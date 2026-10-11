'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {safeLogoUrl}=require('../lib/token-image');
const {parse}=require('../lib/discover');
const {rank}=require('../lib/token-identity');
const BASE='0x'+'b'.repeat(40),CLONE='0x'+'c'.repeat(40),QUOTE='0x'+'f'.repeat(40);
const DEX_ICON='https://cdn.dexscreener.com/images/example.png';
const GECKO_ICON='https://coin-images.coingecko.com/coins/images/12345/small/example.png';
test('only image CDN HTTPS URLs can be used on public search cards',()=>{
 assert.equal(safeLogoUrl(DEX_ICON),DEX_ICON);
 assert.equal(safeLogoUrl(GECKO_ICON),GECKO_ICON);
 for(const url of [
  'javascript:alert(1)','data:image/png;base64,AAAA','http://cdn.dexscreener.com/images/example.png',
  'https://evil.example.net/token.png','https://cdn.dexscreener.com.evil.net/p.png',
  'https://user:pass@cdn.dexscreener.com/a.png',
  'https://cdn.dexscreener.com/a.svg','https://cdn.dexscreener.com/a.html',
  'https://cdn.dexscreener.com:444/a.png',
  'https://cdn.dexscreener.com/a.png#foo',
  null,{},[],'' ])assert.equal(safeLogoUrl(url),null,String(url));
});
test('DEX artwork applies only to the base token, never the quote asset',()=>{
 const pairs=[{chainId:'ethereum',baseToken:{address:BASE,symbol:'QYZ',name:'Qyz'},
  quoteToken:{address:QUOTE,symbol:'QYZ',name:'Qyz'},info:{imageUrl:DEX_ICON},
  liquidity:{usd:100}}];
 const found=parse(pairs,'QYZ');
 assert.equal(found.find(x=>x.address===BASE).logoUrl,DEX_ICON);
 assert.equal(found.find(x=>x.address===QUOTE).logoUrl,null);
});
test('issuer identity never comes from logo and images are kept only on matching addresses',()=>{
 const usdc='0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
 const output=rank('ethereum','USDC',[
  {network:'ethereum',chainId:1,address:CLONE,name:'USD Coin',symbol:'USDC',source:'DexScreener',logoUrl:DEX_ICON},
  {network:'ethereum',chainId:1,address:usdc,name:'USD Coin',symbol:'USDC',source:'DexScreener',logoUrl:GECKO_ICON}
 ]);
 assert.equal(output[0].address,usdc);
 assert.equal(output[0].logoUrl,GECKO_ICON);
 assert.equal(output[0].identity.status,'OFFICIAL_CONTRACT_MATCHED');
 assert.equal(output[1].logoUrl,DEX_ICON);
 assert.equal(output[1].identity.status,'NOT_VERIFIED');
 assert.equal(output[1].identityVerified,false);
});
