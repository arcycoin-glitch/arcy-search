'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readJson}=require('../lib/http');
const {inspect:inspectCirculating}=require('../lib/circulating');
const {rpc}=require('../lib/eth');
const market=require('../lib/market');
const security=require('../lib/security');
const holders=require('../lib/holders');

test('upstream JSON bodies are capped and malformed responses fail closed',async()=>{
 await assert.rejects(readJson(new Response('x'.repeat(100)),10),/exceeds size limit/);
 await assert.rejects(readJson(new Response('{bad json'),100),/malformed JSON/);
 assert.deepEqual(await readJson(new Response('{"ok":true}'),100),{ok:true});
});

test('RPC 429 and 500 responses fail with safe status-only errors',async()=>{
 const originalFetch=global.fetch;
 try{
  for(const status of [429,500]){
   global.fetch=async()=>new Response('upstream detail must not leak',{status});
   await assert.rejects(rpc('eth_chainId',[]),new RegExp('Ethereum RPC HTTP '+status));
  }
 }finally{global.fetch=originalFetch}
});

test('RPC timeout aborts a pending request',async()=>{
 const originalFetch=global.fetch;
 try{
  global.fetch=async(_url,{signal})=>new Promise((_,reject)=>{
   if(signal.aborted)return reject(new DOMException('Aborted','AbortError'));
   signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
  });
  await assert.rejects(rpc('eth_blockNumber',[],{timeoutMs:5}),e=>e.name==='AbortError'||e.name==='TimeoutError');
 }finally{global.fetch=originalFetch}
});

test('RPC rejects mismatched JSON-RPC response IDs',async()=>{
 const originalFetch=global.fetch;
 try{
  global.fetch=async()=>new Response(JSON.stringify({jsonrpc:'2.0',id:-1,result:'0x1'}));
  await assert.rejects(rpc('eth_blockNumber',[]),/response identity mismatch/);
 }finally{global.fetch=originalFetch}
});

test('provider 429 failures remain null and do not leak response bodies',async()=>{
 const originalFetch=global.fetch,token='0x'+'4'.repeat(40);
 try{
  global.fetch=async()=>new Response('provider response body secret',{status:429});
  const circulation=await inspectCirculating(token,'100');
  assert.equal(circulation.value,null);
  assert.equal(circulation.dataState,'SOURCE_API_FAILED');
  assert.equal(circulation.details.includes('provider response body secret'),false);
  await assert.rejects(market.inspect(token),/HTTP 429/);
  const securityResult=await security.inspect(token);
  assert.equal(securityResult.securityStatus,'SOURCE_API_FAILED');
  assert.equal(securityResult.taxes.value,null);
  const holderResult=await holders.inspect(token,'0x1','100');
  assert.equal(holderResult.fields.holderCount.value,null);
  assert.equal(holderResult.fields.holderCount.dataState,'SOURCE_API_FAILED');
 }finally{global.fetch=originalFetch}
});

test('holder RPC reads stay at the configured concurrency bound',async()=>{
 const originalFetch=global.fetch,addresses=Array.from({length:13},(_,i)=>'0x'+String(i+1).padStart(40,'0'));
 let active=0,maxActive=0;
 try{
  global.fetch=async(_url,options)=>{
   const request=JSON.parse(options.body);
   active++;maxActive=Math.max(maxActive,active);
   await new Promise(resolve=>setTimeout(resolve,4));
   active--;
   return new Response(JSON.stringify({jsonrpc:'2.0',id:request.id,result:'0x'+'1'.padStart(64,'0')}));
  };
  const values=await holders.balancesAtBlock('0x'+'a'.repeat(40),addresses,'0x100');
  assert.equal(values.length,13);
  assert.equal(maxActive,6);
 }finally{global.fetch=originalFetch}
});

test('cached CoinGecko values report their original retrieval age',async()=>{
 const token='0x6B175474E89094C44Da98b954EedeAC495271d0F'.toLowerCase();
 const body={id:'dai',asset_platform_id:'ethereum',contract_address:token,market_data:{circulating_supply:50}};
 const originalFetch=global.fetch,originalNow=Date.now;
 let calls=0;
 try{
  global.fetch=async()=>{calls++;return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}})};
  const fresh=await inspectCirculating(token,'100');
  assert.equal(fresh.dataState,'DATA_FOUND');
  assert.equal(fresh.chainId,1);
  assert.equal(fresh.network,'ethereum');
  assert.equal(fresh.freshness.ageMs<1000,true);
  Date.now=()=>originalNow()+60_000;
  const cached=await inspectCirculating(token,'100');
  assert.equal(calls,1);
  assert.equal(cached.dataState,'DATA_FOUND');
  assert.equal(cached.freshness.ageMs>=60_000,true);
  assert.match(cached.freshness.basis,/upstream publication time may be unavailable/);
 }finally{
  global.fetch=originalFetch;
  Date.now=originalNow;
 }
});
