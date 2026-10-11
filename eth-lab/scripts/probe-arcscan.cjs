'use strict';
// Development-only probe: report safe shape, no token credentials, no copied PII.
// Used to determine if Arcscan's token concentration API is usable for onchain evidence.
const addresses=[
 ['ARCY','0x73e5f588d27d6b5ec89c89c82692d1e7fecbd38b'],
 ['Arc USDC','0x3600000000000000000000000000000000000000']
];
(async()=>{
 let successes=0;
 for(const [name,address] of addresses){
  for(const kind of ['','/concentration','/logo']){
   const url='https://api.arc-scan.org/v1/tokens/'+address+kind;
   try{
    const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(7500)});
    const body=await response.text();let data;
    try{data=JSON.parse(body)}catch{data=null}
    const shape=Array.isArray(data)?'array':data&&typeof data==='object'?'object':typeof data;
    const keys=shape==='object'?Object.keys(data).slice(0,30):[];
    const fields=shape==='object'?Object.fromEntries(keys.map(k=>{
      const v=data[k];
      return [k,{type:Array.isArray(v)?'array':typeof v,
       scalar:(typeof v==='string'||typeof v==='number'||typeof v==='boolean')?String(v).slice(0,115):undefined,
       keys:v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).slice(0,20):undefined}]
    })):null;
    if(response.ok)successes++;
    console.log(JSON.stringify({token:name,endpoint:kind||'/token',status:response.status,
      shape,keys,fields,textSnippet:!data?body.slice(0,70):undefined}));
   }catch(e){console.log(JSON.stringify({token:name,endpoint:kind||'/token',status:'FAILED',reason:String(e.message||e).slice(0,110)}))}
  }
 }
 console.log('Public Arcscan probe reachable sources: '+successes+'/6');
})();
