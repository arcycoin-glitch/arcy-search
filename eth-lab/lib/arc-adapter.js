'use strict';
// Arc mainnet (5042) adapter. Read-only. Reuses already-running ARCY
// on-chain contract/supply logic in arc-legacy; no wallet permissions.
// Holder, unlock and contract rights remain unverified until their complete
// evidence-backed adapters have been audited and ported.
const {chain}=require('./chains');
const {ADDRESS,uint}=require('./eth');
const core=require('../arc-legacy/lib/core');
const readToken=require('../arc-legacy/api/token');
const readSupply=require('../arc-legacy/api/supply');
const market=require('./arc-market');
const cfg=chain('arc');
const UNKNOWN=(reason,reasonCode='INSUFFICIENT_EVIDENCE')=>({
 value:null,status:'NOT_VERIFIED',dataState:'NOT_VERIFIED',network:cfg.id,chainId:cfg.chainId,
 source:null,evidence:[],reason,reasonCode
});
const fact=(value,source,details,status='SOURCE_REPORTED')=>({
 value,status,dataState:'DATA_FOUND',network:cfg.id,chainId:cfg.chainId,
 source,evidence:[{network:cfg.id,chainId:cfg.chainId,...details}]
});
async function legacyRead(handler,address){
 // Only permit standard read path, never invoke queue, refresh or mutations.
 const req={method:'GET',query:{address}};
 const res={statusCode:200,setHeader(){return this},status(n){this.statusCode=n;return this},
  json(data){return data}};
 const output=await handler(req,res);
 if(res.statusCode!==200||output?.ok!==true||output.chainId!==cfg.chainId||
  output.address?.toLowerCase()!==address)
  throw Error('Arc legacy RPC result did not attest chain 5042 and the selected token');
 return output;
}
async function inspectToken({address}){
 if(!ADDRESS.test(address))throw Error('Invalid Arc token address');
 const result=await legacyRead(readToken,address);
 const token=result.token||{};
 if(!Number.isInteger(token.decimals)||token.decimals<0||token.decimals>36)
  throw Error('Arc token decimals are invalid or unsupported');
 if(!/^0x[0-9a-f]+$/i.test(result.block))throw Error('Invalid Arc pinned block');
 return {chainId:cfg.chainId,network:cfg.id,address,
  block:result.block,token:{name:token.name||null,symbol:token.symbol||null,
   decimals:token.decimals},tokenSource:result.source};
}
const marketPending=new Map();
async function currentMarket(address){
 const old=marketPending.get(address);
 if(old)return old;
 const task=market.inspect(address);
 marketPending.set(address,task);
 task.finally(()=>{if(marketPending.get(address)===task)marketPending.delete(address)}).catch(()=>{});
 return task;
}
async function supply(address){
 let response;
 try{response=await legacyRead(readSupply,address)}
 catch{return {description:'Live on-chain Arc supply unavailable.',
  fields:Object.fromEntries(['totalSupply','circulatingSupply','burnAddressBalance','burnAddressPct']
   .map(k=>[k,UNKNOWN('Arc RPC did not return complete chain-verified token supply evidence.','ARC_SUPPLY_RPC_UNAVAILABLE')]))}}
 const source='Arc RPC',block=response.block;
 const onchain=(evidenceField,amount,selector)=>{
  if(!evidenceField||evidenceField.dataState!=='DATA_FOUND'||typeof amount!=='string')return UNKNOWN('On-chain token getter unavailable.');
  return fact(amount,source,{address,block,method:selector,scope:'Verified Arc 5042 contract getter at source-reported block.'},'ONCHAIN_VERIFIED');
 };
 const total=onchain(response.fields?.totalSupply,response.totalSupply?.amount,'totalSupply()');
 const burned=onchain(response.fields?.burnAddressBalance,response.burnAddressBalance?.amount,'balanceOf(zero/dead)');
 let pct=UNKNOWN('Burn custody percentage requires both verified raw balances and verified supply.');
 const supplyRaw=response.totalSupply?.raw,burnRaw=response.burnAddressBalance?.raw;
 if(total.dataState==='DATA_FOUND'&&burned.dataState==='DATA_FOUND'&&
  /^\d+$/.test(supplyRaw||'')&&/^\d+$/.test(burnRaw||'')){
  const t=BigInt(supplyRaw),b=BigInt(burnRaw);
  if(t>0n&&b<=t){
   // Scale percent to four decimal places via exact BigInt arithmetic.
   const scaled=(b*1000000n+t/2n)/t;
   pct=fact(Number(scaled)/10000,source,{address,block,
    method:'balanceOf(zero/dead) / totalSupply()',numerator:burnRaw,
    denominator:supplyRaw,scope:'Current standard burn-address custody; NOT proof of a permanent burn or lifetime burned amount.'},'DERIVED_ONCHAIN');
  }
 }
 return {description:'Contract supply and standard burn-address custody on Arc mainnet; circulation is not inferred.',
  fields:{totalSupply:total,circulatingSupply:UNKNOWN('Verified Arc circulating supply is not yet integrated.','ARC_CIRCULATION_NOT_VERIFIED'),
  burnAddressBalance:burned,burnAddressPct:pct}};
}
function holderFields(){
 return {description:'Complete verified Arc holder publication adapter is pending migration.',
  fields:Object.fromEntries(['holderCount','largestWalletPct','top10Pct','top20Pct'].map(k=>
   [k,UNKNOWN('No complete chain-verified holder ranking has been imported into this test adapter.','ARC_HOLDER_NOT_INTEGRATED')]))};
}
async function marketFields(address,cardId){
 let result;
 try{result=await currentMarket(address)}catch{
  const keys=cardId==='liquidity'?['liquidityUsd','volume24h','dexPairCount','lpStatus']:
   ['priceUsd','valuation','change24h','volume24h'];
  return {description:'No complete contract-matched Arc DEX response.',
   fields:Object.fromEntries(keys.map(k=>[k,UNKNOWN('Exact Arc market source unavailable.','ARC_DEX_UNAVAILABLE')]))};
 }
 if(cardId==='liquidity')return {description:'Arc DEX provider-returned pools; LP ownership and lock unverified.',
  fields:{liquidityUsd:result.liquidityUsd,volume24h:result.volume24h,
   dexPairCount:result.dexPairCount,lpStatus:result.lpStatus}};
 return {description:'Arc contract-matched market quotes only; price and valuation are external-provider reports.',
  fields:{priceUsd:result.priceUsd,valuation:result.valuation,change24h:result.change24h,
   volume24h:result.volume24h}};
}
async function contractFields(address,block){
 let owner=UNKNOWN('Generic admin rights cannot be established from ownership metadata alone.','ARC_ADMIN_NOT_VERIFIED');
 try{
  const response=await core.call(address,'0x8da5cb5b',block);
  const ownerWord=uint(response);
  if(ownerWord>=0n&&ownerWord<(1n<<160n)){
   const ownerAddress='0x'+ownerWord.toString(16).padStart(40,'0');
   owner=fact('owner() getter: '+ownerAddress,'Arc RPC',{address,block,selector:'0x8da5cb5b',
    note:'Getter value only. Other ownership and permission routes may still exist.'},'GETTER_REPORTED');
  }
 }catch{}
 return {description:'Only chain-scoped observed contract getters are reported; no inferred safety.',
  fields:{tradingTaxes:UNKNOWN('No reviewed, exact-bytecode trading-tax adapter.','ARC_TAX_NOT_VERIFIED'),
   mintCapability:UNKNOWN('Minting rights cannot be established from an unreviewed ABI.','ARC_MINT_NOT_VERIFIED'),
   ownerAdmin:owner,
   contractArchitecture:UNKNOWN('Proxy and upgradeability analysis requires bytecode and storage-slot evidence.','ARC_ARCHITECTURE_NOT_VERIFIED')}};
}
async function inspectCard({address,base,cardId}){
 if(cardId==='supply')return supply(address);
 if(cardId==='holders')return holderFields();
 if(cardId==='liquidity'||cardId==='activity')return marketFields(address,cardId);
 if(cardId==='mechanics')return contractFields(address,base.block);
 return null;
}
async function discover({query}){return market.discover(query)}
module.exports={inspectToken,inspectCard,discover,legacyRead,supply};
