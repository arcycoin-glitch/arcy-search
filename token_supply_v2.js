const RPC_URL = "https://rpc.mainnet.arc.io";

const SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
  balanceOf: "0x70a08231"
};

const BURN_ADDRESSES = [
  "0x000000000000000000000000000000000000dEaD",
  "0x0000000000000000000000000000000000000001"
];

function isAddress(v) {
  return /^0x[a-fA-F0-9]{40}$/.test(v || "");
}

async function rpc(method, params) {
  const r = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  });
  if (!r.ok) throw new Error("Arc RPC unavailable");
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || "Arc RPC error");
  return j.result;
}

async function ethCall(to, data) {
  return rpc("eth_call", [{ to, data }, "latest"]);
}

function uint(hex) {
  if (!hex || hex === "0x") return null;
  return BigInt(hex);
}

function decodeString(hex) {
  if (!hex || hex === "0x") return null;
  try {
    const raw = hex.slice(2);
    if (raw.length === 64) {
      return Buffer.from(raw, "hex").toString("utf8").replace(/\0/g, "").trim() || null;
    }
    const offset = Number(BigInt("0x" + raw.slice(0, 64))) * 2;
    const len = Number(BigInt("0x" + raw.slice(offset, offset + 64))) * 2;
    return Buffer.from(raw.slice(offset + 64, offset + 64 + len), "hex")
      .toString("utf8").replace(/\0/g, "").trim() || null;
  } catch {
    return null;
  }
}

function formatUnits(value, decimals) {
  if (value === null) return null;
  const d = BigInt(decimals);
  const base = 10n ** d;
  const whole = value / base;
  const frac = (value % base).toString().padStart(Number(d), "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

function balanceData(address) {
  return SELECTORS.balanceOf + address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

  const address = String(req.query.address || "").trim();
  if (!isAddress(address)) {
    return res.status(400).json({ ok: false, error: "Invalid contract address" });
  }

  try {
    const code = await rpc("eth_getCode", [address, "latest"]);
    if (!code || code === "0x") {
      return res.status(404).json({ ok: false, error: "No contract found at this address" });
    }

    const [nameHex, symbolHex, decimalsHex, supplyHex] = await Promise.all([
      ethCall(address, SELECTORS.name).catch(() => null),
      ethCall(address, SELECTORS.symbol).catch(() => null),
      ethCall(address, SELECTORS.decimals).catch(() => null),
      ethCall(address, SELECTORS.totalSupply).catch(() => null)
    ]);

    const decimalsBI = uint(decimalsHex);
    const supply = uint(supplyHex);

    if (decimalsBI === null || supply === null) {
      return res.status(422).json({ ok: false, error: "ERC-20 supply metadata could not be read" });
    }

    const decimals = Number(decimalsBI);
    const name = decodeString(nameHex);
    const symbol = decodeString(symbolHex);

    const burnRaw = await Promise.all(
      BURN_ADDRESSES.map(a => ethCall(address, balanceData(a)).then(uint).catch(() => 0n))
    );
    const burned = burnRaw.reduce((a, b) => a + (b || 0n), 0n);

    // IMPORTANT:
    // This is NOT claimed as authoritative circulating supply.
    // It is only total supply minus balances at recognized burn addresses.
    const circulatingAfterKnownBurns = supply >= burned ? supply - burned : null;

    return res.status(200).json({
      ok: true,
      chain: "Arc",
      address,
      token: {
        name,
        symbol,
        decimals,
        totalSupply: formatUnits(supply, decimals),
        totalSupplyRaw: supply.toString()
      },
      supply: {
        knownBurned: formatUnits(burned, decimals),
        knownBurnedRaw: burned.toString(),
        circulatingAfterKnownBurns: circulatingAfterKnownBurns === null
          ? null
          : formatUnits(circulatingAfterKnownBurns, decimals),
        circulatingStatus: "ESTIMATE_AFTER_KNOWN_BURNS",
        locked: null,
        lockedStatus: "NOT_VERIFIED",
        nextUnlock: null,
        nextUnlockStatus: "NO_VERIFIED_SCHEDULE"
      },
      evidence: {
        totalSupply: "ERC-20 totalSupply() via Arc RPC",
        burned: "balanceOf() for recognized burn addresses via Arc RPC",
        circulating: "Total supply minus recognized burn-address balances; treasury, vesting, LP, bridge or other non-circulating balances are not assumed.",
        locked: "No lock/vesting address is assumed without evidence.",
        nextUnlock: "No unlock date is invented without a verified vesting schedule."
      },
      source: "Arc RPC",
      scannedAt: new Date().toISOString()
    });
  } catch (e) {
    return res.status(502).json({ ok: false, error: e.message || "Arc RPC unavailable" });
  }
};
