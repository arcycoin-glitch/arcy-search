'use strict';
// Browser acceptance for three-chain selectors and five-card presentation.
// Network APIs are fixture-bound here; genuine provider live tests run separately.
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const schema=require('../schema');
const addr='0x73e5f588d27d6b5ec89c89c82692d1e7fecbd38b';
const chainIds={arc:5042,ethereum:1,robinhood:4663};
const port=36911;
const base='http://127.0.0.1:'+port;
const values={
 totalSupply:'1234567890',circulatingSupply:null,burnAddressBalance:'70429498',
 burnAddressPct:7.0429498,holderCount:245000,largestWalletPct:12.345678,
 top10Pct:40.3333333,top20Pct:60.313131,liquidityUsd:1765432.12,
 volume24h:28473.22,dexPairCount:'2 DEX · 4163 pairs',lpStatus:null,
 priceUsd:'0.000000031234',valuation:12345678.99,change24h:-1.23234567,
 tradingTaxes:null,mintCapability:null,ownerAdmin:'owner() getter: 0x1234567890123456789012345678901234567890',
 contractArchitecture:null
};
const sourceField=(key,network)=>values[key]===null?{
 value:null,dataState:'NOT_VERIFIED',status:'NOT_VERIFIED',
 reason:'Insufficient contract-matched evidence.',reasonCode:'INSUFFICIENT_EVIDENCE'
}:{
 value:values[key],dataState:'DATA_FOUND',status:'SOURCE_REPORTED',
 network,chainId:chainIds[network],source:'Three-chain browser fixture',
 ...(key==='valuation'?{kind:'MARKET_CAP'}:{}),
 evidence:[{network,chainId:chainIds[network],address:addr,source:'Browser fixture'}]
};
function report(network){
 const cards=Object.fromEntries(schema.map(x=>[x.id,{
  description:'Fixture-bound exact-chain report',
  fields:Object.fromEntries(x.fields.map(([key])=>[key,sourceField(key,network)]))
 }]));
 return {ok:true,chainId:chainIds[network],network,address:addr,
  block:'0x12345',scannedAt:'2026-10-11T12:00:00.000Z',
  cardCount:5,schemaVersion:1,token:{name:'Research Token',symbol:'ARCY',decimals:18},
  tokenIdentity:{status:'NOT_VERIFIED'},cards};
}
async function connect(){
 for(let i=0;i<120;i++){
  try{const r=await fetch(base);if(r.status===200)return}catch{}
  await new Promise(r=>setTimeout(r,150));
 }
 throw Error('Local browser fixture server did not start');
}
async function main(){
 const server=spawn(process.execPath,['dev.cjs'],{
  cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port)},stdio:'ignore'
 });
 let browser;
 const results=[];
 try{
  await connect();browser=await chromium.launch({headless:true});
  for(const width of [320,390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:850}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   await page.route('**/api/**',async route=>{
    const u=new URL(route.request().url()),network=u.searchParams.get('chain')||'arc';
    if(!Object.hasOwn(chainIds,network))return route.fulfill({status:400,body:'{}'});
    if(u.pathname==='/api/report'){
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(report(network))});
    }
    if(u.pathname==='/api/discover'){
     return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({ok:true,network,chainId:chainIds[network],
       matches:[{name:'Research Token',symbol:'ARCY',address:addr,network,
        chainId:chainIds[network],source:'Browser fixture',
        identity:{status:'NOT_VERIFIED'}}]})});
    }
    return route.fulfill({status:404,body:'{}'});
   });
   await page.goto(base,{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('.card').count(),5);
   assert.equal(await page.locator('.metric').count(),20);
   assert.equal(await page.locator('select#chain option').count(),3);
   assert.equal(await page.locator('footer a[href*="github.com"]').count(),1);
   assert.equal(await page.locator('#chain').inputValue(),'arc');
   assert.equal(await page.locator('#discovery').isVisible(),true);
   assert.equal(await page.locator('#tokenDetail').isVisible(),false);
   assert.match(await page.locator('.hero h2').innerText(),/Know what you're buying/);
   await page.locator('#address').fill(addr);
   await page.locator('#go').click();
   await page.waitForURL('**/token/arc/'+addr);
   await page.waitForFunction(()=>document.querySelector('#detailState').textContent.includes('Snapshot complete'));
   assert.equal(await page.locator('#tokenDetail').isVisible(),true);
   assert.equal(await page.locator('#discovery').isVisible(),false);
   assert.match(await page.locator('#asset').innerText(),/Arc/);
   assert.equal(await page.locator('#quickFacts .quick').count(),3);
   assert.equal(await page.locator('#cards .card').count(),5);
   assert.equal(await page.locator('#cards .metric').count(),20);
   const metrics=await page.locator('#cards').innerText();
   assert.match(metrics,/\\$3\\.123e-8/);
   assert.match(metrics,/1\\.235B/);
   assert.ok(!metrics.includes('0.000000031234'),'Small price must be compact in summary');
   assert.ok(await page.locator('.exactNumber').count()>0,'Unrounded source values stay available');
   assert.match(await page.locator('#chartNote').innerText(),/No exact-chain price history/);
   for(const [network,label] of [['ethereum','Ethereum'],['robinhood','Robinhood Chain'],['arc','Arc']]){
    await page.locator('#backSearch').click();
    assert.equal(await page.locator('#discovery').isVisible(),true);
    assert.equal(new URL(page.url()).pathname,'/');
    await page.locator('#chain').selectOption(network);
    await page.locator('#address').fill(addr);
    await page.locator('#go').click();
    await page.waitForURL('**/token/'+network+'/'+addr);
    await page.waitForFunction(()=>document.querySelector('#detailState').textContent.includes('Snapshot complete'));
    assert.match(await page.locator('#asset').innerText(),new RegExp(label));
    assert.equal(await page.locator('.metric').count(),20);
   }
   await page.goto(base+'/token/arc/'+addr,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#detailState').textContent.includes('Snapshot complete'));
   assert.equal(await page.locator('#chain').inputValue(),'arc');
   assert.equal(await page.locator('#tokenDetail').isVisible(),true);
   assert.equal(await page.locator('#discovery').isVisible(),false);
   await page.locator('#backSearch').click();
   await page.locator('#address').fill('ARCY');
   await page.locator('#go').click();
   await page.waitForSelector('.candidate');
   assert.equal(await page.locator('.candidate').count(),1);
   await page.locator('.candidate').click();
   await page.waitForURL('**/token/arc/'+addr);
   await page.waitForFunction(()=>document.querySelector('#detailState').textContent.includes('Snapshot complete'));
   await page.locator('#backSearch').click();
   await page.locator('#address').fill('0x123');
   await page.locator('#go').click();
   assert.match(await page.locator('#state').innerText(),/Enter a token name/);
   const scroll=await page.evaluate(()=>document.documentElement.scrollWidth);
   assert.ok(scroll<=width,'Horizontal overflow: '+scroll+' > '+width);
   assert.deepEqual(errors,[],'Browser console/page errors');
   results.push({width,status:'PASS',chains:3,cards:5,fields:20,horizontalOverflow:false});
   await page.close();
  }
  for(const x of results)console.log(JSON.stringify(x));
  console.log('Three-chain browser acceptance: '+results.length+'/'+results.length+' viewport PASS');
 }finally{
  await browser?.close();
  server.kill('SIGTERM');
 }
}
main().catch(e=>{console.error('Three-chain browser acceptance FAILED: '+String(e.stack||e));process.exitCode=1});
