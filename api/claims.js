/*
  ARCY Search — Claim vs Reality

  This endpoint does NOT invent project claims.
  It accepts explicit claims from a trusted upstream/manual layer and compares
  only those claims that can be checked against connected evidence.

  Query:
    /api/claims?token=0x...&claims=<URL-encoded JSON>

  Example claims JSON:
    {
      "totalSupply":"1000000000",
      "circulatingSupply":"900000000",
      "burned":"50000000",
      "liquidityUsd":"250000",
      "marketCap":"1000000"
    }

  Results:
    VERIFIED   = claim and evidence agree within tolerance
    MISMATCH   = both exist but materially disagree
    UNVERIFIED = no reliable connected evidence / unsupported claim
*/

const ORIGIN_FALLBACK = "https://arcyusdc.xyz";

function isAddress(v){
  return /^0x[a-fA-F0-9]{40}$/.test(v || "");
}

function finite(v){
  if(v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/,/g,""));
  return Number.isFinite(n) ? n : null;
}

function relativeDiff(a,b){
  if(a === null || b === null) return null;
  const scale = Math.max(Math.abs(a),Math.abs(b),1);
  return Math.abs(a-b)/scale;
}

function compareNumber(claim, found, tolerance=0.005){
  const c=finite(claim);
  const f=finite(found);

  if(c===null){
    return {status:"UNVERIFIED",reason:"No numeric claim supplied."};
  }

  if(f===null){
    return {status:"UNVERIFIED",reason:"No connected evidence available."};
  }

  const diff=relativeDiff(c,f);

  return {
    status:diff<=tolerance ? "VERIFIED" : "MISMATCH",
    claim:c,
    found:f,
    relativeDifference:diff,
    tolerance
  };
}

function parseClaims(raw){
  if(!raw) return {};
  try{
    const value=JSON.parse(raw);
    return value && typeof value==="object" && !Array.isArray(value) ? value : {};
  }catch{
    throw new Error("claims must be valid JSON");
  }
}

function requestOrigin(req){
  const proto=String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host=String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return host ? `${proto}://${host}` : ORIGIN_FALLBACK;
}

async function getJson(url){
  try{
    const r=await fetch(url,{
      headers:{
        accept:"application/json",
        "user-agent":"ARCY-Search/1.0 (+https://arcyusdc.xyz)"
      }
    });
    if(!r.ok) return null;
    const j=await r.json();
    return j?.ok ? j : null;
  }catch{
    return null;
  }
}

module.exports=async function handler(req,res){
  res.setHeader("Content-Type","application/json");
  res.setHeader("Cache-Control","no-store");

  const token=String(req.query.token || req.query.address || "").trim();

  if(!isAddress(token)){
    return res.status(400).json({
      ok:false,
      error:"Valid Arc token contract required"
    });
  }

  let claims;
  try{
    claims=parseClaims(String(req.query.claims || ""));
  }catch(error){
    return res.status(400).json({ok:false,error:error.message});
  }

  const origin=requestOrigin(req);

  try{
    // Reuse ARCY Search evidence endpoints. Failure of one source must not
    // make the entire Claim vs Reality card fail.
    const [supply,market,liquidity] = await Promise.all([
      getJson(`${origin}/api/supply?token=${encodeURIComponent(token)}`),
      getJson(`${origin}/api/market?address=${encodeURIComponent(token)}`),
      getJson(`${origin}/api/liquidity?token=${encodeURIComponent(token)}`)
    ]);

    const evidence={
      totalSupply:
        supply?.totalSupply?.amount ?? null,

      circulatingSupply:
        market?.circulatingSupply ?? null,

      burnAddressBalance:
        supply?.burned?.amount ?? null,

      liquidityUsd:
        liquidity?.liquidityUsd ?? null,

      marketCap:
        liquidity?.primaryPair?.marketCap ?? null,

      fdv:
        liquidity?.primaryPair?.fdv ?? null
    };

    const checks=[];

    const supported = {
      totalSupply:{
        label:"Total Supply",
        found:evidence.totalSupply,
        source:"Arc RPC",
        tolerance:0
      },
      circulatingSupply:{
        label:"Circulating Supply",
        found:evidence.circulatingSupply,
        source:"CoinGecko contract-matched market data",
        tolerance:0.005
      },
      burned:{
        label:"Burned / Burn Address Balance",
        found:evidence.burnAddressBalance,
        source:"Arc RPC standard burn-address balances",
        tolerance:0.005,
        caveat:"Standard burn-address balance is not automatically proof of total historical burns."
      },
      liquidityUsd:{
        label:"Liquidity",
        found:evidence.liquidityUsd,
        source:"DexScreener",
        tolerance:0.03
      },
      marketCap:{
        label:"Market Cap",
        found:evidence.marketCap,
        source:"DexScreener",
        tolerance:0.03
      },
      fdv:{
        label:"FDV",
        found:evidence.fdv,
        source:"DexScreener",
        tolerance:0.03
      }
    };

    for(const [key,value] of Object.entries(claims)){
      const rule=supported[key];

      if(!rule){
        checks.push({
          key,
          claim:value,
          found:null,
          result:"UNVERIFIED",
          reason:"No deterministic evidence rule is connected for this claim."
        });
        continue;
      }

      const result=compareNumber(value,rule.found,rule.tolerance);

      checks.push({
        key,
        label:rule.label,
        claim:value,
        found:rule.found,
        result:result.status,
        source:rule.source,
        relativeDifference:result.relativeDifference ?? null,
        tolerance:rule.tolerance,
        caveat:rule.caveat || null,
        reason:result.reason || null
      });
    }

    const counts={
      verified:checks.filter(x=>x.result==="VERIFIED").length,
      mismatch:checks.filter(x=>x.result==="MISMATCH").length,
      unverified:checks.filter(x=>x.result==="UNVERIFIED").length
    };

    return res.status(200).json({
      ok:true,
      chain:"Arc",
      token,

      checks,
      counts,

      evidenceAvailability:{
        supply:Boolean(supply),
        market:Boolean(market),
        liquidity:Boolean(liquidity)
      },

      status:
        checks.length===0
          ? "NO_CLAIMS_SUPPLIED"
          : counts.mismatch>0
            ? "MISMATCH_FOUND"
            : counts.unverified>0
              ? "PARTIALLY_VERIFIED"
              : "VERIFIED",

      methodology:[
        "Only explicitly supplied project claims are evaluated.",
        "Claims are compared with independently connected ARCY Search evidence.",
        "Unsupported claims remain UNVERIFIED instead of being guessed.",
        "Market-derived values use small tolerances because live values can change between requests.",
        "No overall token safety score or investment recommendation is produced."
      ],

      scannedAt:new Date().toISOString()
    });

  }catch(error){
    return res.status(502).json({
      ok:false,
      error:error.message || "Claim verification failed"
    });
  }
};
