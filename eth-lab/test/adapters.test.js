'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {parse:security}=require('../lib/security');
const {nextEvent}=require('../lib/unlocks');
const token='0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
test('security report must match exact contract',()=>{
 const bad=security({result:{['0x'+'a'.repeat(40)]:{buy_tax:'0',sell_tax:'0',transfer_tax:'0',is_mintable:'0'}}},token);
 assert.equal(bad.taxes.value,null);assert.equal(bad.mint.value,null);
});
test('all three fee observations required',()=>{
 const report=security({result:{[token]:{buy_tax:'0.03',sell_tax:'0.03',is_mintable:'1'}}},token);
 assert.equal(report.taxes.value,null);assert.equal(report.mint.status,'SOURCE_REPORTED');
});
test('well-formed security fees explicitly source-reported',()=>{
 const report=security({result:{[token]:{buy_tax:'0.03',sell_tax:'0.02',transfer_tax:'0',is_mintable:'0'}}},token);
 assert.equal(report.taxes.status,'SOURCE_REPORTED');
 assert.match(report.taxes.value,/Buy 3%/);
});
test('unlock with unknown schedule remains unverified',()=>assert.equal(nextEvent([],token,new Date('2026-10-10T00:00:00Z')).value,null));
test('unlock must match Ethereum contract and recent review',()=>{
 const row={chainId:1,contract:token,sourceUrl:'https://example.org/schedule',sourceName:'Issuer vesting notice',reviewedAt:'2026-10-09T00:00:00Z',events:[{date:'2026-11-01T00:00:00Z',amount:'1000'}]};
 assert.equal(nextEvent([row],token,new Date('2026-10-10T00:00:00Z')).value,'2026-11-01T00:00:00Z');
 assert.equal(nextEvent([{...row,chainId:8453}],token,new Date('2026-10-10T00:00:00Z')).value,null);
 assert.equal(nextEvent([{...row,reviewedAt:'2025-01-01T00:00:00Z'}],token,new Date('2026-10-10T00:00:00Z')).value,null);
});

test('GoPlus non-success status cannot be shown as detected fees',()=>{
 const result=security({code:0,result:{[token]:{buy_tax:'0.04',sell_tax:'0',transfer_tax:'0',is_mintable:'0'}}},token);
 assert.equal(result.taxes.value,null);
 assert.equal(result.mint.value,null);
});
test('empty security tax value cannot be coerced to a verified zero',()=>{
 const result=security({code:1,result:{[token]:{buy_tax:'',sell_tax:'0',transfer_tax:'0'}}},token);
 assert.equal(result.taxes.value,null);
});
