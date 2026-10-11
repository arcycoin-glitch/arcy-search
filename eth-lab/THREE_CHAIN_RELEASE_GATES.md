# ARCY SEARCH — Three-chain release gate (11 Oct 2026)

## Deployment boundary
- **Existing public domain**: `arcyusdc.xyz`, maintained by `arcycoin-glitch/arcy-website` and Vercel `arcy-official`. It must remain unchanged.
- **Test source**: `arcycoin-glitch/arcy-search`, branch `feature/three-chain-release-lab-20261011`, app root `eth-lab/`.
- **Future target**: `arcy-ethereum-test`, protected preview first. Final plan is to point the existing domain at the **finished test project**, not rewrite the old site's deployment.
- **GitHub exposure**: View source URL in the test site's footer. Source review + secret scan and license decision must happen before public marketing.

## Implemented, unit-tested
1. Arc mainnet `5042` is selectable alongside Ethereum `1` and Robinhood Chain `4663`.
2. Read-only Arc RPC supply and burn-address observations are pinned to the inspected block and fail closed on incorrect chain. Arc provider fallback restarts the entire token snapshot.
3. Arc pairs must match chain `arc`, the full contract, and unique pair IDs; source-reported DEX market data never claims total network coverage.
4. Arc name/symbol discovery is chain-filtered and **never treats symbol, logo or market ranking as issuer-verified**.
5. Shared UI renders all five analysis cards / twenty fields, with NOT VERIFIED for insufficient evidence, and a user-expandable exact value behind short K/M/B/T/Q and scientific displays.
6. Ethereum RPC timed-out promises now have a ref-counted watchdog; no observed tests are left pending in CI.
7. Accessible GitHub source link in footer. No private keys or transaction methods are used by Arc adapter.

**CI result:** GitHub Actions `38139629939`, Node 22: **151/151 PASS, 0 failed, 0 cancelled** on `176f68dfc5a8`. This is a unit/regression result, not live deployed proof.

## Remaining release blockers (must be resolved before promotion)
- [ ] **Arc feature parity**: Integrate the existing `arcy-website` source-backed holder worker, signed COMPLETE publications, GoPlus/contract controls, fee-adapter reviews, LP evidence, research content, unlocks/Pulse, burn counter, swap link, mascot, and analytics in the new test project. No unverified tax or whale metrics are to be invented to fill empty cards.
- [ ] **Provider integration**: Run real mainnet scans at that exact test deployment, including ARCY `0x73e5f588d27d6b5ec89c89c82692d1e7fecbd38b` (the existing project's live test fixture), Arc USDC `0x3600000000000000000000000000000000000000`, Ethereum USDC, and first-party-confirmed Robinhood Stock Tokens. Fail closed if source identity is wrong; record coverage per token.
- [ ] **Product acceptance**: Check name/symbol/address discovery, issuer confirmation, no duplicate logos, five cards and 20 rows, each metric's evidence URL/snapshot freshness, all three networks, 320/390/768/1440px responsive layouts, no console errors, navigation, and proper failed-provider behavior.
- [ ] **Operations**: Distributed WAF/rate limiting on all token/discover/report endpoints; monitor latency, per-provider 429/403 rates, and adapter failure; confirm actual Vercel environment variables without exposing secrets.
- [ ] **Legal/source usage**: Review CoinGecko, DexScreener, GoPlus, image CDNs and explorer terms, rate limits, branding, allowed caching, attribution and commercial redistribution before advertising the consolidated data product.
- [ ] **Protected Vercel preview**: Current Vercel management scope `arcy3` returned 403 on list/deployment/domain requests. No preview or domain verification can honestly be marked complete yet.
- [ ] **Independent audit + rollback**: Approve reviewed commit, stage the **test project** production build without changing DNS, execute E2E, then move canonical domain only after parity verification. Preserve the old deployment as an instant rollback target.

**Release decision: NOT READY FOR PUBLIC PRODUCTION.** The original live project and domains remain untouched. Unit tests passing does not satisfy independent live-browser, provenance, feature-parity, upstream service access, and security release gates.
