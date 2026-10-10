'use strict';
const {inspect:inspectToken}=require('./eth');
const evidence=require('./evidence');
const market=require('./market');
const control=require('./control');
const schema=require('../schema');
function unavailable(description,fields){
 return evidence.card(Object.fromEntries(fields.map(([key,reason])=>[key,evidence.unknown(reason)])),description);
}
function copyFields(source,keys,description){
 return evidence.card(Object.fromEntries(keys.map(key=>[key,source.fields[key]||evidence.unknown('Metric adapter has not returned an evidence field.')])),description);
}
function mechanicsCard(controls){
 const owner=controls.fields?.owner;
 const proxy=controls.fields?.proxyImplementation;
 const ownerAdmin=owner?.dataState==='DATA_FOUND'
   ?{...owner,value:'owner() getter: '+owner.value,scope:'Getter-reported only. Does not prove the complete contract admin role model.'}
   :evidence.unknown('Owner/admin authority cannot be established from a missing getter. Role/implementation inspection needed.','OWNER_ADMIN_NOT_VERIFIED');
 const contractArchitecture=proxy?.dataState==='DATA_FOUND'
   ?{...proxy,value:'EIP-1967 implementation: '+proxy.value,scope:'An implementation slot is populated; verify admin, beacon, UUPS and delegatecall behavior separately.'}
   :evidence.unknown('No EIP-1967 implementation established; absence does not prove non-upgradeability.','ARCHITECTURE_NOT_VERIFIED');
 const result=evidence.card({
   tradingTaxes:evidence.unknown('No bytecode-matched reviewed adapter for token trading fees. DEX fees are separate.','TRADING_TAXES_NOT_VERIFIED'),
   mintCapability:evidence.unknown('Mint capability cannot be inferred from ERC-20 metadata or owner() alone.','MINT_CAPABILITY_NOT_VERIFIED'),
   ownerAdmin,
   contractArchitecture
 },'Four production fields. Reports only confirmed getter/storage evidence, not inferred privileges.');
 result.controlEvidence=controls.fields;
 return result;
}
async function build(address){
 const t=await inspectToken(address);
 const [marketResult,controlResult]=await Promise.allSettled([market.inspect(t.address),control.inspect(t.address,t.block)]);
 const m=marketResult.status==='fulfilled'?marketResult.value:market.failure(marketResult.reason);
 const c=controlResult.status==='fulfilled'?controlResult.value:control.failure(controlResult.reason);
 const onChain=x=>x?.status==='ON_CHAIN'?evidence.found(x.value,'Ethereum RPC',[{method:x.method,block:t.block,address:t.address}],'ON_CHAIN'):evidence.unknown(x?.reason||'No on-chain verification available.');
 const supply=evidence.card({
   totalSupply:onChain(t.fields.totalSupply),
   circulatingSupply:evidence.unknown('Verified source-reported circulating supply for this exact Ethereum contract required.'),
   burnAddressBalance:onChain(t.fields.burnAddressBalance),
   nextUnlock:evidence.unknown('No exact-contract verified token vesting/unlock schedule is connected.')
 },'Pinned-block on-chain supply and standard burn address balances.');
 const holders=unavailable('Complete Ethereum holder indexing and pinned-block reconciliation not connected.',[
   ['holderCount','Complete indexed unique holder snapshot is required.'],
   ['largestWalletPct','Largest wallet balance and full supply reconciliation are required.'],
   ['top10Pct','Verified top-10 balances required.'],
   ['top20Pct','Verified top-20 balances required.']
 ]);
 const liquidity=copyFields(m,['liquidityUsd','volume24h','dexPairCount','lpStatus'],'Exact-matched source-reported market data. LP permissions remain unverified.');
 const activity=copyFields(m,['priceUsd','valuation','change24h','volume24h'],'Primary base-token market values from exact Ethereum pairs; source-reported.');
 const mechanics=mechanicsCard(c);
 const cards={supply,holders,liquidity,activity,mechanics};
 for(const d of schema){
   if(!cards[d.id])throw Error('Missing required card '+d.id);
   for(const [key] of d.fields)if(!cards[d.id].fields[key])throw Error('Missing required field '+d.id+'.'+key);
 }
 return {
   ok:true,schemaVersion:1,cardCount:schema.length,chainId:1,network:'ethereum',
   address:t.address,scannedAt:t.scannedAt,block:t.block,token:t.token,cards,
   warnings:['Experimental prototype — not financial advice.','Market APIs report source values; they are not independently verified on-chain.','Missing evidence never becomes zero, false or a simulated value.']
 };
}
module.exports={build,copyFields,mechanicsCard};
