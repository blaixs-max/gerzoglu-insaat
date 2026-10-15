const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const ADMIN = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const BACKFILLED = '99999999-9999-4999-8999-999999999999';
let db;
function document(slug, overrides = {}) {
  return { schemaVersion: 1, slug, name: 'Test Apartmanı', district: 'Kartal',
    status: 'planlanan', constructionArea: null, unitCount: null, listOrder: 999,
    start: { value: '2026', estimated: false }, end: { value: '', estimated: true },
    cover: { id: null, src: '/assets/projects/test.webp', srcset: '', width: 1600, height: 1200, kind: 'exterior' },
    gallery: [], interiors: [], facts: [], ...overrides };
}
async function actor(role, uid, operation) {
  await db.exec('begin');
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid || '']);
    const result = await operation();
    await db.exec('commit');
    return result;
  } catch (error) {
    await db.exec('rollback');
    throw error;
  }
}
async function rpc(name, args) {
  const placeholders = args.map((_, index) => `$${index + 1}`).join(',');
  const result = await db.query(`select public.${name}(${placeholders}) as result`, args);
  return result.rows[0].result;
}
async function create(slug, overrides) {
  return actor('authenticated', ADMIN, () => rpc('cms_create_project', [document(slug, overrides)]));
}
async function countPublic(id) {
  return actor('anon', null, async () => (await db.query('select count(*)::integer as n from public.cms_public_projects where id=$1',[id])).rows[0].n);
}
before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
    $$;
    grant usage on schema auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    grant usage on schema public to anon,authenticated,service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key,bucket_id text,name text);
    alter table storage.objects enable row level security;
    insert into auth.users(id) values('${ADMIN}'),('${OTHER}');
  `);
  // This is the real checked-in migration, not an alternate test implementation.
  const directory = path.join(__dirname, '..', 'supabase', 'migrations');
  for (const file of fs.readdirSync(directory).filter(file => file.endsWith('.sql')).sort()) {
    if (file.endsWith('_cms_archived_project_deletion.sql')) {
      await db.query('insert into public.cms_projects(id,slug,draft) values($1,$2,$3)',[BACKFILLED,'pre-migration-address',document('pre-migration-address')]);
    }
    await db.exec(fs.readFileSync(path.join(directory, file), 'utf8'));
  }
  await db.query('insert into public.cms_admins(user_id) values($1)', [ADMIN]);
});
after(async () => { if (db) await db.close(); });

test('CMS database: public wrappers are invokers; private helpers and private tables are denied', async () => {
  const wrappers = await db.query("select proname,prosecdef from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname='public' and proname like 'cms_%'");
  assert.equal(wrappers.rows.length, 9);
  assert.ok(wrappers.rows.every(row => row.prosecdef === false));
  const protections = await db.query("select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname like 'cms_%'");
  assert.equal(protections.rows.length,7);
  assert.ok(protections.rows.every(row=>row.relrowsecurity));
  const privileged = await db.query("select p.proname,p.proconfig,has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='cms_private' and p.prosecdef");
  assert.ok(privileged.rows.length > 8);
  assert.ok(privileged.rows.every(row=>row.proconfig.includes('search_path=\"\"') && row.anon_execute === false));
  await assert.rejects(actor('anon', null, () => db.query('select * from public.cms_projects')), /permission denied/);
  await assert.rejects(actor('anon', null, () => rpc('cms_create_project',[document('anon-denied')])), /permission denied/);
  await assert.rejects(actor('authenticated', OTHER, () => db.query("select cms_private.project_result('00000000-0000-4000-8000-000000000000')")), /permission denied/);
  await assert.rejects(actor('authenticated', ADMIN, () => db.query("select cms_private.record_publication('00000000-0000-4000-8000-000000000000')")), /permission denied/);
});

test('CMS database: active administrator membership is checked on every RPC and RLS read', async () => {
  const project = await create('admin-rls');
  const forbidden = await actor('authenticated', OTHER, () => db.query('select id from public.cms_projects where id=$1',[project.id]));
  assert.equal(forbidden.rows.length, 0);
  await assert.rejects(actor('authenticated', OTHER, () => rpc('cms_create_project',[document('other-denied')])), /CMS_ADMIN_REQUIRED/);
  await assert.rejects(actor('authenticated', null, () => rpc('cms_create_project',[document('empty-sub-denied')])), /CMS_ADMIN_REQUIRED/);
  await assert.rejects(actor('authenticated', ADMIN, () => db.query("update public.cms_projects set publication_state='published' where id=$1",[project.id])), /permission denied/);
  await assert.rejects(actor('authenticated', OTHER, () => db.query('insert into public.cms_admins(user_id) values($1)',[OTHER])), /permission denied/);
  await db.query('update public.cms_admins set active=false where user_id=$1',[ADMIN]);
  await assert.rejects(actor('authenticated', ADMIN, () => rpc('cms_publish_project',[project.id,project.version])), /CMS_ADMIN_REQUIRED/);
  const hidden = await actor('authenticated', ADMIN, () => db.query('select id from public.cms_projects where id=$1',[project.id]));
  assert.equal(hidden.rows.length, 0);
  await db.query('update public.cms_admins set active=true where user_id=$1',[ADMIN]);
});

test('CMS database: saving is private, publishing is atomic, and stale editors are rejected', async () => {
  let project = await create('draft-and-publish');
  assert.equal(await countPublic(project.id), 0);
  project = await actor('authenticated', ADMIN, () => rpc('cms_publish_project',[project.id,project.version]));
  assert.equal(project.version, 2);
  assert.equal(project.has_unpublished_changes, false);
  assert.equal(await countPublic(project.id), 1);
  const previousVersion = project.version;
  project = await actor('authenticated', ADMIN, () => rpc('cms_save_project',[project.id,previousVersion,{...project.draft,name:'Unpublished name'}]));
  assert.equal(project.has_unpublished_changes, true);
  const live = await actor('anon', null, () => db.query('select document from public.cms_public_projects where id=$1',[project.id]));
  assert.equal(live.rows[0].document.name, 'Test Apartmanı');
  await assert.rejects(actor('authenticated', ADMIN, () => rpc('cms_publish_project',[project.id,previousVersion])), error => error.code === 'P0001' && /CMS_STALE_VERSION/.test(error.message));
  assert.equal((await db.query('select version from public.cms_projects where id=$1',[project.id])).rows[0].version,project.version);
  project = await actor('authenticated', ADMIN, () => rpc('cms_discard_draft',[project.id,project.version]));
  assert.equal(project.draft.name, 'Test Apartmanı');
  assert.equal(project.has_unpublished_changes,false);
});

test('CMS database: publication enforces exact status, required fields, immutable URL and no private preview URLs', async () => {
  await assert.rejects(create('bad-status',{status:'published'}), /CMS_INVALID_STATUS/);
  await assert.rejects(create('bad-schema-version',{schemaVersion:'1'}), /CMS_INVALID_SLUG/);
  await assert.rejects(create('bad-preview',{cover:{id:null,src:'/assets/test.webp',previewSrc:'private-signed-url'}}), /CMS_PRIVATE_PREVIEW_NOT_STORABLE/);
  let project = await create('missing-required',{district:''});
  await assert.rejects(actor('authenticated',ADMIN,()=>rpc('cms_publish_project',[project.id,project.version])), /CMS_REQUIRED_FIELDS/);
  assert.equal(await countPublic(project.id),0);
  await assert.rejects(actor('authenticated',ADMIN,()=>rpc('cms_save_project',[project.id,project.version,{...project.draft,slug:'different-slug'}])), /CMS_SLUG_IMMUTABLE/);
  const read = await db.query('select version,publication_state from public.cms_projects where id=$1',[project.id]);
  assert.deepEqual(read.rows[0],{version:1,publication_state:'draft'});
});

test('CMS database: unready/foreign media cannot publish and never becomes public on failed publish', async () => {
  let project = await create('media-publication');
  const other = await create('media-other-project');
  const mediaId = '33333333-3333-4333-8333-333333333333';
  const foreignId = '44444444-4444-4444-8444-444444444444';
  const image = {id:mediaId,src:`/media/${mediaId}/1600.webp`,srcset:'',width:1600,height:1200,kind:'exterior'};
  await actor('service_role',null,()=>db.query('insert into public.cms_media(id,project_id,path,mime_type,size_bytes) values($1,$2,$3,$4,$5)',[mediaId,project.id,`${project.id}/${mediaId}.png`,'image/png',1024]));
  await db.query('insert into public.cms_media(id,project_id,path,mime_type,size_bytes) values($1,$2,$3,$4,$5)',[foreignId,other.id,`${other.id}/${foreignId}.png`,'image/png',1024]);
  await assert.rejects(actor('authenticated',ADMIN,()=>rpc('cms_save_project',[project.id,project.version,{...project.draft,cover:{...image,id:foreignId}}])), /CMS_MEDIA_NOT_OWNED/);
  project = await actor('authenticated',ADMIN,()=>rpc('cms_save_project',[project.id,project.version,{...project.draft,cover:image}]));
  await assert.rejects(actor('authenticated',ADMIN,()=>rpc('cms_publish_project',[project.id,project.version])), /CMS_MEDIA_NOT_READY/);
  assert.equal(await countPublic(project.id),0);
  assert.equal((await db.query('select published_at from public.cms_media where id=$1',[mediaId])).rows[0].published_at,null);
  await db.query("update public.cms_media set status='ready',width=1600,height=1200,image=$2,variants=$3 where id=$1",[mediaId,image,[{width:1600,height:1200,path:`${project.id}/${mediaId}/1600.webp`,mime:'image/webp'}]]);
  project = await actor('authenticated',ADMIN,()=>rpc('cms_publish_project',[project.id,project.version]));
  assert.equal(await countPublic(project.id),1);
  assert.ok((await db.query('select published_at from public.cms_media where id=$1',[mediaId])).rows[0].published_at);
  const after = await actor('authenticated',ADMIN,()=>rpc('cms_save_project',[project.id,project.version,{...project.draft,cover:{...image,src:'/media/wrong/1600.webp'}}]));
  await assert.rejects(actor('authenticated',ADMIN,()=>rpc('cms_publish_project',[project.id,after.version])), /CMS_MEDIA_METADATA_MISMATCH/);
  const live = await actor('anon',null,()=>db.query('select document from public.cms_public_projects where id=$1',[project.id]));
  assert.equal(live.rows[0].document.cover.src,image.src);
});

test('CMS database: history restore is a draft; archive and restore do not implicitly republish', async () => {
  let project = await create('revision-archive');
  project = await actor('authenticated',ADMIN,()=>rpc('cms_publish_project',[project.id,project.version]));
  const revision = project.current_revision_id;
  const other = await create('revision-other');
  await assert.rejects(actor('authenticated',ADMIN,()=>rpc('cms_restore_revision',[other.id,other.version,revision])), /CMS_REVISION_NOT_FOUND/);
  project = await actor('authenticated',ADMIN,()=>rpc('cms_save_project',[project.id,project.version,{...project.draft,name:'Published revision two'}]));
  project = await actor('authenticated',ADMIN,()=>rpc('cms_publish_project',[project.id,project.version]));
  assert.equal(project.previous_published_revision_id,revision);
  project = await actor('authenticated',ADMIN,()=>rpc('cms_restore_revision',[project.id,project.version,revision]));
  assert.equal(project.draft.name,'Test Apartmanı');
  assert.equal(project.published.name,'Published revision two');
  project = await actor('authenticated',ADMIN,()=>rpc('cms_archive_project',[project.id,project.version]));
  assert.equal(await countPublic(project.id),0);
  project = await actor('authenticated',ADMIN,()=>rpc('cms_restore_project',[project.id,project.version]));
  assert.equal(project.publication_state,'draft');
  assert.equal(await countPublic(project.id),0);
  project = await actor('authenticated',ADMIN,()=>rpc('cms_publish_project',[project.id,project.version]));
  assert.equal(await countPublic(project.id),1);
  assert.equal(project.published.name,'Test Apartmanı');
  assert.equal((await db.query('select count(*)::integer as n from public.cms_audit_log where project_id=$1',[project.id])).rows[0].n,8);
});

test('CMS database: reorder is atomic on conflicts and preserves unpublished field changes', async () => {
  let one = await create('ordering-one');
  let two = await create('ordering-two');
  one = await actor('authenticated',ADMIN,()=>rpc('cms_publish_project',[one.id,one.version]));
  one = await actor('authenticated',ADMIN,()=>rpc('cms_save_project',[one.id,one.version,{...one.draft,name:'Draft must stay private'}]));
  await assert.rejects(actor('authenticated',ADMIN,()=>rpc('cms_reorder_projects',[[two.id,one.id],{[two.id]:two.version,[one.id]:one.version-1}])), /CMS_STALE_VERSION/);
  assert.equal((await db.query('select version from public.cms_projects where id=$1',[two.id])).rows[0].version,two.version);
  const result = await actor('authenticated',ADMIN,()=>rpc('cms_reorder_projects',[[two.id,one.id],{[two.id]:two.version,[one.id]:one.version}]));
  assert.equal(result[0].draft.listOrder,1);
  assert.equal(result[1].draft.listOrder,2);
  assert.equal(result[1].draft.name,'Draft must stay private');
  assert.equal(result[1].published.name,'Test Apartmanı');
  assert.equal(result[1].published.listOrder,2);
  assert.equal(await countPublic(two.id),0);
});

test('CMS database: storage stays private, and service role can import while browser roles cannot', async () => {
  const buckets = await db.query("select id,public from storage.buckets where id in ('project-media-originals','project-media-variants')");
  assert.equal(buckets.rows.length,2);
  assert.ok(buckets.rows.every(bucket=>bucket.public === false));
  const policies = await db.query("select policyname from pg_policies where schemaname='storage' and tablename='objects'");
  assert.equal(policies.rows.length,0);
  await assert.rejects(actor('authenticated',ADMIN,()=>db.query('select * from storage.objects')), /permission denied/);
  const imported = document('service-import');
  const rows = await actor('service_role',null,()=>db.query("insert into public.cms_projects(slug,draft) values($1,$2) returning id",[imported.slug,imported]));
  assert.ok(rows.rows[0].id);
});

test('CMS database: only authoritative imported coverless publications can keep their placeholder', async () => {
  const coverless = document('imported-placeholder', {cover:null});
  const inserted = await actor('service_role',null,()=>db.query("insert into public.cms_projects(slug,draft,published,publication_state,published_at) values($1,$2,$2,'published',now()) returning id,version",[coverless.slug,coverless]));
  let project = inserted.rows[0];
  project = await actor('authenticated',ADMIN,()=>rpc('cms_save_project',[project.id,project.version,{...coverless,name:'Updated imported placeholder'}]));
  project = await actor('authenticated',ADMIN,()=>rpc('cms_publish_project',[project.id,project.version]));
  assert.equal(project.published.cover,null);
  assert.equal(project.published.name,'Updated imported placeholder');
  assert.equal(await countPublic(project.id),1);
  const forged = await create('forged-placeholder',{cover:null,legacy:{placeholder:true}});
  await assert.rejects(actor('authenticated',ADMIN,()=>rpc('cms_publish_project',[forged.id,forged.version])),/CMS_REQUIRED_FIELDS/);
  let standard = await create('cannot-remove-cover');
  standard = await actor('authenticated',ADMIN,()=>rpc('cms_publish_project',[standard.id,standard.version]));
  standard = await actor('authenticated',ADMIN,()=>rpc('cms_save_project',[standard.id,standard.version,{...standard.draft,cover:null,legacy:{placeholder:true}}]));
  await assert.rejects(actor('authenticated',ADMIN,()=>rpc('cms_publish_project',[standard.id,standard.version])),/CMS_REQUIRED_FIELDS/);
  assert.ok((await db.query('select document from public.cms_public_projects where id=$1',[standard.id])).rows[0].document.cover);
});

test('CMS database: address migration backfills legacy rows and denies direct writes or non-admin reads', async () => {
  const address = await actor('authenticated',ADMIN,()=>db.query('select slug,project_id,deleted_at from public.cms_project_addresses where project_id=$1',[BACKFILLED]));
  assert.deepEqual(address.rows,[{slug:'pre-migration-address',project_id:BACKFILLED,deleted_at:null}]);
  assert.equal((await actor('authenticated',OTHER,()=>db.query('select * from public.cms_project_addresses'))).rows.length,0);
  await assert.rejects(actor('anon',null,()=>db.query('select * from public.cms_project_addresses')),/permission denied/);
  for(const query of [
    "insert into public.cms_project_addresses(slug,project_id) values('forged','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')",
    "update public.cms_project_addresses set deleted_at=now()",
    "delete from public.cms_project_addresses",
    `delete from public.cms_projects where id='${BACKFILLED}'`,
  ]) await assert.rejects(actor('authenticated',ADMIN,()=>db.query(query)),/permission denied/);
});

test('CMS database: deletion requires a current active administrator, archive state, exact name and version', async () => {
  let project=await create('delete-guards',{name:'Kesin Adı Apartmanı'});
  const args=()=>[project.id,project.version,'Kesin Adı Apartmanı'];
  await assert.rejects(actor('anon',null,()=>rpc('cms_delete_project',args())),/permission denied/);
  await assert.rejects(actor('authenticated',OTHER,()=>rpc('cms_delete_project',args())),/CMS_ADMIN_REQUIRED/);
  await assert.rejects(actor('authenticated',null,()=>rpc('cms_delete_project',args())),/CMS_ADMIN_REQUIRED/);
  await assert.rejects(actor('authenticated',ADMIN,()=>rpc('cms_delete_project',args())),/CMS_DELETE_REQUIRES_ARCHIVE/);
  project=await actor('authenticated',ADMIN,()=>rpc('cms_publish_project',[project.id,project.version]));
  await assert.rejects(actor('authenticated',ADMIN,()=>rpc('cms_delete_project',args())),/CMS_DELETE_REQUIRES_ARCHIVE/);
  assert.equal(await countPublic(project.id),1);
  project=await actor('authenticated',ADMIN,()=>rpc('cms_archive_project',[project.id,project.version]));
  const snapshot=await db.query('select * from public.cms_projects where id=$1',[project.id]);
  await db.query('update public.cms_admins set active=false where user_id=$1',[ADMIN]);
  await assert.rejects(actor('authenticated',ADMIN,()=>rpc('cms_delete_project',args())),/CMS_ADMIN_REQUIRED/);
  assert.equal((await actor('authenticated',ADMIN,()=>db.query('select * from public.cms_project_addresses'))).rows.length,0);
  await db.query('update public.cms_admins set active=true where user_id=$1',[ADMIN]);
  for(const name of [null,'','kesin Adı Apartmanı','Kesin Adı']) {
    await assert.rejects(actor('authenticated',ADMIN,()=>rpc('cms_delete_project',[project.id,project.version,name])),/CMS_DELETE_NAME_MISMATCH/);
  }
  for(const expected of [null,project.version-1]) {
    await assert.rejects(actor('authenticated',ADMIN,()=>rpc('cms_delete_project',[project.id,expected,project.draft.name])),error=>error.code==='P0001'&&error.message==='CMS_STALE_VERSION');
  }
  assert.deepEqual((await db.query('select * from public.cms_projects where id=$1',[project.id])).rows,snapshot.rows);
  assert.equal((await db.query('select deleted_at from public.cms_project_addresses where project_id=$1',[project.id])).rows[0].deleted_at,null);
});

test('CMS database: deleting one archived project removes its child rows atomically and permanently reserves its address', async () => {
  let project=await create('delete-complete',{name:'Silinecek Apartman'});
  let other=await create('delete-neighbor',{name:'Korunacak Apartman'});
  other=await actor('authenticated',ADMIN,()=>rpc('cms_publish_project',[other.id,other.version]));
  const otherSnapshot=(await db.query('select * from public.cms_projects where id=$1',[other.id])).rows[0];
  const otherMediaId='77777777-7777-4777-8777-777777777777';
  await db.query("insert into public.cms_media(id,project_id,path,mime_type,size_bytes) values($1,$2,$3,'image/jpeg',1000)",[otherMediaId,other.id,`${other.id}/${otherMediaId}.jpg`]);
  const otherMedia=(await db.query('select * from public.cms_media where id=$1',[otherMediaId])).rows[0];
  const otherRevisions=(await db.query('select * from public.cms_revisions where project_id=$1',[other.id])).rows;
  const mediaId='88888888-8888-4888-8888-888888888888';
  const image={id:mediaId,src:`/media/${mediaId}/1600.webp`,srcset:'',width:1600,height:1200,kind:'exterior'};
  await db.query("insert into public.cms_media(id,project_id,path,mime_type,size_bytes,status,width,height,image,variants) values($1,$2,$3,'image/jpeg',1000,'ready',1600,1200,$4,$5)",[mediaId,project.id,`${project.id}/${mediaId}.jpg`,image,[{width:1600,height:1200,path:`${project.id}/${mediaId}/1600.webp`,mime:'image/webp'}]]);
  await db.query('insert into storage.objects(id,bucket_id,name) values($1,$2,$3)',[mediaId,'project-media-originals',`${project.id}/${mediaId}.jpg`]);
  project=await actor('authenticated',ADMIN,()=>rpc('cms_save_project',[project.id,project.version,{...project.draft,cover:image}]));
  project=await actor('authenticated',ADMIN,()=>rpc('cms_publish_project',[project.id,project.version]));
  project=await actor('authenticated',ADMIN,()=>rpc('cms_archive_project',[project.id,project.version]));
  for(const table of ['cms_media','cms_revisions','cms_audit_log']) {
    assert.ok((await db.query(`select count(*)::integer as n from public.${table} where project_id=$1`,[project.id])).rows[0].n>0);
  }
  const deleted=await actor('authenticated',ADMIN,()=>rpc('cms_delete_project',[project.id,project.version,'  Silinecek Apartman  ']));
  assert.deepEqual(deleted,{id:project.id,deleted:true});
  for(const [table,key] of [['cms_projects','id'],['cms_public_projects','id'],['cms_media','project_id'],['cms_revisions','project_id'],['cms_audit_log','project_id']]) {
    assert.equal((await db.query(`select count(*)::integer as n from public.${table} where ${key}=$1`,[project.id])).rows[0].n,0);
  }
  const address=(await db.query('select * from public.cms_project_addresses where slug=$1',[project.slug])).rows[0];
  assert.equal(address.project_id,project.id);assert.equal(address.deleted_by,ADMIN);assert.ok(address.deleted_at);
  await assert.rejects(create(project.slug),error=>error.code==='23505');
  assert.equal((await db.query('select count(*)::integer as n from public.cms_project_addresses where slug=$1',[project.slug])).rows[0].n,1);
  await assert.rejects(actor('authenticated',ADMIN,()=>rpc('cms_delete_project',[project.id,project.version,project.draft.name])),/CMS_PROJECT_NOT_FOUND/);
  assert.deepEqual((await db.query('select * from public.cms_projects where id=$1',[other.id])).rows[0],otherSnapshot);
  assert.deepEqual((await db.query('select * from public.cms_media where id=$1',[otherMediaId])).rows[0],otherMedia);
  assert.deepEqual((await db.query('select * from public.cms_revisions where project_id=$1',[other.id])).rows,otherRevisions);
  assert.equal(await countPublic(other.id),1);
  // Metadata removal does not claim to purge private originals or cached immutable derivatives.
  assert.equal((await db.query('select count(*)::integer as n from storage.objects where id=$1',[mediaId])).rows[0].n,1);
});

test('CMS database: imported rows reserve addresses on deletion and failed creation leaves no orphan reservation', async () => {
  const imported=document('delete-service-import',{name:'Sonradan Aktarılan'});
  const inserted=await actor('service_role',null,()=>db.query('insert into public.cms_projects(slug,draft) values($1,$2) returning id,version',[imported.slug,imported]));
  let project=inserted.rows[0];
  await assert.rejects(create(imported.slug),error=>error.code==='23505');
  assert.equal((await db.query('select count(*)::integer as n from public.cms_project_addresses where slug=$1',[imported.slug])).rows[0].n,0);
  project=await actor('authenticated',ADMIN,()=>rpc('cms_archive_project',[project.id,project.version]));
  await actor('authenticated',ADMIN,()=>rpc('cms_delete_project',[project.id,project.version,imported.name]));
  await assert.rejects(create(imported.slug),error=>error.code==='23505');
  assert.ok((await db.query('select deleted_at from public.cms_project_addresses where slug=$1',[imported.slug])).rows[0].deleted_at);
});
