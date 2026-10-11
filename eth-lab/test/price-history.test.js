'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const price=require('../lib/price-history');
const chart=require('../api/chart');
const addr='0x'+'a'.repeat(40),other='0x'+'b'.repeat(40),pool='0x'+'c'.repeat(40),now=Date.parse('2026-10-11T12:00:00Z');
const body=()=>({data:[{
 attributes:{address:pool,reserve_in_usd:'200000'},
 relationships:{base_token:{data:{id:'arc_'+addr}},quote_token:{data:{id:'arc_'+other}}}
},{attributes:{address:'0x'+'d'.repeat(40),reserve_in_usd:'100000000'},
 relationships:{base_token:{data:{id:'eth_'+addr}},quote_token:{data:{id:'eth_'+other}}}
}]});
const candles=()=>({data:{attributes:{ohlcv_list:[
 [1728000000,'1','2','1','1.5','300'],[1727913600,'1','2','0.9','1.1','500'],
 [1727827200,'1','2','0.5','0.95','450']
]}},meta:{base:{address:addr},quote:{address:other}}});
test('Gecko history requires exact chain and complete address, never ticker-only',()=>{
 assert.ok(price.tokenMatch(body().data[0],'arc',addr));
 assert.equal(price.tokenMatch(body().data[0],'eth',addr),false);
 assert.equal(price.choosePool(body(),'arc',addr),pool);
 assert.equal(price.choosePool(body(),'eth',addr),'0x'+'d'.repeat(40));
 assert.equal(price.choosePool({data:[body().data[1]]},'arc',addr),null);
 assert.equal(price.choosePool({data:null},'arc',addr),null);
 assert.throws(()=>price.parseCandles({...candles(),meta:{base:{address:other},quote:{address:other}}},addr,now),/identity/);
});
test('Historical chart request pins returned candles to the same Gecko contract',async()=>{
 const seen=[];
 const fetcher=async url=>{
  seen.push(url);
  const response=url.includes('/ohlcv/day')?candles():body();
  return new Response(JSON.stringify(response),{status:200,headers:{'content-type':'application/json'}});
 };
 const d=await price.load('arc',addr,{fetcher,now,disableCache:true});
 assert.equal(d.chainId,5042);assert.equal(d.network,'arc');assert.equal(d.address,addr);
 assert.equal(d.poolAddress,pool);assert.equal(d.points.length,3);
 assert.equal(d.points[0].close,0.95);assert.equal(d.points.at(-1).close,1.5);
 assert.ok(seen[0].includes('/networks/arc/tokens/'+addr+'/pools'));
 assert.ok(seen[1].includes('/networks/arc/pools/'+pool+'/ohlcv/day'));
 assert.ok(seen[1].includes('token='+addr));
 assert.match(d.scope,/one highest-reserve returned exact-token pool/);
 assert.match(d.sourceUrl,/geckoterminal.com/);
});
test('Provider mismatches and malformed or fabricated historical values fail closed',async()=>{
 for(const alteration of [
  x=>{x.meta.base.address=other;x.meta.quote.address=other},
  x=>{x.data.attributes.ohlcv_list[0][4]='0'},
  x=>{x.data.attributes.ohlcv_list[0][3]='3'},
  x=>{x.data.attributes.ohlcv_list[0][0]=99999999999},
  x=>{x.data.attributes.ohlcv_list[0][0]=x.data.attributes.ohlcv_list[1][0]},
  x=>{x.data.attributes.ohlcv_list=[x.data.attributes.ohlcv_list[0]]}
 ]){
  const modified=candles();alteration(modified);
  const fetcher=async url=>new Response(JSON.stringify(url.includes('/ohlcv/day')?modified:body()));
  await assert.rejects(price.load('arc',addr,{fetcher,now,disableCache:true}));
 }
 await assert.rejects(price.load('robinhood',addr,{disableCache:true}),/Unsupported/);
 await assert.rejects(price.load('arc','USDC',{disableCache:true}),/Unsupported/);
});
test('Chart API is read-only, rejects unsupported networks and uses safe failure when no trusted series exists',async()=>{
 const run=async(query,method='GET')=>{
  let status=0;const headers={};
  const res={setHeader(k,v){headers[k]=v},status(n){status=n;return this},json(x){return {status,body:x,headers}}};
  return chart({method,query,headers:{},socket:{remoteAddress:'127.0.0.1'}},res);
 };
 assert.equal((await run({chain:'arc',address:'0x123'})).status,400);
 assert.equal((await run({chain:'robinhood',address:addr})).status,404);
 assert.equal((await run({chain:'arc',address:addr},'POST')).status,405);
 assert.equal((await run({chain:['arc','eth'],address:addr})).status,400);
});
