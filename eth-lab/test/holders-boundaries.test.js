'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {inspect}=require('../lib/holders');
const token='0x'+'f'.repeat(40),block='0x100';
const address=i=>'0x'+BigInt(i).toString(16).padStart(40,'0');
const word=n=>'0x'+BigInt(n).toString(16).padStart(64,'0');

async function runCount(count,{pageCount=count,failRpc=false}={}){
 const originalFetch=global.fetch;
 const ranked=count>30;
 const values=new Map();
 const n=ranked?21:pageCount;
 const items=Array.from({length:n},(_,i)=>{
  const holder=address(i+1),value=ranked?1:1;
  values.set(holder,value);
  return {address:{hash:holder},value:String(value)};
 });
 try{
  global.fetch=async(input,options={})=>{
   const url=String(input);
   if(url.startsWith('https://eth.blockscout.com/')){
    if(url.endsWith('/counters'))return new Response(JSON.stringify({token_holders_count:count}));
    return new Response(JSON.stringify({items,next_page_params:null}));
   }
   if(failRpc)return new Response('rpc down',{status:500});
   const request=JSON.parse(options.body);
   const holder='0x'+request.params[0].data.slice(-40).toLowerCase();
   return new Response(JSON.stringify({jsonrpc:'2.0',id:request.id,result:word(values.get(holder)||1)}));
  };
  return await inspect(token,block,String(ranked?100000:count));
 }finally{global.fetch=originalFetch}
}

test('holder boundaries: zero and fewer than twenty never invent concentration',async()=>{
 const zero=await runCount(0);
 assert.equal(zero.fields.holderCount.value,null);
 const small=await runCount(10);
 assert.equal(small.fields.holderCount.value,10);
 for(const key of ['largestWalletPct','top10Pct','top20Pct'])assert.equal(small.fields[key].value,null);
});

test('holder boundaries: 20, 21 and 30 enumerate and reconcile the full population',async()=>{
 for(const count of [20,21,30]){
  const snapshot=await runCount(count);
  assert.equal(snapshot.fields.holderCount.value,count);
  assert.equal(snapshot.fields.top20Pct.status,'RECONCILED_SNAPSHOT');
 }
});

test('holder boundary above thirty qualifies 21 tied candidates without claiming complete ranking',async()=>{
 const snapshot=await runCount(31);
 assert.equal(snapshot.fields.holderCount.status,'SOURCE_REPORTED');
 assert.equal(snapshot.fields.largestWalletPct.status,'SOURCE_REPORTED_RPC_RECONCILED');
 assert.equal(snapshot.fields.top20Pct.status,'SOURCE_REPORTED_RPC_RECONCILED');
 assert.equal(snapshot.fields.top20Pct.evidence[0].rankBoundary,'Rank 21 is positive and not greater than rank 20');
 assert.match(snapshot.fields.top20Pct.evidence[0].limitation,/not the absence of a larger unlisted wallet/);
});

test('holder partial pagination and RPC outages fail closed',async()=>{
 const partial=await runCount(20,{pageCount:19});
 assert.equal(partial.fields.holderCount.value,null);
 assert.equal(partial.fields.top10Pct.value,null);
 const failed=await runCount(31,{failRpc:true});
 assert.equal(failed.fields.holderCount.value,31);
 assert.equal(failed.fields.top10Pct.value,null);
});
