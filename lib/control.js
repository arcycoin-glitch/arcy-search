const c=require('./core');
const slots={implementation:'0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',admin:'0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103',beacon:'0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50'};
function pushes(code){const b=Buffer.from(code.slice(2),'hex'),out=[];for(let i=0;i<b.length;i++){const op=b[i];if(op>=0x60&&op<=0x7f){const n=op-0x5f;if(op===0x63&&i+4<b.length)out.push(b.subarray(i+1,i+5).toString('hex'));i+=n;}}return out;}
async function inspect(a){
  const {block,code}=await c.context(a),evidence=[];
  const readings=await Promise.allSettled(Object.entries(slots).map(async([name,slot])=>({name,address:c.addressWord(await c.rpc('eth_getStorageAt',[a,slot,block])),slot})));
  let implementation=null,admin=null,beacon=null;
  for(const r of readings)if(r.status==='fulfilled'){evidence.push({...r.value,block});if(r.value.address!==c.BURNS[0]){if(r.value.name==='implementation')implementation=r.value.address;if(r.value.name==='admin')admin=r.value.address;if(r.value.name==='beacon')beacon=r.value.address;}}
  if(!implementation&&beacon){try{implementation=c.addressWord(await c.call(beacon,'0x5c60da1b',block));}catch{}}
  const clone=code.match(/^0x363d3d373d3d3d363d73([0-9a-f]{40})5af43d82803e903d91602b57fd5bf3$/i);
  if(clone)implementation='0x'+clone[1].toLowerCase();
  let implementationCode=null;
  if(implementation){try{const x=await c.rpc('eth_getCode',[implementation,block]);if(/^0x(?:[0-9a-f]{2})+$/i.test(x))implementationCode=x;}catch{}}
  const selectors=new Set([...pushes(code),...pushes(implementationCode||'0x')]);
  // Selector presence is a candidate only: collisions, unreachable code and fallback are possible.
  const candidates=[['mint','40c10f19'],['pause','8456cb59'],['unpause','3f4ba83a'],['AccessControl.hasRole','91d14854'],['burn','42966c68']].filter(([,s])=>selectors.has(s)).map(([name,selector])=>({name,selector:'0x'+selector,status:'CANDIDATE',address:implementationCode?implementation:a}));
  let owner=c.unknown(),paused=c.unknown(),accessControl=c.unknown();
  const probes=await Promise.allSettled(['0x8da5cb5b','0x5c975abb','0x01ffc9a77965db0b'+ '0'.repeat(56)].map(s=>c.call(a,s,block)));
  if(probes[0].status==='fulfilled'&&selectors.has('8da5cb5b')){try{const x=c.addressWord(probes[0].value);owner=c.fact(x,[{method:'owner()',address:a,block}], 'GETTER_REPORTED');}catch{}}
  if(probes[1].status==='fulfilled'&&selectors.has('5c975abb')){try{const x=c.uint(probes[1].value);if(x<=1n)paused=c.fact(x===1n,[{method:'paused()',address:a,block}], 'GETTER_REPORTED');}catch{}}
  if(probes[2].status==='fulfilled'){try{if(c.uint(probes[2].value)===1n)accessControl=c.fact(true,[{method:'supportsInterface(0x7965db0b)',address:a,block}], 'INTERFACE_REPORTED');}catch{}}
  return {block,source:'Arc RPC',status:'PARTIAL_EVIDENCE',mint:c.unknown('Selector candidates do not prove callable mint control'),pause:c.unknown('Paused state does not establish who can pause'),blacklist:c.unknown(),owner,admin:admin?c.fact(admin,evidence.filter(x=>x.name==='admin')):c.unknown(),paused,accessControl,proxy:implementation&&implementationCode?c.fact(implementation,evidence.concat(clone?[{method:'EIP-1167 runtime'}]:[]),'DETECTED'):c.unknown('No validated standard implementation; custom proxies remain possible'),implementation,implementationInspected:!!implementationCode,beacon,candidates,evidence,verifiedSource:c.unknown('No live verified-source response established')};
}
module.exports={inspect,slots,pushes};
