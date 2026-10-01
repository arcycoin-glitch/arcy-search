/*
  ARCY Search — Liquidity & Exit
  Primary market source: DexScreener public API.
  Conservative rules:
  - Match the exact Arc token contract address.
  - Aggregate liquidity/volume across returned Arc pairs without inventing data.
  - LP lock/burn status is NOT inferred from liquidity alone.
*/

const DEXSCREENER = "https://api.dexscreener.com/latest/dex/tokens/";

function isAddress(v){
  return /^0x[a-fA-F0-9]{40}$/.test(v || "");
}

function num(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sum(values){
  return values.reduce((a,v)=>a+(Number.isFinite(v)?v:0),0);
}

function lower(v){
  return String(v || "").toLowerCase();
}

module.exports = async function handler(req,res){
  res.setHeader("Content-Type","application/json");
  res.setHeader("Cache-Control","s-maxage=60, stale-while-revalidate=120");

  const token = String(req.query.token || req.query.address || "").trim();

  if(!isAddress(token)){
    return res.status(400).json({
      ok:false,
      error:"Valid Arc token contract required"
    });
  }

  try{
    const r = await fetch(DEXSCREENER + encodeURIComponent(token),{
      headers:{
        accept:"application/json",
        "user-agent":"ARCY-Search/1.0 (+https://arcyusdc.xyz)"
      }
    });

    if(!r.ok) throw new Error(`DexScreener HTTP ${r.status}`);

    const j = await r.json();
    const tokenLower = lower(token);

    const pairs = (Array.isArray(j?.pairs) ? j.pairs : [])
      .filter(p=>{
        const base = lower(p?.baseToken?.address);
        const quote = lower(p?.quoteToken?.address);
        return base === tokenLower || quote === tokenLower;
      })
      .map(p=>({
        chainId:p.chainId || null,
        dexId:p.dexId || null,
        pairAddress:p.pairAddress || null,
        url:p.url || null,
        baseToken:p.baseToken || null,
        quoteToken:p.quoteToken || null,
        priceUsd:num(p.priceUsd),
        liquidityUsd:num(p?.liquidity?.usd),
        volume24h:num(p?.volume?.h24),
        txns24h:{
          buys:num(p?.txns?.h24?.buys),
          sells:num(p?.txns?.h24?.sells)
        },
        priceChange24h:num(p?.priceChange?.h24),
        fdv:num(p.fdv),
        marketCap:num(p.marketCap)
      }))
      .sort((a,b)=>(b.liquidityUsd || 0)-(a.liquidityUsd || 0));

    if(!pairs.length){
      return res.status(200).json({
        ok:true,
        token,
        status:"NO_MARKET_DATA",
        liquidityUsd:null,
        volume24hUsd:null,
        primaryPair:null,
        pairs:[],
        lpStatus:{
          status:"NOT_VERIFIED",
          reason:"No verified LP lock/burn source connected."
        },
        source:"DexScreener",
        scannedAt:new Date().toISOString()
      });
    }

    const primary = pairs[0];
    const liquidityUsd = sum(pairs.map(x=>x.liquidityUsd));
    const volume24hUsd = sum(pairs.map(x=>x.volume24h));
    const buys24h = sum(pairs.map(x=>x.txns24h.buys));
    const sells24h = sum(pairs.map(x=>x.txns24h.sells));

    return res.status(200).json({
      ok:true,
      token,
      status:"MARKET_DATA_FOUND",

      liquidityUsd,
      volume24hUsd,

      activity24h:{
        buys:buys24h,
        sells:sells24h
      },

      primaryPair:primary,

      pairCount:pairs.length,
      dexes:[...new Set(pairs.map(x=>x.dexId).filter(Boolean))],

      pairs:pairs.slice(0,20),

      exitContext:{
        status:"DATA_ONLY",
        note:"Liquidity and 24h volume are market-depth context, not a guarantee that a specific order can exit at the displayed price. Slippage depends on pair reserves, routing and trade size."
      },

      lpStatus:{
        locked:null,
        burned:null,
        status:"NOT_VERIFIED",
        reason:"DexScreener market data does not by itself prove LP tokens are locked or burned."
      },

      methodology:[
        "Exact token contract address is queried against DexScreener.",
        "Liquidity and 24h volume are aggregated across returned pairs containing the exact token address.",
        "Primary pair is the returned pair with the highest USD liquidity.",
        "No LP lock/burn claim is made without a separate verifiable source."
      ],

      source:"DexScreener",
      scannedAt:new Date().toISOString()
    });

  }catch(error){
    return res.status(502).json({
      ok:false,
      error:error.message || "Liquidity scan failed"
    });
  }
};
