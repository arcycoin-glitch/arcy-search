'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createCache}=require('../lib/discovery-cache');
test('name lookup caches successful candidates with real retrieval age and TTL',async()=>{
 let now=1000,calls=0;
 const c=createCache(async q=>{calls++;return[{name:q}]},{ttlMs:2000,now:()=>now});
 const a=await c.find('Uniswap');
 assert.equal(a.matches[0].name,'Uniswap');
 now=2000;
 const b=await c.find('uniswap');
 assert.equal(b.cacheAgeMs,1000);
 assert.equal(calls,1);
 now=3001;
 await c.find('Uniswap');
 assert.equal(calls,2);
});
test('name lookup coalesces in-flight requests',async()=>{
 let calls=0;
 const c=createCache(async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,12));return[{symbol:'UNI'}]});
 const [a,b]=await Promise.all([c.find('UNI'),c.find('uni')]);
 assert.equal(calls,1);
 assert.deepEqual(a.matches,b.matches);
});
test('cache does not memoize empty results or source failures',async()=>{
 let calls=0;
 const c=createCache(async()=>{calls++;if(calls===1)throw Error('provider 429');return []});
 await assert.rejects(c.find('BUNKER'),/provider 429/);
 assert.deepEqual((await c.find('BUNKER')).matches,[]);
 assert.deepEqual((await c.find('BUNKER')).matches,[]);
 assert.equal(calls,3);
});
test('name search cache has strict entry limit',async()=>{
 const c=createCache(async q=>[{name:q}],{maxEntries:2});
 await c.find('ONE');await c.find('TWO');await c.find('THREE');
 assert.equal(c.size(),2);
});
