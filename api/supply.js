const RPC_URL = "https://rpc.mainnet.arc.io";

const BALANCE_OF = "0x70a08231";

// Sadece kesin olarak bilinen standart burn adresleri.
// Vesting/lock adreslerini kanıt olmadan buraya EKLEMİYORUZ.
const BURN_ADDRESSES = [
  "0x000000000000000000000000000000000000dEaD",
  "0x0000000000000000000000000000000000000000"
];

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

async function ethCall(to, data) {
  return rpc("eth_call", [
    {
      to,
      data
    },
    "latest"
  ]);
}

function encodeBalanceOf(address) {
  return (
    BALANCE_OF +
    address
      .toLowerCase()
      .replace("0x", "")
      .padStart(64, "0")
  );
}

function decodeUint(hex) {
  if (!hex || hex === "0x") {
    return 0n;
  }

  return BigInt(hex);
}

function formatUnits(value, decimals) {
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

  res.setHeader("Content-Type", "application/json");

  res.setHeader(
    "Cache-Control",
    "s-maxage=30, stale-while-revalidate=60"
  );

  const token =
    String(req.query.address || "").trim();

  if (!isAddress(token)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid token address"
    });
  }

  try {

    // token.js zaten çalışan ana token endpoint'imiz.
    // Burada supply.js yalnızca burn/supply ek analizini yapıyor.

    const burnBalances = [];

    let totalBurnedRaw = 0n;

    for (const burnAddress of BURN_ADDRESSES) {

      const result = await ethCall(
        token,
        encodeBalanceOf(burnAddress)
      );

      const balance = decodeUint(result);

      totalBurnedRaw += balance;

      burnBalances.push({
        address: burnAddress,
        balanceRaw: balance.toString()
      });
    }

    // ARCY şu anda 18 decimals.
    // Daha sonra bunu token.js'den dinamik bağlayacağız.
    const decimals = 18;

    const burned =
      formatUnits(totalBurnedRaw, decimals);

    return res.status(200).json({

      ok: true,

      chain: "Arc",

      token,

      burned: {
        amount: burned,
        amountRaw: totalBurnedRaw.toString(),
        addresses: burnBalances,
        status: "ON_CHAIN"
      },

      circulating: {
        amount: null,
        status: "NOT_VERIFIED",
        reason:
          "A verified circulating-supply methodology requires confirmed non-circulating addresses such as vesting, locked treasury or other excluded balances."
      },

      nextUnlock: {
        date: null,
        amount: null,
        status: "NO_VERIFIED_SCHEDULE",
        reason:
          "No vesting or unlock schedule is assumed without verifiable on-chain or official evidence."
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
        "Supply analysis failed"

    });

  }
};
