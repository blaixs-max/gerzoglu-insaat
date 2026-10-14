'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createProject } = require('../lib/cms-projects.cjs');
const { CmsError } = require('../lib/cms-model.cjs');

test('CMS project creation: a unique race retries the insert using a fresh suffix without requerying',async()=>{
  let reads=0;const writes=[];
  const store={
    async listSlugs(){reads++;return['yilmaz-apartmani','yilmaz-apartmani-2'];},
    async rpc(name,{p_document}){
      assert.equal(name,'cms_create_project');writes.push(p_document);
      if(writes.length===1)throw new CmsError(422,'SLUG_EXISTS','Concurrent insert');
      return{id:'new-record',draft:p_document};
    },
  };
  const result=await createProject(store,{name:'Yılmaz Apartmanı',slug:'overwrite-another-project'});
  assert.equal(reads,1);assert.deepEqual(writes.map(document=>document.slug),['yilmaz-apartmani-3','yilmaz-apartmani-4']);
  assert.equal(result.draft.legacy.detailPath,'/proje/yilmaz-apartmani-4.html');
});

test('CMS project creation: invalid names fail before querying or writing and service errors are preserved',async()=>{
  let operations=0;
  const untouched={async listSlugs(){operations++;return[];},async rpc(){operations++;}};
  await assert.rejects(createProject(untouched,{name:' ',slug:'valid-client-slug'}),error=>error.code==='VALIDATION'&&!!error.fields.name);
  assert.equal(operations,0);
  const unavailable=new CmsError(503,'UNAVAILABLE','Unavailable');
  let writes=0;
  await assert.rejects(createProject({async listSlugs(){return[];},async rpc(){writes++;throw unavailable;}},{name:'Bina'}),error=>error===unavailable);
  assert.equal(writes,1);
});

test('CMS project creation: repeated unique races stop with a recoverable error',async()=>{
  let writes=0;
  await assert.rejects(createProject({async listSlugs(){return[];},async rpc(){writes++;throw new CmsError(422,'SLUG_EXISTS','Race');}},{name:'Bina'}),error=>error.status===409&&error.code==='CREATE_RETRY');
  assert.equal(writes,12);
});
