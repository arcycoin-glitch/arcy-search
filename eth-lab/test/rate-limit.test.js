'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {clientIdentity,createLimiter,enforce}=require('../lib/rate-limit');
const direct=(ip,headers={})=>({socket:{remoteAddress:ip},headers});
const vercel=(ip)=>({headers:{'x-vercel-forwarded-for':ip}});
test('trusted Vercel edge IP is the only header-derived rate-limit identity',()=>{
 assert.equal(clientIdentity(vercel('203.0.113.40'),true),'203.0.113.40');
 assert.equal(clientIdentity({headers:{'x-vercel-forwarded-for':'203.0.113.40, 192.0.2.1'}},true),'unknown');
 assert.equal(clientIdentity({headers:{'x-forwarded-for':'1.1.1.1','x-real-ip':'203.0.113.30'}},true),'203.0.113.30');
});
test('non-Vercel rate limit never trusts spoofed forwarded headers',()=>{
 assert.equal(clientIdentity(direct('127.0.0.1',{'x-forwarded-for':'8.8.8.8'}),false),'127.0.0.1');
 assert.equal(clientIdentity({headers:{'x-forwarded-for':'1.1.1.1'}},false),'unknown');
});
test('per-runtime limiter blocks 25th scan and permits after the window',()=>{
 let t=1000;
 const limiter=createLimiter({limit:24,windowMs:60000,now:()=>t});
 const req=vercel('203.0.113.17');
 for(let i=0;i<24;i++){const x=limiter.check(req,{vercel:true});assert.equal(x.allowed,true);assert.equal(x.remaining,23-i)}
 const blocked=limiter.check(req,{vercel:true});
 assert.equal(blocked.allowed,false);
 assert.equal(blocked.retryAfter,60);
 t+=60000;
 assert.equal(limiter.check(req,{vercel:true}).allowed,true);
});
test('IPs are separate buckets; different endpoints share the same module limiter',()=>{
 const limiter=createLimiter({limit:1,windowMs:60000,now:()=>0});
 assert.equal(limiter.check(vercel('203.0.113.1'),{vercel:true}).allowed,true);
 assert.equal(limiter.check(vercel('203.0.113.1'),{vercel:true}).allowed,false);
 assert.equal(limiter.check(vercel('203.0.113.2'),{vercel:true}).allowed,true);
});
test('memory cap fails closed without evicting active client quota',()=>{
 const limiter=createLimiter({limit:2,windowMs:60000,maxClients:1,now:()=>100});
 assert.equal(limiter.check(vercel('203.0.113.1'),{vercel:true}).allowed,true);
 const r=limiter.check(vercel('203.0.113.2'),{vercel:true});
 assert.equal(r.allowed,false);
 assert.equal(r.reason,'CAPACITY');
 assert.equal(limiter.size(),1);
 assert.equal(limiter.check(vercel('203.0.113.1'),{vercel:true}).allowed,true);
 assert.equal(limiter.check(vercel('203.0.113.1'),{vercel:true}).allowed,false);
});
test('real HTTP limiter returns 429, Retry-After and no upstream scan when exhausted',()=>{
 const res=()=>({headers:{},statusCode:200,setHeader(k,v){this.headers[k.toLowerCase()]=v;return this},status(c){this.statusCode=c;return this},json(x){this.body=x;return this}});
 const req=direct('192.0.2.243');
 for(let i=0;i<24;i++)assert.equal(enforce(req,res()),true);
 const response=res();
 assert.equal(enforce(req,response),false);
 assert.equal(response.statusCode,429);
 assert.equal(response.body.error,'RATE_LIMITED');
 assert.equal(response.headers['retry-after']!==undefined,true);
 assert.equal(response.headers['ratelimit-remaining'],'0');
});
