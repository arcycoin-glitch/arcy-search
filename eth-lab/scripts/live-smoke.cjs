'use strict';
/**
 * Live mainnet smoke test. No writes, no private keys, no swap.
 * Uses direct adapters locally; do not assume a protected Vercel preview is public.
 * Node >=22, run: npm run smoke
 */
const {inspect}=require('../lib/eth');
const {build}=require('../lib/report');
const schema=require('../schema');
const TESTS=[
 {symbol:'USDC',address:'0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'},
 {symbol:'UNI',address:'0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'},
 {symbol:'LINK',address:'0x514910771AF9Ca656af840dff83E8264EcF986CA'}
];
async function main(){
 let passed=0;
 for(const t of TESTS){
  const started=Date.now();
  try{
   const snapshot=await Promise.race([
    build(t.address),
    new Promise((_,reject)=>setTimeout(()=>reject(Error('SMOKE_TIMEOUT')),65000))
   ]);
   if(!snapshot.ok||snapshot.chainId!==1||snapshot.address!==t.address.toLowerCase())throw Error('CHAIN_IDENTITY_FAILED');
   if(snapshot.cardCount!==5||Object.keys(snapshot.cards).length!==5)throw Error('FIVE_CARD_SCHEMA_FAILED');
   for(const spec of schema){
     if(!snapshot.cards[spec.id])throw Error('MISSING_CARD_'+spec.id);
     const fields=snapshot.cards[spec.id].fields;
     if(spec.fields.length!==4||spec.fields.some(([key])=>!(key in fields)))throw Error('MISSING_FIELD_'+spec.id);
     for(const [field] of spec.fields){
       const entry=fields[field];
       if(entry.dataState!=='DATA_FOUND'&&entry.value!==null)throw Error('UNVERIFIED_VALUE_'+spec.id+'.'+field);
     }
   }
   if(snapshot.cards.supply.fields.totalSupply.dataState!=='DATA_FOUND')throw Error('ONCHAIN_SUPPLY_MISSING');
   const verified=Object.entries(snapshot.cards).map(([key,card])=>key+':'+Object.values(card.fields).filter(x=>x.dataState==='DATA_FOUND').length+'/4');
   console.log(JSON.stringify({token:t.symbol,ok:true,elapsedMs:Date.now()-started,block:snapshot.block,fields:verified}));
   passed++;
  }catch(e){
   console.error(JSON.stringify({token:t.symbol,ok:false,elapsedMs:Date.now()-started,error:String(e?.message||e).slice(0,140)}));
  }
 }
 console.log(JSON.stringify({passed,total:TESTS.length,productionReady:false}));
 if(passed!==TESTS.length)process.exitCode=1;
}
main().catch(e=>{console.error(String(e));process.exitCode=1});
