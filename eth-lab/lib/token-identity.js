'use strict';
// Curated canonical token identity: a chain AND a full contract address must
// exactly match a token issuer's public, first-party contract documentation.
// Market lists, ticker/logo matching, popularity and search ranking are NOT proof.
const ADDRESS=/^0x[0-9a-f]{40}$/i;
const OFFICIAL=Object.freeze([
 Object.freeze({
  network:'ethereum',chainId:1,address:'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  name:'USD Coin',symbol:'USDC',issuer:'Circle',
  proofUrl:'https://developers.circle.com/stablecoins/usdc-contract-addresses'
 }),
 Object.freeze({
  network:'ethereum',chainId:1,address:'0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
  name:'Uniswap',symbol:'UNI',issuer:'Uniswap',
  proofUrl:'https://developers.uniswap.org/docs/ecosystem/governance/uni'
 })
]);
function verified(network,address){
 if(typeof network!=='string'||typeof address!=='string'||!ADDRESS.test(address))return null;
 const token=OFFICIAL.find(x=>x.network===network&&x.address===address.toLowerCase());
 return token?{status:'OFFICIAL_CONTRACT_MATCHED',type:'TOKEN',chainId:token.chainId,
  address:token.address,issuer:token.issuer,source:'Official issuer contract documentation',
  proofUrl:token.proofUrl}:null;
}
function knownMatches(network,query){
 if(typeof query!=='string')return [];
 const q=query.normalize('NFKC').trim().toLocaleLowerCase('en-US');
 if(q.length<2)return [];
 return OFFICIAL.filter(x=>x.network===network&&(
  x.symbol.toLowerCase()===q||x.name.toLowerCase()===q||
  x.symbol.toLowerCase().startsWith(q)||x.name.toLowerCase().startsWith(q)
 )).map(x=>({address:x.address,network:x.network,chainId:x.chainId,
  name:x.name,symbol:x.symbol,source:'Official issuer contract documentation',
  identity:verified(network,x.address),identityVerified:true}));
}
function rank(network,query,candidates){
 if(!Array.isArray(candidates))throw Error('Invalid token search candidates');
 const known=knownMatches(network,query);
 const ordered=new Map();
 // First-party canonical records always win over provider-supplied display names.
 for(const x of known)ordered.set(x.address,x);
 const trustedStock=(item)=>network==='robinhood'&&item.registryMatched===true&&
  item.source==='Robinhood official asset registry';
 for(const item of candidates){
  if(!item||item.network!==network||item.chainId!==(network==='ethereum'?1:4663))continue;
  const address=typeof item.address==='string'?item.address.toLowerCase():'';
  if(!ADDRESS.test(address)||ordered.has(address))continue;
  const official=verified(network,address);
  const stock=trustedStock(item);
  const identity=official||(stock?{
   status:'REGISTRY_MATCHED',type:'STOCK_TOKEN',chainId:4663,address,
   issuer:'Robinhood Chain official asset registry',
   source:'Robinhood official asset registry',
   proofUrl:'https://api.robinhood.com/rhj/assets'
  }:{status:'NOT_VERIFIED',type:null,source:null,proofUrl:null});
  const canonical=OFFICIAL.find(x=>x.network===network&&x.address===address);
  ordered.set(address,{address,network,chainId:item.chainId,
   name:canonical?.name||String(item.name||'').slice(0,90),
   symbol:canonical?.symbol||String(item.symbol||'').slice(0,30),
   source:canonical?'Official issuer contract documentation':String(item.source||'').slice(0,100),
   registryMatched:stock,identityVerified:identity.status!=='NOT_VERIFIED',identity});
 }
 const rows=[...ordered.values()];
 rows.sort((a,b)=>{
  const importance=x=>x.identity?.status==='OFFICIAL_CONTRACT_MATCHED'?0:
   x.identity?.status==='REGISTRY_MATCHED'?1:2;
  return importance(a)-importance(b);
 });
 return rows.slice(0,12);
}
module.exports={OFFICIAL,verified,knownMatches,rank};
