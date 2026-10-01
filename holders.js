const ARC_RPC = "https://rpc.mainnet.arc.io";
const ARCSCAN = "https://api.arc-scan.org/api";
const PAGE_SIZE = 1000;
const MAX_PAGES = 100;
const BURN = new Set([
  "0x000000000000000000000000000000000000dead",
  "0x0000000000000000000000000000000000000000"
]);

function isAddress(v){ return /^0x[a-fA-F0-9]{40}$/.test(v || ""); }
function hexToBigInt(v){ return (!v || v === "0x") ? 0n : BigInt(v); }

async function rpc(method, params){
  const r = await fetch(ARC_RPC, {
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})
  });
  if(!r.ok) throw new Error(`Arc RPC HTTP ${r.status}`);
  const j=await r.json();
  if(j.error) throw new Error(j.error.message || "Arc RPC error");
  return j.result;
}

async function call(to,data){
  return rpc("eth_call",[{to,data},"latest"]);
}

function holderAddress(row){
  return String(row.TokenHolderAddress || row.tokenHolderAddress || row.address || row.holder || "").toLowerCase();
}
function holderRaw(row){
  const v=row.TokenHolderQuantity ?? row.tokenHolderQuantity ?? row.balance ?? row.value ?? "0";
  try { return BigInt(String(v)); } catch { return 0n; }
}
function pct(raw,total){
  if(total<=0n) return null;
  return Number((raw*1000000n)/total)/10000;
}

module.exports = async function handler(req,res){
  res.setHeader("Content-Type","application/json");
  res.setHeader("Cache-Control","s-maxage=120, stale-while-revalidate=300");

  const token=String(req.query.token || "").trim();
  if(!isAddress(token)) return res.status(400).json({ok:false,error:"Valid Arc token contract required"});

  try{
    const [decHex,totalHex]=await Promise.all([
      call(token,"0x313ce567"),
      call(token,"0x18160ddd")
    ]);
    const decimals=Number(hexToBigInt(decHex));
    const totalSupplyRaw=hexToBigInt(totalHex);
    if(!Number.isInteger(decimals) || decimals<0 || decimals>255 || totalSupplyRaw<=0n){
      throw new Error("Invalid ERC-20 supply metadata");
    }

    const rows=[];
    let complete=false;
    for(let page=1; page<=MAX_PAGES; page++){
      const url=`${ARCSCAN}?module=token&action=tokenholderlist&contractaddress=${encodeURIComponent(token)}&page=${page}&offset=${PAGE_SIZE}`;
      const r=await fetch(url,{headers:{accept:"application/json","user-agent":"ARCY-Search/1.0 (+https://arcyusdc.xyz)"}});
      if(!r.ok) throw new Error(`Arcscan HTTP ${r.status}`);
      const j=await r.json();
      if(j.status !== "1" || !Array.isArray(j.result)){
        const msg=typeof j.result === "string" ? j.result : (j.message || "Holder index unavailable");
        throw new Error(msg);
      }
      rows.push(...j.result);
      if(j.result.length < PAGE_SIZE){ complete=true; break; }
    }

    const parsed=rows
      .map(r=>({address:holderAddress(r),raw:holderRaw(r)}))
      .filter(x=>isAddress(x.address) && x.raw>0n);

    // Deduplicate defensively in case an index page overlaps.
    const balances=new Map();
    for(const x of parsed) balances.set(x.address,(balances.get(x.address)||0n)+x.raw);
    const all=[...balances.entries()].map(([address,raw])=>({address,raw}));

    // Holder count follows the indexed holder list. Whale concentration excludes
    // standard burn/zero addresses so destroyed supply is not called a whale.
    const whaleWallets=all.filter(x=>!BURN.has(x.address)).sort((a,b)=>a.raw===b.raw?0:(a.raw>b.raw?-1:1));
    const sumTop=n=>whaleWallets.slice(0,n).reduce((a,x)=>a+x.raw,0n);

    return res.status(200).json({
      ok:true,
      chain:"Arc",
      token,
      holders:all.length,
      largestWalletPct:whaleWallets[0] ? pct(whaleWallets[0].raw,totalSupplyRaw) : null,
      top10Pct:pct(sumTop(10),totalSupplyRaw),
      top20Pct:pct(sumTop(20),totalSupplyRaw),
      complete,
      excludedFromWhaleConcentration:[...BURN],
      methodology:"Arcscan indexed holder balances. Largest/Top10/Top20 exclude standard burn and zero addresses; LP, treasury, exchange and custody addresses remain included unless separately identified.",
      source:"Arcscan holder index + Arc RPC totalSupply",
      scannedAt:new Date().toISOString()
    });
  }catch(error){
    return res.status(502).json({ok:false,error:error.message || "Holder scan failed"});
  }
};
