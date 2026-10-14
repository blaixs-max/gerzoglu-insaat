'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const cheerio = require('cheerio');
const { CmsError } = require('../lib/cms-model.cjs');
const actualStore = require('../lib/cms-store.cjs');
const { createHealthHandler } = require('../api/health.js');
const { runHealthCheck, configuration } = require('../scripts/check-cms-health.cjs');

const ADMIN = '11111111-1111-4111-8111-111111111111';
const SECRET = 'test-only-health-secret-at-least-16-characters';
const freshDocument = (overrides = {}) => ({
  schemaVersion:1, slug:`http-project-${randomUUID()}`, name:'HTTP Test Apartmanı', district:'Kartal',
  status:'planlanan', listOrder:999, constructionArea:2100, unitCount:24,
  start:{value:'2026',estimated:false},end:{value:'2027',estimated:true},
  cover:{id:null,src:'/assets/projects/http-test.webp',srcset:'',width:1600,height:1200,kind:'exterior'},
  gallery:[],interiors:[],facts:[],home:{card:true,hero:false,cardOrder:999,heroOrder:999},...overrides,
});

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(),'gerzoglu-http-test-'));
  const store = new actualStore.LocalStore(directory);
  await store.list();
  const state = {active:true,unavailable:false};
  // Exercise the real CloudStore authorization implementation with an isolated Auth API.
  // Every project/media operation then uses the real temporary LocalStore; no cloud calls.
  const authorizer = Object.create(actualStore.CloudStore.prototype);
  authorizer.client = {
    auth:{async getUser(token){return token==='valid-admin'?{data:{user:{id:ADMIN,email:'admin@example.test'}},error:null}:{data:{user:null},error:{message:'invalid'}};}},
    from(table){
      assert.equal(table,'cms_admins');
      const query={select(){return query;},eq(column,id){assert.equal(column,'user_id');assert.equal(id,ADMIN);return query;},async maybeSingle(){return{data:{active:state.active},error:null};}};
      return query;
    },
  };
  store.authorize=authorizer.authorize.bind(authorizer);
  const storeFile=require.resolve('../lib/cms-store.cjs');
  const originalExports=require.cache[storeFile].exports;
  require.cache[storeFile].exports={...originalExports,getStore:async()=>{
    if(state.unavailable)throw new CmsError(503,'UNAVAILABLE','Test database unavailable');
    return store;
  }};
  const handlers={};
  const files=['../api/cms.js','../api/site.js','../api/media.js'];
  for(const [index,key] of ['admin','site','media'].entries()){
    const file=require.resolve(files[index]);delete require.cache[file];handlers[key]=require(files[index]);
  }
  const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    try{
      if(pathname.startsWith('/api/admin/')||pathname==='/api/cms')return await handlers.admin(req,res);
      if(pathname.startsWith('/media/')||pathname==='/api/media')return await handlers.media(req,res);
      return await handlers.site(req,res);
    }catch(error){res.statusCode=500;res.end('Unhandled test request');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{
    require.cache[storeFile].exports=originalExports;
    for(const file of files)delete require.cache[require.resolve(file)];
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
    const resolved=path.resolve(directory);
    assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('gerzoglu-http-test-'));
    await fs.rm(resolved,{recursive:true,force:true});
  });
  async function request(target,options={}){
    const headers={...(options.token===false?{}:{Authorization:`Bearer ${options.token||'valid-admin'}`}),...options.headers};
    let body;
    if(options.body!==undefined){
      body=typeof options.body==='string'||Buffer.isBuffer(options.body)?options.body:JSON.stringify(options.body);
      if(!headers['Content-Type'])headers['Content-Type']='application/json';
    }
    const response=await fetch(base+target,{method:options.method||'GET',headers,body,redirect:'manual',signal:AbortSignal.timeout(15000)});
    const buffer=Buffer.from(await response.arrayBuffer()),text=buffer.toString('utf8');
    let json;try{json=JSON.parse(text);}catch{}
    return{status:response.status,headers:response.headers,buffer,text,json};
  }
  async function create(document=freshDocument()){
    const response=await request('/api/admin/projects',{method:'POST',body:{draft:document}});
    assert.equal(response.status,201,response.text);return response.json.project;
  }
  async function action(project,name,body={}){
    return request(`/api/admin/projects/${project.id}/${name}`,{method:'POST',body:{expectedVersion:project.version,...body}});
  }
  return{directory,store,state,request,create,action,base};
}

test('CMS HTTP: missing/expired credentials and inactive admin cannot read or mutate projects',async t=>{
  const f=await fixture(t);
  let r=await f.request('/api/admin/projects',{token:false});assert.equal(r.status,401);assert.equal(r.json.error.code,'UNAUTHENTICATED');
  r=await f.request('/api/admin/projects',{token:'expired'});assert.equal(r.status,401);
  r=await f.request('/api/admin/session');assert.equal(r.status,200);assert.equal(r.json.user.id,ADMIN);
  f.state.active=false;
  r=await f.request('/api/admin/projects');assert.equal(r.status,403);
  r=await f.request('/api/admin/projects',{method:'POST',body:{draft:freshDocument()}});assert.equal(r.status,403);
  f.state.active=true;
  r=await f.request('/api/admin/projects',{method:'POST',headers:{Origin:'https://attacker.example'},body:{draft:freshDocument()}});assert.equal(r.status,403);assert.equal(r.json.error.code,'ORIGIN_DENIED');
  r=await f.request('/api/admin/projects',{method:'POST',headers:{Origin:f.base},body:'{not-json'});assert.equal(r.status,400);
  r=await f.request('/api/admin/projects',{method:'POST',body:'null'});assert.equal(r.status,400);
  r=await f.request('/api/admin/media/sign',{method:'POST',body:'[]'});assert.equal(r.status,400);
  assert.equal((await f.store.list()).length,27);
});

test('CMS HTTP: rewritten Vercel paths preserve routes and unsupported preview POST is rejected',async t=>{
  const f=await fixture(t);
  let r=await f.request('/api/cms?__adminPath=projects');assert.equal(r.status,200);assert.equal(r.json.projects.length,27);
  r=await f.request('/api/cms?__adminPath=session');assert.equal(r.status,200);assert.equal(r.json.isAdmin,true);
  const project=await f.create();
  r=await f.request(`/api/cms?__adminPath=projects/${project.id}`);assert.equal(r.status,200);assert.equal(r.json.project.id,project.id);
  r=await f.request(`/api/admin/projects/${project.id}/preview`,{method:'POST',body:{expectedVersion:project.version}});assert.equal(r.status,405);assert.equal(r.headers.get('allow'),'GET');
  r=await f.request('/api/site?__path=/projeler.html',{token:false});assert.equal(r.status,200);
});

test('CMS HTTP: imported Yılmaz placeholder accepts edits while a new coverless project cannot publish',async t=>{
  const f=await fixture(t);const row=(await f.store.list()).find(row=>row.slug==='uskudar-yilmaz-apartmani');
  assert.equal(row.published.cover,null);
  let r=await f.request(`/api/admin/projects/${row.id}`,{method:'PUT',body:{expectedVersion:row.version,draft:{...row.draft,name:'Yılmaz Apartmanı Güncel'}}});assert.equal(r.status,200,r.text);
  r=await f.action(r.json.project,'publish');assert.equal(r.status,200,r.text);assert.equal(r.json.project.published.cover,null);
  const created=await f.create(freshDocument({cover:null,legacy:{placeholder:true}}));
  r=await f.action(created,'publish');assert.equal(r.status,422);
});

test('CMS HTTP: draft edits stay private and simultaneous editors cannot overwrite each other',async t=>{
  const f=await fixture(t);let project=await f.create();
  let r=await f.request(`/proje/${project.slug}.html`,{token:false});assert.equal(r.status,404);
  r=await f.action(project,'publish');assert.equal(r.status,200,r.text);project=r.json.project;
  r=await f.request(`/proje/${project.slug}.html`,{token:false});assert.equal(r.status,200);assert.match(r.text,/HTTP Test Apartmanı/);assert.match(r.headers.get('cache-control'),/no-store/);
  const edit={...project.draft,name:'Draft secret name',description:'Never public until publish'};
  const edits=await Promise.all([1,2].map(()=>f.request(`/api/admin/projects/${project.id}`,{method:'PUT',body:{draft:edit,expectedVersion:project.version}})));
  assert.deepEqual(edits.map(r=>r.status).sort(),[200,409]);
  const saved=edits.find(r=>r.status===200).json.project;
  assert.equal(saved.hasUnpublishedChanges,true);
  r=await f.request(`/proje/${project.slug}.html`,{token:false});assert.ok(!r.text.includes('Draft secret name'));
  r=await f.action(project,'publish');assert.equal(r.status,409);
  r=await f.action(saved,'publish');assert.equal(r.status,200);project=r.json.project;
  r=await f.request(`/proje/${project.slug}.html`,{token:false});assert.match(r.text,/Draft secret name/);
  const persisted=await new actualStore.LocalStore(f.directory).getRow(project.id);assert.equal(persisted.version,project.version);assert.equal(persisted.published.name,'Draft secret name');
});

test('CMS HTTP: validation protects exact status, cover, dates, immutable URL and HTML rendering',async t=>{
  const f=await fixture(t);
  let r=await f.request('/api/admin/projects',{method:'POST',body:{draft:freshDocument({status:'done'})}});assert.equal(r.status,422);
  r=await f.request('/api/admin/projects',{method:'POST',body:{draft:freshDocument({start:{value:'2026-02-30'}})}});assert.equal(r.status,422);
  let project=await f.create(freshDocument({cover:null}));
  r=await f.action(project,'publish');assert.equal(r.status,422);
  project=await f.create(freshDocument({name:'<script>window.bad=1</script> & Apartment',summary:'<img src=x onerror=alert(1)>'}));
  r=await f.action(project,'publish');assert.equal(r.status,200);project=r.json.project;
  r=await f.request(`/proje/${project.slug}.html`,{token:false});
  const $=cheerio.load(r.text);
  assert.equal($('script').filter((_,node)=>$(node).text().includes('window.bad=1')&&$(node).attr('type')!=='application/ld+json').length,0);
  assert.equal($('img[onerror]').length,0);assert.match($('.phero__title').text()||$('h1').text(),/<script>window.bad=1<\/script>/);assert.match(r.text,/&lt;script&gt;/);
  const changed={...project.draft,slug:'attempt-to-change-url'};
  r=await f.request(`/api/admin/projects/${project.id}`,{method:'PUT',body:{draft:changed,expectedVersion:project.version}});assert.equal(r.status,200);assert.equal(r.json.project.slug,project.slug);assert.equal(r.json.project.draft.slug,project.slug);
});

test('CMS HTTP: archiving removes public detail, lists and sitemap; revision restore remains a draft',async t=>{
  const f=await fixture(t);let project=await f.create();
  let r=await f.action(project,'publish');project=r.json.project;
  r=await f.request(`/api/admin/projects/${project.id}`);const revisionId=r.json.history[0].id;
  r=await f.request(`/api/admin/projects/${project.id}`,{method:'PUT',body:{draft:{...project.draft,name:'Second published name'},expectedVersion:project.version}});project=r.json.project;
  r=await f.action(project,'publish');project=r.json.project;
  r=await f.action(project,'restore-revision',{revisionId});assert.equal(r.status,200);project=r.json.project;
  assert.equal(project.draft.name,'HTTP Test Apartmanı');assert.equal(project.published.name,'Second published name');
  r=await f.action(project,'archive');project=r.json.project;
  r=await f.request(`/proje/${project.slug}.html`,{token:false});assert.equal(r.status,404);
  for(const url of ['/projeler.html','/sitemap.xml','/llms.txt']){r=await f.request(url,{token:false});assert.equal(r.status,200);assert.ok(!r.text.includes(`/proje/${project.slug}.html`));}
  r=await f.action(project,'restore');assert.equal(r.status,200);project=r.json.project;assert.equal(project.publicationState,'draft');
  r=await f.request(`/proje/${project.slug}.html`,{token:false});assert.equal(r.status,404);
  r=await f.action(project,'publish');assert.equal(r.status,200);project=r.json.project;
  r=await f.request(`/proje/${project.slug}.html`,{token:false});assert.equal(r.status,200);assert.match(r.text,/HTTP Test Apartmanı/);
});

test('CMS HTTP: private upload/preview becomes an immutable public derivative only after publish',async t=>{
  const f=await fixture(t);let project=await f.create();
  const original=await sharp({create:{width:96,height:64,channels:3,background:'#bca'}}).jpeg().toBuffer();
  let r=await f.request('/api/admin/media/sign',{method:'POST',body:{projectId:project.id,fileName:'building.jpg',type:'image/jpeg',size:original.length}});assert.equal(r.status,200,r.text);
  const signed=r.json;
  r=await f.request(signed.signedUrl,{method:'PUT',headers:{'Content-Type':'image/jpeg'},body:original});assert.equal(r.status,200,r.text);
  r=await f.request(`/api/admin/media/${signed.mediaId}/finalize`,{method:'POST',body:{}});assert.equal(r.status,200,r.text);const image=r.json.media;
  r=await f.request(image.src+'?allowPrivate=true',{token:false});assert.equal(r.status,404);
  r=await f.request(image.previewSrc,{token:false});assert.equal(r.status,401);
  r=await f.request(image.previewSrc);assert.equal(r.status,200);assert.equal((await sharp(r.buffer).metadata()).width,96);
  r=await f.request(`/api/admin/projects/${project.id}`,{method:'PUT',body:{expectedVersion:project.version,draft:{...project.draft,cover:image}}});assert.equal(r.status,200,r.text);project=r.json.project;
  assert.ok(project.draft.cover.previewSrc);
  assert.equal((await f.store.getRow(project.id)).draft.cover.previewSrc,undefined);
  r=await f.action(project,'publish');assert.equal(r.status,200,r.text);project=r.json.project;
  r=await f.request(image.src,{token:false});assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/immutable/);const etag=r.headers.get('etag');
  assert.equal((await sharp(r.buffer).metadata()).format,'webp');
  r=await f.request(image.src,{token:false,headers:{'If-None-Match':etag}});assert.equal(r.status,304);assert.equal(r.buffer.length,0);
  r=await f.request(image.src,{token:false,method:'HEAD'});assert.equal(r.status,200);assert.equal(r.buffer.length,0);
  r=await f.request(`/media/${signed.mediaId}/1920.webp`,{token:false});assert.equal(r.status,404);
  r=await f.request(`/api/media?id=${signed.mediaId}&file=96.webp`,{token:false});assert.equal(r.status,200);
});

test('CMS HTTP: configured database failure returns 503 without reviving archived static data',async t=>{
  const f=await fixture(t);const existing=(await f.store.list())[0];
  const archived=await f.action({id:existing.id,version:existing.version},'archive');assert.equal(archived.status,200);
  f.state.unavailable=true;
  for(const url of ['/','/projeler.html',`/proje/${existing.slug}.html`]){
    const r=await f.request(url,{token:false});assert.equal(r.status,503);assert.equal(r.headers.get('retry-after'),'30');assert.ok(!r.text.includes(existing.published.name));
  }
});

function fakeResponse(){return{statusCode:0,headers:{},setHeader(key,value){this.headers[key]=value;},end(value){this.body=JSON.parse(value);}};}
async function health(options={},authorization=`Bearer ${SECRET}`,method='GET'){
  const res=fakeResponse();await createHealthHandler({environment:()=>({CMS_HEALTH_SECRET:SECRET}),logger:{error(){}},...options})({method,headers:{authorization}},res);return res;
}
test('CMS health: protected real cloud check, failure/timeout/local fallback never false-green',async()=>{
  let queries=0;const cloud={getStore:async()=>({local:false,publicCatalog:async()=>{queries++;return[];}})};
  let r=await health(cloud,'bad');assert.equal(r.statusCode,401);assert.equal(queries,0);
  r=await health({...cloud,environment:()=>({})});assert.equal(r.statusCode,503);assert.equal(queries,0);
  r=await health(cloud,`Bearer ${SECRET}`,'POST');assert.equal(r.statusCode,405);
  r=await health({getStore:async()=>({local:true,publicCatalog:async()=>[]})});assert.equal(r.statusCode,503);
  r=await health(cloud);assert.equal(r.statusCode,200);assert.equal(queries,1);assert.equal(r.body.database,'ok');assert.match(r.headers['Cache-Control'],/no-store/);
  r=await health({getStore:async()=>({local:false,publicCatalog:async()=>{throw new Error('sensitive detail');}})});assert.equal(r.statusCode,503);assert.ok(!JSON.stringify(r.body).includes('sensitive detail'));
  r=await health({getStore:async()=>({local:false,publicCatalog:async()=>new Promise(()=>{})}),timeoutMs:1});assert.equal(r.statusCode,503);
});

test('CMS health script: real REST route, public-only credentials, bounded retry and response validation',async()=>{
  const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_12345678901234567890'};
  let request;
  let r=await runHealthCheck({env,fetch:async(url,options)=>{request={url:String(url),options};return new Response('[]',{status:200});}});
  assert.equal(r.ok,true);assert.match(request.url,/cms_public_projects\?select=id&limit=1$/);assert.equal(request.options.cache,'no-store');assert.equal(request.options.redirect,'error');assert.ok(!request.options.headers.Authorization);
  let calls=0;r=await runHealthCheck({env,wait:async()=>{},fetch:async()=>{calls++;return calls<3?new Response('',{status:503}):new Response('[]',{status:200});}});assert.equal(calls,3);assert.equal(r.attempts,3);
  calls=0;await assert.rejects(runHealthCheck({env,wait:async()=>{},fetch:async()=>{calls++;return new Response('',{status:401});}}),/HEALTH_HTTP_401/);assert.equal(calls,1);
  await assert.rejects(runHealthCheck({env,fetch:async()=>new Response('{}',{status:200})}),/HEALTH_INVALID_RESPONSE/);
  const jwt=role=>`header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
  assert.throws(()=>configuration({...env,SUPABASE_PUBLISHABLE_KEY:jwt('service_role')}),/HEALTH_PUBLIC_KEY_REQUIRED/);
  assert.throws(()=>configuration({...env,SUPABASE_PUBLISHABLE_KEY:'sb_secret_12345678901234567890'}),/HEALTH_PUBLIC_KEY_REQUIRED/);
  assert.equal(configuration({...env,SUPABASE_PUBLISHABLE_KEY:jwt('anon')}).source,'supabase-rest');
  r=await runHealthCheck({env:{CMS_HEALTH_URL:'https://gerzoglu.com/api/health',CMS_HEALTH_SECRET:SECRET},fetch:async()=>new Response(JSON.stringify({ok:true,mode:'cloud',database:'ok'}),{status:200})});assert.equal(r.source,'website');
});
