'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../ui-model');

const evidence=(value,status='ON_CHAIN_VERIFIED')=>({value,status,dataState:'DATA_FOUND'});

test('all common figures use K, M, B, T and four significant digits',()=>{
 const examples=[
  [2652000,'2.652M'],
  [4163000,'4.163M'],
  [1234567890,'1.235B'],
  [1700000,'1.7M'],
  [847200,'847.2K'],
  [70429498,'70.43M'],
  [1234.56789,'1.235K'],
  [1000000000000,'1T'],
  [999999.9999,'1M'],
  [999.9999,'1K'],
  [-12345.6789,'-12.35K'],
  [0,'0'],
  ['0','0']
 ];
 for(const [input,expected] of examples)assert.equal(model.compact(input),expected,String(input));
});

test('fractions use at most four decimals; genuinely tiny prices are never rounded to zero',()=>{
 const examples=[
  [0.123456789,'0.1235'],
  [0.0001,'0.0001'],
  [0.000000031234,'3.123e-8'],
  [0.00005,'5e-5'],
  [-12.345678,'-12.35'],
  [0.000000000000001,'1e-15'],
  [null,'NOT VERIFIED'],
  [undefined,'NOT VERIFIED']
 ];
 for(const [input,expected] of examples)assert.equal(model.compact(input),expected,String(input));
 for(const input of [1/3,0.0003456789,999.9876,21.123456789,654321.876543]){
  const formatted=model.compact(input);
  assert.ok(!/\.\d{5}/.test(formatted),`Too many decimal digits: ${formatted}`);
 }
});

test('the token summary uses compact numbers while preserving data confidence',()=>{
 const activity=model.summarize('activity',{ok:true,priceUsd:evidence(0.000000031234),valuation:{...evidence(1234567890),kind:'FDV'},change24h:evidence(-12.345678),volume24h:evidence(847200)});
 assert.deepEqual(activity.fields.map(x=>x.text),['$3.123e-8','FDV $1.235B','-12.35%','$847.2K']);
 const whale=model.summarize('whales',{ok:true,holderCount:2652000,largestWalletPct:12.345678,top10Pct:38.999999,top20Pct:70.429498});
 assert.deepEqual(whale.fields.map(x=>x.text),['2.652M','12.35%','39%','70.43%']);
 const liquidity=model.summarize('liquidity',{ok:true,liquidityUsd:1234567890,volume24h:28130.07,dexCount:2450,pairCount:4163,lpStatus:evidence(null,'NOT_VERIFIED')});
 assert.deepEqual(liquidity.fields.slice(0,3).map(x=>x.text),['$1.235B','$28.13K','2.45K DEX · 4.163K pairs']);
 assert.ok(activity.fields.every(x=>x.dataState==='DATA_FOUND'));
});

test('very large quantities use extended suffixes or scientific notation',()=>{
 assert.equal(model.compact(1e15),'1Q');
 assert.equal(model.compact(1e18),'1Qi');
 assert.equal(model.compact(1e21),'1Sx');
 assert.equal(model.compact(1e25),'1e+25');
});
