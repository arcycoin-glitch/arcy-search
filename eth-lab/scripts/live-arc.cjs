'use strict';
// Public-mainnet read-only acceptance: NO transactions, keys or writes.
// Run separately from fixture-driven unit CI to distinguish provider blocks.
const assert=require('node:assert/strict');
const {report}=require('../lib/multichain-service');
const sample=[
 {label:'ARCY (existing website fixture)',address:'0x73e5f588d27d6b5ec89c89c82692d1e7fecbd38b'},
 {label:'Arc USDC predeploy',address:'0x3600000000000000000000000000000000000000'}
];
async function main(){
 const rows=[];let unsuccessful=0;
 for(const item of sample){
  const t=Date.now(),record={label:item.label,address:item.address,network:'arc',chainId:5042};
  try{
   let watchdog;
   const result=await Promise.race([
    report({network:'arc',address:item.address}),
    new Promise((_,reject)=>{watchdog=setTimeout(()=>reject(Error('Mainnet request deadline exceeded')),65000)})
   ]).finally(()=>clearTimeout(watchdog));
   assert.equal(result.ok,true);
   assert.equal(result.network,'arc');
   assert.equal(result.chainId,5042);
   assert.equal(result.address,item.address);
   assert.equal(result.cardCount,5);
   const values=Object.entries(result.cards).flatMap(([card,output])=>
    Object.entries(output.fields).map(([key,field])=>({card,key,status:field.dataState,
     source:field.source||null,kind:field.kind||null,verified:field.value!==null})));
   assert.equal(values.length,20);
   assert.ok(values.filter(x=>x.verified).every(x=>x.status==='DATA_FOUND'&&x.source),
    'A non-null value must have source evidence');
   assert.ok(values.filter(x=>x.verified).length>=1,'Expected at least one on-chain field');
   Object.assign(record,{status:'PASS',symbol:result.token?.symbol||null,
    block:result.block,verifiedFields:values.filter(x=>x.verified).length,
    missingFields:values.filter(x=>!x.verified).map(x=>x.card+'.'+x.key),
    fields:values,elapsedMs:Date.now()-t});
  }catch(e){unsuccessful++;Object.assign(record,{status:'BLOCKED',reason:String(e.message||e).slice(0,160),elapsedMs:Date.now()-t})}
  rows.push(record);
  console.log(JSON.stringify(record));
 }
 console.log('ARC mainnet acceptance result: '+rows.filter(x=>x.status==='PASS').length+'/'+rows.length+' successful');
 if(unsuccessful)process.exitCode=1;
}
main().catch(e=>{console.error(String(e?.message||e));process.exitCode=1});
