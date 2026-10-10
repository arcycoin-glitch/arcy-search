'use strict';
const {ADDRESS}=require('../lib/eth');
const {build}=require('../lib/report');
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET required'});
 if(!req.query||typeof req.query!=='object'||Array.isArray(req.query)||Object.keys(req.query).length!==1||typeof req.query.address!=='string')return res.status(400).json({ok:false,error:'Only one contract address query parameter is allowed'});
 const address=req.query.address.trim();
 if(!ADDRESS.test(address))return res.status(400).json({ok:false,error:'Valid contract address required'});
 try{return res.status(200).json(await build(address));}
 catch(e){return res.status(502).json({ok:false,chainId:1,address:address.toLowerCase(),error:'ETHEREUM_SCAN_UNAVAILABLE',reason:'One or more Ethereum data providers did not return a verified response.'});}
};
