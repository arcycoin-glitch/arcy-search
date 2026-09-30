const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

async function cg(path) {
  const headers = { accept: "application/json" };
  if (process.env.COINGECKO_API_KEY) {
    headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
  }
  const response = await fetch(COINGECKO_BASE + path, { headers });
  if (!response.ok) throw new Error(`CoinGecko HTTP ${response.status}`);
  return response.json();
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const address = String(req.query.address || "").trim();
  if (!isAddress(address)) {
    return res.status(400).json({ ok: false, error: "Valid Arc token contract required" });
  }

  try {
    const platforms = await cg("/asset_platforms");
    const arc = platforms.find(p =>
      String(p.name || "").toLowerCase() === "arc" ||
      String(p.id || "").toLowerCase() === "arc" ||
      String(p.shortname || "").toLowerCase() === "arc"
    );

    if (!arc || !arc.id) {
      return res.status(200).json({
        ok: false,
        status: "NOT_VERIFIED",
        circulatingSupply: null,
        reason: "Arc is not available as a CoinGecko contract platform."
      });
    }

    const coin = await cg(`/coins/${encodeURIComponent(arc.id)}/contract/${address.toLowerCase()}`);
    const circulatingSupply = coin?.market_data?.circulating_supply;

    if (circulatingSupply === null || circulatingSupply === undefined) {
      return res.status(200).json({
        ok: false,
        status: "NOT_VERIFIED",
        circulatingSupply: null,
        source: "CoinGecko",
        platform: arc.id
      });
    }

    return res.status(200).json({
      ok: true,
      status: "SOURCE_REPORTED",
      circulatingSupply,
      source: "CoinGecko",
      platform: arc.id,
      coinId: coin.id || null,
      scannedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      status: "NOT_VERIFIED",
      circulatingSupply: null,
      reason: error.message || "CoinGecko lookup unavailable"
    });
  }
};
