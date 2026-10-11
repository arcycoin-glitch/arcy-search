'use strict';
/* Read-only live acceptance of exact-contract GeckoTerminal price history.
   A blocked source is reported honestly; it is not permission to synthesize charts. */
const {load}=require('../lib/price-history');
const checks=[
 {network:'arc',symbol:'ARCY',address:'0x73e5f588d27d6b5ec89c89c82692d1e7fecbd38b'},
 {network:'ethereum',symbol:'USDC',address:'0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'}
];
async function run(){
 let passed=0;
 for(const c of checks){
  const start=Date.now();
  try{
   const data=await load(c.network,c.address,{disableCache:true});
   if(!data.ok||data.address!==c.address.toLowerCase()||data.points.length<3)
    throw Error('Source-bound chart evidence mismatch');
   passed++;
   console.log(JSON.stringify({network:c.network,token:c.symbol,status:'PASS',points:data.points.length,
    pool:data.poolAddress,source:data.source,elapsedMs:Date.now()-start}));
  }catch(e){
   console.log(JSON.stringify({network:c.network,token:c.symbol,status:'BLOCKED',
    reason:String(e.message||e).slice(0,130),elapsedMs:Date.now()-start}));
  }
 }
 console.log('GeckoTerminal exact-token live chart: '+passed+'/'+checks.length+' verified');
 if(passed!==checks.length)process.exitCode=1;
}
run().catch(e=>{console.error(String(e?.message||e));process.exitCode=1});
