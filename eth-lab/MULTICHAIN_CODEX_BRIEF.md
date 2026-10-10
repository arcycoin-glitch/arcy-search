# ARCY SEARCH — Ethereum + Robinhood Chain joint preview / Codex execution contract
Status: **foundation only, not complete, not deployed, not merged.**
Prepared: 2026-10-11. Feature branch: \`multichain-lab\` (based on \`eth-lab\`).
Production site is **outside scope**: \`arcycoin-glitch/arcy-website/main\`, \`arcy-official\`, \`arcyusdc.xyz\`.

## Product objective
Use the ONE already-existing Vercel test project \`arcy-ethereum-test\`. Its tested UI should allow an explicit Ethereum / Robinhood Chain network selection, and search by token name, symbol, or exact contract within the selected chain. Under either selection, show the existing **five cards / twenty fields** in the same order and with the same semantic labels. No sixth card, no Next Unlock substituted into the twenty metrics. Preserve Ethereum behavior and tests. No new Vercel project, no GitHub project deletion, no wallets, keys, trades, transactions, paid services, or main-site edits.

### Verified network sources
- Robinhood Chain **mainnet**: Chain ID **4663**, JSON-RPC \`https://rpc.mainnet.chain.robinhood.com\` (rate-limited; official docs advise a managed node for production), explorer \`https://robinhoodchain.blockscout.com\`. The distinct *testnet* is **46630** and must be rejected by mainnet RPC checks.
- Official config: https://docs.robinhood.com/chain/connecting/
- Robinhood Stock Tokens are ERC-20 debt securities supplying economic exposure, not shareholder ownership: https://docs.robinhood.com/chain/stock-tokens/
- Exact canonical Stock Token contract identity is asserted ONLY when contract address and Chain ID match an official registry \`GET https://api.robinhood.com/rhj/assets\` deployment. Ticker or logo alone is insufficient.
- Official Stock Token API: https://docs.robinhood.com/chain/stock-token-apis/. \`/prices\` is **raw underlying bid/ask** (not multiplier-adjusted); Chainlink feeds produce multiplier-adjusted data; \`currentMultiplier\` and \`uiMultiplier()\` may change upon corporate actions. Do not conflate DEX token price, feed price and underlying quote.
- Robinhood Blockscout REST API docs: https://robinhoodchain.blockscout.com/api-docs ; PRO API may require credentials. Fail closed if blocked.
- DexScreener chain ID must be asserted from **live API responses**. If missing, NOT VERIFIED. Never substitute Ethereum liquidity. Do not presume CoinGecko or GoPlus support for chain 4663 without exact contract+chain fixtures.

### Baseline existing ETH Lab
Read existing implementation: \`eth-lab/lib/eth.js\`, \`report.js\`, \`market.js\`, \`holders.js\`, \`large-holders.js\`, \`circulating.js\`, \`security.js\`, \`control.js\`, \`discover.js\`, \`discovery-cache.js\`; \`eth-lab/api/*.js\`; \`eth-lab/index.html\`; \`eth-lab/schema.js\`; and current tests. **Never replace working ETH adapters with Robinhood-specific shortcuts**.

New optional foundations on this branch:
- \`eth-lab/lib/chains.js\`: strict two-mainnet chain config, HTTPS-RPC validation, chain ID guard, official explorers / tentative provider locators.
- \`eth-lab/lib/robinhood-assets.js\`: exact official-registry 4663 deployment identity, cautious name/symbol discovery, duplicate-identity rejection.
- \`eth-lab/test/chains.test.js\`: local pure-module boundary checks.
These are **NOT yet wired into report, UI, or network endpoint**. They are not evidence of working Robinhood scans.

## Required Codex implementation (one coherent feature branch)
1. Create explicit client network selector (Ethereum = 1; Robinhood = 4663). Input is always scoped to the chosen network. Prevent stale cross-network results, caches and races. Show chain ID, explorer, sources, evidence status and scannedAt correctly. Use safe rendering; keep mobile-first interface and no overflow at 320/390/768/1440.
2. Add a validated \`chain\` query parameter (or equivalent) to read-only token, report and discover APIs. Require exact known slug; malformed array/duplicate/unrecognized params return 400. Preserve backward-compatible ETH requests with omitted chain. Ensure all cache keys include network and contract.
3. Generalize on-chain ERC-20 supply, burn-address current balances, metadata, bytecode and control introspection to network-specific pinned-block RPC. Require \`eth_chainId\` equals requested chain ID **before any result**; EOA and mismatched chain fail closed; never mix Ethereum and Robinhood reports. RPC credentials must remain server-side; use \`ROBINHOOD_RPC_URL\` optional env override with public rate-limited fallback.
4. Reuse the existing five-card schema (four fields each, 20 exactly): (a) Unlock & Supply: totalSupply/circulatingSupply/burnAddressBalance/burnAddressPct; (b) Holder & Whale: holderCount/largestWalletPct/top10Pct/top20Pct; (c) Liquidity & Exit: liquidityUsd/volume24h/dexPairCount/lpStatus; (d) Market Activity: priceUsd/valuation/change24h/volume24h; (e) Contract & Mechanics: tradingTaxes/mintCapability/ownerAdmin/contractArchitecture. No invented circulating supply, LP lock, tax, authority or historical burn.
5. Market source only if the response pair's chain, token contract and base/quote side match chosen chain and token. Aggregate only the subset returned by the source, never claim network total. Don't equate underlying-stock prices with Stock Token market prices.
6. Holder Count can be Blockscout source-reported only. Concentration requires pinned RPC balance reconciliation and defensible coverage/ranking; otherwise NOT VERIFIED. Missing provider endpoints/429/timeout must not appear as zero.
7. CoinGecko circulating supply, GoPlus taxes/mint and external source features may return NOT VERIFIED if unsupported on Robinhood; do not copy Ethereum provider evidence across chains.
8. Optional Stock Token badge may say \`ROBINHOOD REGISTRY MATCHED\` only after a match of *full lowercased address + mainnet Chain ID* in the official Robinhood asset registry. Keep shares-per-token multiplier as separate metadata, not extra card metric. Corporate actions may require additional review before displaying non-DEX prices. Other same-symbol tokens remain independent and unverified.
9. Keep existing 24-request/60-second **per-process** rate limiter shared across scan/discovery endpoints. The **global multi-instance Vercel WAF is still missing**: no public release or unprotected preview until globally effective protection reviewed and verified (include path /api/discover).
10. Run \`npm test\` and \`npm run smoke\`; add live Robinhood read-only smoke test against an **official registry token contract**, with randomized nonexistent address and same-symbol fake contract, wrong chain 46630, HTTP 429, timeouts and malformed providers. Add 4 Chromium viewport tests. Include status source for every 20 fields and failure isolation checks. Collect actual provider responses before declaring supported.
11. Produce concise audit: passed tests and exact counts, individual Robinhood stock contract and pinned block, sources verified vs NOT VERIFIED, remaining errors, Vercel preview release gates and any relevant costs.
12. ONLY after development is complete and quota reopens, deploy a combined **preview** to existing Vercel \`arcy-ethereum-test\` from approved source; preserve Vercel Authentication/SSO. **Do not touch, merge, redeploy, or configure \`arcy-official\`/production without explicit separate user approval.**

### Current Vercel quota prevention
The existing test project's preview auto-deploy setting was changed to \`previewDeploymentsDisabled: true\` during preparation to avoid excess deploys. Recheck actual Vercel settings, quota and permissions before enabling previews or making a single manual preview deployment. Do not set up extra test Vercel projects, and do not suggest paying for Pro solely to unblock today's work.

**Non-goal:** No actual token purchases, minting, swaps, transfers, custom token issuance, wallet connection, or write methods. No duplicate provider claims or simulated data.
