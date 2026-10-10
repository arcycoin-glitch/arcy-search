'use strict';
const {readJson}=require('./http');
const SOURCE='https://api.dexscreener.com/latest/dex/search/';
const ADDRESS=/^0x[0-9a-f]{40}$/i;
const SEARCH=/^[\p{L}\p{N}\s.$_+\-&]{2,48}$/u;
function normalizeQuery(raw){
 if(typeof raw!=='string')return null;
 const q=raw.normalize('NFKC').trim().replace(/\s+/g,' ');
 return SEARCH.test(q)&&!ADDRESS.test(q)?q:null;
}
function parse(pairs,rawQuery){
 const query=normalizeQuery(rawQuery);
 if(!query)return [];
 const q=query.toLocaleLowerCase('en-US'),found=new Map();
 for(const pair of Array.isArray(pairs)?pairs.slice(0,400):[]){
  if(pair?.chainId!=='ethereum')continue;
  for(const token of [pair.baseToken,pair.quoteToken]){
   if(!token||typeof token!=='object')continue;
   const address=String(token.address||'').trim().toLowerCase();
   if(!ADDRESS.test(address))continue;
   const name=String(token.name||'').trim().slice(0,90),symbol=String(token.symbol||'').trim().slice(0,30);
   if(!name&&!symbol)continue;
   const lowerName=name.toLocaleLowerCase('en-US'),lowerSymbol=symbol.toLocaleLowerCase('en-US');
   if(!lowerName.includes(q)&&!lowerSymbol.includes(q))continue;
   const relevance=lowerSymbol===q?0:lowerName===q?1:lowerSymbol.startsWith(q)?2:lowerName.startsWith(q)?3:4;
   const amount=Number(pair.liquidity?.usd),liquidity=Number.isFinite(amount)&&amount>=0?amount:0;
   const prev=found.get(address);
   if(!prev||relevance<prev.relevance||relevance===prev.relevance&&liquidity>prev.liquidity){
    found.set(address,{name,symbol,address,chainId:1,network:'Ethereum',source:'DexScreener',identityVerified:false,relevance,liquidity});
   }
  }
 }
 return [...found.values()].sort((a,b)=>a.relevance-b.relevance||b.liquidity-a.liquidity||a.address.localeCompare(b.address)).slice(0,12).map(({name,symbol,address,chainId,network,source,identityVerified})=>({name,symbol,address,chainId,network,source,identityVerified}));
}
async function discover(rawQuery){
 const q=normalizeQuery(rawQuery);
 if(!q)throw Error('Invalid discovery query');
 const response=await fetch(SOURCE+'?q='+encodeURIComponent(q),{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Token discovery source HTTP '+response.status);
 const json=await readJson(response,2*1024*1024);
 if(!json||typeof json!=='object'||(json.pairs!==null&&!Array.isArray(json.pairs)))throw Error('Malformed token discovery response');
 return parse(json.pairs||[],q);
}
module.exports={normalizeQuery,parse,discover};
