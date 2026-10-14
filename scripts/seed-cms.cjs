'use strict';

// Generate an atomic, empty-database-only baseline import. It never resets data.
const projects = require('../data/projects.json');

function seedSql(documents = projects) {
  if (!Array.isArray(documents) || documents.length !== 27 || new Set(documents.map(document => document.slug)).size !== 27) throw new Error('The initial migration must contain exactly 27 distinct source project URLs');
  const literal = JSON.stringify(documents).replace(/'/g, "''");
  return `begin;
lock table public.cms_projects in share row exclusive mode;
do $cms_seed$
declare
  v_document jsonb;
  v_id uuid;
  v_revision uuid;
  v_now timestamptz := now();
begin
  if exists(select 1 from public.cms_projects) then
    raise notice 'CMS already has projects: initial import skipped without modifying any record';
    return;
  end if;
  if exists(select 1 from public.cms_public_projects) or exists(select 1 from public.cms_revisions) then
    raise exception 'CMS baseline refuses a partially populated database';
  end if;
  for v_document in select value from jsonb_array_elements('${literal}'::jsonb) loop
    -- Legacy baseline includes the already-public Yılmaz placeholder cover.
    -- Subsequent new publications use the stricter publish RPC validation.
    insert into public.cms_projects(slug,version,publication_state,draft,published,published_at,updated_at)
      values(v_document->>'slug',1,'published',v_document,v_document,v_now,v_now) returning id into v_id;
    insert into public.cms_revisions(project_id,project_version,document,created_at)
      values(v_id,1,v_document,v_now) returning id into v_revision;
    update public.cms_projects set current_revision_id=v_revision where id=v_id;
    insert into public.cms_public_projects(id,slug,document,published_at,updated_at)
      values(v_id,v_document->>'slug',v_document,v_now,v_now);
    insert into public.cms_audit_log(project_id,action,before_version,after_version,created_at)
      values(v_id,'publish',null,1,v_now);
  end loop;
end;
$cms_seed$;
commit;
select (select count(*) from public.cms_projects) as projects,
       (select count(*) from public.cms_public_projects) as published,
       (select count(*) from public.cms_revisions) as revisions;
`;
}

if (require.main === module) {
  if (process.argv.includes('--sql')) process.stdout.write(seedSql());
  else {
    console.log('Usage: node scripts/seed-cms.cjs --sql');
    console.log('Apply the generated SQL only after verifying the isolated Gerzoğlu project ref. Existing CMS data is never overwritten.');
  }
}

module.exports = { seedSql };
