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
    if(u.pathname==='/api/unlocks'){
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      ok:true,status:'CONFIRMED_EVENTS',generatedAt:'2026-10-11T12:00:00Z',
      confirmed:[{name:'Api3',symbol:'API3',date:'2026-10-20',amount:'1.5M API3',
       verification:'project-confirmed',logoUrl:null,
       sourceUrl:'https://www.api3.org/tokenomics'}],
      reported:[{name:'Example Calendar',symbol:'EX',date:'2026-10-24',amount:'2M EX',
       verification:'source-published',logoUrl:null,
       sourceUrl:'https://api.coinbell.in/token-unlocks?sort=soonest&window=30'}]})});
    }
    if(u.pathname==='/api/pulse'){
     return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({ok:true,number:3,status:'UPDATED',checkedAt:'2026-10-11T14:00:00Z',
       cards:[{owner:'OFFICIAL ARC',title:'Arc Mainnet infrastructure report',
        publishedAt:'2026-10-10T10:00:00Z',
        sourceUrl:'https://www.arc.io/blog/developer-update'}],coverage:{checked:5,total:5}})});
    }
    if(u.pathname==='/api/token'){
     const mainnetAddress='0x73e5f588d27d6b5ec89c89c82692d1e7fecbd38b';
     return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({ok:true,chainId:5042,network:'arc',address:mainnetAddress,block:'0x12345',
       fields:{
        totalSupply:{...sourceField('totalSupply','arc'),value:'1234567890'},
        burnAddressBalance:{...sourceField('burnAddressBalance','arc'),value:'70429498'},
        burnAddressPct:{...sourceField('burnAddressPct','arc'),value:7.0429498}
       }})});
    }
    if(u.pathname==='/api/chart'){
     const networkId=network==='ethereum'?'eth':'arc';
     return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({ok:true,network,chainId:chainIds[network],address:addr,
       source:'GeckoTerminal',sourceUrl:'https://www.geckoterminal.com/'+networkId+'/pools/0x'+
        'c'.repeat(40),range:'30D',lastCandleTime:1728000000,
       points:[{time:1727827200,close:1},{time:1727913600,close:1.04},{time:1728000000,close:1.02}]})});
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
   // All mobile browsers must see the website's dark selector, not a white native OS sheet.
   assert.equal(await page.locator('select').count(),0);
   assert.equal(await page.locator('#chainMenu [role="option"]').count(),3);
   assert.equal(await page.locator('#chainMenu .chain-mark svg').count(),3);
   assert.equal(await page.locator('#chainTrigger .chain-mark svg').count(),1);
   assert.equal(await page.locator('#chain').inputValue(),'arc');
   assert.equal(await page.locator('#chainTrigger').getAttribute('aria-expanded'),'false');
   await page.locator('#chainTrigger').click();
   assert.equal(await page.locator('#chainMenu').isVisible(),true);
   assert.equal(await page.locator('#chainTrigger').getAttribute('aria-expanded'),'true');
   assert.deepEqual((await page.locator('#chainMenu [role="option"]').allInnerTexts()),['Arc','Ethereum','Robinhood Chain']);
   assert.ok(!(await page.locator('#chainMenu').innerText()).includes('5042'));
   const theme=await page.locator('#chainMenu').evaluate(x=>getComputedStyle(x).backgroundColor);
   assert.ok(!['rgb(255, 255, 255)','rgb(250, 250, 250)'].includes(theme),'Network selection must never be white');
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#chainMenu').isVisible(),false);
   await page.locator('#chainTrigger').click();
   await page.locator('#chainOptionEthereum').click();
   assert.equal(await page.locator('#chain').inputValue(),'ethereum');
   assert.equal(await page.locator('#currentChainName').innerText(),'Ethereum');
   assert.equal(await page.locator('#chainMenu').isVisible(),false);
   await page.locator('#chainTrigger').click();
   await page.keyboard.press('End');
   await page.keyboard.press('Enter');
   assert.equal(await page.locator('#chain').inputValue(),'robinhood');
   await page.locator('#chainTrigger').click();
   await page.locator('#chainOptionArc').click();
   assert.equal(await page.locator('#chain').inputValue(),'arc');
   assert.equal(await page.locator('footer a[href*="github.com"]').count(),1);
   assert.equal(await page.locator('#discovery').isVisible(),true);
   assert.equal(await page.locator('#tokenDetail').isVisible(),false);
   await page.locator('#arcyBurn').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('#burnProof').textContent.includes('3/3 source-backed'));
   assert.equal(await page.locator('#burnSupply').innerText(),'1.235B');
   assert.equal(await page.locator('#burnHeld').innerText(),'70.43M');
   assert.match(await page.locator('#burnProof').innerText(),/Current burn-address balances are NOT proof/);
   await page.locator('#tokenUnlocks').scrollIntoViewIfNeeded();
   await page.waitForSelector('#unlockConfirmed .unlock-entry');
   assert.equal(await page.locator('#unlockConfirmed .unlock-entry').count(),1);
   assert.match(await page.locator('#unlockConfirmed').innerText(),/Api3/);
   assert.equal(await page.locator('#unlockReported').getAttribute('hidden'),null);
   assert.equal(await page.locator('#unlockReportedRows .unlock-entry').count(),1);
   assert.match(await page.locator('#unlockReported > summary').innerText(),/Not issuer confirmed/);
   await page.locator('#arcPulse').scrollIntoViewIfNeeded();
   await page.waitForSelector('.pulse-entry');
   assert.equal(await page.locator('.pulse-entry').count(),1);
   assert.match(await page.locator('.pulse-entry').innerText(),/Arc Mainnet infrastructure report/);
   assert.equal(await page.locator('.pulse-entry').getAttribute('href'),'https://www.arc.io/blog/developer-update');
   const swap=page.locator('#arcySwap a.premium-action');
   const swapURL=new URL(await swap.getAttribute('href'));
   assert.equal(swapURL.origin,'https://app.uniswap.org');
   assert.equal(swapURL.pathname,'/swap');
   assert.equal(swapURL.searchParams.get('chain'),'arc');
   assert.equal(swapURL.searchParams.get('outputCurrency'),addr);
   assert.equal(await swap.getAttribute('target'),'_blank');
   assert.equal(await page.locator('#arcyResearch a[href="https://github.com/arcycoin-glitch/arcy-search"]').count(),1);
   await page.locator('.hero').scrollIntoViewIfNeeded();
   assert.match(await page.locator('.hero h2').innerText(),/Know what you're buying/);
   // The canonical owl PNG is stored in the new repository, not a generated substitute.
   const mascot=page.locator('.hero-mascot img');
   assert.equal(await mascot.count(),1);
   assert.match(await mascot.getAttribute('alt'),/original blue-and-white owl/i);
   assert.equal(await mascot.getAttribute('src'),'/assets/hero-arcy.png');
   await mascot.evaluate(img=>img.decode());
   const natural=await mascot.evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight}));
   assert.ok(natural.width>0&&natural.height>0,'ARCY owl image must load successfully');
   assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'),'/assets/hero-arcy.png');
   const greeting=page.locator('.hero-greeting-video');
   assert.equal(await greeting.count(),1);
   assert.equal(await greeting.getAttribute('data-src'),'/assets/arcy-greeting.mp4');
   assert.equal(await greeting.getAttribute('muted'),'');
   assert.equal(await greeting.getAttribute('playsinline'),'');
   const range=await page.request.get(base+'/assets/arcy-greeting.mp4',{headers:{Range:'bytes=0-15'}});
   assert.equal(range.status(),206,'Greeting video must support byte-range playback');
   const body=await range.body();
   assert.equal(body.byteLength,16);
   assert.equal(body.subarray(4,8).toString(),'ftyp');


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
   assert.equal(await page.locator('#deepResearch').getAttribute('open'),null);
   assert.equal(await page.locator('#moreResearch').getAttribute('open'),null);
   await page.locator('#deepResearch > summary').click();
   const metrics=await page.locator('#cards').innerText();
   assert.match(metrics,/\$3\.123e-8/);
   assert.match(metrics,/1\.235B/);
   assert.ok(!metrics.includes('0.000000031234'),'Small price must be compact in summary');
   assert.ok(await page.locator('.exactNumber').count()>0,'Unrounded source values stay available');
   assert.equal(await page.locator('.proof-panel').count(),5);
   const firstProof=page.locator('.proof-panel').first();
   await firstProof.locator(':scope > summary').click();
   assert.equal(await firstProof.locator('.proof-entry').count(),4);
   assert.match(await firstProof.locator('.proof-entry').first().innerText(),/SOURCE BACKED|NOT VERIFIED/);
   assert.equal(await firstProof.locator('.advanced-proof').getAttribute('open'),null);
   await firstProof.locator('.advanced-proof > summary').click();
   assert.match(await firstProof.locator('.advanced-proof pre').innerText(),/"fields"/);
   await page.waitForSelector('#chartPlot svg');
   assert.match(await page.locator('#chartNote').innerText(),/GeckoTerminal/);
   assert.equal(await page.locator('#marketLink').isVisible(),true);
   for(const [network,label] of [['ethereum','Ethereum'],['robinhood','Robinhood Chain'],['arc','Arc']]){
    await page.locator('#backSearch').click();
    assert.equal(await page.locator('#discovery').isVisible(),true);
    assert.equal(new URL(page.url()).pathname,'/');
    await page.locator('#chainTrigger').click();
    await page.locator('[data-chain="'+network+'"]').click();
    assert.equal(await page.locator('#currentChainName').innerText(),label);
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
   assert.equal(await page.locator('#currentChainName').innerText(),'Arc');
   assert.equal(await page.locator('#tokenDetail').isVisible(),true);
   assert.equal(await page.locator('#discovery').isVisible(),false);
   await page.locator('#backSearch').click();
   await page.locator('#address').fill('ARCY');
   await page.locator('#go').click();
   await page.waitForSelector('.candidate');
   assert.equal(await page.locator('.candidate').count(),1);
   assert.equal(await page.locator('.candidate-logo img').getAttribute('src'),'/assets/hero-arcy.png');
   await page.locator('.candidate').click();
   await page.waitForURL('**/token/arc/'+addr);
   await page.waitForFunction(()=>document.querySelector('#detailState').textContent.includes('Snapshot complete'));
   assert.equal(await page.locator('#asset .token-title-logo').getAttribute('src'),'/assets/hero-arcy.png');
   await page.locator('#asset .token-title-logo').evaluate(img=>img.decode());
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
