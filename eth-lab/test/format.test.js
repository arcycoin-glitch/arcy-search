'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {display,full,compactNumeric}=require('../format');
test('buyer-facing USD values shorten exactly to B and preserve source numbers',()=>{
 const usd=3632889854.05;
 assert.equal(display(usd,'liquidityUsd'),'$3.633B');
 assert.equal(full(usd,'liquidityUsd'),'$3,632,889,854.05');
 assert.equal(display(48554267204,'valuation','MARKET_CAP'),'Market Cap $48.55B');
 assert.equal(full(48554267204,'valuation','MARKET_CAP'),'Market Cap $48,554,267,204');
});
test('integer holder count and high-precision string supplies use K/M/B',()=>{
 assert.equal(display(9477826,'holderCount'),'9.478M');
 assert.equal(display('56351.642419','burnAddressBalance'),'56.35K');
 assert.equal(full('56351.642419','burnAddressBalance'),'56,351.642419');
 assert.equal(display('48526566263.516597','totalSupply'),'48.53B');
 assert.equal(full('48526566263.516597','totalSupply'),'48,526,566,263.516597');
});
test('very large raw decimal strings never incur floating point rounding',()=>{
 const raw='123456789012345678901234567890.12345678901234567890';
 assert.equal(full(raw,'totalSupply'),'123,456,789,012,345,678,901,234,567,890.12345678901234567890');
 assert.equal(display(raw,'totalSupply'),'1.235e+29');
});
test('threshold rounding does not output 1000K or 1000M',()=>{
 assert.equal(display(1000,'holderCount'),'1K');
 assert.equal(display(999999,'holderCount'),'1M');
 assert.equal(display('999999999','totalSupply'),'1B');
 assert.equal(display(1999,'holderCount'),'1.999K');
 assert.equal(display(999,'holderCount'),'999');
 assert.equal(display('999.99','totalSupply'),'1K');
});
test('prices below 1 USD keep critical tiny digits and percentages are not compacted',()=>{
 assert.equal(display(0.01,'priceUsd'),'$0.01');
 assert.equal(display('0.000000000017','priceUsd'),'$1.7e-11');
 assert.equal(display(1e-21,'priceUsd'),'$1e-21');
 assert.equal(full(1e-21,'priceUsd'),'$0.000000000000000000001');
 assert.equal(display(0.0000000112,'change24h'),'1.12e-8%');
 assert.equal(display(98.7654321,'top10Pct'),'98.77%');
 assert.equal(display(-0.0000001,'change24h'),'-1e-7%');
 assert.equal(display('12345.678','priceUsd'),'$12.35K');
});
test('non-numeric permissions, addresses, pool descriptions and zeros retain meaning',()=>{
 assert.equal(display('1 DEX · 4 pairs','dexPairCount'),'1 DEX · 4 pairs');
 assert.equal(display('owner() getter: 0xabc','ownerAdmin'),'owner() getter: 0xabc');
 assert.equal(display(false,'mintCapability'),'FALSE');
 assert.equal(display(0,'volume24h'),'$0');
 assert.equal(display('-1250000','volume24h'),'-$1.25M');
 assert.equal(compactNumeric('NaN'),null);
});

test('global four digit summaries retain exact evidence for all networks',()=>{
 assert.equal(display(2652000,'holderCount'),'2.652M');
 assert.equal(display(4163000,'holderCount'),'4.163M');
 assert.equal(display(0.123456789,'priceUsd'),'$0.1235');
 assert.equal(display('0.000000031234','priceUsd'),'$3.123e-8');
 assert.equal(display('1 DEX · 4163 pairs','dexPairCount'),'1 DEX · 4.163K pairs');
 assert.equal(full('0.000000031234','priceUsd'),'$0.000000031234');
 for(const [number,key] of [[0.123456789,'priceUsd'],[98.7654321,'top10Pct'],[1234567.89,'liquidityUsd']]){
  assert.ok(!/\\.\\d{5}/.test(display(number,key)),String(number)+' must have <=4 visible decimal places');
 }
});
