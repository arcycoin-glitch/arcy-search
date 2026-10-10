'use strict';
const {ADDRESS,inspect}=require('../lib/eth');
module.exports=async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET required'});
  if(!req.query||typeof req.query!=='object'||Array.isArray(req.query)||Object.keys(req.query).length!==1||typeof req.query.address!=='string')return res.status(400).json({ok:false,error:'Only one contract address query parameter is allowed'});
  const address=req.query.address.trim();
  if(!ADDRESS.test(address))return res.status(400).json({ok:false,error:'Valid 0x Ethereum contract address required'});
  try{return res.status(200).json(await inspect(address));}
  catch(e){return res.status(502).json({ok:false,chainId:1,address:address.toLowerCase(),error:'ETHEREUM_DATA_UNAVAILABLE',reason:'Ethereum RPC data unavailable or contract validation failed.',scannedAt:new Date().toISOString()});}
};
