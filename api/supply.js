const ARCSCAN = "https://api.arc-scan.org/v1";

function validAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Cache-Control",
    "s-maxage=60, stale-while-revalidate=120"
  );

  const address = String(req.query.address || "").trim();

  if (!validAddress(address)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid token address"
    });
  }

  try {
    const url =
      `${ARCSCAN}/tokens/${address}/holders?limit=100`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error:
          data?.error?.message ||
          "Arcscan holder data unavailable",
        arcscan: data
      });
    }

    return res.status(200).json({
      ok: true,
      chain: "Arc",
      token: address,
      source: "Arcscan",
      holders: data,
      scannedAt: new Date().toISOString()
    });

  } catch (error) {
    return res.status(502).json({
      ok: false,
      error:
        error.message ||
        "Arcscan connection failed"
    });
  }
};
