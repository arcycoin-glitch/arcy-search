'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalizeQuery,parse,discover}=require('../lib/discover');
const handler=require('../api/discover');
const ETH='0x'+'a'.repeat(40),ALT='0x'+'b'.repeat(40),WRONG='0x'+'c'.repeat(40);
const pair=(base,quote,props={})=>({chainId:'ethereum',liquidity:{usd:1000},baseToken:base,quoteToken:quote,...props});
const uni={name:'Uniswap',symbol:'UNI',address:ETH};
const second={name:'Uniswap Replica',symbol:'UNI',address:ALT};
const other={name:'No relation',symbol:'TEST',address:WRONG};
const res=()=>({statusCode:200,body:null,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;return this},status(n){this.statusCode=n;return this},json(v){this.body=v;return this}});
test('name search accepts reasonable symbols and names, rejects addresses and long inputs',()=>{
 assert.equal(normalizeQuery('  Uniswap  '),'Uniswap');
 assert.equal(normalizeQuery('  UNI '),'UNI');
 assert.equal(normalizeQuery(' BUNKER '),'BUNKER');
 assert.equal(normalizeQuery('a'),null);
 assert.equal(normalizeQuery('0x'+'f'.repeat(40)),null);
 assert.equal(normalizeQuery('a'.repeat(100)),null);
 assert.equal(normalizeQuery('<script>'),null);
 assert.equal(normalizeQuery(['UNI']),null);
});
test('only Ethereum and exact name/ticker matching are returned',()=>{
 const result=parse([pair(uni,other),pair(other,uni,{chainId:'base'}),pair({name:'Different',symbol:'DIF',address:ALT},other)],'uni');
 assert.equal(result.length,1);
 assert.equal(result[0].address,ETH);
 assert.equal(result[0].chainId,1);
 assert.equal(result[0].identityVerified,false);
});
test('same-name contracts stay separate and duplicate listings deduplicate',()=>{
 const result=parse([pair(uni,other,{liquidity:{usd:100}}),pair(uni,other,{liquidity:{usd:500}}),pair(second,other)],'UNI');
 assert.equal(result.length,2);
 assert.deepEqual(result.map(x=>x.address).sort(),[ETH,ALT].sort());
 assert.equal(result.some(x=>x.identityVerified),false);
});
test('quote token is discoverable only if its own name matches',()=>{
 const result=parse([pair(other,uni)],'Uniswap');
 assert.equal(result.length,1);
 assert.equal(result[0].address,ETH);
});
test('bad contract addresses and malformed source responses fail closed',()=>{
 const missing={name:'UNI',symbol:'UNI',address:'malformed'};
 assert.deepEqual(parse([pair(missing,other)],'UNI'),[]);
 assert.deepEqual(parse([{chainId:'ethereum',baseToken:{name:'UNI',symbol:'UNI',address:'0x0'}}],'UNI'),[]);
});
test('discovery endpoint validates method and query strictly without using provider',async()=>{
 for(const [req,code] of [
  [{method:'POST',query:{q:'UNI'}},405],
  [{method:'GET',query:{q:'a'}},400],
  [{method:'GET',query:{q:['UNI','UNI']}},400],
  [{method:'GET',query:{q:'UNI',extra:'X'}},400],
  [{method:'GET',query:{q:'<img src=x>'}},400]
 ]){
  const r=res();
  await handler(req,r);
  assert.equal(r.statusCode,code);
  assert.equal(r.body.ok,false);
 }
});
test('discovery adapter supports source-reported results and 429 upstream failures',async()=>{
 const original=global.fetch;
 try{
  global.fetch=async()=>new Response(JSON.stringify({pairs:[pair(uni,other)]}),{status:200,headers:{'content-type':'application/json'}});
  const found=await discover('Uniswap');assert.equal(found.length,1);
  global.fetch=async()=>new Response('Rate limited',{status:429});
  await assert.rejects(discover('UNI'),/All discovery providers unavailable/);
 }finally{global.fetch=original}
});
test('name discovery response is bounded to at most twelve candidates',()=>{
 const many=Array.from({length:50},(_,i)=>pair({name:'Example Token '+i,symbol:'EXAMPLE',address:'0x'+(i+1).toString(16).padStart(40,'0')},other));
 const r=parse(many,'EXAMPLE');
 assert.equal(r.length,12);
});

test('CoinGecko fallback returns only an Ethereum contract from exact coin detail identity',async()=>{
 const original=global.fetch;
 const q='Uniswap',coin={id:'uniswap',name:'Uniswap',symbol:'UNI'};
 try{
  global.fetch=async url=>{
   if(String(url).includes('/api/v3/search?'))return new Response(JSON.stringify({coins:[coin,{id:'fake-bridge',name:'Uniswap Bridge',symbol:'UNI'}]}));
   if(String(url).includes('/coins/uniswap?'))return new Response(JSON.stringify({id:'uniswap',platforms:{ethereum:ETH}}));
   if(String(url).includes('/coins/fake-bridge?'))return new Response(JSON.stringify({id:'other-coin',platforms:{ethereum:ALT}}));
   return new Response(JSON.stringify({pairs:[]}));
  };
  const r=await discover(q);
  assert.equal(r.length,1);
  assert.equal(r[0].address,ETH);
  assert.equal(r[0].source,'CoinGecko');
  assert.equal(r[0].identityVerified,false);
 }finally{global.fetch=original}
});
test('CoinGecko never accepts a coin that lacks an exact Ethereum contract',async()=>{
 const original=global.fetch;
 try{
  global.fetch=async url=>{
   if(String(url).includes('/api/v3/search?'))return new Response(JSON.stringify({coins:[{id:'bridged-uni',name:'Uniswap',symbol:'UNI'}]}));
   if(String(url).includes('/coins/bridged-uni?'))return new Response(JSON.stringify({id:'bridged-uni',platforms:{base:ALT,ethereum:null}}));
   return new Response(JSON.stringify({pairs:[]}));
  };
  assert.deepEqual(await discover('Uniswap'),[]);
 }finally{global.fetch=original}
});
