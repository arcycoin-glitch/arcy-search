const RPC_URL = "https://rpc.mainnet.arc.io";

const SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd"
};

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

async function rpc(method, params) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params
    })
  });

  if (!response.ok) {
    throw new Error("Arc RPC unavailable");
  }

  const json = await response.json();

  if (json.error) {
    throw new Error(json.error.message || "Arc RPC error");
  }

  return json.result;
}

async function ethCall(address, data) {
  return rpc("eth_call", [
    {
      to: address,
      data: data
    },
    "latest"
  ]);
}

function decodeUint(hex) {
  if (!hex || hex === "0x") return null;

  try {
    return BigInt(hex);
  } catch {
    return null;
  }
}

function decodeString(hex) {
  if (!hex || hex === "0x") return null;

  try {
    const raw = hex.slice(2);

    if (raw.length === 64) {
      return Buffer
        .from(raw, "hex")
        .toString("utf8")
        .replace(/\0/g, "")
        .trim();
    }

    const offset =
      Number(BigInt("0x" + raw.slice(0, 64))) * 2;

    const length =
      Number(
        BigInt(
          "0x" + raw.slice(offset, offset + 64)
        )
      ) * 2;

    return Buffer
      .from(
        raw.slice(
          offset + 64,
          offset + 64 + length
        ),
        "hex"
      )
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();

  } catch {
    return null;
  }
}

function formatUnits(value, decimals) {
  if (value === null) return null;

  const base = 10n ** BigInt(decimals);

  const whole = value / base;

  const fraction = (value % base)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");

  return fraction
    ? `${whole}.${fraction}`
    : whole.toString();
}

module.exports = async function handler(req, res) {

  res.setHeader(
    "Cache-Control",
    "s-maxage=30, stale-while-revalidate=60"
  );

  const address =
    String(req.query.address || "").trim();

  if (!isAddress(address)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid contract address"
    });
  }

  try {

    const code = await rpc(
      "eth_getCode",
      [address, "latest"]
    );

    if (!code || code === "0x") {
      return res.status(404).json({
        ok: false,
        error: "No contract found"
      });
    }

    const [
      nameHex,
      symbolHex,
      decimalsHex,
      supplyHex
    ] = await Promise.all([

      ethCall(address, SELECTORS.name),

      ethCall(address, SELECTORS.symbol),

      ethCall(address, SELECTORS.decimals),

      ethCall(address, SELECTORS.totalSupply)

    ]);

    const decimalsValue =
      decodeUint(decimalsHex);

    const supplyValue =
      decodeUint(supplyHex);

    if (
      decimalsValue === null ||
      supplyValue === null
    ) {
      throw new Error(
        "ERC20 metadata unavailable"
      );
    }

    const decimals =
      Number(decimalsValue);

    const name =
      decodeString(nameHex);

    const symbol =
      decodeString(symbolHex);

    return res.status(200).json({

      ok: true,

      chain: "Arc",

      address: address,

      token: {

        name: name,

        symbol: symbol,

        decimals: decimals,

        totalSupply:
          formatUnits(
            supplyValue,
            decimals
          ),

        totalSupplyRaw:
          supplyValue.toString()

      },

      source: "Arc RPC",

      scannedAt:
        new Date().toISOString()

    });

  } catch (error) {

    return res.status(502).json({

      ok: false,

      error:
        error.message ||
        "Arc RPC unavailable"

    });

  }
};
