'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createEngine,validateField}=require('../lib/data-engine');
const schema=require('../schema');
const A='0x1234567890123456789012345678901234567890';
const B='0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
function base(cfg,address){return {chainId:cfg.chainId,network:cfg.id,address,block:'0x1234',token:{name:'Example',symbol:'EX'}}}
function found(cfg,value=12){return {dataState:'DATA_FOUND',status:'SOURCE_REPORTED',chainId:cfg.chainId,network:cfg.id,value,source:'Example provider',evidence:[{chainId:cfg.chainId,contract:A}]}}
function adapter({confuseChain=false,withStock=false}={}){
 return {
  async inspectToken({cfg,address}){return base(cfg,address)},
  async inspectCard({cfg,cardId}){
   if(cardId==='activity')throw Error('Market API temporarily unavailable');
   const [key]=schema.find(x=>x.id===cardId).fields[0];
   return {description:'Valid provider data',fields:{[key]:confuseChain?{...found(cfg),network:'ethereum',chainId:1}:found(cfg)}};
  },
  async inspectStock({cfg,address}){
   return withStock?{chainId:cfg.chainId,address,registryMatched:true,source:'Robinhood official asset registry',symbol:'EX',multiplier:'0.5'}:null;
  },
  async discover({cfg}){
   return [{chainId:cfg.chainId,network:cfg.id,address:A,symbol:'EX',name:'Example',source:'DexScreener'},
    {chainId:cfg.chainId===1?4663:1,network:cfg.id,address:B,symbol:'EX',name:'Wrong Chain'},
    {chainId:cfg.chainId,network:cfg.id,address:A.toUpperCase(),symbol:'EX',name:'Duplicate'}];
  }
 };
}
test('all chain reports keep exactly the five-card / twenty-field schema',async()=>{
 const e=createEngine({ethereum:adapter(),robinhood:adapter({withStock:true})});
 for(const name of ['ethereum','robinhood']){
  const report=await e.report({network:name,address:A});
  assert.equal(report.network,name);
  assert.equal(report.chainId,name==='ethereum'?1:4663);
  assert.equal(report.cardCount,5);
  assert.deepEqual(Object.keys(report.cards),schema.map(x=>x.id));
  assert.equal(Object.values(report.cards).flatMap(x=>Object.keys(x.fields)).length,20);
  assert.equal(report.cards.supply.fields.totalSupply.value,12);
  assert.equal(report.cards.activity.fields.priceUsd.value,null);
  assert.equal(report.cards.liquidity.fields.volume24h.value,null);
  assert.equal(report.cards.activity.status,'NOT_VERIFIED');
  assert.equal(report.tokenIdentity.status,name==='robinhood'?'REGISTRY_MATCHED':'NOT_VERIFIED');
 }
});
test('wrong-chain field is rejected, not copied into Robinhood report',async()=>{
 const report=await createEngine({robinhood:adapter({confuseChain:true})}).report({network:'robinhood',address:A});
 assert.equal(report.cards.supply.fields.totalSupply.value,null);
 assert.equal(report.cards.supply.fields.totalSupply.reasonCode,'SOURCE_IDENTITY_MISMATCH');
});
test('wrong-chain base rejects entire token report',async()=>{
 const bad={...adapter(),inspectToken:async({cfg,address})=>({...base(cfg,address),chainId:1})};
 await assert.rejects(createEngine({robinhood:bad}).report({network:'robinhood',address:A}),/identity mismatch/);
});
test('malformed network, malformed contract or missing adapter always rejects',async()=>{
 const e=createEngine({ethereum:adapter()});
 await assert.rejects(e.report({network:'robinhood',address:A}),/unavailable/);
 await assert.rejects(e.report({network:'ethereum',address:'not-an-address'}),/Invalid EVM/);
 await assert.rejects(e.report({network:'bsc',address:A}),/Unsupported network/);
});
test('missing evidence never becomes zero',()=>{
 const field=validateField({dataState:'NOT_VERIFIED',value:0,reason:'unknown'}, {id:'robinhood',chainId:4663});
 assert.equal(field.value,null);
 assert.equal(field.network,'robinhood');
});
test('discovery separates networks, removes duplicates and does not auto-select',async()=>{
 const engine=createEngine({ethereum:adapter(),robinhood:adapter()});
 const r=await engine.discover({network:'robinhood',query:'Example'});
 assert.equal(r.candidates.length,1);
 assert.equal(r.candidates[0].address,A);
 assert.equal(r.candidates[0].chainId,4663);
 assert.equal(r.candidates[0].registryMatched,false);
 assert.ok(r.warning.includes('not proof'));
});
test('unmatched stock-ticker clone is never official registry matched',async()=>{
 const e=createEngine({robinhood:{...adapter(),inspectStock:async()=>({address:B,chainId:4663,registryMatched:true,source:'Robinhood official asset registry'})}});
 const r=await e.report({network:'robinhood',address:A});
 assert.equal(r.tokenIdentity.status,'NOT_VERIFIED');
});
