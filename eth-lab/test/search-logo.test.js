'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {imageFromPairs,contractLogo,enhance}=require('../lib/search-logo');
const one='0x'+'a'.repeat(40),another='0x'+'b'.repeat(40),third='0x'+'c'.repeat(40);
const logo='https://cdn.dexscreener.com/token-images/genuine.png';
function pair({chainId='arc',baseToken=one,quoteToken=another,url=logo,liquidity=150000}={}){
 return {chainId,baseToken:{address:baseToken,name:'Official Asset',symbol:'OFL'},
  quoteToken:{address:quoteToken,name:'Secondary',symbol:'SEC'},
  liquidity:{usd:liquidity},info:{imageUrl:url}};
}
test('Logo must be in selected network and exact BASE token, never quote token',()=>{
 assert.equal(imageFromPairs([pair(),pair({baseToken:another,quoteToken:one,liquidity:1e9})],'arc',one),logo);
 assert.equal(imageFromPairs([pair({chainId:'ethereum'})],'arc',one),null);
 assert.equal(imageFromPairs([pair({baseToken:another,quoteToken:one})],'arc',one),null);
 assert.equal(imageFromPairs([pair({url:'https://example.org/fake.png'})],'arc',one),null);
 assert.equal(imageFromPairs([pair({url:'https://cdn.dexscreener.com/malicious.svg'})],'arc',one),null);
 assert.equal(imageFromPairs([pair({chainId:'ethereum'})],'ethereum',one),logo);
 assert.equal(imageFromPairs([pair({chainId:'robinhood'})],'robinhood',one),logo);
});
test('Contract logo lookup uses exact-network token-pairs API and caches safely',async()=>{
 let calls=0;
 const fetcher=async url=>{
  calls++;
  assert.equal(url,'https://api.dexscreener.com/token-pairs/v1/arc/'+one);
  return new Response(JSON.stringify([pair()]),{status:200});
 };
 const l=await contractLogo('arc',one,{fetcher,now:1000});
 assert.equal(l,logo);
 const second=await contractLogo('arc',one,{fetcher,now:1001});
 assert.equal(second,logo);
 assert.equal(calls,1);
 assert.equal(await contractLogo('arc','USDC',{fetcher}),null);
});
test('Only bounded missing images are enriched; official status never changes',async()=>{
 let count=0;
 const official={network:'arc',chainId:5042,address:one,name:'ARCY',symbol:'ARCY',
  identity:{status:'OFFICIAL_CONTRACT_MATCHED'}};
 const second={...official,address:another,identity:{status:'NOT_VERIFIED'}};
 const thirdToken={...official,address:third,identity:{status:'NOT_VERIFIED'}};
 const found=await enhance('arc',[official,second,thirdToken],{
  lookup:async(network,address)=>{count++;return logo;},max:2
 });
 assert.equal(count,2);
 assert.equal(found[0].logoUrl,logo);
 assert.equal(found[1].logoUrl,logo);
 assert.equal(found[2].logoUrl,undefined);
 assert.equal(found[0].identity.status,'OFFICIAL_CONTRACT_MATCHED');
 assert.equal(found[1].identity.status,'NOT_VERIFIED');
});
