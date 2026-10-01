const ARC_RPC = "https://rpc.mainnet.arc.io";

/*
  ARCY Search — Contract Control
  Conservative rule:
  - Never treat a failed call as proof that a capability does not exist.
  - "DETECTED" means the selector/call or standard proxy slot produced evidence.
  - "NOT_VERIFIED" means no reliable evidence was found by this lightweight scan.
*/

const SELECTORS = {
  owner:       "0x8da5cb5b", // owner()
  paused:      "0x5c975abb", // paused()
  pendingOwner:"0xe30c3978"  // pendingOwner()
};

// EIP-1967 standard storage slots.
const EIP1967_IMPLEMENTATION =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const EIP1967_ADMIN =
  "0xb53127684a568b3173ae13b9f8a6016e019dc321a6e29013d8a7d3e8d6a717850b5d6103";

// Common function selectors searched in runtime bytecode.
// Presence is evidence of exposed bytecode logic, not proof of current permission state.
const BYTECODE_FLAGS = {
  mint: [
    "40c10f19", // mint(address,uint256)
    "a0712d68"  // mint(uint256)
  ],
  pause: [
    "8456cb59", // pause()
    "3f4ba83a"  // unpause()
  ],
  blacklist: [
    "e47d6060", // blacklist(address) - common
    "f9f92be4", // addToBlacklist(address) - common
    "3d2d70a4"  // removeFromBlacklist(address) - common
  ],
  ownership: [
    "8da5cb5b", // owner()
    "f2fde38b", // transferOwnership(address)
    "715018a6"  // renounceOwnership()
  ],
  accessControl: [
    "91d14854", // hasRole(bytes32,address)
    "2f2ff15d", // grantRole(bytes32,address)
    "d547741f"  // revokeRole(bytes32,address)
  ]
};

function isAddress(v){
  return /^0x[a-fA-F0-9]{40}$/.test(v || "");
}

function addressFromWord(hex){
  if(!hex || hex === "0x") return null;
  const clean = hex.replace(/^0x/,"").padStart(64,"0");
  const candidate = "0x" + clean.slice(-40);
  if(!isAddress(candidate)) return null;
  if(/^0x0{40}$/i.test(candidate)) return null;
  return candidate;
}

function boolFromWord(hex){
  if(!hex || hex === "0x") return null;
  try{
    const n = BigInt(hex);
    if(n === 0n) return false;
    if(n === 1n) return true;
  }catch{}
  return null;
}

async function rpc(method, params){
  const r = await fetch(ARC_RPC,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})
  });
  if(!r.ok) throw new Error(`Arc RPC HTTP ${r.status}`);
  const j = await r.json();
  if(j.error) throw new Error(j.error.message || "Arc RPC error");
  return j.result;
}

async function safeCall(to, data){
  try{
    const result = await rpc("eth_call",[{to,data},"latest"]);
    return {ok:true,result};
  }catch(error){
    return {ok:false,result:null,error:error.message};
  }
}

async function safeStorage(address, slot){
  try{
    const result = await rpc("eth_getStorageAt",[address,slot,"latest"]);
    return addressFromWord(result);
  }catch{
    return null;
  }
}

function bytecodeHasAny(code, selectors){
  const body = String(code || "").toLowerCase().replace(/^0x/,"");
  return selectors.some(s => body.includes(s.toLowerCase()));
}

module.exports = async function handler(req,res){
  res.setHeader("Content-Type","application/json");
  res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=600");

  const token = String(req.query.token || req.query.address || "").trim();

  if(!isAddress(token)){
    return res.status(400).json({
      ok:false,
      error:"Valid Arc token contract required"
    });
  }

  try{
    const code = await rpc("eth_getCode",[token,"latest"]);

    if(!code || code === "0x"){
      return res.status(404).json({
        ok:false,
        error:"No contract found at this address"
      });
    }

    const [
      ownerCall,
      pausedCall,
      pendingOwnerCall,
      implementation,
      proxyAdmin
    ] = await Promise.all([
      safeCall(token,SELECTORS.owner),
      safeCall(token,SELECTORS.paused),
      safeCall(token,SELECTORS.pendingOwner),
      safeStorage(token,EIP1967_IMPLEMENTATION),
      safeStorage(token,EIP1967_ADMIN)
    ]);

    const owner = ownerCall.ok ? addressFromWord(ownerCall.result) : null;
    const pendingOwner =
      pendingOwnerCall.ok ? addressFromWord(pendingOwnerCall.result) : null;
    const paused =
      pausedCall.ok ? boolFromWord(pausedCall.result) : null;

    const flags = {};
    for(const [name,selectors] of Object.entries(BYTECODE_FLAGS)){
      flags[name] = bytecodeHasAny(code,selectors);
    }

    const isProxy = Boolean(implementation);
    const controlEvidence = Boolean(
      owner ||
      pendingOwner ||
      proxyAdmin ||
      flags.ownership ||
      flags.accessControl
    );

    return res.status(200).json({
      ok:true,
      chain:"Arc",
      token,

      owner:{
        address:owner,
        status:owner ? "DETECTED" : "NOT_VERIFIED",
        evidence:owner ? "owner() returned an address" : null
      },

      pendingOwner:{
        address:pendingOwner,
        status:pendingOwner ? "DETECTED" : "NOT_VERIFIED"
      },

      pause:{
        currentState:paused,
        capabilitySelectorDetected:flags.pause,
        status:
          paused !== null || flags.pause
            ? "DETECTED"
            : "NOT_VERIFIED"
      },

      mint:{
        capabilitySelectorDetected:flags.mint,
        status:flags.mint ? "DETECTED" : "NOT_VERIFIED"
      },

      blacklist:{
        capabilitySelectorDetected:flags.blacklist,
        status:flags.blacklist ? "DETECTED" : "NOT_VERIFIED"
      },

      accessControl:{
        selectorDetected:flags.accessControl,
        status:flags.accessControl ? "DETECTED" : "NOT_VERIFIED"
      },

      proxy:{
        detected:isProxy,
        implementation:implementation,
        admin:proxyAdmin,
        status:isProxy ? "DETECTED" : "NOT_VERIFIED"
      },

      controlSummary:{
        privilegedControlEvidence:controlEvidence,
        status:controlEvidence ? "CONTROL_EVIDENCE_FOUND" : "NOT_VERIFIED"
      },

      methodology:[
        "Direct Arc RPC eth_call for owner(), pendingOwner() and paused().",
        "Runtime bytecode selector scan for common mint, pause, blacklist, ownership and AccessControl functions.",
        "EIP-1967 implementation/admin storage-slot checks for standard proxies.",
        "Absence of a selector or successful call is NOT treated as proof that a capability is impossible."
      ],

      limitations:[
        "Custom permission systems and non-standard selectors may not be detected.",
        "Bytecode selector presence does not prove that a function is currently callable by an administrator.",
        "Proxy implementations may require a deeper implementation-contract scan.",
        "Blacklist detection is limited to common selectors and must be verified before a definitive claim."
      ],

      source:"Arc RPC",
      scannedAt:new Date().toISOString()
    });

  }catch(error){
    return res.status(502).json({
      ok:false,
      error:error.message || "Contract control scan failed"
    });
  }
};