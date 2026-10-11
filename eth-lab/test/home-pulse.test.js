'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const pulse=require('../api/pulse');
const cycle=Date.parse('2026-10-11T14:00:00Z');
const normal={
 success:true,number:2,status:'updated',generatedAt:new Date(cycle).toISOString(),
 cards:[{owner:'OFFICIAL ARC',title:'Arc mainnet developer changes',
  url:'https://www.arc.io/blog/developer-changes',publishedAt:'2026-10-10T09:00:00Z',
  summary:'First party documentation'}],
 audit:{sourcesSuccessfullyChecked:4}
};
test('Pulse only renders current week articles from configured first-party origins',()=>{
 const input={...normal,cards:[...normal.cards,
  {...normal.cards[0],url:'https://fake-arc.io/blog/developer-changes'},
  {...normal.cards[0],url:'https://www.arc.io/blog/outdated',publishedAt:'2026-09-01T10:00:00Z'},
  {...normal.cards[0],url:'http://www.arc.io/blog/insecure'},
  {...normal.cards[0],url:'https://www.arc.io/blog/future',publishedAt:'2026-10-20T10:00:00Z'}]};
 const d=pulse.sanitize(input,cycle);
 assert.equal(d.cards.length,1);assert.equal(d.cards[0].sourceUrl,normal.cards[0].url);
 assert.equal(d.status,'UPDATED');assert.equal(d.coverage.total,5);assert.equal(d.coverage.checked,4);
});
test('Pulse empty week never fabricates headlines and rejects invalid editions',()=>{
 const q=pulse.sanitize({...normal,status:'quiet_week',cards:[{
  title:'No major verified update this week.',url:'',publishedAt:'2026-10-11T10:00:00Z'}]},cycle);
 assert.deepEqual(q.cards,[]);assert.equal(q.status,'NO_VERIFIED_UPDATES');
 assert.throws(()=>pulse.sanitize({...normal,success:false},cycle));
});
test('Public read-only Pulse endpoint rejects writes and parameters',async()=>{
 const res=()=>({statusCode:200,body:null,setHeader(){},status(x){this.statusCode=x;return this},
  json(x){this.body=x;return this}});
 for(const req of [{method:'POST',query:{}},{method:'GET',query:{q:'x'}}]){
  const r=res();await pulse(req,r);
  assert.equal(r.statusCode,req.method==='POST'?405:400);
 }
});
