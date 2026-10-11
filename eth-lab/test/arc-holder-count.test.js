'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const source=require('../lib/arc-holder-count');
const address='0x'+'a'.repeat(40);
test('Arc explorer count source validates positive safe integers',()=>{
 for(const body of [{token_holders_count:150},{token_holders_count:'150'},{holders_count:150}])
  assert.equal(source.parseCount(body),150);
 for(const body of [{token_holders_count:0},{token_holders_count:-1},{token_holders_count:'0'},
  {token_holders_count:'150x'},{token_holders_count:2**60}, {},null])
  assert.equal(source.parseCount(body),null);
});
test('Arc source-reported count is contract-specific with clear missing whale scope',async()=>{
 const seen=[];
 const good=async url=>{seen.push(url);return new Response(JSON.stringify({token_holders_count:'2107'}))};
 const field=await source.fetchCount(address,{fetcher:good,now:Date.parse('2026-10-11T10:00:00Z')});
 assert.equal(field.value,2107);
 assert.equal(field.network,'arc');
 assert.equal(field.chainId,5042);
 assert.equal(field.status,'SOURCE_REPORTED');
 assert.equal(field.dataState,'DATA_FOUND');
 assert.match(field.evidence[0].sourceUrl,/explorer.arc.io\/api\/v2\/tokens/);
 assert.match(field.evidence[0].scope,/not a pinned-block enumeration/i);
 assert.ok(seen[0].endsWith(address+'/counters'));
 assert.equal(await source.fetchCount('USDC',{fetcher:good}),null);
});
test('Missing Arc source response leaves current holder count NOT VERIFIED',async()=>{
 const unavailable=async()=>new Response('rate limit',{status:429});
 assert.equal(await source.fetchCount(address,{fetcher:unavailable}),null);
 const malformed=async()=>new Response(JSON.stringify({holders_count:'invalid'}));
 assert.equal(await source.fetchCount(address,{fetcher:malformed}),null);
});
