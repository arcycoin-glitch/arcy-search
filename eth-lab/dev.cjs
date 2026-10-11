'use strict';const http=require('node:http'),fs=require('node:fs'),path=require('node:path');http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');const query={};url.searchParams.forEach((value,key)=>{if(Object.hasOwn(query,key))query[key]=[].concat(query[key],value);else query[key]=value});res.status=function(code){res.statusCode=code;return res};res.json=function(v){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(v))};const route={'/api/token':'token','/api/report':'report','/api/health':'health','/api/discover':'discover','/api/chart':'chart','/api/pulse':'pulse'}[url.pathname];if(route){try{await require('./api/'+route)({method:req.method,query},res)}catch{res.status(500).json({ok:false,error:'SERVER_ERROR'})}return}if(url.pathname==='/assets/hero-arcy.png'){res.setHeader('Content-Type','image/png');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','public, max-age=3600');fs.createReadStream(path.join(__dirname,'assets','hero-arcy.png')).pipe(res);return}if(url.pathname==='/assets/arcy-greeting.mp4'){
 const file=path.join(__dirname,'assets','arcy-greeting.mp4'),size=fs.statSync(file).size;
 res.setHeader('Content-Type','video/mp4');res.setHeader('Accept-Ranges','bytes');
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','public, max-age=3600');
 const range=req.headers.range,match=typeof range==='string'&&/^bytes=(\d+)-(\d*)$/.exec(range);
 if(range&&!match){res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return}
 if(match){
  const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),size-1):size-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){
   res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return
  }
  res.writeHead(206,{'Content-Range':'bytes '+start+'-'+end+'/'+size,'Content-Length':end-start+1});
  fs.createReadStream(file,{start,end}).pipe(res);return;
 }
 res.setHeader('Content-Length',size);fs.createReadStream(file).pipe(res);return;
}
if(url.pathname==='/hero-greeting.js'){
 res.setHeader('Content-Type','text/javascript; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
 fs.createReadStream(path.join(__dirname,'hero-greeting.js')).pipe(res);return
}if(url.pathname==='/schema.js'||url.pathname==='/format.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');fs.createReadStream(path.join(__dirname,url.pathname==='/schema.js'?'schema.js':'format.js')).pipe(res);return}if(url.pathname!=='/'&&!/^\/token\/(arc|ethereum|robinhood)\/0x[0-9a-fA-F]{40}\/?$/.test(url.pathname)){res.writeHead(404);res.end('Not found');return}res.setHeader('Content-Type','text/html');fs.createReadStream(path.join(__dirname,'index.html')).pipe(res)}).listen(Number(process.env.PORT)||3001,'127.0.0.1',()=>console.log('ETH Lab listening on port '+(process.env.PORT||3001)));
