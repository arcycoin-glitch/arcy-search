'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const unlocks=require('../api/unlocks');
const now=Date.parse('2026-10-11T12:00:00Z');
const item=(verification,name='Api3')=>({
 name,symbol:'API3',date:'2026-10-20',amount:'1.5M API3',
 sourceUrl:'https://api.coinbell.in/token-unlocks?sort=soonest&window=30',
 allocation:'Ecosystem',verification
});
test('Unlocks distinguish confirmed issuer events from source-reported calendar dates',()=>{
 const r=unlocks.select({success:true,generatedAt:'2026-10-11T12:00:00Z',
  events:[item('project-confirmed'),item('source-published','Another source-listed project')]},now);
 assert.equal(r.confirmed.length,1);
 assert.equal(r.reported.length,1);
 assert.equal(r.confirmed[0].verification,'project-confirmed');
 assert.equal(r.reported[0].verification,'source-published');
 assert.match(r.note,/NOT issuer-verified unlocks/);
});
test('Exact name AND symbol required for token unlock logo registry',()=>{
 assert.match(unlocks.logo('Api3','API3')||'',/^https:\/\/coin-images\.coingecko\.com\//);
 assert.equal(unlocks.logo('Not Api3','API3'),null);
 assert.equal(unlocks.logo('Api3','FAKE'),null);
});
test('Expired, duplicate, malformed and estimated unlocks never become issuer-verified',()=>{
 const bad=[
 {...item('project-confirmed'),date:'2027-01-01'},
 {...item('project-confirmed'),date:'2026-01-01'},
 {...item('estimated')},
 {...item('project-confirmed'),sourceUrl:'http://phishing.example'},
 {...item('project-confirmed'),date:'not a date'}
 ];
 const r=unlocks.select({success:true,events:[...bad,item('project-confirmed'),item('project-confirmed')],generatedAt:'2026-10-11T12:00:00Z'},now);
 assert.equal(r.confirmed.length,1);
 assert.equal(r.reported.length,0);
});
test('An empty evidence list is explicitly no confirmed unlocks',()=>{
 const result=unlocks.select({success:true,events:[],generatedAt:'2026-10-11T12:00:00Z'},now);
 assert.equal(result.status,'NO_VERIFIED_EVENTS');
 assert.deepEqual(result.confirmed,[]);
 assert.throws(()=>unlocks.select({success:false,events:[]},now));
});
test('Unlocks endpoint rejects state-changing methods and unknown parameters',async()=>{
 const res=()=>({statusCode:200,body:null,setHeader(){},status(n){this.statusCode=n;return this},json(body){this.body=body;return this}});
 for(const [req,code] of [[{method:'POST',query:{}},405],[{method:'GET',query:{refresh:'1'}},400]]){
  const r=res();await unlocks(req,r);assert.equal(r.statusCode,code);
 }
});
