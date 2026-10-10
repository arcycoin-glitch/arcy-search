'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {verified,knownMatches,rank}=require('../lib/token-identity');
const service=require('../lib/multichain-service');
const USDC='0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const UNI='0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';
const CLONE='0xabc123456789abcdef123456789abcdef1234567';
const STOCK='0xb8dbf92f9741c9ac1c32115e78581f23509916fd';
test('issuer primary-source proof requires exact Ethereum chain and full contract',()=>{
 const circle=verified('ethereum',USDC.toUpperCase().replace('0X','0x'));
 assert.equal(circle.status,'OFFICIAL_CONTRACT_MATCHED');
 assert.match(circle.proofUrl,/developers\.circle\.com/);
 assert.equal(verified('robinhood',USDC),null);
 assert.equal(verified('ethereum',CLONE),null);
 assert.equal(verified('ethereum','USDC'),null);
 assert.equal(verified('ethereum','0x123'),null);
 assert.equal(verified('ethereum',UNI).issuer,'Uniswap');
});
test('verified Ethereum contracts are discoverable even without DexScreener',()=>{
 assert.deepEqual(knownMatches('ethereum','USDC').map(x=>x.address),[USDC]);
 assert.deepEqual(knownMatches('ethereum','uni').map(x=>x.address),[UNI]);
 assert.equal(knownMatches('robinhood','USDC').length,0);
});
test('clone of identical ticker does not receive official label or outrank source',()=>{
 const rows=rank('ethereum','USDC',[
  {network:'ethereum',chainId:1,address:CLONE,name:'USD Coin',symbol:'USDC',source:'DexScreener'},
  {network:'ethereum',chainId:1,address:USDC,name:'Fake issuer name',symbol:'USDC',source:'DexScreener'},
  {network:'robinhood',chainId:4663,address:USDC,name:'USD Coin',symbol:'USDC',source:'DexScreener'}
 ]);
 assert.equal(rows.length,2);
 assert.equal(rows[0].address,USDC);
 assert.equal(rows[0].name,'USD Coin');
 assert.equal(rows[0].identity.status,'OFFICIAL_CONTRACT_MATCHED');
 assert.equal(rows[1].address,CLONE);
 assert.equal(rows[1].identity.status,'NOT_VERIFIED');
});
test('official Robinhood registry match is limited to original registered provider and mainnet',()=>{
 const claim={network:'robinhood',chainId:4663,address:STOCK,name:'APLD',symbol:'APLD',source:'DexScreener',registryMatched:true};
 let rows=rank('robinhood','APLD',[claim]);
 assert.equal(rows[0].identity.status,'NOT_VERIFIED');
 rows=rank('robinhood','APLD',[{...claim,source:'Robinhood official asset registry'}]);
 assert.equal(rows[0].identity.status,'REGISTRY_MATCHED');
 rows=rank('ethereum','APLD',[{...claim,network:'ethereum',chainId:1,source:'Robinhood official asset registry'}]);
 assert.equal(rows[0].identity.status,'NOT_VERIFIED');
});
test('source-backed Ethereum candidate wins and retains official issuer hyperlink in API',async()=>{
 const original=global.fetch;
 try{
  global.fetch=async()=>new Response(JSON.stringify({pairs:[
   {chainId:'ethereum',baseToken:{address:CLONE,symbol:'USDC',name:'USD Coin'},quoteToken:{address:'0x0000000000000000000000000000000000000001',symbol:'WETH',name:'Wrapped ETH'},liquidity:{usd:100000000000}},
   {chainId:'ethereum',baseToken:{address:USDC,symbol:'USDC',name:'USD Coin'},quoteToken:{address:'0x0000000000000000000000000000000000000001',symbol:'WETH',name:'Wrapped ETH'},liquidity:{usd:1}}
  ]}),{headers:{'content-type':'application/json'}});
  const result=await service.discover({network:'ethereum',query:'USDC'});
  assert.equal(result.matches[0].address,USDC);
  assert.equal(result.matches[0].identity.status,'OFFICIAL_CONTRACT_MATCHED');
  assert.equal(result.matches[1].identity.status,'NOT_VERIFIED');
 }finally{global.fetch=original}
});
