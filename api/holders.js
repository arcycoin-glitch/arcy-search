const c=require('../lib/core');
module.exports=c.route(async a=>{
  const result={status:'NOT_VERIFIED',source:'Arcscan',holderCount:null,largestWalletPct:null,top10Pct:null,top20Pct:null,methodology:'Exclude only zero and 0xdead. Concentration denominator is total supply.',reason:'Holder service unavailable or schema/coverage not validated.'};
  // Do not promote an undocumented payload into facts. The public endpoint currently returns HTTP 530.
  try{const chain=await c.json('https://api.arc-scan.org/v1/chain');if(chain.chain_id!==c.CHAIN||chain.capabilities?.holder_index!==true)return result;
    await c.json('https://api.arc-scan.org/v1/tokens/'+a+'/holders?limit=22');
    return {...result,reason:'Service reachable; response schema, ranking and full-history coverage still require validation.'};
  }catch{return result;}
});
