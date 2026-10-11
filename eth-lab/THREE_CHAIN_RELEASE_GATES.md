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
8. Signed-holder reader rejects tampering, wrong-chain identity, unsigned/incomplete publications and regressions. It is off by default until an authorized publication URL and public verification key are configured.

**CI baseline:** GitHub Actions `38139629939`, Node 22: **151/151 PASS, 0 failed, 0 cancelled**. New signed-holder regression suite is being run separately; no Vercel preview has been deployed.

## Remaining release blockers (must be resolved before promotion)
- [ ] **Arc feature parity**: The new lab now includes a read-only Ed25519-signed COMPLETE holder publication reader, but it requires the legitimate `ARC_HOLDER_PUBLISHED_URL` and `ARC_HOLDER_PUBLIC_KEY` in the new Vercel environment and an independently running old holder worker; no on-demand indexing is performed. Still integrate the verified worker publication feed, GoPlus/contract controls, fee-adapter reviews, LP evidence, research content, unlocks/Pulse, burn counter, swap link, mascot, and analytics in the new test project. No unverified tax or whale metrics are to be invented to fill empty cards.
- [ ] **Provider integration**: Source-level real mainnet scans ran successfully in isolated GitHub Actions: Arc ARCY **11/20**, Arc USDC **8/20** (`38139964905`, **2/2 PASS**); Ethereum six known tokens + three negative cases (`38140112837`, **9/9 PASS**); Robinhood 10 checks (`38140112837`, **10/10 PASS**). These are **not** a substitute for real Vercel protected-preview scans on the actual deployment, which remain pending.
- [ ] **Product acceptance**: Check name/symbol/address discovery, issuer confirmation, no duplicate logos, five cards and 20 rows, each metric's evidence URL/snapshot freshness, all three networks, 320/390/768/1440px responsive layouts, no console errors, navigation, and proper failed-provider behavior.
- [ ] **Operations**: Distributed WAF/rate limiting on all token/discover/report endpoints; monitor latency, per-provider 429/403 rates, and adapter failure; confirm actual Vercel environment variables without exposing secrets.
- [ ] **Legal/source usage**: Review CoinGecko, DexScreener, GoPlus, image CDNs and explorer terms, rate limits, branding, allowed caching, attribution and commercial redistribution before advertising the consolidated data product.
- [ ] **Protected Vercel preview**: Current Vercel management scope `arcy3` returned 403 on list/deployment/domain requests. No preview or domain verification can honestly be marked complete yet.
- [ ] **Independent audit + rollback**: Approve reviewed commit, stage the **test project** production build without changing DNS, execute E2E, then move canonical domain only after parity verification. Preserve the old deployment as an instant rollback target.

**Release decision: NOT READY FOR PUBLIC PRODUCTION.** The original live project and domains remain untouched. Unit tests passing does not satisfy independent live-browser, provenance, feature-parity, upstream service access, and security release gates.
