const RPC_URL = "https://rpc.mainnet.arc.io";

const TOTAL_SUPPLY = "0x18160ddd";
const DECIMALS = "0x313ce567";
const BALANCE_OF = "0x70a08231";

const BURN_ADDRESSES = [
  "0x000000000000000000000000000000000000dEaD",
  "0x0000000000000000000000000000000000000000"
];

function validAddress(value) {
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
  return rpc("eth_call", [{ to, data }, "latest"]);
}

function encodeBalanceOf(address) {
  return (
    BALANCE_OF +
    address.toLowerCase().replace("0x", "").padStart(64, "0")
  );
}

function uint(hex) {
  if (!hex || hex === "0x") return 0n;
  return BigInt(hex);
}

function formatUnits(value, decimals) {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;

  const fraction = (value % base)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole.toString();
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Cache-Control",
    "s-maxage=30, stale-while-revalidate=60"
  );

  const token = String(req.query.address || "").trim();

  if (!validAddress(token)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid token address"
    });
  }

  try {
    // Token decimals
    const decimalsHex = await ethCall(token, DECIMALS);
    const decimals = Number(uint(decimalsHex));

    // Total supply
    const totalSupplyHex = await ethCall(token, TOTAL_SUPPLY);
    const totalSupplyRaw = uint(totalSupplyHex);

    // Burn balances
    let burnedRaw = 0n;
    const burnAddresses = [];

    for (const burnAddress of BURN_ADDRESSES) {
      const result = await ethCall(
        token,
        encodeBalanceOf(burnAddress)
      );

      const balanceRaw = uint(result);

      burnedRaw += balanceRaw;

      burnAddresses.push({
        address: burnAddress,
        balanceRaw: balanceRaw.toString(),
        balance: formatUnits(balanceRaw, decimals)
      });
    }

    /*
      ESTIMATED CIRCULATING

      This is NOT presented as verified circulating supply.

      It only calculates:
      total supply - balances held at known burn addresses.

      Verified vesting / lock / treasury exclusions must be
      added separately when evidence exists.
    */

    const estimatedCirculatingRaw =
      totalSupplyRaw >= burnedRaw
        ? totalSupplyRaw - burnedRaw
        : 0n;

    return res.status(200).json({
      ok: true,

      chain: "Arc",
      token,

      totalSupply: {
        amount: formatUnits(totalSupplyRaw, decimals),
        amountRaw: totalSupplyRaw.toString(),
        status: "ON_CHAIN"
      },

      burned: {
        amount: formatUnits(burnedRaw, decimals),
        amountRaw: burnedRaw.toString(),
        addresses: burnAddresses,
        status: "ON_CHAIN"
      },

      circulating: {
        amount: formatUnits(
          estimatedCirculatingRaw,
          decimals
        ),
        amountRaw: estimatedCirculatingRaw.toString(),

        status: "ESTIMATED",

        methodology:
          "Total Supply - verified balances at known burn addresses",

        warning:
          "Does not subtract unknown or unverified vesting, lock, treasury or other non-circulating balances."
      },

      nextUnlock: {
        date: null,
        amount: null,

        status: "NO_VERIFIED_SCHEDULE",

        reason:
          "No verified vesting or unlock schedule was discovered from the currently connected on-chain sources."
      },

      source: "Arc RPC",

      scannedAt: new Date().toISOString()
    });

  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error.message || "Supply analysis failed"
    });
  }
};
