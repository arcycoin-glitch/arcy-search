'use strict';
// READ-ONLY live Robinhood mainnet acceptance; no wallet, private key or tx.
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {report,discover,token}=require('../lib/multichain-service');
const robinhood=require('../lib/robinhood-adapter');
const assets=require('../lib/robinhood-assets');
const {rpc}=require('../lib/robinhood-rpc');
const {verifyChainId}=require('../lib/chains');
const schema=require('../schema');
const P='0x1cdad396db64bda184d5182a97dd9b3c62100b7d';
const APLD='0xb8dbf92f9741c9ac1c32115e78581f23509916fd';
let stage='Official Stock Token full report';
async function watch(label,fn,timeout=65000){
 let timer;const start=Date.now();
 try{
  const value=await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{
   timer=setTimeout(()=>reject(Error(label+' exceeded watchdog')),timeout)})]);
  return {value,elapsedMs:Date.now()-start};
 }finally{clearTimeout(timer)}
}
async function main(){
 const results=[];
 const stock=await watch('Official Stock Token full report',()=>report({network:'robinhood',address:P}));
 const r=stock.value;
 assert.equal(r.ok,true);assert.equal(r.chainId,4663);assert.equal(r.network,'robinhood');
 assert.equal(r.address,P);assert.match(r.block,/^0x[0-9a-f]+$/i);
 assert.equal(r.tokenIdentity.status,'REGISTRY_MATCHED');
 assert.equal(r.tokenIdentity.source,'Robinhood official asset registry');
 assert.equal(r.tokenIdentity.type,'STOCK_TOKEN');
 assert.deepEqual(Object.keys(r.cards),schema.map(x=>x.id));
 const fields=Object.entries(r.cards).flatMap(([card,c])=>Object.entries(c.fields).map(([key,v])=>({card,key,...v})));
 assert.equal(fields.length,20);
 assert.ok(fields.every(f=>f.value===null||f.chainId===4663&&f.network==='robinhood'));
 assert.equal(r.cards.supply.fields.totalSupply.dataState,'DATA_FOUND');
 assert.equal(r.cards.supply.fields.totalSupply.status,'ON_CHAIN');
 const verified=fields.filter(f=>f.value!==null);
 results.push({case:'Official Everpure Stock Token',ok:true,chainId:r.chainId,address:r.address,
  block:r.block,elapsedMs:stock.elapsedMs,verified:verified.map(f=>f.card+'.'+f.key),
  missing:fields.filter(f=>f.value===null).map(f=>f.card+'.'+f.key)});
 stage='APLD Stock Token official discovery';
 const lookup=await watch('APLD Stock Token official discovery',()=>discover({network:'robinhood',query:'APLD'}));
 assert.equal(lookup.value.chainId,4663);
 assert.ok(lookup.value.matches.some(item=>item.address===APLD&&item.registryMatched===true));
 results.push({case:'APLD official contract discovery',ok:true,elapsedMs:lookup.elapsedMs});
 stage='Direct Robinhood ERC-20 token endpoint';
 const simple=await watch('Direct Robinhood ERC-20 token endpoint',()=>token({network:'robinhood',address:P}));
 assert.equal(simple.value.ok,true);assert.equal(simple.value.chainId,4663);
 assert.equal(simple.value.fields.totalSupply.dataState,'DATA_FOUND');
 results.push({case:'Direct pinned mainnet token read',ok:true,elapsedMs:simple.elapsedMs});
 assert.throws(()=>verifyChainId('robinhood','0xb626'),/mismatch/); // 46630 is testnet
 results.push({case:'Wrong chain rejects 46630',ok:true});
 await assert.rejects(report({network:'robinhood',address:'0x123'}),/Invalid EVM token address/);
 results.push({case:'Malformed address rejected',ok:true});
 stage='Randomized nonexistent contract';
 let nonexistent=null;
 try{
  for(let attempt=0;attempt<5;attempt++){
   const candidate='0x'+randomBytes(20).toString('hex');
   if(await rpc('eth_getCode',[candidate,'latest'])==='0x'){nonexistent=candidate;break}
  }
  assert.ok(nonexistent,'Could not find a random address with no deployed code');
  await assert.rejects(robinhood.inspectToken({address:nonexistent}),/No verified token contract/);
  results.push({case:'Randomized nonexistent mainnet address',ok:true,address:nonexistent});
 }catch(error){
  const detail=String(error.message||error);
  const status=/Robinhood RPC HTTP (?:403|429|5\d\d)|fetch failed|TimeoutError|AbortError/.test(detail)?'BLOCKED':'FAIL';
  results.push({case:'Randomized nonexistent mainnet address',ok:false,status,error:detail.slice(0,140)});
 }
 stage='Same-symbol registry clone check';
 const registry=await robinhood.officialAssets();
 const fake='0x'+randomBytes(20).toString('hex');
 const sameSymbolCandidate={name:'Applied Digital clone',symbol:'APLD',address:fake,chainId:4663,network:'robinhood'};
 assert.equal(assets.byContract(registry,sameSymbolCandidate.address),null);
 results.push({case:'Synthetic same-symbol candidate is not registry matched',ok:true,symbol:sameSymbolCandidate.symbol,address:sameSymbolCandidate.address});
 stage='Injected provider fault checks';
 const originalFetch=global.fetch;
 try{
  global.fetch=async()=>new Response('provider detail must not leak',{status:429});
  await assert.rejects(rpc('eth_blockNumber',[]),/Robinhood RPC HTTP 429/);
  results.push({case:'Injected Robinhood RPC HTTP 429 fails closed',ok:true});
  global.fetch=async(_url,{signal})=>new Promise((_,reject)=>{
   if(signal.aborted)return reject(new DOMException('Aborted','AbortError'));
   signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
  });
  await assert.rejects(rpc('eth_blockNumber',[],{timeoutMs:5}),e=>e.name==='AbortError'||e.name==='TimeoutError');
  results.push({case:'Injected Robinhood RPC timeout aborts',ok:true});
  global.fetch=async()=>new Response('{malformed',{status:200});
  await assert.rejects(rpc('eth_blockNumber',[]),/malformed JSON/);
  results.push({case:'Injected malformed Robinhood RPC JSON fails closed',ok:true});
 }finally{global.fetch=originalFetch}
 const passed=results.filter(x=>x.ok).length,blocked=results.filter(x=>x.status==='BLOCKED').length;
 const failed=results.filter(x=>!x.ok&&x.status!=='BLOCKED').length;
 console.log(JSON.stringify({passed,total:results.length,blocked,failed,network:'Robinhood Chain',
  chainId:4663,readyForPublicRelease:false,results},null,2));
 if(blocked||failed)process.exitCode=1;
}
main().catch(e=>{console.error(JSON.stringify({passed:false,stage,error:String(e.message||e).slice(0,200)}));process.exitCode=1});
