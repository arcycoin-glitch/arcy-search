'use strict';
// READ-ONLY live Robinhood mainnet acceptance; no wallet, private key or tx.
const assert=require('node:assert/strict');
const {report,discover,token}=require('../lib/multichain-service');
const {verifyChainId}=require('../lib/chains');
const schema=require('../schema');
const P='0x1cdad396db64bda184d5182a97dd9b3c62100b7d';
const APLD='0xb8dbf92f9741c9ac1c32115e78581f23509916fd';
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
 const lookup=await watch('APLD Stock Token official discovery',()=>discover({network:'robinhood',query:'APLD'}));
 assert.equal(lookup.value.chainId,4663);
 assert.ok(lookup.value.matches.some(item=>item.address===APLD&&item.registryMatched===true));
 results.push({case:'APLD official contract discovery',ok:true,elapsedMs:lookup.elapsedMs});
 const simple=await watch('Direct Robinhood ERC-20 token endpoint',()=>token({network:'robinhood',address:P}));
 assert.equal(simple.value.ok,true);assert.equal(simple.value.chainId,4663);
 assert.equal(simple.value.fields.totalSupply.dataState,'DATA_FOUND');
 results.push({case:'Direct pinned mainnet token read',ok:true,elapsedMs:simple.elapsedMs});
 assert.throws(()=>verifyChainId('robinhood','0xb626'),/mismatch/); // 46630 is testnet
 results.push({case:'Wrong chain rejects 46630',ok:true});
 await assert.rejects(report({network:'robinhood',address:'0x123'}),/Invalid EVM token address/);
 results.push({case:'Malformed address rejected',ok:true});
 console.log(JSON.stringify({passed:results.length,total:results.length,network:'Robinhood Chain',
  chainId:4663,readyForPublicRelease:false,results},null,2));
}
main().catch(e=>{console.error(JSON.stringify({passed:false,error:String(e.message||e).slice(0,200)}));process.exitCode=1});
