'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const report=require('../api/report');
const token=require('../api/token');
const health=require('../api/health');
const VALID='0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
function response(){
 const headers={};
 return {headers,statusCode:200,body:null,setHeader(k,v){headers[k.toLowerCase()]=v;return this},
 status(n){this.statusCode=n;return this},json(v){this.body=v;return this}};
}
for(const [path,handler] of [['report',report],['token',token],['health',health]]){
 test(path+' only permits GET',async()=>{
  const res=response();
  await handler({method:'POST',query:{address:VALID}},res);
  assert.equal(res.statusCode,405);
  assert.equal(res.body.ok,false);
  assert.match(res.headers['content-type'],/application\/json/);
  assert.equal(res.headers['cache-control'],'no-store');
  assert.equal(res.headers['access-control-allow-origin'],undefined);
 });
}
for(const [path,handler] of [['report',report],['token',token]]){
 test(path+' rejects missing and malformed contract',async()=>{
  for(const address of ['',undefined,'0xabc','0x'+'x'.repeat(40),'0x'+'a'.repeat(41),'0x'+'a'.repeat(100000)]){
   const res=response();
   await handler({method:'GET',query:{address}},res);
   assert.equal(res.statusCode,400);
   assert.equal(res.body.ok,false);
  }
 });
}
for(const [path,handler] of [['report',report],['token',token]]){
 test(path+' rejects unexpected and duplicate query shapes',async()=>{
  for(const query of [{address:VALID,extra:'x'},{address:[VALID,VALID]},['address',VALID]]){
   const res=response();
   await handler({method:'GET',query},res);
   assert.equal(res.statusCode,400);
   assert.equal(res.body.ok,false);
  }
 });
}
test('health does not claim production readiness',()=>{
 const res=response();
 health({method:'GET',query:{}},res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.readyForProduction,false);
 assert.equal(res.body.expectedCards,5);
 assert.equal(res.body.expectedMetrics,20);
});
