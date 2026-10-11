'use strict';
// Arc mainnet market evidence: exact chain 5042 + exact contract only.
// Values are source-returned DEX pool coverage, NOT guaranteed exit liquidity.
const {readJson}=require('./http');
const {chain}=require('./chains');
const {safeLogoUrl}=require('./token-image');
const cfg=chain('arc'),API='https://api.dexscreener.com/latest/dex/tokens/';
const SEARCH_API='https://api.dexscreener.com/latest/dex/search/?q=';
const ADDRESS=/^0x[0-9a-f]{40}$/i;
const SEARCH=/^[\p{L}\p{N}\s.$_+\-&]{2,48}$/u;
const num=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const UNKNOWN=reason=>({value:null,status:'NOT_VERIFIED',dataState:'NOT_VERIFIED',reason,source:null,evidence:[]});
function value(v,address,scope,kind=null){
 return {value:v,status:'SOURCE_REPORTED',dataState:'DATA_FOUND',chainId:cfg.chainId,network:cfg.id,
  source:'DexScreener',evidence:[{chainId:cfg.chainId,network:cfg.id,address,scope,provider:'DexScreener'}],
  ...(kind?{kind}:{})};
}
function parseMarket(pairs,address){
 if(!ADDRESS.test(address))throw Error('Invalid Arc address');
 const seen=new Set(),matched=[];
 for(const p of Array.isArray(pairs)?pairs.slice(0,400):[]){
  if(p?.chainId!=='arc')continue;
  if(![p.baseToken?.address,p.quoteToken?.address].some(a=>String(a||'').toLowerCase()===address))continue;
  const pair=String(p.pairAddress||'').toLowerCase();
  if(!/^0x(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(pair)||seen.has(pair))continue;
  seen.add(pair);matched.push(p);
 }
 matched.sort((a,b)=>(num(b.liquidity?.usd)?b.liquidity.usd:0)-(num(a.liquidity?.usd)?a.liquidity.usd:0));
 const scope='Source-returned Arc mainnet contract-matched DEX pairs only. Incomplete pool coverage; figures do not guarantee exits without slippage.';
 const sum=fn=>matched.length&&matched.every(p=>num(fn(p)))?matched.reduce((n,p)=>n+fn(p),0):null;
 const liquidity=sum(p=>p.liquidity?.usd),volume=sum(p=>p.volume?.h24);
 const dexes=new Set(matched.map(p=>typeof p.dexId==='string'?p.dexId:'').filter(Boolean));
 const primary=matched.find(p=>String(p.baseToken?.address||'').toLowerCase()===address&&
  typeof p.priceUsd==='string'&&/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(p.priceUsd)&&Number(p.priceUsd)>0);
 const price=primary?primary.priceUsd:null;
 const cap=primary&&num(primary.marketCap)&&primary.marketCap>0?primary.marketCap:null;
 const fdv=primary&&num(primary.fdv)&&primary.fdv>0?primary.fdv:null;
 const change=primary?.priceChange?.h24;
 const found=(v,reason,kind)=>v===null?UNKNOWN(reason):value(v,address,scope,kind);
 return {
  liquidityUsd:found(liquidity,'Liquidity was not reported for all exact Arc pairs.'),
  volume24h:found(volume,'Source did not provide comparable 24H volumes for all exact Arc pairs.'),
  dexPairCount:found(matched.length&&dexes.size?dexes.size+' DEX · '+matched.length+' pairs':null,'No exact Arc market pairs returned.'),
  lpStatus:UNKNOWN('Liquidity alone does not prove LP lock or ownership; check official LP contracts.'),
  priceUsd:found(price,'No valid base-token USD price reported for the selected Arc contract.'),
  valuation:cap!==null?found(cap,'','MARKET_CAP'):found(fdv,'Market cap and FDV unavailable.',fdv===null?null:'FDV'),
  change24h:found(typeof change==='number'&&Number.isFinite(change)?change:null,'No base-token 24-hour percentage available.')
 };
}
async function inspect(address){
 if(!ADDRESS.test(address))throw Error('Invalid Arc address');
 const res=await fetch(API+address.toLowerCase(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(8500)});
 if(!res.ok)throw Error('Arc market source HTTP '+res.status);
 const body=await readJson(res,2*1024*1024);
 if(!body||typeof body!=='object'||!Object.hasOwn(body,'pairs')||
  body.pairs!==null&&!Array.isArray(body.pairs))throw Error('Invalid Arc market source');
 return parseMarket(body.pairs||[],address.toLowerCase());
}
function parseSearch(pairs,rawQuery){
 if(typeof rawQuery!=='string'||!SEARCH.test(rawQuery.trim()))return [];
 const q=rawQuery.trim().toLowerCase(),entries=new Map();
 for(const pair of Array.isArray(pairs)?pairs.slice(0,400):[]){
  if(pair?.chainId!=='arc')continue;
  for(const item of [pair.baseToken,pair.quoteToken]){
   const addr=String(item?.address||'').toLowerCase();
   if(!ADDRESS.test(addr))continue;
   const name=String(item.name||'').slice(0,90),symbol=String(item.symbol||'').slice(0,30);
   const n=name.toLowerCase(),sym=symbol.toLowerCase();
   if(!n.includes(q)&&!sym.includes(q))continue;
   const relevance=sym===q?0:n===q?1:sym.startsWith(q)?2:n.startsWith(q)?3:4;
   const liquidity=num(pair.liquidity?.usd)?pair.liquidity.usd:0;
   const logoUrl=item===pair.baseToken?safeLogoUrl(pair.info?.imageUrl):null;
   const old=entries.get(addr);
   if(!old||relevance<old.relevance||relevance===old.relevance&&liquidity>old.liquidity)
    entries.set(addr,{address:addr,name,symbol,chainId:5042,network:'arc',source:'DexScreener',
     identityVerified:false,registryMatched:false,logoUrl:logoUrl||old?.logoUrl||null,relevance,liquidity});
  }
 }
 return [...entries.values()].sort((a,b)=>a.relevance-b.relevance||b.liquidity-a.liquidity)
  .slice(0,12).map(({address,name,symbol,chainId,network,source,identityVerified,registryMatched,logoUrl})=>
   ({address,name,symbol,chainId,network,source,identityVerified,registryMatched,logoUrl}));
}
async function discover(query){
 if(typeof query!=='string'||!SEARCH.test(query.trim()))throw Error('Invalid Arc name search');
 const response=await fetch(SEARCH_API+encodeURIComponent(query.trim()),{
  headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Arc DexScreener discovery HTTP '+response.status);
 const body=await readJson(response,2*1024*1024);
 if(!body||typeof body!=='object'||(body.pairs!==null&&!Array.isArray(body.pairs)))
  throw Error('Invalid Arc token discovery');
 return parseSearch(body.pairs||[],query);
}
module.exports={parseMarket,parseSearch,inspect,discover};
