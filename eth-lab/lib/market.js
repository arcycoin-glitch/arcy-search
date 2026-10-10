'use strict';
const {found,unknown,card,error}=require('./evidence');
const API='https://api.dexscreener.com/latest/dex/tokens/';
const numeric=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
function parse(pairs,token){
  const seen=new Set();
  const matching=(Array.isArray(pairs)?pairs:[]).filter(p=>{
    if(p?.chainId!=='ethereum')return false;
    if(![p.baseToken?.address,p.quoteToken?.address].some(x=>String(x||'').toLowerCase()===token))return false;
    const id=String(p.pairAddress||'').toLowerCase();
    if(!/^0x(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(id)||seen.has(id))return false;
    seen.add(id);return true;
  }).sort((a,b)=>(numeric(b.liquidity?.usd)?b.liquidity.usd:0)-(numeric(a.liquidity?.usd)?a.liquidity.usd:0));
  const evidence=[{source:'DexScreener',chainId:'ethereum',token,matchedPairs:matching.map(p=>p.pairAddress),scope:'Only source-returned, exact-contract Ethereum pairs; may be incomplete.'}];
  const sum=get=>matching.length&&matching.every(p=>numeric(get(p)))?matching.reduce((n,p)=>n+get(p),0):null;
  const liquid=sum(p=>p.liquidity?.usd);
  const volume=sum(p=>p.volume?.h24);
  const pool=matching[0];
  // DexScreener priceUsd and priceChange describe the base token, not the quote token.
  const baseMatches=pool&&String(pool.baseToken?.address||'').toLowerCase()===token;
  const price=baseMatches?Number(pool.priceUsd):NaN;
  const priceValue=Number.isFinite(price)&&price>0?String(pool.priceUsd):null;
  const change=baseMatches?pool.priceChange?.h24:undefined;
  const cap=baseMatches&&Number.isFinite(pool.marketCap)&&pool.marketCap>0?pool.marketCap:null;
  const fdv=baseMatches&&Number.isFinite(pool.fdv)&&pool.fdv>0?pool.fdv:null;
  const valuation=cap!==null?{value:cap,kind:'MARKET_CAP'}:fdv!==null?{value:fdv,kind:'FDV'}:null;
  const changeValid=typeof change==='number'&&Number.isFinite(change);
  const pairCount=matching.length;
  const dexCount=pairCount?new Set(matching.map(p=>p.dexId).filter(x=>typeof x==='string'&&x.length>0)).size:null;
  const pairSummary=pairCount&&dexCount?dexCount+' DEX · '+pairCount+' pairs':null;
  const missingPair=unknown('No exact-matched Ethereum market pairs returned.','NO_MATCHED_MARKET_PAIRS');
  const fields={
    liquidityUsd:liquid===null?unknown('No complete exact-pool liquidity dataset.','LIQUIDITY_NOT_VERIFIED'):found(liquid,'DexScreener',evidence),
    volume24h:volume===null?unknown('No complete exact-pool volume dataset.','VOLUME_NOT_VERIFIED'):found(volume,'DexScreener',evidence),
    dexPairCount:pairSummary===null?unknown('Exact-matched DEX and pair counts unavailable.','PAIR_COUNT_NOT_VERIFIED'):found(pairSummary,'DexScreener',evidence),
    lpStatus:unknown('Pool liquidity does not establish LP ownership, lock or withdrawal permissions.','LP_STATUS_NOT_VERIFIED'),
    priceUsd:priceValue===null?unknown('No exact base-token-matched pool price.','PRICE_NOT_VERIFIED'):found(priceValue,'DexScreener',evidence),
    valuation:valuation===null?unknown('No exact base-token-matched market cap or FDV.','VALUATION_NOT_VERIFIED'):{...found(valuation.value,'DexScreener',evidence),kind:valuation.kind},
    change24h:!changeValid?unknown('No exact base-token-matched 24h price change.','CHANGE_NOT_VERIFIED'):found(change,'DexScreener',evidence)
  };
  return {...card(fields,'Contract-matched source-reported Ethereum trading data; not proof of exit liquidity.'),primaryPair:pool?.pairAddress||null,matches:pairCount};
}
async function inspect(address){
 const response=await fetch(API+address,{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Market API HTTP '+response.status);
 const body=await response.json();
 if(!body||typeof body!=='object'||(body.pairs!==null&&!Array.isArray(body.pairs)))throw Error('Invalid market API response');
 return parse(body.pairs||[],address.toLowerCase());
}
function failure(e){
 const failed=()=>error(e,'DexScreener');
 return card({liquidityUsd:failed(),volume24h:failed(),dexPairCount:failed(),lpStatus:unknown('LP status never inferred from market listing.'),priceUsd:failed(),valuation:failed(),change24h:failed()},'Ethereum market API was unavailable.');
}
module.exports={parse,inspect,failure};
