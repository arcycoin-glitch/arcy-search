'use strict';
const assert=require('node:assert/strict');
const {discover,report}=require('../lib/multichain-service');
const {fetchCount}=require('../lib/arc-holder-count');
const {safeLogoUrl}=require('../lib/token-image');
const candidates=[
 {network:'arc',query:'ARCY',contract:'0x73e5f588d27d6b5ec89c89c82692d1e7fecbd38b'},
 {network:'ethereum',query:'USDC',contract:'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'},
 {network:'robinhood',query:'APLD',contract:'0xb8dbf92f9741c9ac1c32115e78581f23509916fd'}
];
async function within(promise,ms,label){
 let timer;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' timed out')),ms)})])}
 finally{clearTimeout(timer)}
}
async function run(){
 let found=0,rich=0,logos=0;
 for(const example of candidates){
  const t=Date.now();
  try{
   const response=await within(discover({network:example.network,query:example.query}),35000,example.network);
   assert.equal(response.network,example.network);
   assert.ok(response.matches.every(x=>x.network===example.network&&
    x.chainId===response.chainId),'Cross-chain token candidate');
   const hit=response.matches.find(x=>x.address===example.contract);
   const item={network:example.network,query:example.query,status:hit?'FOUND':'NO_MATCH',
    candidates:response.matches.length,address:example.contract,
    logo:!!safeLogoUrl(hit?.logoUrl),logoSource:hit?.logoSource||hit?.source||null,
    identity:hit?.identity?.status||null,elapsedMs:Date.now()-t};
   if(hit){found++;if(item.logo)logos++}
   if(example.network==='arc'){
    const count=await within(fetchCount(example.contract),12000,'Arc explorer holder count');
    item.holderCount=count?.value??null;
    item.holderCountStatus=count?.status||'NOT_VERIFIED';
    if(count)rich++;
   }
   console.log(JSON.stringify(item));
  }catch(e){console.log(JSON.stringify({network:example.network,query:example.query,status:'BLOCKED',
    error:String(e.message||e).slice(0,150),elapsedMs:Date.now()-t}))}
 }
 console.log(JSON.stringify({searches:found+'/'+candidates.length,logosFound:logos,
  arcHolderCountVerified:rich>0,liveReady:false,
  warning:'Provider source data is not proof of token issuer identity.'}));
 if(found!==candidates.length)process.exitCode=1;
}
run().catch(e=>{console.error(String(e));process.exitCode=1});
