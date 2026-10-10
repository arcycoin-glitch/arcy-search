'use strict';
/**
 * Liveness only; does not imply live market, explorer, or Ethereum RPC health.
 */
module.exports=function health(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET_REQUIRED'});
 return res.status(200).json({
  ok:true,product:'ARCY SEARCH ETH LAB',environment:'isolated-preview',
  chainId:1,expectedCards:5,expectedMetrics:20,readyForProduction:false,
  capabilities:['token','report'],note:'Liveness does not establish provider health or correctness.'
 });
};
