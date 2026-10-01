const RPC = process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io';
const CHAIN = 5042;
const BURNS = ['0x0000000000000000000000000000000000000000','0x000000000000000000000000000000000000dead'];
async function json(url, options = {}) {
  const r = await fetch(url, {...options, signal: AbortSignal.timeout(8000)});
  if (!r.ok) {const e=new Error(`HTTP ${r.status}`);e.httpStatus=r.status;throw e;}
  return r.json();
}
const pending=new Map(),waiters=[];let active=0;
async function send(method,params){
  if(active>=4)await new Promise(resolve=>waiters.push(resolve));else active++;
  try{for(let attempt=0;attempt<2;attempt++){try{
    const d=await json(RPC,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
    if(!d||d.error||!Object.hasOwn(d,'result'))throw new Error('RPC unavailable');return d.result;
  }catch(e){if(attempt||![429,502,503,504].includes(e.httpStatus))throw e;await new Promise(r=>setTimeout(r,250));}}}
  finally{const next=waiters.shift();if(next)next();else active--;}
}
function rpc(method,params){const key=JSON.stringify([method,params]);if(pending.has(key))return pending.get(key);const p=send(method,params).finally(()=>pending.delete(key));pending.set(key,p);return p;}
function uint(h) { if(!/^0x[0-9a-fA-F]{64}$/.test(h)) throw new Error('Invalid ABI word'); return BigInt(h); }
function units(n,d) {const s=n.toString().padStart(d+1,'0'); return d ? (s.slice(0,-d)+'.'+s.slice(-d)).replace(/\.?0+$/,'') || '0':s;}
function addressWord(h) {uint(h); if(!/^0x0{24}/i.test(h)) throw new Error('Invalid address word'); return '0x'+h.slice(-40).toLowerCase();}
function string(h) {
  if(!/^0x(?:[0-9a-f]{2})+$/i.test(h)) return null;
  const b=Buffer.from(h.slice(2),'hex');
  if(b.length===32) return b.toString('utf8').replace(/\0+$/,'');
  if(b.length<64) return null;
  const o=Number(BigInt('0x'+b.subarray(0,32).toString('hex')));
  if(!Number.isSafeInteger(o)||o+32>b.length) return null;
  const l=Number(BigInt('0x'+b.subarray(o,o+32).toString('hex')));
  return Number.isSafeInteger(l)&&l<=4096&&o+32+l<=b.length ? b.subarray(o+32,o+32+l).toString('utf8'):null;
}
const call=(a,data,block)=>rpc('eth_call',[{to:a,data},block]);
async function context(a) {
  if(Number(BigInt(await rpc('eth_chainId',[])))!==CHAIN) throw new Error('Wrong chain');
  const block=await rpc('eth_blockNumber',[]);
  const code=await rpc('eth_getCode',[a,block]);
  if(!/^0x(?:[0-9a-f]{2})+$/i.test(code)) throw new Error('No contract');
  return {block,code};
}
const unknown=(reason='Reliable evidence unavailable')=>({value:null,status:'NOT_VERIFIED',evidence:[],reason});
const fact=(value,evidence,status='ON_CHAIN')=>({value,status,evidence});
function route(fn) {return async(req,res)=>{
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  if(req.method && req.method!=='GET') return res.status(405).json({ok:false,error:'GET required'});
  const a=String(req.query.address || req.query.token || '').trim().toLowerCase();
  if(!/^0x[0-9a-f]{40}$/.test(a)) return res.status(400).json({ok:false,error:'Valid contract address required'});
  try {return res.status(200).json({ok:true,address:a,chainId:CHAIN,scannedAt:new Date().toISOString(),...await fn(a,req)});}
  catch {return res.status(200).json({ok:false,address:a,status:'NOT_VERIFIED',error:'DATA UNAVAILABLE'});}
};}
module.exports={RPC,CHAIN,BURNS,json,rpc,uint,units,addressWord,string,call,context,unknown,fact,route};
