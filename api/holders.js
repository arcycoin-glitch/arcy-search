const ARC_RPC = "https://rpc.mainnet.arc.io";
const ARCSCAN_V1 = "https://api.arc-scan.org/v1";
const PAGE_LIMIT = 1000;
const MAX_PAGES = 200;

const BURN = new Set([
  "0x000000000000000000000000000000000000dead",
  "0x0000000000000000000000000000000000000000"
]);

function isAddress(v){ return /^0x[a-fA-F0-9]{40}$/.test(v || ""); }
function hexToBigInt(v){ return (!v || v === "0x") ? 0n : BigInt(v); }

async function rpc(method,params){
  const r=await fetch(ARC_RPC,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})
  });
  if(!r.ok) throw new Error(`Arc RPC HTTP ${r.status}`);
  const j=await r.json();
  if(j.error) throw new Error(j.error.message || "Arc RPC error");
  return j.result;
}

async function call(to,data){ return rpc("eth_call",[{to,data},"latest"]); }

function pickArray(j){
  if(Array.isArray(j)) return j;
  for(const k of ["holders","items","data","results","rows"]){
    if(Array.isArray(j?.[k])) return j[k];
  }
  return [];
}

function nextCursor(j){
  return j?.next_cursor ?? j?.nextCursor ??
         j?.pagination?.next_cursor ?? j?.pagination?.nextCursor ?? null;
}

function holderAddress(row){
  return String(
    row?.address ?? row?.holder ?? row?.holder_address ??
    row?.account ?? row?.owner ?? ""
  ).toLowerCase();
}

function rawFromMoney(v){
  if(v===null || v===undefined) return 0n;
  if(typeof v==="object"){
    const raw=v.raw ?? v.amount_raw ?? v.value ?? v.balance_raw ?? null;
    if(raw!==null && raw!==undefined){
      try{return BigInt(String(raw));}catch{}
    }
  }
  try{
    const s=String(v);
    if(/^\d+$/.test(s)) return BigInt(s);
  }catch{}
  return 0n;
}

function holderRaw(row){
  for(const v of [
    row?.balance,row?.amount,row?.quantity,row?.raw,
    row?.balance_raw,row?.amount_raw,row?.token_balance
  ]){
    const n=rawFromMoney(v);
    if(n>0n) return n;
  }
  return 0n;
}

function pct(raw,total){
  if(total<=0n) return null;
  return Number((raw*1000000n)/total)/10000;
}

async function arcscanJson(url){
  const r=await fetch(url,{
    headers:{
      accept:"application/json",
      "user-agent":"ARCY-Search/1.0 (+https://arcyusdc.xyz)"
    }
  });
  let j={};
  try{j=await r.json();}catch{}
  if(!r.ok){
    throw new Error(j?.error?.message || j?.message || `Arcscan HTTP ${r.status}`);
  }
  return j;
}

module.exports=async function handler(req,res){
  res.setHeader("Content-Type","application/json");
  res.setHeader("Cache-Control","s-maxage=120, stale-while-revalidate=300");

  const token=String(req.query.token || "").trim();
  if(!isAddress(token)){
    return res.status(400).json({ok:false,error:"Valid Arc token contract required"});
  }

  try{
    const totalSupplyRaw=hexToBigInt(await call(token,"0x18160ddd"));
    if(totalSupplyRaw<=0n) throw new Error("Invalid ERC-20 total supply");

    const balances=new Map();
    let cursor=null, complete=false, pages=0;

    for(let page=0;page<MAX_PAGES;page++){
      const qs=new URLSearchParams();
      qs.set("limit",String(PAGE_LIMIT));
      if(cursor) qs.set("cursor",cursor);

      const j=await arcscanJson(
        `${ARCSCAN_V1}/tokens/${encodeURIComponent(token)}/holders?${qs.toString()}`
      );

      for(const row of pickArray(j)){
        const address=holderAddress(row);
        const raw=holderRaw(row);
        if(isAddress(address) && raw>0n) balances.set(address,raw);
      }

      pages++;
      const next=nextCursor(j);
      if(!next){ complete=true; break; }
      if(String(next)===String(cursor)) throw new Error("Arcscan returned a repeated holder cursor");
      cursor=String(next);
    }

    const all=[...balances.entries()].map(([address,raw])=>({address,raw}));

    if(!all.length){
      return res.status(200).json({
        ok:true,chain:"Arc",token,
        holders:null,largestWalletPct:null,top10Pct:null,top20Pct:null,
        complete,status:"NOT_VERIFIED",
        reason:"Arcscan returned no enumerable holder balances for this token.",
        source:"Arcscan v1 holder index",
        scannedAt:new Date().toISOString()
      });
    }

    const whaleWallets=all
      .filter(x=>!BURN.has(x.address))
      .sort((a,b)=>a.raw===b.raw?0:(a.raw>b.raw?-1:1));

    const sumTop=n=>whaleWallets.slice(0,n).reduce((s,x)=>s+x.raw,0n);

    return res.status(200).json({
      ok:true,chain:"Arc",token,
      holders:all.length,
      largestWalletPct:whaleWallets[0]?pct(whaleWallets[0].raw,totalSupplyRaw):null,
      top10Pct:pct(sumTop(10),totalSupplyRaw),
      top20Pct:pct(sumTop(20),totalSupplyRaw),
      complete,pagesRead:pages,
      status:complete?"INDEXED":"TRUNCATED",
      excludedFromWhaleConcentration:[...BURN],
      methodology:"Arcscan v1 indexed holder balances. Largest/Top10/Top20 exclude standard burn and zero addresses; LP, treasury, exchange and custody addresses remain included unless separately identified.",
      source:"Arcscan v1 holder index + Arc RPC totalSupply",
      scannedAt:new Date().toISOString()
    });
  }catch(error){
    return res.status(502).json({ok:false,error:error.message || "Holder scan failed"});
  }
};
