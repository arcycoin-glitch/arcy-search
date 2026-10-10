'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {unknown,found,card}=require('../lib/evidence');
const {parse}=require('../lib/market');
const {addrWord}=require('../lib/control');
const {mechanicsCard,copyFields}=require('../lib/report');
const schema=require('../schema');
const token='0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const pair={
 chainId:'ethereum',dexId:'uniswap',pairAddress:'0x'+'a'.repeat(40),
 baseToken:{address:token},quoteToken:{address:'0x'+'b'.repeat(40)},
 liquidity:{usd:200},volume:{h24:10},priceUsd:'1',
 priceChange:{h24:-1.5},marketCap:1000,fdv:1100
};
test('the schema matches the five current production cards, with four metrics each',()=>{
 assert.deepEqual(schema.map(x=>x.id),['supply','holders','liquidity','activity','mechanics']);
 assert.ok(schema.every(x=>x.fields.length===4));
 assert.equal(new Set(schema.map(x=>x.id)).size,5);
 assert.equal(new Set(schema.flatMap(x=>x.fields.map(([field])=>x.id+'.'+field))).size,20);
});
test('unknown fields are null and never silently zero',()=>{
 const x=unknown('No proof');assert.equal(x.value,null);assert.equal(x.status,'NOT_VERIFIED');
});
test('verified field requires evidence',()=>assert.throws(()=>found(0,'RPC',[]),/evidence/));
test('card reports partial evidence',()=>assert.equal(card({a:unknown(),b:found(0,'RPC',[{block:'0x12'}])},'demo').status,'PARTIAL_EVIDENCE'));
test('market excludes wrong chains, unrelated tokens and duplicate pair addresses',()=>{
 const x=parse([pair,{...pair,chainId:'base'},pair,{...pair,pairAddress:'0x'+'c'.repeat(40),baseToken:{address:'0x'+'d'.repeat(40)}}],token);
 assert.equal(x.fields.dexPairCount.value,'1 DEX · 1 pairs');
 assert.equal(x.fields.volume24h.value,10);
 assert.equal(x.fields.lpStatus.value,null);
 assert.equal(x.fields.valuation.kind,'MARKET_CAP');
 assert.equal(x.fields.change24h.value,-1.5);
});
test('market returns explicit unavailable data when no market pairs found',()=>{
 const x=parse([],token);
 assert.equal(x.fields.liquidityUsd.value,null);
 assert.equal(x.fields.dexPairCount.value,null);
 assert.equal(x.fields.priceUsd.value,null);
 assert.equal(x.fields.valuation.value,null);
});
test('quoted token is not incorrectly priced using base token price',()=>{
 const quoted={...pair,baseToken:{address:'0x'+'b'.repeat(40)},quoteToken:{address:token}};
 const x=parse([quoted],token);
 assert.equal(x.fields.priceUsd.value,null);
 assert.equal(x.fields.valuation.value,null);
 assert.equal(x.fields.change24h.value,null);
 assert.equal(x.fields.volume24h.value,10);
});
test('no partial market volume sum is fabricated',()=>{
 const x=parse([pair,{...pair,pairAddress:'0x'+'c'.repeat(40),volume:{}}],token);
 assert.equal(x.fields.volume24h.value,null);
});
test('zero proxy implementation is not treated as verified',()=>assert.equal(addrWord('0x'+'0'.repeat(64)),null));
test('contract mechanics remains exactly four production metrics',()=>{
 const c=card({
   owner:found('0x'+'a'.repeat(40),'Ethereum RPC',[{method:'owner()',block:'0x1'}]),
   proxyImplementation:unknown('No implementation')
 },'basic');
 const x=mechanicsCard(c);
 assert.deepEqual(Object.keys(x.fields),schema.find(x=>x.id==='mechanics').fields.map(x=>x[0]));
 assert.match(x.fields.ownerAdmin.value,/owner\(\) getter/);
 assert.equal(x.fields.tradingTaxes.value,null);
 assert.equal(x.fields.contractArchitecture.value,null);
});
test('a copied source card always uses requested production keys',()=>{
 const c=card({volume24h:found(2,'DexScreener',[{p:1}])},'demo');
 const x=copyFields(c,['volume24h','missing'],'demo');
 assert.equal(x.fields.volume24h.value,2);
 assert.equal(x.fields.missing.value,null);
});


test('quoted top-liquidity pool does not hide lower-liquidity valid base-token price',()=>{
 const quoted={...pair,pairAddress:'0x'+'d'.repeat(40),baseToken:{address:'0x'+'b'.repeat(40)},quoteToken:{address:token},liquidity:{usd:1000},priceUsd:'42',marketCap:999999};
 const base={...pair,pairAddress:'0x'+'e'.repeat(40),liquidity:{usd:100},priceUsd:'1.05',marketCap:1050,priceChange:{h24:3.5}};
 const x=parse([quoted,base],token);
 assert.equal(x.fields.priceUsd.value,'1.05');
 assert.equal(x.fields.valuation.value,1050);
 assert.equal(x.fields.change24h.value,3.5);
 assert.equal(x.primaryPair,base.pairAddress);
 assert.equal(x.fields.volume24h.value,20);
});
test('market schema labels partial aggregates as tracked or returned, not Ethereum-wide totals',()=>{
 const liquidity=schema.find(x=>x.id==='liquidity').fields;
 const activity=schema.find(x=>x.id==='activity').fields;
 assert.match(liquidity.find(([key])=>key==='liquidityUsd')[1],/Tracked/);
 assert.match(liquidity.find(([key])=>key==='volume24h')[1],/Tracked/);
 assert.match(liquidity.find(([key])=>key==='dexPairCount')[1],/Returned/);
 assert.match(activity.find(([key])=>key==='volume24h')[1],/Tracked/);
});
