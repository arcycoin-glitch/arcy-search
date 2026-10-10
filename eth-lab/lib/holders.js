'use strict';
const {found,unknown,error,card}=require('./evidence');
const {rpc,ADDRESS,uint}=require('./eth');
const API='https://eth.blockscout.com/api/v2/tokens/';
const blank=(why,code='HOLDER_SNAPSHOT_NOT_VERIFIED')=>card(Object.fromEntries(['holderCount','largestWalletPct','top10Pct','top20Pct'].map(k=>[k,unknown(why,code)])),'Ethereum holder data requires explorer counts plus pinned-block balance reconciliation.');
function parseCount(payload){
 const v=payload?.token_holders_count??payload?.holders_count;
 if(typeof v==='number'&&Number.isSafeInteger(v)&&v>0)return v;
 if(typeof v==='string'&&/^[1-9]\d*$/.test(v)&&Number.isSafeInteger(Number(v)))return Number(v);
 return null;
}
function holders(rows,address){
 if(!Array.isArray(rows))return [];
 const seen=new Set(),out=[];
 for(const h of rows){
  const a=(typeof h?.address==='string'?h.address:h?.address?.hash)||h?.address_hash;
  if(!ADDRESS.test(a||''))return [];
  const norm=a.toLowerCase();
  if(seen.has(norm))return [];
  seen.add(norm);out.push(norm);
 }
 return out;
}
function percent(n,d){return Math.round(Number(n*1000000n/d))/10000}
function calculate(addresses,balances,supply,count,block,token){
 if(!Array.isArray(addresses)||addresses.length<20||addresses.length!==balances.length||!Number.isSafeInteger(count)||count<addresses.length||supply<=0n)return blank('A complete and consistent top-20 candidate list is required.');
 if(new Set(addresses).size!==addresses.length||balances.some(b=>typeof b!=='bigint'||b<0n||b>supply))return blank('Duplicate or invalid holder balance detected.','HOLDER_RECONCILIATION_FAILED');
 // A page is not proof that these are the chain-wide top holders. Sorting and
 // source ordering guarantees must be validated by the adapter.
 const sorted=balances.slice().sort((a,b)=>a>b?-1:a<b?1:0);
 const sum=n=>sorted.slice(0,n).reduce((s,v)=>s+v,0n);
 if(sum(20)>supply)return blank('Top balances exceed on-chain total supply.','HOLDER_RECONCILIATION_FAILED');
 const ev=[{source:'Blockscout candidate list + Ethereum RPC pinned balanceOf()',address:token,block,scope:'Candidate page only; non-exhaustive index ordering is not independently established.'}];
 // HolderCount is a source report, not independently verified wallet completeness.
 return card({
  holderCount:found(count,'Blockscout',[{provider:'Blockscout',contractAddress:token,scope:'Source-reported holder count; not independently reconciled.'}],'SOURCE_REPORTED'),
  largestWalletPct:unknown('Top-wallet ranking has not been proven complete.','TOP_RANKING_NOT_VERIFIED'),
  top10Pct:unknown('Chain-wide top ten not independently established.','TOP_RANKING_NOT_VERIFIED'),
  top20Pct:unknown('Chain-wide top twenty not independently established.','TOP_RANKING_NOT_VERIFIED')
 },'Explorer-reported count and pinned-block candidate reconciliation. Percentages withheld pending completeness proof.');
}
async function inspect(address,block,rawSupply){
 if(!ADDRESS.test(address))return blank('Invalid Ethereum contract address.','INVALID_ADDRESS');
 try{
  const r=await fetch(API+address.toLowerCase()+'/counters',{headers:{accept:'application/json'},signal:AbortSignal.timeout(8500)});
  if(r.status===404)return blank('Blockscout has no holder counters for this contract.','SOURCE_HAS_NO_DATA');
  if(!r.ok)throw Error('Blockscout counter HTTP '+r.status);
  const payload=await r.json(),count=parseCount(payload);
  if(!count)return blank('A positive holder count was not present in the source response.','COUNT_NOT_VERIFIED');
  const fields={
   holderCount:found(count,'Blockscout',[{provider:'Blockscout',token:address.toLowerCase(),scope:'Explorer-reported holder count, not independently indexed.'}],'SOURCE_REPORTED'),
   largestWalletPct:unknown('No verified full top-holder ranking.','TOP_RANKING_NOT_VERIFIED'),
   top10Pct:unknown('No verified full top-holder ranking.','TOP_RANKING_NOT_VERIFIED'),
   top20Pct:unknown('No verified full top-holder ranking.','TOP_RANKING_NOT_VERIFIED')
  };
  return card(fields,'Reported count only; concentration metrics need verified complete ranking.');
 }catch(e){
  const c=blank('Holder explorer failed.','SOURCE_API_FAILED');
  c.fields.holderCount=error(e,'Blockscout');return c;
 }
}
module.exports={parseCount,holders,calculate,inspect,blank};
