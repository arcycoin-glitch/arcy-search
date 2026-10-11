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

test('Chainlink LINK and Tether USDT must match issuer-published Ethereum contracts only',()=>{
 const LINK='0x514910771af9ca656af840dff83e8264ecf986ca';
 const USDT='0xdac17f958d2ee523a2206206994597c13d831ec7';
 assert.equal(verified('ethereum',LINK)?.issuer,'Chainlink');
 assert.equal(verified('ethereum',USDT)?.issuer,'Tether');
 assert.match(verified('ethereum',USDT).proofUrl,/tether\.to/);
 assert.equal(knownMatches('ethereum','LINK')[0].address,LINK);
 assert.equal(knownMatches('ethereum','USDT')[0].address,USDT);
 assert.equal(verified('robinhood',USDT),null);
 assert.equal(verified('ethereum',CLONE),null);
});

test('more original tokens require issuer first-party Ethereum contract proofs',()=>{
 const cases=[
  ['DAI','0x6b175474e89094c44da98b954eedeac495271d0f','Sky / Maker'],
  ['WBTC','0x2260fac5e5542a773aa44fbcfedf7c193bc2c599','WBTC'],
  ['SHIB','0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce','Shiba Inu'],
  ['BONE','0x9813037ee2218799597d83d4a5b6f3b6778218d9','Shiba Inu'],
  ['LEASH','0x27c70cd1946795b66be9d954418546998b546634','Shiba Inu'],
  ['TREAT','0xa02c49da76a085e4e1ee60a6b920ddbc8db599f4','Shiba Inu']
 ];
 for(const [symbol,address,issuer] of cases){
  const known=knownMatches('ethereum',symbol);
  assert.equal(known[0].address,address);
  assert.equal(verified('ethereum',address).issuer,issuer);
  assert.equal(verified('robinhood',address),null);
  assert.equal(verified('ethereum',CLONE),null);
 }
});
test('CoinGecko-indexed Ethereum address is prioritized but NEVER called issuer official',()=>{
 const INDEXED='0x6982508145454ce325ddbe47a25d4ec3d2311933';
 const rows=rank('ethereum','PEPE',[
  {network:'ethereum',chainId:1,address:CLONE,name:'Pepe',symbol:'PEPE',source:'DexScreener'},
  {network:'ethereum',chainId:1,address:INDEXED,name:'Pepe',symbol:'PEPE',source:'CoinGecko',catalogCoinId:'pepe'}
 ]);
 assert.equal(rows[0].address,INDEXED);
 assert.equal(rows[0].identity.status,'INDEXED_ON_COINGECKO');
 assert.equal(rows[0].identityVerified,false);
 assert.equal(rows[0].identity.issuer,null);
 assert.equal(rows[1].identity.status,'NOT_VERIFIED');
 assert.equal(verified('ethereum',INDEXED),null);
 assert.equal(rank('robinhood','PEPE',[{...rows[0],network:'robinhood',chainId:4663}])[0].identity.status,'NOT_VERIFIED');
});
test('unattributed CoinGecko mention without validated coin id cannot be indexed',()=>{
 const m=rank('ethereum','PEPE',[{network:'ethereum',chainId:1,address:CLONE,source:'CoinGecko',name:'Pepe',symbol:'PEPE'}]);
 assert.equal(m[0].identity.status,'NOT_VERIFIED');
});

test('ONDO issuer documentation proves the exact Ethereum governance contract',()=>{
 const ONDO='0xfaba6f8e4a5e8ab82f62fe7c39859fa577269be3';
 const official=verified('ethereum',ONDO);
 assert.equal(official?.status,'OFFICIAL_CONTRACT_MATCHED');
 assert.equal(official?.issuer,'Ondo Foundation');
 assert.equal(official?.proofUrl,'https://docs.ondo.foundation/ondo-token');
 assert.equal(verified('robinhood',ONDO),null);
 assert.equal(verified('ethereum',CLONE),null);
 assert.deepEqual(knownMatches('ethereum','ONDO').map(x=>x.address),[ONDO]);
 const candidates=rank('ethereum','ONDO',[
  {network:'ethereum',chainId:1,address:CLONE,name:'Ondo',symbol:'ONDO',source:'DexScreener'},
  {network:'ethereum',chainId:1,address:ONDO,name:'Ondo',symbol:'ONDO',source:'CoinGecko',catalogCoinId:'ondo-finance'},
  {network:'ethereum',chainId:1,address:'0x96f6ef951840721adbf46ac996b59e0235cb985c',name:'Ondo US Dollar Yield',symbol:'USDY',source:'CoinGecko',catalogCoinId:'ondo-us-dollar-yield'}
 ]);
 assert.equal(candidates[0].address,ONDO);
 assert.equal(candidates[0].identity.status,'OFFICIAL_CONTRACT_MATCHED');
 assert.equal(candidates[1].identityVerified,false);
 assert.equal(candidates[2].identity.status,'NOT_VERIFIED');
});

test('PAX Gold is only official for exact Paxos Ethereum contract address',()=>{
 const PAXG='0x45804880de22913dafe09f4980848ece6ecbaf78';
 const fake='0x1fa0618ecb8b1766af1bb6512afcf699cf859695';
 const official=verified('ethereum',PAXG);
 assert.equal(official.issuer,'Paxos');
 assert.match(official.proofUrl,/paxos\.com/);
 assert.equal(verified('ethereum',fake),null);
 assert.equal(verified('robinhood',PAXG),null);
 const list=rank('ethereum','PAXG',[
  {network:'ethereum',chainId:1,address:fake,symbol:'PAXG',name:'Paxos Gold',source:'DexScreener'},
  {network:'ethereum',chainId:1,address:PAXG,symbol:'PAXG',name:'PAX Gold',source:'DexScreener'}]);
 assert.equal(list[0].address,PAXG);
 assert.equal(list[0].identity.status,'OFFICIAL_CONTRACT_MATCHED');
 assert.equal(list[1].identity.status,'NOT_VERIFIED');
});


test('ARCY official label belongs only to first-party Arc 5042 token, never lookalikes',()=>{
 const ARCY='0x73e5f588d27d6b5ec89c89c82692d1e7fecbd38b';
 const clone='0x'+('a'.repeat(40));
 const original=verified('arc',ARCY);
 assert.equal(original.status,'OFFICIAL_CONTRACT_MATCHED');
 assert.equal(original.chainId,5042);
 assert.equal(original.issuer,'ARCY');
 assert.match(original.proofUrl,/arcy-website\/blob\/main\/test\/live\.cjs/);
 assert.equal(verified('ethereum',ARCY),null);
 assert.equal(verified('robinhood',ARCY),null);
 assert.equal(verified('arc',clone),null);
 const rows=rank('arc','ARCY',[
  {network:'arc',chainId:5042,address:clone,name:'ARCY',symbol:'ARCY',logoUrl:'https://cdn.dexscreener.com/token-images/fake.png',source:'DexScreener'},
  {network:'arc',chainId:5042,address:ARCY,name:'Misleading display name',symbol:'ARCY',source:'DexScreener'}
 ]);
 assert.equal(rows[0].address,ARCY);
 assert.equal(rows[0].name,'ARCY');
 assert.equal(rows[0].identity.status,'OFFICIAL_CONTRACT_MATCHED');
 assert.equal(rows[1].address,clone);
 assert.equal(rows[1].identity.status,'NOT_VERIFIED');
});
