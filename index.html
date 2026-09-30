const ARC_RPC = "https://rpc.mainnet.arc.io";

const SELECTORS = {
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
  balanceOf: "0x70a08231"
};

const BURN_ADDRESSES = [
  "0x000000000000000000000000000000000000dEaD",
  "0x0000000000000000000000000000000000000000"
];

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function padAddress(address) {
  return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

function hexToBigInt(hex) {
  if (!hex || hex === "0x") return 0n;
  return BigInt(hex);
}

function formatUnits(value, decimals) {
  const negative = value < 0n;
  const abs = negative ? -value : value;

  if (decimals === 0) {
    return `${negative ? "-" : ""}${abs.toString()}`;
  }

  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = (abs % base)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");

  return `${negative ? "-" : ""}${whole.toString()}${
    fraction ? "." + fraction : ""
  }`;
}

async function rpc(method, params) {
  const response = await fetch(ARC_RPC, {
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
    throw new Error(`Arc RPC HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || "Arc RPC error");
  }

  return data.result;
}

async function ethCall(to, data) {
  return rpc("eth_call", [{ to, data }, "latest"]);
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Cache-Control",
    "s-maxage=60, stale-while-revalidate=120"
  );

  const token = String(req.query.token || "").trim();

  if (!isAddress(token)) {
    return res.status(400).json({
      ok: false,
      error: "Valid Arc token contract required"
    });
  }

  try {
    const code = await rpc("eth_getCode", [token, "latest"]);

    if (!code || code === "0x") {
      return res.status(404).json({
        ok: false,
        error: "No contract found at this address"
      });
    }

    const [decimalsHex, totalSupplyHex] = await Promise.all([
      ethCall(token, SELECTORS.decimals),
      ethCall(token, SELECTORS.totalSupply)
    ]);

    const decimals = Number(hexToBigInt(decimalsHex));

    if (
      !Number.isInteger(decimals) ||
      decimals < 0 ||
      decimals > 255
    ) {
      throw new Error("Invalid token decimals");
    }

    const totalSupplyRaw = hexToBigInt(totalSupplyHex);

    const burnBalances = await Promise.all(
      BURN_ADDRESSES.map(async address => {
        const result = await ethCall(
          token,
          SELECTORS.balanceOf + padAddress(address)
        );

        const raw = hexToBigInt(result);

        return {
          address,
          raw,
          amount: formatUnits(raw, decimals)
        };
      })
    );

    const burnedRaw = burnBalances.reduce(
      (sum, item) => sum + item.raw,
      0n
    );

    return res.status(200).json({
      ok: true,
      chain: "Arc",
      token,

      totalSupply: {
        amount: formatUnits(totalSupplyRaw, decimals),
        raw: totalSupplyRaw.toString(),
        status: "ON_CHAIN"
      },

      burned: {
        amount: formatUnits(burnedRaw, decimals),
        raw: burnedRaw.toString(),
        addresses: burnBalances.map(item => ({
          address: item.address,
          amount: item.amount
        })),
        status: "ON_CHAIN_KNOWN_ADDRESSES",
        methodology:
          "Sum of balances held by standard 0xdead and zero burn addresses."
      },

      circulating: {
        amount: null,
        status: "NOT_VERIFIED",
        reason:
          "Circulating supply cannot be derived reliably from total supply minus burned tokens. Locked, vesting, treasury and other non-circulating balances require separate verification."
      },

      locked: {
        amount: null,
        status: "NOT_VERIFIED",
        reason:
          "No verified lock or vesting balance has been connected yet."
      },

      nextUnlock: {
        date: null,
        amount: null,
        status: "NOT_VERIFIED",
        reason:
          "Unlock schedule requires a separately verified vesting or unlock source."
      },

      source: "Arc RPC",
      scannedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error.message || "Supply scan failed"
    });
  }
};
