'use strict';
const pulse=require('../api/pulse');
const unlocks=require('../api/unlocks');
function withDeadline(p,ms,label){
 let timeout;
 return Promise.race([Promise.resolve().then(()=>p),new Promise((_,reject)=>{
  timeout=setTimeout(()=>reject(Error(label+' source request timed out')),ms)
 })]).finally(()=>clearTimeout(timeout));
}
async function main(){
 const output=[];
 for(const [name,load] of [['pulse',pulse.latest],['unlocks',unlocks.latest]]){
  const start=Date.now();
  try{
   const payload=await withDeadline(load(),90000,name);
   const pass=payload.ok===true;
   const row={section:name,status:pass?'PASS':'NOT_VERIFIED',elapsedMs:Date.now()-start,
    checkedAt:payload.checkedAt||payload.generatedAt||null,
    confirmed:payload.confirmed?.length??null,reported:payload.reported?.length??null,
    articles:payload.cards?.length??null,
    checkedSources:payload.coverage?.checked??payload.coverage?.sources?.filter(x=>x.status==='available').length??null};
   output.push(row);console.log(JSON.stringify(row));
  }catch(error){
   const row={section:name,status:'SOURCE_BLOCKED',reason:String(error.message||error).slice(0,140),
    elapsedMs:Date.now()-start};
   output.push(row);console.log(JSON.stringify(row));
  }
 }
 if(output.some(x=>x.status!=='PASS'))process.exitCode=1;
 console.log('ARCY live home evidence: '+output.filter(x=>x.status==='PASS').length+'/2 sources reachable.');
}
main().catch(error=>{console.error(String(error));process.exitCode=1});
