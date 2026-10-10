'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parsePage,evaluate,inspect,TOP_SIZE}=require('../lib/large-holders');
const token='0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const rows=Array.from({length:21},(_,i)=>({address:{hash:'0x'+(i+1).toString(16).padStart(40,'0')},value:String(100-i)}));
test('21 sorted distinct explorer entries are required',()=>{
 assert.equal(parsePage({items:rows},token).ok,true);
 assert.equal(parsePage({items:rows.slice(0,20)},token).ok,false);
 assert.equal(parsePage({items:[rows[0],rows[0],...rows.slice(2)]},token).ok,false);
 assert.equal(parsePage({items:[rows[1],rows[0],...rows.slice(2)]},token).ok,false);
});
test('top-20 ranked percentage uses pinned RPC balances and marks source reported',()=>{
 const page=parsePage({items:rows},token);
 const sum=rows.reduce((n,x)=>n+BigInt(x.value),0n);
 const r=evaluate(page,rows.map(x=>BigInt(x.value)),sum+500n,'0x100',token,100000);
 assert.equal(r.ok,true);
 assert.equal(r.fields.top20Pct.status,'SOURCE_REPORTED_RPC_RECONCILED');
 assert.equal(r.fields.top20Pct.value>0,true);
 assert.equal(r.fields.top20Pct.evidence[0].rpcMatchesExplorerValues,true);
});
test('source/RPC mismatch invalidates entire ranked snapshot',()=>{
 const page=parsePage({items:rows},token);
 const values=rows.map(x=>BigInt(x.value));values[3]+=1n;
 assert.equal(evaluate(page,values,100000n,'0x100',token,300).ok,false);
});
test('invalid ranked source cannot produce verified whales',async()=>{
 const r=await inspect(token,'0x100','100000',500,{getPage:async()=>({items:rows.slice(0,19)}),getBalances:async()=>{throw Error('must not run')}});
 assert.equal(r.fields.top10Pct.value,null);
 assert.equal(r.reasonCode,'INSUFFICIENT_RANK_CANDIDATES');
});
test('mocked 21 rows and pinned block return only explicitly qualified concentration',async()=>{
 const r=await inspect(token,'0x100','100000',500,{
  getPage:async()=>({items:rows}),
  getBalances:async()=>rows.map(x=>BigInt(x.value))
 });
 assert.equal(r.fields.top10Pct.dataState,'DATA_FOUND');
 assert.equal(r.fields.top10Pct.status,'SOURCE_REPORTED_RPC_RECONCILED');
});
