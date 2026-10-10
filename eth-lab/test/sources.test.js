'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parse:parseCirculating}=require('../lib/circulating');
const {parseCount,holders,calculate}=require('../lib/holders');
const token='0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const base={asset_platform_id:'ethereum',contract_address:token,market_data:{circulating_supply:500}};
test('correct CoinGecko exact contract source report',()=>{
 const p=parseCirculating(base,token.toLowerCase(),'1000');
 assert.equal(p.value,500);assert.equal(p.status,'SOURCE_REPORTED');
});
test('reject wrong contract and network',()=>{
 assert.equal(parseCirculating({...base,contract_address:'0x'+'a'.repeat(40)},token,'1000').value,null);
 assert.equal(parseCirculating({...base,asset_platform_id:'base'},token,'1000').value,null);
});
test('reject missing/zero/unreconciled circulation',()=>{
 assert.equal(parseCirculating({...base,market_data:{circulating_supply:0}},token,'1000').value,null);
 assert.equal(parseCirculating(base,token,'200').value,null);
});
test('accept strict explorer count format only',()=>{
 assert.equal(parseCount({token_holders_count:'2000'}),2000);
 assert.equal(parseCount({holders_count:125}),125);
 assert.equal(parseCount({token_holders_count:'1.2k'}),null);
 assert.equal(parseCount({token_holders_count:0}),null);
});
test('candidate addresses must be distinct and valid',()=>{
 const a='0x'+'a'.repeat(40);
 assert.deepEqual(holders([{address:{hash:a}}],token),[a]);
 assert.deepEqual(holders([{address:a},{address:a}],token),[]);
 assert.deepEqual(holders([{address:'x'}],token),[]);
});
test('unproven top holders never return verified percentages',()=>{
 const addresses=Array.from({length:20},(_,i)=>'0x'+(i+1).toString(16).padStart(40,'0'));
 const balances=addresses.map(()=>1n);
 const x=calculate(addresses,balances,100n,30,'0x10',token);
 assert.equal(x.fields.holderCount.value,null);
 assert.equal(x.fields.top10Pct.value,null);
 assert.equal(x.fields.top20Pct.value,null);
});

test('full holder set matching pinned on-chain supply produces concentration',()=>{
 const addresses=Array.from({length:20},(_,i)=>'0x'+(i+1).toString(16).padStart(40,'0'));
 const balances=addresses.map(()=>5n);
 const x=calculate(addresses,balances,100n,20,'0x10',token);
 assert.equal(x.fields.holderCount.value,20);
 assert.equal(x.fields.largestWalletPct.value,5);
 assert.equal(x.fields.top10Pct.value,50);
 assert.equal(x.fields.top20Pct.value,100);
});
test('incomplete holder supply invalidates every concentration percentage',()=>{
 const addresses=Array.from({length:20},(_,i)=>'0x'+(i+1).toString(16).padStart(40,'0'));
 const x=calculate(addresses,addresses.map(()=>4n),100n,20,'0x10',token);
 assert.equal(x.fields.largestWalletPct.value,null);
 assert.equal(x.fields.top20Pct.value,null);
});
