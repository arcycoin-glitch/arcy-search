'use strict';
// One facade and contract-identity boundary; Ethereum retains its proven adapters.
const {createEngine}=require('./data-engine');
const ethereumReport=require('./report');
const ethereumDiscover=require('./discover');
const ethereumToken=require('./eth');
const robinhood=require('./robinhood-adapter');
const chains=require('./chains');
const {createCache}=require('./discovery-cache');
const ethereumAdapter={
 async inspectToken({address}){
  const report=await ethereumReport.build(address);
  return {chainId:1,network:'ethereum',address:report.address,block:report.block,
   token:report.token,fullReport:report};
 },
 async inspectCard({base,cardId}){return base.fullReport.cards[cardId]},
 async discover({query}){return ethereumDiscover.discover(query)}
};
const engine=createEngine({ethereum:ethereumAdapter,robinhood});
const ethCache=createCache(async q=>engine.discover({network:'ethereum',query:q}).then(x=>x.candidates));
const rhCache=createCache(async q=>engine.discover({network:'robinhood',query:q}).then(x=>x.candidates));
function parseChain(raw){
 const value=raw===undefined?'ethereum':raw;
 return chains.chain(value).id;
}
async function report({network='ethereum',address}){
 return engine.report({network,address});
}
async function token({network='ethereum',address}){
 if(network==='ethereum')return ethereumToken.inspect(address);
 return robinhood.inspectToken({address});
}
async function discover({network='ethereum',query}){
 const cache=network==='ethereum'?ethCache:rhCache;
 const response=await cache.find(query);
 return {ok:true,query,chainId:chains.chain(network).chainId,network,
  matches:response.matches,sourceFetchedAt:new Date(response.fetchedAt).toISOString(),
  cacheAgeMs:response.cacheAgeMs,identityVerified:false,
  note:'Name matches are candidates only. Confirm network and full contract.'};
}
module.exports={parseChain,report,token,discover,engine};
