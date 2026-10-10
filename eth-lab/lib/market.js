'use strict';
const {found,unknown,card,error}=require('./evidence');
const API='https://api.dexscreener.com/latest/dex/tokens/';
const isNumber=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
function parse(pairs,token){
  const seen=new Set();
  const matching=(Array.isArray(pairs)?pairs:[]).filter(p=>{
    if(p?.chainId!=='ethereum')return false;
    if(![p.baseToken?.address,p.quoteToken?.address].some(a=>String(a||'').toLowerCase()===token))return false;
    const pair=String(p.pairAddress||'').toLowerCase();
    if(!/^0x[0-9a-f]{40}$/.test(pair)||seen.has(pair))return false;
    seen.add(pair);return true;
  });
  matching.sort((a,b)=>(b.liquidity?.usd||0)-(a.liquidity?.usd||0));
  const proof=[{provider:'DexScreener',chain:'ethereum',token,pairs:matching.map(p=>p.pairAddress),scope:'Source-returned exact-token pairs, not exhaustive chain-wide liquidity.'}];
  const numericSum=get=>matching.length&&matching.every(p=>isNumber(get(p)))?matching.reduce((sum,p)=>sum+get(p),0):null;
  const liquidity=numericSum(p=>p.liquidity?.usd);
  const volume=numericSum(p=>p.volume?.h24);
  const primary=matching[0]||null;
  const price=primary&&typeof primary.priceUsd==='string'&&Number(primary.priceUsd)>0&&Number.isFinite(Number(primary.priceUsd))?primary.priceUsd:null;
  return {
    ...card({
      liquidityUsd:liquidity===null?unknown('Complete liquidity values were not supplied for exact-matched pools.','NO_COMPLETE_POOL_LIQUIDITY'):found(liquidity,'DexScreener',proof),
      volume24h:volume===null?unknown('Complete 24h volume values were not supplied for exact-matched pools.','NO_COMPLETE_POOL_VOLUME'):found(volume,'DexScreener',proof),
      priceUsd:price===null?unknown('No verified contract-matched primary-pool price.','NO_MATCHED_PRICE'):found(price,'DexScreener',proof),
      pairCount:matching.length?found(matching.length,'DexScreener',proof):unknown('No exact Ethereum pair was returned.','NO_MATCHED_PAIRS'),
      lpLock:unknown('A pool listing or quoted liquidity does not prove LP locking or withdrawal permissions.','LP_LOCK_NOT_VERIFIED')
    },'Source-reported Ethereum pools, never a guarantee of exit liquidity.'),
    primaryPair:primary?.pairAddress||null,
    matches:matching.length
  };
}
async function inspect(address){
  const response=await fetch(API+address,{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Market API HTTP '+response.status);
  const body=await response.json();
  if(!body||!Array.isArray(body.pairs))throw Error('Invalid market API response');
  return parse(body.pairs,address.toLowerCase());
}
function failure(e){return card({
  liquidityUsd:error(e,'DexScreener'),volume24h:error(e,'DexScreener'),
  priceUsd:error(e,'DexScreener'),pairCount:error(e,'DexScreener'),
  lpLock:unknown('LP lock has not been verified.')
},'Market API unavailable; no inferred zero liquidity.');}
module.exports={parse,inspect,failure};
