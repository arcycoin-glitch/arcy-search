'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const rpc=require('../lib/robinhood-rpc');
const market=require('../lib/robinhood-market');
const adapter=require('../lib/robinhood-adapter');
const assets=require('../lib/robinhood-assets');
const reportApi=require('../api/report'),tokenApi=require('../api/token'),discoveryApi=require('../api/discover');
const A='0x1cdad396db64bda184d5182a97dd9b3c62100b7d';
const B='0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const word=n=>'0x'+BigInt(n).toString(16).padStart(64,'0');
function mockResponse(){return{statusCode:200,body:null,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;return this},status(n){this.statusCode=n;return this},json(v){this.body=v;return this}}}
test('Robinhood report, token, discover reject unexpected chain and array query inputs',async()=>{
 for(const handler of [reportApi,tokenApi]){
  for(const query of [
   {address:A,chain:'ethereum',unknown:'1'},
   {address:A,chain:['robinhood','ethereum']},
   {address:A,chain:'robinhood-testnet'},
   {address:A,chain:'Robinhood'},
   {address:A,chain:4663},
   {address:[A,A],chain:'robinhood'}
  ]){
   const r=mockResponse();await handler({method:'GET',query},r);
   assert.equal(r.statusCode,400);
  }
 }
 for(const query of [{q:'APLD',chain:['ethereum','robinhood']},{q:'APLD',chain:'base'}, {q:'APLD',chain:'robinhood',extra:'x'}]){
  const r=mockResponse();await discoveryApi({method:'GET',query},r);assert.equal(r.statusCode,400);
 }
});
test('Robinhood price never uses Ethereum pools, unrelated contracts or quote-side base prices',()=>{
 const pair={chainId:'robinhood',dexId:'dex-one',pairAddress:'0x'+'d'.repeat(40),
  baseToken:{address:A},quoteToken:{address:B},priceUsd:'75',priceChange:{h24:-2},
  liquidity:{usd:1000},volume:{h24:200},marketCap:1400};
 const match=market.parse([pair,{...pair,chainId:'ethereum'},{...pair,pairAddress:'0x'+'e'.repeat(40),baseToken:{address:B},quoteToken:{address:A},priceUsd:'1337'}],A);
 assert.equal(match.priceUsd.value,'75');
 assert.equal(match.liquidityUsd.value,2000);
 assert.equal(match.dexPairCount.value,'1 DEX · 2 pairs');
 assert.equal(match.lpStatus.value,null);
 assert.equal(match.priceUsd.chainId,4663);
 assert.equal(match.priceUsd.network,'robinhood');
 assert.equal(match.valuation.kind,'MARKET_CAP');
 assert.equal(market.parse([{...pair,chainId:'ethereum'}],A).priceUsd.value,null);
 assert.equal(market.parse([{...pair,baseToken:{address:B},quoteToken:{address:A}}],A).priceUsd.value,null);
});
test('Robinhood liquidity and activity share one in-flight market request',async()=>{
 const original=global.fetch,A='0x'+'a'.repeat(40);let calls=0;
 try{
  global.fetch=async url=>{calls++;assert.match(String(url),/api\.dexscreener\.com\/latest\/dex\/tokens/);return new Response(JSON.stringify({pairs:[]}))};
  await Promise.all([
   adapter.inspectCard({address:A,cardId:'liquidity'}),
   adapter.inspectCard({address:A,cardId:'activity'})
  ]);
  assert.equal(calls,1);
 }finally{global.fetch=original}
});
test('same-symbol contract clone cannot match the official Stock Token registry',()=>{
 const registry={assets:[{tokenSymbol:'APLD',tokenName:'Applied Digital • Robinhood Token',
  deployments:[{chainId:4663,contractAddress:A}]}]};
 const clone='0x'+'c'.repeat(40);
 assert.equal(assets.byContract(registry,clone),null);
});
test('Robinhood RPC 429 and malformed JSON fail closed without response-body leakage',async()=>{
 const original=global.fetch;
 try{
  global.fetch=async()=>new Response('sensitive-provider-error',{status:429});
  await assert.rejects(rpc.rpc('eth_blockNumber',[]),e=>e.message==='Robinhood RPC HTTP 429'&&!e.message.includes('sensitive-provider-error'));
  global.fetch=async()=>new Response('{bad json',{status:200});
  await assert.rejects(rpc.rpc('eth_blockNumber',[]),/malformed JSON/);
 }finally{global.fetch=original}
});
test('Robinhood RPC timeout aborts a pending provider request',async()=>{
 const original=global.fetch;
 try{
  global.fetch=async(_url,{signal})=>new Promise((_,reject)=>{
   if(signal.aborted)return reject(new DOMException('Aborted','AbortError'));
   signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
  });
  await assert.rejects(rpc.rpc('eth_blockNumber',[],{timeoutMs:5}),e=>e.name==='AbortError'||e.name==='TimeoutError');
 }finally{global.fetch=original}
});
test('Robinhood pinned-block RPC rejects wrong-chain endpoint before totalSupply call',async()=>{
 const original=global.fetch;const methods=[];
 try{
  global.fetch=async(_url,init)=>{
   const req=JSON.parse(init.body);methods.push(req.method);
   return new Response(JSON.stringify({jsonrpc:'2.0',id:req.id,result:'0xb626'}),{headers:{'content-type':'application/json'}});
  };
  await assert.rejects(rpc.inspectToken({address:A}),/mismatch/);
  assert.deepEqual(methods,['eth_chainId']);
 }finally{global.fetch=original}
});
test('Robinhood token mainnet RPC rejects absent contract and safely parses valid ERC20 balances',async()=>{
 const old=global.fetch;
 let chain='0x1237',bytecode='0x60016001';
 const methods=[],block='0x300';
 try{
  global.fetch=async(_url,init)=>{
   const req=JSON.parse(init.body);methods.push(req.method);
   let result;
   if(req.method==='eth_chainId')result=chain;
   else if(req.method==='eth_blockNumber')result=block;
   else if(req.method==='eth_getCode')result=bytecode;
   else if(req.method==='eth_call'){
    const sig=req.params[0].data.slice(0,10);
    result=sig==='0x18160ddd'?word(100000000000000000000n):
     sig==='0x313ce567'?word(18):
     sig==='0x06fdde03'?'0x'+Buffer.from('Mock Stock').toString('hex').padEnd(64,'0'):
     sig==='0x95d89b41'?'0x'+Buffer.from('MST').toString('hex').padEnd(64,'0'):word(0);
   }else throw Error('Unexpected method');
   return new Response(JSON.stringify({jsonrpc:'2.0',id:req.id,result}));
  };
  const t=await rpc.inspectToken({address:A});
  assert.equal(t.block,block);assert.equal(t.network,'robinhood');assert.equal(t.chainId,4663);
  assert.equal(t.totalSupply,'100');assert.equal(t.token.symbol,'MST');assert.equal(t.burnAddressBalance,'0');
  assert.ok(methods.every(k=>['eth_chainId','eth_blockNumber','eth_getCode','eth_call'].includes(k)));
  bytecode='0x';
  await assert.rejects(rpc.inspectToken({address:A}),/No verified token contract/);
  chain='0x1';
  await assert.rejects(rpc.inspectToken({address:A}),/mismatch/);
 }finally{global.fetch=old}
});
test('Robinhood source failures cannot manufacture holder counts or concentrations',async()=>{
 const old=global.fetch;
 try{
  global.fetch=async()=>new Response('<html>Forbidden</html>',{status:403});
  const x=await adapter.holder({address:A});
  assert.equal(x.fields.holderCount.value,null);
  assert.equal(x.fields.top20Pct.value,null);
 }finally{global.fetch=old}
});
test('Robinhood tiny positive burn ratio remains positive, not rounded to zero',async()=>{
 const fields=(await adapter.supply({address:A,block:'0x123',totalSupply:'100',
  totalSupplyRaw:'100000000000000000000',
  burnAddressRaw:'10000000000',burnAddressBalance:'0.00000001'})).fields;
 assert.ok(fields.burnAddressPct.value>0);
 assert.equal(fields.burnAddressPct.network,'robinhood');
 assert.equal(fields.circulatingSupply.value,null);
 const extreme=(await adapter.supply({address:A,block:'0x123',totalSupply:'1',
  totalSupplyRaw:'1'+'0'.repeat(77),burnAddressRaw:'1',burnAddressBalance:'0'})).fields.burnAddressPct;
 assert.equal(extreme.dataState,'DATA_FOUND');
 assert.ok(extreme.value>0);
});

test('Robinhood official Stock Token discovery survives chain-label normalization',async()=>{
 const original=global.fetch;
 const asset={assets:[{tokenSymbol:'APLD',tokenName:'Applied Digital • Robinhood Token',
  deployments:[{chainId:4663,contractAddress:B}],currentMultiplier:'1.000000000000000000',
  status:'ASSET_STATUS_ACTIVE'}]};
 try{
  global.fetch=async url=>{
   if(String(url)==='https://api.robinhood.com/rhj/assets')return new Response(JSON.stringify(asset),{status:200});
   if(String(url).includes('/dex/search/'))return new Response(JSON.stringify({pairs:[]}),{status:200});
   throw Error('Unexpected source');
  };
  const x=await adapter.discover({query:'APLD'});
  assert.equal(x.length,1);
  assert.equal(x[0].network,'robinhood');
  assert.equal(x[0].chainId,4663);
  assert.equal(x[0].registryMatched,true);
  const y=await require('../lib/multichain-service').engine.discover({network:'robinhood',query:'APLD'});
  assert.equal(y.candidates[0].registryMatched,true);
  assert.equal(y.candidates[0].address,B);
 }finally{global.fetch=original}
});
