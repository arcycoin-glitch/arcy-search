# ARCY SEARCH — Arc Migration Lab, Stage 1 (2026-10-11)

## Repository / release safety
- GitHub: `arcycoin-glitch/arcy-search`, branch `arc-migration-lab`.
- Protected Vercel test project only: `arcy-ethereum-test`. **Never change production `arcycoin-glitch/arcy-website/main` or `arcyusdc.xyz` without separate authorization.**
- Three chains: Arc mainnet `5042`, Ethereum mainnet `1`, Robinhood Chain mainnet `4663`.
- All operations are read-only. No transactions, private keys, wallet connections or market making.

## What is working
- Arc network selection in the new multichain search UI, exact chain scoping and Arc-only name discovery.
- Name discovery uses GeckoTerminal's **network=arc** indexed pool/token relationship and logos when available, with a DexScreener Arc-only fallback. Name, logo, catalog listing and pool liquidity do **not** prove issuer identity.
- ARCY official Ethereum-style 0x address on **Arc** is `0x73e5f588d27d6b5ec89c89c82692d1e7fecbd38b`, supported by the first-party ARCY website `https://www.arcyusdc.xyz/`, which lists this exact contract. One primary official ARCY result; lookalikes remain separately inspectable.
- Reused from published ARCY production code, revision `52853be1af7c4c9765c16aabc9cbc369fad2bb52`: `arc-legacy/lib/core.js`, `search-health.js`, `fields.js`, `api/token.js` and `api/supply.js`. The original Arc RPC attests chain ID 5042 and contract bytecode. Burn address **current custody** is **not** a proof of lifetime burn / executed buyback.
- New Arc market/DEX reader keeps only chain ID `arc` with full 0x contract matches. Aggregate market data is external-provider-reported, not guaranteed total market-wide liquidity.
- Contract controls report observed `owner()` getter **only**, not universal owner/admin or renouncement conclusions.
- Buyer-focused five-card/twenty-metric schema remains intact across all networks. K/M/B values and exact-value drill-down are preserved.

## Tests completed
- `npm test`: **155/155 passing**.
- Ethereum live smoke: **9/9 passing**.
- Robinhood live smoke: **10/10 passing**.
- Arc live read-only test (ARCY, mainnet): correct chain `5042`, ERC20 symbol `ARCY`, 5 cards / 20 metric keys, 11 source-backed metric values. Remaining values intentionally `NOT VERIFIED`.
- Live GeckoTerminal Arc name searches returned multiple ARCY and ARGUS contracts; the final API ranks the first-party ARCY contract ahead of clones.
- Playwright widths **320, 390, 1440**: three networks rendered; one first-party ARCY result; other same-name contracts collapsed; 5-card Arc report; no horizontal overflow; zero browser JavaScript errors; network changes clear prior identity.

## Remaining mandatory work BEFORE user approval for production
1. Migrate and audit the signed COMPLETE published Arc **holder snapshots** subsystem; never coerce partial/candidate holder rankings into verified percentages.
2. Migrate **Next Unlock** source-backed schedule and ensure users can distinguish `NO_SOURCE_REPORTED_SCHEDULE` from an actual zero unlock.
3. Migrate and audit Arc contract controls, tax and LP lock evidence; preserve `NOT VERIFIED` when source does not prove a property.
4. Migrate Arc circulation only from chain-specific, full-contract-matched verified sources.
5. Build the **new premium website** around the new search system, then reintroduce or redesign existing ARCY Buyback & Burn, Pulse, Research, and BUY sections. **Do not simply overwrite the main site with the current isolated test HTML.**
6. Check image source attribution, external data-provider terms, WAF/rate-limit/SSO, mobile UX and accessibility before public launch.
7. Run full end-to-end acceptance testing for all three networks, confirm domain/rewrite roll-forward and rollback. Get explicit user approval before changing `arcyusdc.xyz`.

## Evidence model
Token official status is exact **network+contract** match to issuer-published records. CoinGecko/GeckoTerminal/DexScreener logos and search listings are not official verification. Don't mislabel Arc's native USDC or ARGUS until exact first-party proof is added.

## Public source references
- https://www.arcyusdc.xyz/ (official ARCY token contract)
- https://docs.arc-scan.org/docs/explorer (Arc mainnet 5042 explorer identification)
- https://www.coingecko.com/learn/dex-data-api (GeckoTerminal indexed pool search methodology)
