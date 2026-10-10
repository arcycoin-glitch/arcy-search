'use strict';
/**
 * Live mainnet smoke test. No writes, no private keys, no swap.
 * Uses direct adapters locally; do not assume a protected Vercel preview is public.
 * Node >=22, run: npm run smoke
 */
const {inspect,rpc}=require('../lib/eth');
const {build}=require('../lib/report');
const {withTimeout}=require('../lib/timeout');
const schema=require('../schema');
const TESTS=[
 {symbol:'USDC',address:'0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'},
 {symbol:'UNI',address:'0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'},
 {symbol:'LINK',address:'0x514910771AF9Ca656af840dff83E8264EcF986CA'},
 // Address provenance: official Maker/Sky deployment docs, wbtc.network transparency,
 // and Tether's supported-protocols page (all cross-checked against Ethereum mainnet).
 {symbol:'DAI',address:'0x6B175474E89094C44Da98b954EedeAC495271d0F'},
 {symbol:'WBTC',address:'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'},
 {symbol:'USDT',address:'0xdAC17F958D2ee523a2206206994597C13D831ec7'}
];
const NEGATIVE=[
 {name:'malformed address',address:'0x123'},
 {name:'EOA/no code',address:'0x000000000000000000000000000000000000dEaD'},
 {name:'non-ERC20 contract',address:'0x06012c8cf97BEaD5deAe237070F9587f8E7A266d'}
];
async function main(){
 let passed=0,total=0;
 for(const t of TESTS){
  total++;
  const started=Date.now();
  try{
   const snapshot=await withTimeout(build(t.address),65000,'SMOKE_TIMEOUT');
   if(!snapshot.ok||snapshot.chainId!==1||snapshot.address!==t.address.toLowerCase())throw Error('CHAIN_IDENTITY_FAILED');
   if(snapshot.cardCount!==5||Object.keys(snapshot.cards).length!==5)throw Error('FIVE_CARD_SCHEMA_FAILED');
   for(const spec of schema){
     if(!snapshot.cards[spec.id])throw Error('MISSING_CARD_'+spec.id);
     const fields=snapshot.cards[spec.id].fields;
     if(spec.fields.length!==4||spec.fields.some(([key])=>!(key in fields)))throw Error('MISSING_FIELD_'+spec.id);
     if(Object.keys(fields).sort().join(',')!==spec.fields.map(([key])=>key).sort().join(','))throw Error('EXTRA_CARD_FIELD_'+spec.id);
     for(const [field] of spec.fields){
       const entry=fields[field];
       if(entry.dataState!=='DATA_FOUND'&&entry.value!==null)throw Error('UNVERIFIED_VALUE_'+spec.id+'.'+field);
     }
   }
   if(snapshot.cards.supply.fields.totalSupply.dataState!=='DATA_FOUND')throw Error('ONCHAIN_SUPPLY_MISSING');
   if(snapshot.token.symbol!==t.symbol)throw Error('TOKEN_SYMBOL_MISMATCH');
   const verified=Object.entries(snapshot.cards).map(([key,card])=>key+':'+Object.values(card.fields).filter(x=>x.dataState==='DATA_FOUND').length+'/4');
   const sources=[...new Set(Object.values(snapshot.cards).flatMap(card=>Object.values(card.fields).filter(x=>x.dataState==='DATA_FOUND').map(x=>x.source)))];
   const notVerified=Object.entries(snapshot.cards).flatMap(([card,section])=>Object.entries(section.fields).filter(([,x])=>x.dataState!=='DATA_FOUND').map(([field,x])=>card+'.'+field+'='+x.reasonCode));
   console.log(JSON.stringify({token:t.symbol,address:snapshot.address,chainId:snapshot.chainId,ok:true,elapsedMs:Date.now()-started,block:snapshot.block,fields:verified,sources,notVerified}));
   passed++;
  }catch(e){
   console.error(JSON.stringify({token:t.symbol,ok:false,elapsedMs:Date.now()-started,error:String(e?.message||e).slice(0,140)}));
  }
 }
 for(const t of NEGATIVE){
  total++;
  const started=Date.now();
  try{
   if(t.name==='non-ERC20 contract'){
    const code=await rpc('eth_getCode',[t.address.toLowerCase(),'latest']);
    if(typeof code!=='string'||code==='0x')throw Error('EXPECTED_CONTRACT_CODE_MISSING');
   }
   await withTimeout(inspect(t.address),65000,'SMOKE_TIMEOUT');
   console.error(JSON.stringify({case:t.name,address:t.address,ok:false,error:'INVALID_CONTRACT_ACCEPTED'}));
  }catch(e){
   const expected=e?.message==='Invalid Ethereum contract address'||e?.message==='No contract deployed at this address'||e?.message==='Invalid 32-byte ABI result'||(t.name==='non-ERC20 contract'&&e?.message==='Ethereum RPC method failed: eth_call (3)');
   console.log(JSON.stringify({case:t.name,address:t.address,ok:expected,elapsedMs:Date.now()-started,result:expected?'REJECTED':'UNEXPECTED_ERROR',error:expected?undefined:String(e?.message||e).slice(0,140)}));
   if(expected)passed++;
  }
 }
 console.log(JSON.stringify({passed,total,productionReady:false}));
 if(passed!==total)process.exitCode=1;
}
main().catch(e=>{console.error(String(e));process.exitCode=1});
