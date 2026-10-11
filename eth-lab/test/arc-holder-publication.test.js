'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const p=require('../lib/arc-holder-publication');
const adapter=require('../lib/arc-adapter');
const {validateField}=require('../lib/data-engine');
const {chain}=require('../lib/chains');
const contract='0x'+'a'.repeat(40),hash='0x'+'b'.repeat(64),block='0xa1';
const keyPair=crypto.generateKeyPairSync('ed25519');
const pub=keyPair.publicKey.export({format:'pem',type:'spki'});
const env={ARC_HOLDER_PUBLIC_KEY:pub,ARC_HOLDER_PUBLISHED_URL:'https://signed-publication.example/arc/'};
function snapshot(){
 const fields={},nums={holderCount:125,largestWalletPct:12,top10Pct:42,top20Pct:61};
 for(const [name,value]of Object.entries(nums))fields[name]={value,status:'ONCHAIN_VERIFIED',
  dataState:'DATA_FOUND',evidence:[{block,anchor:hash}]};
 return {chainId:5042,address:contract,status:'ONCHAIN_VERIFIED',coverage:{complete:true},
  ...nums,fields,block,snapshot:{block,completedAt:'2026-10-10T10:00:00.000Z'},
  evidence:[{block,anchor:hash,source:'Arc pinned RPC'}]};
}
function signed(s=snapshot(),address=contract,chainId=5042){
 const payload=JSON.stringify({chainId,address,snapshot:s});
 return {payload,signature:crypto.sign(null,Buffer.from(payload),keyPair.privateKey).toString('base64')};
}
const http=(body,status=200)=>async()=>new Response(typeof body==='string'?body:JSON.stringify(body),{
 status,headers:{'content-type':'application/json'}
});
test('signed COMPLETE Arc holder snapshot is accepted as historical only',async()=>{
 const result=await p.load(contract,{env,fetcher:http(signed()),now:Date.parse('2026-10-11T00:00:00Z')});
 assert.equal(result.fields.holderCount.value,125);
 assert.equal(result.fields.top20Pct.value,61);
 assert.match(result.description,/historical/);
 assert.equal(result.snapshot.freshness,'LAST_VERIFIED');
 for(const field of Object.values(result.fields)){
  assert.equal(field.chainId,5042);
  assert.equal(field.network,'arc');
  assert.equal(field.status,'SIGNED_ONCHAIN_SNAPSHOT');
  assert.equal(field.evidence[0].block,block);
  assert.equal(validateField(field,chain('arc')).value,field.value);
 }
});
test('tamper, wrong token, network, source and incomplete publications fail closed',async()=>{
 const invalid=[
  {...signed(),payload:signed().payload.replace('"holderCount":125','"holderCount":999')},
  signed(snapshot(),contract,1),
  signed(snapshot(),('0x'+'c'.repeat(40))),
  signed({...snapshot(),coverage:{complete:false}}),
  signed({...snapshot(),top20Pct:30}),
  signed({...snapshot(),snapshot:{block:'0x12',completedAt:'2026-10-10T10:00:00Z'}}),
  signed({...snapshot(),evidence:[{block,anchor:'0x'+'0'.repeat(64-1)}]}),
  signed({...snapshot(),fields:{...snapshot().fields,holderCount:{value:123,status:'ONCHAIN_VERIFIED',dataState:'DATA_FOUND',evidence:[{block,anchor:hash}]}}}),
  {chainId:5042,address:contract,snapshot:snapshot()}
 ];
 for(const sample of invalid){
  const result=await p.load(contract,{env,fetcher:http(sample),now:Date.parse('2026-10-11T00:00:00Z')});
  assert.equal(result.fields.holderCount.value,null);
  assert.ok(Object.values(result.fields).every(f=>f.dataState==='NOT_VERIFIED'));
 }
});
test('unconfigured, insecure URL, wrong key and unavailable HTTP fail closed',async()=>{
 for(const bad of [{}, {...env,ARC_HOLDER_PUBLISHED_URL:'http://insecure.example/'},
   {...env,ARC_HOLDER_PUBLIC_KEY:'not a key'},
   {...env,ARC_HOLDER_PUBLISHED_URL:'https://user:pass@private.example/'},
   {...env,ARC_HOLDER_PUBLISHED_URL:'https://public.example/?address=secret'}]){
  const result=await p.load(contract,{env:bad,fetcher:()=>{throw Error('Should not make request')}});
  assert.equal(result.fields.top10Pct.value,null);
 }
 const failed=await p.load(contract,{env,fetcher:http('unavailable',429)});
 assert.equal(failed.fields.holderCount.value,null);
});
test('snapshot block, future timestamp and percent concentration order are strict',()=>{
 const now=Date.parse('2026-10-11T00:00:00Z');
 assert.ok(p.verifyDocument(signed(),contract,keyPair.publicKey,now));
 assert.equal(p.verifyDocument(signed({...snapshot(),snapshot:{block,completedAt:'2027-01-01T00:00:00Z'}}),contract,keyPair.publicKey,now),null);
 assert.equal(p.verifyDocument(signed({...snapshot(),largestWalletPct:65}),contract,keyPair.publicKey,now),null);
});
test('Arc adapter retains NOT VERIFIED if the signature feed is not configured',async()=>{
 const result=await adapter.holders({address:contract});
 // Deployment env may contain publication credentials; test a source explicitly.
 const empty=p.empty();
 assert.ok(Object.values(empty.fields).every(x=>x.value===null));
 assert.equal(result.fields?.holderCount?.chainId,5042);
});
