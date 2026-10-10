# ARCY SEARCH — Ethereum + Robinhood Chain lab audit

**Date:** 2026-10-11
**GitHub branch:** multichain-lab in arcycoin-glitch/arcy-search
**Future preview target:** Existing protected Vercel project arcy-ethereum-test
**Production:** arcycoin-glitch/arcy-website/main, arcy-official and arcyusdc.xyz — **NOT MODIFIED**.

## Implemented
- One Ethereum (chain ID 1) / Robinhood Chain (chain ID 4663) selector; network-bound name/ticker/address discovery and contract scans; five cards, exactly twenty metrics.
- Source- and chain-scoped report orchestrator; hard failure for wrong RPC chain, incorrect contract, invalid query; unavailable fields explicitly NOT VERIFIED.
- Ethereum existing source adapters preserved. Robinhood read-only pinned-block ERC-20 supply/metadata/burn-address balance, DexScreener exact-chain market pairs, official Robinhood Stock Token contract registry, and conditional Blockscout holder count.
- Stock Token identity and source-reported multiplier as separate metadata, not extra card metrics or a claim of underlying-share ownership.
- Cross-chain stale UI requests invalidated on network switch; trusted explorer links; mobile-first layout.
- Existing per-runtime limiter 24 requests/IP/minute remains. Not shared globally; Vercel WAF still required for public service.
- No wallets, trades, write transactions, private keys, payments, production edits, new Vercel project or deployment.

## Actual test results
**Node 24 unit/regression suite:** 106/106 PASS, zero failures.
**Ethereum mainnet smoke:** 9/9 PASS, including USDC, UNI, LINK, DAI, WBTC, USDT and three negatives.
**Robinhood mainnet smoke:** 5/5 PASS: canonical Everpure Robinhood Stock Token contract 0x1cdad396db64bda184d5182a97dd9b3c62100b7d, official APLD discovery matching 0xb8dbf92f9741c9ac1c32115e78581f23509916fd, direct pinned-block token scan, testnet 46630 rejection, malformed address rejection.
**Chromium browser acceptance:** 4/4 PASS for widths 320px, 390px, 768px and 1440px. No horizontal overflow, 5 cards and 20 fields rendered, official Stock Token discovery, live Robinhood scan, live ETH USDC scan, stale chain-result clearing, no page errors.

### Example live P/Everpure Stock Token
**10/20 fields with source data:** supply.totalSupply, supply.burnAddressBalance, supply.burnAddressPct, liquidity.liquidityUsd, liquidity.volume24h, liquidity.dexPairCount, activity.priceUsd, activity.valuation, activity.change24h, activity.volume24h.
**10/20 NOT VERIFIED:** circulatingSupply; 4 holder fields; LP status; 4 contract mechanics fields. Source coverage may vary per token.
Official stock contract registry match is additional metadata outside the five metrics cards.

## Explicit limitations and release gates
- Robinhood Blockscout public token-counters endpoint returns HTTP 403 Cloudflare challenge in the sandbox. Holder count/whales are NOT VERIFIED, not zero. Consider properly authorized Blockscout API access; no challenge bypass.
- No verified contract-matched Robinhood source for circulation, LP lock, taxes or mint powers yet. Do not promote inferred claims. Price is DEX token price; not unadjusted underlying-equity bid/ask.
- Production-grade resilient RPC/provider sources and distributed Vercel WAF rate limiting for /api/report, /api/token and /api/discover remain required before unprotected public use.
- Independent Codex audit is still recommended prior to preview promotion. Stock Token corporate-action/multiplier economic analytics are deferred to phase B.
- Existing Vercel test project's automatic preview deployment setting was disabled to avoid quota exhaustion. After quota renewal, deploy only ONE protected preview to arcy-ethereum-test; preserve SSO. No production promotion without explicit separate approval.

## Reproduction
From eth-lab directory:
- npm test
- npm run smoke
- npm run smoke:robinhood
- npm run dev (browse localhost:3001)

**Conclusion:** Two-chain local test application is functional and independently browser tested, but NOT ready for unrestricted public launch.
