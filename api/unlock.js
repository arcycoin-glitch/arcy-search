const SOURCE_URL =
  "https://api.coinbell.in/token-unlocks?sort=soonest&window=30";

function stripTags(s = "") {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function isoDate(text = "") {
  const m = text.match(
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\b/i
  );

  if (!m) return null;

  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3,
    may: 4, jun: 5, jul: 6, aug: 7,
    sep: 8, oct: 9, nov: 10, dec: 11
  };

  const d = new Date(
    Date.UTC(
      Number(m[3]),
      months[m[2].toLowerCase()],
      Number(m[1])
    )
  );

  return d.toISOString().slice(0, 10);
}

function parseRows(html) {
  const rows = [
    ...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)
  ];

  const out = [];

  for (const row of rows) {
    const cells = [
      ...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)
    ].map(x => stripTags(x[1]));

    if (cells.length < 6) continue;
    if (!/^\d+$/.test(cells[0])) continue;

    const date = isoDate(cells[2]);
    if (!date) continue;

    const amount = cells[3] || "";
    const pct = cells[5] || "";
    const allocation = cells[6] || "";

    const symbolMatch = amount.match(
      /\s([A-Z0-9._-]{1,14})\s*$/i
    );

    const symbol = symbolMatch
      ? symbolMatch[1].toUpperCase()
      : "";

    let name = cells[1] || symbol || "Unknown";

    if (
      symbol &&
      name.toUpperCase().endsWith(symbol)
    ) {
      name =
        name.slice(0, -symbol.length).trim() ||
        symbol;
    }

    out.push({
      name,
      symbol,
      date,
      amount,
      pctCirculating: pct,
      allocation
    });
  }

  return out;
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  res.setHeader(
    "Cache-Control",
    "s-maxage=21600, stale-while-revalidate=900"
  );

  const symbol = String(
    req.query.symbol || ""
  ).trim().toUpperCase();

  if (!symbol) {
    return res.status(400).json({
      ok: false,
      error: "Token symbol required"
    });
  }

  try {
    const response = await fetch(SOURCE_URL, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent":
          "ARCY Search/1.0 (+https://arcyusdc.xyz)"
      }
    });

    if (!response.ok) {
      throw new Error(
        `Unlock source HTTP ${response.status}`
      );
    }

    const html = await response.text();
    const events = parseRows(html);

    const today = new Date()
      .toISOString()
      .slice(0, 10);

    const matches = events
      .filter(
        x =>
          x.symbol === symbol &&
          x.date >= today
      )
      .sort(
        (a, b) =>
          Date.parse(a.date) -
          Date.parse(b.date)
      );

    const next = matches[0] || null;

    return res.status(200).json({
      ok: true,
      symbol,

      nextUnlock: next
        ? {
            date: next.date,
            amount: next.amount,
            pctCirculating:
              next.pctCirculating,
            allocation:
              next.allocation,
            status: "SOURCE_REPORTED"
          }
        : {
            date: null,
            amount: null,
            pctCirculating: null,
            allocation: null,
            status:
              "NO_VERIFIED_SCHEDULE"
          },

      source: "CoinBell / DefiLlama-attributed unlock feed",

      scannedAt:
        new Date().toISOString()
    });

  } catch (error) {
    return res.status(502).json({
      ok: false,
      error:
        error.message ||
        "Unlock feed unavailable"
    });
  }
};
