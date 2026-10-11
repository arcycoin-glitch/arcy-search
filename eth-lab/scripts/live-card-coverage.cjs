'use strict';
const {report}=require('../lib/multichain-service');
const schema=require('../schema');
const tokens=[
 {network:'arc',label:'ARCY',address:'0x73e5f588d27d6b5ec89c89c82692d1e7fecbd38b'},
 {network:'ethereum',label:'USDC',address:'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'},
 {network:'robinhood',label:'APLD',address:'0xb8dbf92f9741c9ac1c32115e78581f23509916fd'}
];
async function main(){
 const rows=[];let okay=0;
 for(const x of tokens){
  let timeout;const started=Date.now();
  try{
   const r=await Promise.race([
    report({network:x.network,address:x.address}),
    new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Source deadline')),65000)})
   ]).finally(()=>clearTimeout(timeout));
   if(r.network!==x.network||r.address!==x.address||r.cardCount!==5||
    schema.some(card=>Object.keys(r.cards[card.id].fields).length!==4))throw Error('Wrong contract/schema');
   const cards={};
   for(const card of schema){
    const fields=r.cards[card.id].fields;cards[card.id]={
      sourceBacked:Object.values(fields).filter(f=>f.dataState==='DATA_FOUND').length,
      missing:Object.entries(fields).filter(([,f])=>f.dataState!=='DATA_FOUND').map(([k,v])=>k+':'+(v.reasonCode||'NO_EVIDENCE'))
    };
   }
   const count=Object.values(cards).reduce((t,c)=>t+c.sourceBacked,0);
   const row={network:x.network,symbol:x.label,status:'PASS',verified:count,total:20,cards,elapsedMs:Date.now()-started};
   rows.push(row);okay++;console.log(JSON.stringify(row));
  }catch(e){const row={network:x.network,symbol:x.label,status:'BLOCKED',reason:String(e.message||e).slice(0,140)};rows.push(row);console.log(JSON.stringify(row))}
 }
 console.log('Live three-chain card coverage: '+okay+'/'+tokens.length+' scans, evidence values only.');
 if(okay!==tokens.length)process.exitCode=1;
}
main().catch(e=>{console.error(String(e));process.exitCode=1});
