'use strict';
const {normalizeQuery,discover}=require('../lib/discover');
const {enforce}=require('../lib/rate-limit');
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET_REQUIRED'});
 const query=req.query;
 if(!query||typeof query!=='object'||Array.isArray(query)||Object.keys(query).length!==1||typeof query.q!=='string')
  return res.status(400).json({ok:false,error:'VALID_QUERY_REQUIRED'});
 const q=normalizeQuery(query.q);
 if(!q)return res.status(400).json({ok:false,error:'VALID_QUERY_REQUIRED'});
 if(!enforce(req,res))return;
 try{
  const matches=await discover(q);
  return res.status(200).json({ok:true,query:q,chainId:1,source:'DexScreener / CoinGecko',identityVerified:false,matches,note:'Search results are source-reported candidates, NOT verified projects. Confirm network and contract before analysis.'});
 }catch{
  return res.status(502).json({ok:false,error:'TOKEN_DISCOVERY_UNAVAILABLE',reason:'Token search provider did not return a usable response.'});
 }
};
