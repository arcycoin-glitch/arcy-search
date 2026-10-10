'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {unknown,found,card}=require('../lib/evidence');
const {parse}=require('../lib/market');
const {addrWord}=require('../lib/control');
const token='0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
test('unknown fields remain null, not zero',()=>{const x=unknown('No proof');assert.equal(x.value,null);assert.equal(x.status,'NOT_VERIFIED')});
test('verified field requires evidence',()=>assert.throws(()=>found(0,'RPC',[]),/evidence/));
test('card partial state',()=>assert.equal(card({a:unknown(),b:found(0,'RPC',[{block:'0x12'}])},'demo').status,'PARTIAL_EVIDENCE'));
test('market filters wrong chain and unrelated token',()=>{
 const pair={chainId:'ethereum',pairAddress:'0x'+'a'.repeat(40),baseToken:{address:token},quoteToken:{address:'0x'+'b'.repeat(40)},liquidity:{usd:200},volume:{h24:10},priceUsd:'1'};
 const x=parse([pair,{...pair,chainId:'base'},{...pair,pairAddress:'0x'+'c'.repeat(40),baseToken:{address:'0x'+'d'.repeat(40)}}],token);
 assert.equal(x.fields.pairCount.value,1);assert.equal(x.fields.volume24h.value,10);assert.equal(x.fields.lpLock.value,null);
});
test('no market pairs is not zero liquidity',()=>{const x=parse([],token);assert.equal(x.fields.liquidityUsd.value,null);assert.equal(x.fields.pairCount.value,null)});
test('zero proxy slot does not count as implementation',()=>assert.equal(addrWord('0x'+'0'.repeat(64)),null));
