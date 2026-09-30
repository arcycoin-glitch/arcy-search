const RPC_URL = "https://rpc.mainnet.arc.io";

const SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
};

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

async function rpc(method, params) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || "RPC error");
  return data.result;
}

async function ethCall(address, data) {
  return rpc("eth_call", [{ to: address, data }, "latest"]);
}

function decodeUint(hex) {
  if (!hex || hex === "0x") return null;
  return BigInt(hex).toString();
}

function decodeString(hex) {
  if (!hex || hex === "0x") return null;

  const clean = hex.slice(2);

  try {
    // Standard ABI dynamic string.
    if (clean.length >= 128) {
      const offset = Number(BigInt("0x" + clean.slice(0, 64)));
      const lengthPos = offset * 2;
      const length = Number(BigInt("0x" + clean.slice(lengthPos, lengthPos + 64)));
      const valueHex = clean.slice(lengthPos + 64, lengthPos + 64 + length * 2);
      return Buffer.from(valueHex, "hex").toString("utf8").replace(/\0/g, "").trim() || null;
    }

    // Some older ERC-20 contracts return bytes32.
    return Buffer.from(clean.slice(0, 64), "hex")
      .toString("utf8")
      .replace(/\0/g, "")
      .trim() || null;
  } catch {
    return null;
  }
}

function formatUnits(raw, decimals) {
  if (raw == null || decimals == null) return null;

  const value = BigInt(raw);
  const d = Number(decimals);
  if (!Number.isInteger(d) || d < 0 || d > 255) return null;

  if (d === 0) return value.toString();

  const base = 10n ** BigInt(d);
  const whole = value / base;
  const fraction = (value % base)
    .toString()
    .padStart(d, "0")
    .replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  const address = String(req.query.address || "").trim();

  if (!isAddress(address)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid contract address",
    });
  }

  try {
    const bytecode = await rpc("eth_getCode", [address, "latest"]);

    if (!bytecode || bytecode === "0x") {
      return res.status(404).json({
        ok: false,
        error: "No contract found at this address",
      });
    }

    const results = await Promise.allSettled([
      ethCall(address, SELECTORS.name),
      ethCall(address, SELECTORS.symbol),
      ethCall(address, SELECTORS.decimals),
      ethCall(address, SELECTORS.totalSupply),
    ]);

    const result = (index) =>
      results[index].status === "fulfilled" ? results[index].value : null;

    const name = decodeString(result(0));
    const symbol = decodeString(result(1));
    const decimalsRaw = decodeUint(result(2));
    const totalSupplyRaw = decodeUint(result(3));

    const decimals = decimalsRaw == null ? null : Number(decimalsRaw);
    const totalSupply = formatUnits(totalSupplyRaw, decimals);

    if (!name && !symbol && decimals == null && totalSupplyRaw == null) {
      return res.status(422).json({
        ok: false,
        error: "Contract found, but standard ERC-20 metadata could not be read",
      });
    }

    return res.status(200).json({
      ok: true,
      chain: "Arc",
      address,
      token: {
        name,
        symbol,
        decimals,
        totalSupply,
        totalSupplyRaw,
      },
      source: "Arc RPC",
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: "Arc RPC temporarily unavailable",
      detail: error?.message || String(error),
    });
  }
}
