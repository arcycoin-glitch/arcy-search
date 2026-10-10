'use strict';
const {chain,rpcUrl,verifyChainId}=require('./chains');
const {readJson}=require('./http');
const {uint,units,abiString,BURN,ADDRESS}=require('./eth');
const cfg=chain('robinhood');
let nextId=0;
async function rpc(method,params,{timeoutMs=11000}={}){
 const id=++nextId;
 const response=await fetch(rpcUrl('robinhood'),{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id,method,params}),
  signal:AbortSignal.timeout(timeoutMs)
 });
 if(!response.ok)throw Error('Robinhood RPC HTTP '+response.status);
 const body=await readJson(response,1024*1024);
 if(!body||typeof body!=='object'||body.jsonrpc!=='2.0'||body.id!==id||body.error||!Object.hasOwn(body,'result'))
  throw Error('Robinhood RPC invalid response');
 return body.result;
}
async function inspectToken({address}){
 if(!ADDRESS.test(address))throw Error('Invalid contract address');
 const normalized=address.toLowerCase();
 verifyChainId('robinhood',await rpc('eth_chainId',[]));
 const block=await rpc('eth_blockNumber',[]);
 if(!/^0x[0-9a-f]+$/i.test(block))throw Error('Malformed Robinhood block');
 const bytecode=await rpc('eth_getCode',[normalized,block]);
 if(!/^0x[0-9a-f]+$/i.test(bytecode||'')||bytecode==='0x')throw Error('No verified token contract');
 const call=data=>rpc('eth_call',[{to:normalized,data},block]);
 const [supplyWord,decimalsWord]=await Promise.all([call('0x18160ddd'),call('0x313ce567')]);
 const totalSupplyRaw=uint(supplyWord),decimals=Number(uint(decimalsWord));
 if(!Number.isInteger(decimals)||decimals<0||decimals>36)throw Error('Unsupported token precision');
 const names=await Promise.allSettled([
  call('0x06fdde03'),call('0x95d89b41'),
  ...BURN.map(a=>call('0x70a08231'+a.slice(2).padStart(64,'0')))
 ]);
 const name=names[0].status==='fulfilled'?abiString(names[0].value):null;
 const symbol=names[1].status==='fulfilled'?abiString(names[1].value):null;
 const raw=names.slice(2).every(x=>x.status==='fulfilled')?
  names.slice(2).reduce((a,x)=>a+uint(x.value),0n):null;
 return {chainId:cfg.chainId,network:cfg.id,address:normalized,block,token:{name,symbol,decimals},
  totalSupplyRaw:totalSupplyRaw.toString(),totalSupply:units(totalSupplyRaw,decimals),
  burnAddressRaw:raw?.toString()??null,
  burnAddressBalance:raw===null?null:units(raw,decimals)};
}
module.exports={rpc,inspectToken};
