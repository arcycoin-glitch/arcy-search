# ARCY SEARCH — Approved token-detail UX decision
Date: 2026-10-11
Status: APPROVED; implemented in isolated test branch, not yet deployed or production-parity audited
Applies to: The NEXT `arcy-search` test site (Arc, Ethereum, Robinhood Chain). No changes to the current live `arcyusdc.xyz` site until release gates pass.

## Visual product standard — approved 2026-10-11
- Inspiration: Synthra and Argus **quality and restraint**, not imitation of their visual branding.
- Premium dark navy with modest cyan accents, excellent typography, abundant negative space, cohesive rhythm, accessible contrast, and light motion only where useful.
- Discovery home must stay visually minimal: one leading search action, clean chain selector, no wall of metrics.
- Token detail must privilege contract identity, **three concise headline facts**, and a single source-bound historical chart. No multiple busy dashboard graphs.
- Keep the five-card, twenty-field full report behind an explicit expandable section. Keep specialist modules (Before You Buy, Exit Reality, What Changed?, Claim vs Reality) behind their own disclosure until reliable features are ready.
- No fictional candles, false investor-safety scores, fake badges or decorative 'live' claims.
- Mobile-first across 320px, 390px, 768px and 1440px; navigate in same tab via stable chain/address deep links.
- The historical chart uses a single exact-token GeckoTerminal pool's source data when independently verified. The external source must be attributed and may be absent on chains where support cannot be confirmed.

## Non-negotiable navigation
1. Keep the home/search/discovery screen minimal, fast and clean. Network selector, search, ranked original/verified contract result, core ARCY content and Arc Pulse continue to live here.
2. Selecting a token must navigate **within the same ARCY SEARCH website** to a dedicated token detail page (same browser tab; not a new external tab).
3. Every token detail has a **stable, shareable deep link** that includes the canonical network and full verified contract address, e.g. `/token/arc/0x...`, `/token/ethereum/0x...`, `/token/robinhood/0x...`. Do not use a symbol-only path because symbols can collide. Links from X research must open the exact contract.
4. Back navigation and browser history work, and changing networks clears stale token data. Do not navigate across chains implicitly. Preserve existing production features.

## Dedicated token detail hierarchy
A. Compact header: full token name, ticker, selected chain, full contract address (copy + explorer), identity confidence status (OFFICIAL CONTRACT MATCHED / INDEXED BUT NOT ISSUER VERIFIED / NOT VERIFIED), snapshot time/source and concise current market figures.
B. Price history chart near the top, with useful time ranges and a source line. Chart only after exact network + contract + pool binding (and provider terms approval). Do not display made-up history, market prices borrowed from another chain, or simulated data labelled live.
C. Existing buyer-first analysis: all five validated sections / twenty fields (or six cards only when the approved canonical production architecture explicitly requires that), expandable proof details, actual source URLs, precise raw metric value, freshness and block context. Compact UI presents <= four significant digits; values >1,000 abbreviated K/M/B/T etc; tiny nonzero prices in short scientific notation; do not truncate addresses or source values internally.
D. Four ARCY-specific research modules below core analytics:
   - BEFORE YOU BUY: evidence-backed changeable taxes, transfer/sell restrictions, owner/admin, mint, blacklist, pause, proxy/upgrade control and LP control. An unknown is NOT VERIFIED, never 'safe'.
   - EXIT REALITY: optional input for proposed sell amount, calculate source-bound swap quote and price impact where safe and supported. Show DEX route, verified fees, slippage and assumptions separately; warn that it is an estimate, not a guarantee; do not imply a sale is executable without simulation.
   - WHAT CHANGED?: compare two immutable, provenance-tagged historical snapshots; whales, liquidity and contract roles/permissions; state timestamps and block height and avoid fabricating historical records or inferring sells from wallet holdings.
   - CLAIM VS REALITY: project first-party promises compared against precise on-chain claims with sources, dates, confidence and unresolved cases.
E. Clear data/provider attribution and read-only / not investment advice note.

## Verification and security
- Official token means exact chain ID plus full first-party issuer-documented contract; market logos, popularity, ticker and CoinGecko listing do not confer official status.
- Never infer support for a chain from address/ticker only.
- No empty fake numbers, no overly long decimal chains in preview cards. Show NOT VERIFIED for absent/insufficient proof.
- Keep provider terms, chart embedding licensing, API cache/rate-limit and CORS reviewed.
- Accessible keyboard navigation, small-screen layouts (320/390/768/1440px), SEO/share previews per token, correct full URLs.
- Keep chart performance isolated from core research card performance; charts fail gracefully.
- Do not expose admin secrets, private keys, token provider credentials, host-only environment variables or privileged worker endpoints.

## Implementation sequence — safe test branch only
1. Introduce shareable route + same-tab transition from search results and direct deep-link load. Preserve original site's live domain.
2. Build header and proof-linked five-card detail view using existing report API and evidence formatter.
3. Add data-backed price chart after exact-chain pool resolution and provider licensing check.
4. Add BEFORE YOU BUY from verified contract controls. Add other tools after actual modeling and historical storage are ready.
5. Test direct-route refresh, navigation, network changes, original vs fake tokens, tiny prices, unverified sources, mobile/desktop, live API and accessibility.
6. Release only after the old production features (Arc holder worker, Pulse, burn counter, research, swap, source-reviewed tax/LP) are preserved and Vercel test deployment acceptance is complete.

**No domain cutover, no merge to production and no public claims of finished features before all release gates pass.**

## Implementation checkpoint
- Test branch: `feature/three-chain-release-lab-20261011`.
- Home and token detail route implemented, with Vercel route-rewrite configuration (requires deployment verification).
- User-controlled, folded disclosures keep deep metrics and unimplemented specialist tools out of the initial viewport.
- Read-only GeckoTerminal exact-chain OHLCV source adapter and source-attributed SVG chart are implemented as a fail-closed enhancement; live deployed provider compatibility, rate limits and permitted commercial use require confirmation.
- Do not treat passing isolated-browser tests as approval to replace the current live domain.
