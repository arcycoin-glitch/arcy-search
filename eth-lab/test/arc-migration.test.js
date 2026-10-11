'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {chain,verifyChainId,rpcUrl}=require('../lib/chains');
const market=require('../lib/arc-market');
const {legacyRead}=require('../lib/arc-adapter');
const {safeLogoUrl}=require('../lib/token-image');
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

test('GeckoTerminal Arc pool token catalog gives source-linked logos without impersonation proof',()=>{
 const real='0x73e5f588d27d6b5ec89c89c82692d1e7fecbd38b';
 const clone='0x2b4623c889ae110df5c80ce679aa062631ac92ab';
 const logo='https://assets.geckoterminal.com/arc-test-image';
 const included=[real,clone].map(addr=>({id:'arc_'+addr,type:'token',
  attributes:{name:'Arcy',symbol:'ARCY',image_url:logo}}));
 const pools=[real,clone].map((addr,i)=>({id:'arc_0x'+String(i+1).repeat(40),
  type:'pool',attributes:{reserve_in_usd:i===0?'9000':'4'},
  relationships:{base_token:{data:{id:'arc_'+addr}}}}));
 const rows=market.parseGeckoSearch({included,data:pools},'ARCY');
 assert.equal(rows.length,2);
 assert.equal(rows[0].address,real);
 assert.equal(rows[0].logoUrl,logo);
 assert.equal(rows[0].chainId,5042);
 assert.equal(rows[0].identityVerified,false);
 assert.equal(rows[1].identityVerified,false);
 assert.equal(safeLogoUrl(logo),logo);
});
test('GeckoTerminal names from Ethereum, wrong pool IDs and absent pool relations are excluded',()=>{
 const address='0x'+'a'.repeat(40);
 const body={included:[{id:'eth_'+address,type:'token',attributes:{name:'Arcy',symbol:'ARCY'}}],
  data:[{id:'arc_0x'+'f'.repeat(40),type:'pool',relationships:{base_token:{data:{id:'eth_'+address}}}}]};
 assert.deepEqual(market.parseGeckoSearch(body,'ARCY'),[]);
 assert.deepEqual(market.parseGeckoSearch({included:body.included,data:[{id:'eth_0x'+'f'.repeat(40)}]},'ARCY'),[]);
});
test('GeckoTerminal Arc search cannot assign proof of original token issuer',()=>{
 const rows=market.parseGeckoSearch({included:[{id:'arc_'+ADDR,type:'token',
  attributes:{name:'Arcy',symbol:'ARCY',image_url:'javascript:alert(1)'}}],
  data:[{id:'arc_0x'+'9'.repeat(40),type:'pool',
   relationships:{base_token:{data:{id:'arc_'+ADDR}}}}]},'ARCY');
 assert.equal(rows.length,1);
 assert.equal(rows[0].identityVerified,false);
 assert.equal(rows[0].logoUrl,null);
});

test('Arc name candidates are retained by final identity ranking, never falsely official',()=>{
 const {rank}=require('../lib/token-identity');
 const a=rank('arc','ARCY',[
  {network:'arc',chainId:5042,address:ADDR,name:'ARCY',symbol:'ARCY',source:'GeckoTerminal',
   logoUrl:'https://assets.geckoterminal.com/my-token'},
  {network:'ethereum',chainId:1,address:ALT,name:'ARCY',symbol:'ARCY',source:'CoinGecko'}]);
 assert.equal(a.length,1);
 assert.equal(a[0].chainId,5042);
 assert.equal(a[0].network,'arc');
 assert.equal(a[0].identity.status,'NOT_VERIFIED');
 assert.equal(a[0].logoUrl,'https://assets.geckoterminal.com/my-token');
 assert.equal(a[0].identityVerified,false);
});

test('first-party ARCY site pins one exact Arc contract without blessing copycats',()=>{
 const {rank,verified,knownMatches}=require('../lib/token-identity');
 const ARCY='0x73e5f588d27d6b5ec89c89c82692d1e7fecbd38b';
 const CLONE='0x2b4623c889ae110df5c80ce679aa062631ac92ab';
 const official=verified('arc',ARCY);
 assert.equal(official?.status,'OFFICIAL_CONTRACT_MATCHED');
 assert.equal(official?.issuer,'ARCY');
 assert.equal(official?.proofUrl,'https://www.arcyusdc.xyz/');
 assert.equal(verified('ethereum',ARCY),null);
 assert.equal(verified('arc',CLONE),null);
 const rows=rank('arc','ARCY',[
  {network:'arc',chainId:5042,address:CLONE,name:'Arcy',symbol:'ARCY',source:'GeckoTerminal'},
  {network:'arc',chainId:5042,address:ARCY,name:'Arcy',symbol:'ARCY',source:'GeckoTerminal'}
 ]);
 assert.equal(rows[0].address,ARCY);
 assert.equal(rows[0].identity.status,'OFFICIAL_CONTRACT_MATCHED');
 assert.equal(rows[1].address,CLONE);
 assert.equal(rows[1].identity.status,'NOT_VERIFIED');
 assert.deepEqual(knownMatches('arc','ARCY').map(x=>x.address),[ARCY]);
});
