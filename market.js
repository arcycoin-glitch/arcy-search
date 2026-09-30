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
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");

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

    if (!arc?.id) {
      return res.status(200).json({
        ok: true,
        status: "NOT_VERIFIED",
        circulatingSupply: null,
        source: "CoinGecko",
        reason: "Arc contract platform is not available from CoinGecko."
      });
    }

    const coin = await cg(`/coins/${encodeURIComponent(arc.id)}/contract/${address.toLowerCase()}`);
    const raw = coin?.market_data?.circulating_supply;
    const circulatingSupply = Number(raw);

    // Critical rule: CoinGecko often returns 0 when circulating supply has not
    // actually been verified. ARCY Search must never present that as verified zero.
    if (!Number.isFinite(circulatingSupply) || circulatingSupply <= 0) {
      return res.status(200).json({
        ok: true,
        status: "NOT_VERIFIED",
        circulatingSupply: null,
        source: "CoinGecko",
        platform: arc.id,
        coinId: coin?.id || null,
        reason: "CoinGecko does not report a positive verified circulating supply for this contract.",
        scannedAt: new Date().toISOString()
      });
    }

    return res.status(200).json({
      ok: true,
      status: "SOURCE_REPORTED",
      circulatingSupply,
      source: "CoinGecko",
      platform: arc.id,
      coinId: coin?.id || null,
      contractMatched: true,
      scannedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(200).json({
      ok: true,
      status: "NOT_VERIFIED",
      circulatingSupply: null,
      source: "CoinGecko",
      reason: error.message || "CoinGecko lookup unavailable",
      scannedAt: new Date().toISOString()
    });
  }
};
