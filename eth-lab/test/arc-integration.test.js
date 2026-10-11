'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const chain=require('../lib/chains');
const rpc=require('../lib/arc-rpc');
const market=require('../lib/arc-market');
const adapter=require('../lib/arc-adapter');
const service=require('../lib/multichain-service');
const A='0x1234567890123456789012345678901234567890';
const B='0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const word=n=>'0x'+BigInt(n).toString(16).padStart(64,'0');

test('Arc 5042 is isolated from Ethereum, Robinhood and testnets',()=>{
 assert.equal(chain.chain('arc').chainId,5042);
 assert.equal(chain.verifyChainId('arc','0x13b2'),5042);
 assert.throws(()=>chain.verifyChainId('arc','0x1'),/mismatch/);
 assert.throws(()=>chain.verifyChainId('arc','0x1237'),/mismatch/);
 assert.throws(()=>chain.verifyChainId('arc','0x4cef32'),/mismatch/);
 assert.throws(()=>chain.rpcUrl('arc',{ARC_RPC_URL:'http://public.example'}),/HTTPS/);
 assert.equal(service.parseChain('arc'),'arc');
 assert.throws(()=>service.parseChain('Arc'),/Unsupported network/);
 assert.throws(()=>service.parseChain('arc-testnet'),/Unsupported network/);
});

test('exact-chain Arc DEX pairs exclude Ethereum, unrelated and duplicate pools',()=>{
 const pair={chainId:'arc',dexId:'argus',pairAddress:'0x'+'9'.repeat(40),
  baseToken:{address:A},quoteToken:{address:B},priceUsd:'0.000000031234',
  priceChange:{h24:2.5},liquidity:{usd:180000},volume:{h24:40000},fdv:870000};
 const mixed=[pair,{...pair,chainId:'ethereum'},
  {...pair,pairAddress:'0x'+'8'.repeat(40),baseToken:{address:B},quoteToken:{address:A},priceUsd:'2000'},
  {...pair,baseToken:{address:B},quoteToken:{address:B}},
  {...pair,priceUsd:'9999'}];
 const fields=market.parse(mixed,A.toLowerCase());
 assert.equal(fields.priceUsd.value,'0.000000031234');
 assert.equal(fields.liquidityUsd.value,360000);
 assert.equal(fields.dexPairCount.value,'1 DEX · 2 pairs');
 assert.equal(fields.valuation.kind,'FDV');
 assert.equal(fields.priceUsd.chainId,5042);
 assert.equal(fields.priceUsd.network,'arc');
 assert.equal(fields.lpStatus.value,null);
 assert.equal(market.parse([{...pair,chainId:'ethereum'}],A.toLowerCase()).priceUsd.value,null);
});

test('Arc RPC pins onchain calls to the verified chain and block',async()=>{
 const previous=global.fetch,calls=[],block='0x1234';
 try{
  global.fetch=async (_url,options)=>{
   const p=JSON.parse(options.body);
   calls.push(p);
   const method=p.method;
   const signature=method==='eth_call'?p.params[0].data.slice(0,10):'';
   const result=method==='eth_chainId'?'0x13b2':
    method==='eth_blockNumber'?block:
    method==='eth_getCode'?'0x60016001':
    method==='eth_call'?(signature==='0x18160ddd'?word(1000000000n):
     signature==='0x313ce567'?word(6):
     signature==='0x06fdde03'?'0x'+Buffer.from('Arc Token').toString('hex').padEnd(64,'0'):
     signature==='0x95d89b41'?'0x'+Buffer.from('ARCT').toString('hex').padEnd(64,'0'):word(0)):
    null;
   if(result===null)throw Error('Unexpected method '+method);
   return new Response(JSON.stringify({jsonrpc:'2.0',id:p.id,result}),{status:200});
  };
  const token=await rpc.inspectToken({address:A});
  assert.equal(token.chainId,5042);
  assert.equal(token.network,'arc');
  assert.equal(token.totalSupply,'1000');
  assert.equal(token.burnAddressBalance,'0');
  assert.ok(calls.filter(x=>['eth_getCode','eth_call'].includes(x.method)).every(x=>x.params[x.method==='eth_call'?1:1]===block));
  const fields=adapter.supply(token).fields;
  assert.equal(fields.totalSupply.value,'1000');
  assert.equal(fields.circulatingSupply.value,null);
  assert.equal(fields.burnAddressPct.value,0);
  assert.equal(fields.burnAddressPct.status,'ON_CHAIN_DERIVED');
  assert.ok(calls.every(x=>!x.method.startsWith('eth_send')));
 }finally{global.fetch=previous}
});

test('Arc RPC rejects other chain and refuses transaction methods',async()=>{
 const prev=global.fetch;
 try{
  global.fetch=async(_url,init)=>{const p=JSON.parse(init.body);
   return new Response(JSON.stringify({jsonrpc:'2.0',id:p.id,result:'0x1'}))};
  await assert.rejects(rpc.inspectToken({address:A}),/mismatch/);
  await assert.rejects(rpc.rpc('eth_sendRawTransaction',['0x00']),/not allowed/);
 }finally{global.fetch=prev}
});

test('Arc token discovery never promotes matching names on foreign chains',async()=>{
 const prev=global.fetch;
 const pair={chainId:'arc',baseToken:{address:A,name:'Original Arc',symbol:'ARCY'},
  quoteToken:{address:B,name:'USDC',symbol:'USDC'},info:{imageUrl:'https://cdn.dexscreener.com/token-images/test.png'}};
 try{
  global.fetch=async()=>new Response(JSON.stringify({pairs:[{...pair,chainId:'ethereum'},pair]}));
  const matches=await adapter.discover({query:'ARCY'});
  assert.equal(matches.length,1);
  assert.equal(matches[0].network,'arc');
  assert.equal(matches[0].address,A);
  assert.equal(matches[0].chainId,5042);
  assert.equal(matches[0].registryMatched,false);
  const ranked=require('../lib/token-identity').rank('arc','ARCY',matches);
  assert.equal(ranked.length,1);
  assert.equal(ranked[0].identity.status,'NOT_VERIFIED');
 }finally{global.fetch=prev}
});

test('Arc holder and tax gaps are explicit rather than fabricated zeros',async()=>{
 const h=await adapter.holders();
 assert.ok(Object.values(h.fields).every(x=>x.value===null&&x.dataState==='NOT_VERIFIED'));
 const result=await adapter.supply({address:A,block:'0x1',totalSupply:'100',
  totalSupplyRaw:'100000000',burnAddressRaw:null,burnAddressBalance:null});
 assert.equal(result.fields.burnAddressBalance.value,null);
 assert.equal(result.fields.burnAddressPct.value,null);
});
