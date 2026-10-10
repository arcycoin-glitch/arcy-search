'use strict';
const {ADDRESS}=require('../lib/eth');
const {build}=require('../lib/report');
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Access-Control-Allow-Origin','same-origin');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET required'});
 const address=String(req.query?.address||'').trim();
 if(!ADDRESS.test(address))return res.status(400).json({ok:false,error:'Valid contract address required'});
 try{return res.status(200).json(await build(address));}
 catch(e){return res.status(502).json({ok:false,chainId:1,address:address.toLowerCase(),error:'ETHEREUM_SCAN_UNAVAILABLE',reason:'One or more Ethereum data providers did not return a verified response.'});}
};
