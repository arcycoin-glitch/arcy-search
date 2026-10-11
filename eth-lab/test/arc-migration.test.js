'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {chain,verifyChainId,rpcUrl}=require('../lib/chains');
const market=require('../lib/arc-market');
const {legacyRead}=require('../lib/arc-adapter');
const ADDR='0x'+'1'.repeat(40),PAIR='0x'+'2'.repeat(40),ALT='0x'+'3'.repeat(40);
function pair(overrides={}){
 return {chainId:'arc',pairAddress:PAIR,dexId:'uniswap',baseToken:{address:ADDR,name:'ARC TEST',symbol:'ARC'},
  quoteToken:{address:ALT,name:'USD Coin',symbol:'USDC'},liquidity:{usd:120000},
  volume:{h24:4200},priceUsd:'0.00000431',priceChange:{h24:-1.5},fdv:6300000,...overrides};
}
test('Arc is chain ID 5042 and cannot silently accept testnet or Ethereum',()=>{
 assert.equal(chain('arc').chainId,5042);
 assert.equal(chain('arc').dexScreenerChainId,'arc');
 assert.equal(verifyChainId('arc','0x13b2'),5042);
 assert.throws(()=>verifyChainId('arc','0x1'),/mismatch/);
 assert.throws(()=>verifyChainId('arc','0x4cef52'),/mismatch/);
 assert.throws(()=>chain('ARC'),/Unsupported network/);
 assert.equal(rpcUrl('arc',{}),'https://rpc.mainnet.arc.io/');
});
test('Arc DEX metrics count only exact Arc contract and deduplicated pair',()=>{
 const p=pair(),noise=pair({pairAddress:'0x'+'5'.repeat(40),chainId:'ethereum',liquidity:{usd:999999999}});
 const different=pair({pairAddress:'0x'+'4'.repeat(40),baseToken:{address:ALT,symbol:'XYZ',name:'Other'},
  quoteToken:{address:'0x'+'6'.repeat(40),symbol:'WEIRD'},liquidity:{usd:80000000}});
 const r=market.parseMarket([p,p,noise,different],ADDR);
 assert.equal(r.liquidityUsd.value,120000);
 assert.equal(r.volume24h.value,4200);
 assert.equal(r.dexPairCount.value,'1 DEX · 1 pairs');
 assert.equal(r.priceUsd.value,'0.00000431');
 assert.equal(r.valuation.value,6300000);
 assert.equal(r.valuation.kind,'FDV');
 assert.equal(r.lpStatus.value,null);
 assert.equal(r.liquidityUsd.chainId,5042);
 assert.equal(r.priceUsd.network,'arc');
});
test('Arc DEX does not derive price from quote asset',()=>{
 const quoteOnly=pair({baseToken:{address:ALT},quoteToken:{address:ADDR},priceUsd:'999'});
 const r=market.parseMarket([quoteOnly],ADDR);
 assert.equal(r.priceUsd.value,null);
 assert.equal(r.valuation.value,null);
 assert.equal(r.liquidityUsd.value,120000);
});
test('Arc name search rejects wrong-chain clones and returns only chain-scoped contract art',()=>{
 const logo='https://cdn.dexscreener.com/images/arc.png';
 const a=market.parseSearch([pair({info:{imageUrl:logo}}),
  pair({chainId:'ethereum',pairAddress:'0x'+'7'.repeat(40),liquidity:{usd:9e12}})],'ARC');
 assert.equal(a.length,1);
 assert.equal(a[0].address,ADDR);
 assert.equal(a[0].logoUrl,logo);
 assert.equal(a[0].identityVerified,false);
 assert.equal(market.parseSearch([pair({info:{imageUrl:'https://evil.example/arc.png'}})],'ARC')[0].logoUrl,null);
});
test('Arc route response enforces chain ID and exact contract identity',async()=>{
 const fixture=(id,address)=>async (req,res)=>res.status(200).json({
  ok:true,chainId:id,address,block:'0x123',token:{decimals:18}});
 assert.equal((await legacyRead(fixture(5042,ADDR),ADDR)).chainId,5042);
 await assert.rejects(()=>legacyRead(fixture(1,ADDR),ADDR),/did not attest/);
 await assert.rejects(()=>legacyRead(fixture(5042,ALT),ADDR),/did not attest/);
 await assert.rejects(()=>legacyRead(async(req,res)=>res.status(200).json({ok:false,address:ADDR,chainId:5042}),ADDR),/did not attest/);
});
test('Arc market values missing provider data remain NOT VERIFIED not zero',()=>{
 const r=market.parseMarket([],ADDR);
 assert.equal(r.liquidityUsd.value,null);
 assert.equal(r.volume24h.value,null);
 assert.equal(r.priceUsd.value,null);
 assert.equal(r.change24h.value,null);
 assert.equal(r.valuation.value,null);
});
