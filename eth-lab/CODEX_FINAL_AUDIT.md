# ARCY SEARCH — Ethereum Lab Final Codex Audit

**Mission:** Independently audit, repair and re-test the isolated Ethereum token-intelligence implementation. Deliver a reproducible release decision. This is a **quality and correctness gate**, not a feature request or marketing exercise. Perform the work instead of merely writing suggestions.

## 0. Absolute operating boundaries

- Repository: `arcycoin-glitch/arcy-search`
- Working branch: `eth-lab` — stay on it for all edits, commits and testing.
- App root: `eth-lab/`
- Isolated Vercel project: `arcy-ethereum-test`; use preview only.
- Production repository `arcycoin-glitch/arcy-website`: **READ ONLY**, only to inspect the current design and integration interfaces. Do not edit, commit, deploy or merge it.
- Do **not** merge `eth-lab` into `main`, create or modify production aliases, change domains, disable Vercel deployment protection, expose keys, or promote Ethereum into the Arc site.
- Do **not** place live private keys or wallet credentials in code, logs, tickets or prompts. Read-only public chain analysis only; no wallet transactions.
- Source of product truth: explicitly approved **five cards / four fields per card**. The Ethereum card must **not** show "Next Unlock" (removed by product decision). The fourth supply field is "Burn Address %" and represents current zero/dead-address holdings divided by current totalSupply — NOT historical tokens burned or buyback amounts. An old `main` or production template might still mention the removed field; flag any divergence, do not silently restore it.
- Keep the ARCY SEARCH research-first, evidence-first identity and existing production features. No speculative or invented numbers, no generic hype, no unnecessary architectural rewrite.

## 1. Baseline and verification

Previous runs reported 46/46 Node unit tests, USDC/UNI/LINK 3/3 mainnet scan smoke, Chromium viewport tests at 1440/768/390/320 px, and an isolated Vercel preview build marked READY. These are historical observations **not** automatic proof of the current revision. Re-run every test after fixes.

Commands:
```sh
git status --short --branch
git branch --show-current
cd eth-lab
npm test
npm run smoke
```

Confirm commit SHA, Node version, UTC timestamp, exact commands and exit codes. Don't interpret Vercel READY as passing HTTP/API tests. Protected Vercel previews can redirect to SSO; report REMOTE E2E BLOCKED if access is not legitimately available. Do not disable protections just to make the test green.

## 2. Exact product/schema contract (20 fields)

Read `eth-lab/schema.js`; preserve these keys and display four metrics per card:

1. `supply` / Unlock & Supply: `totalSupply`, `circulatingSupply`, `burnAddressBalance`, `burnAddressPct`. **No** `nextUnlock` displayed or returned as a card field.
2. `holders` / Holder & Whale: `holderCount`, `largestWalletPct`, `top10Pct`, `top20Pct`.
3. `liquidity` / Liquidity & Exit: `liquidityUsd`, `volume24h`, `dexPairCount`, `lpStatus`.
4. `activity` / Market Activity: `priceUsd`, `valuation`, `change24h`, `volume24h`.
5. `mechanics` / Contract & Mechanics: `tradingTaxes`, `mintCapability`, `ownerAdmin`, `contractArchitecture`.

Verify API report structure, field semantics, frontend DOM rendering, mobile order, evidence panel, null/zero/false distinction, and consistent money/percent/decimals rendering. Report any production-design discrepancy separately; do not solve it by modifying production.

## 3. High priority: evidence fidelity / fail-closed policy

Every non-null metric needs token-specific source, chain identity, scope, data age, and appropriate evidence status:
- `ON_CHAIN`: verifiable Ethereum RPC reads, same chain ID 1 and pinned block where applicable.
- `ON_CHAIN_DERIVED`: only a correctly reconciled computation on pinned on-chain inputs; check precision (BigInt vs Number and very large supplies), division, rounding and zero supply.
- `SOURCE_REPORTED`: provider data, NOT independently verified on-chain.
- Ranked holders: `SOURCE_REPORTED_RPC_RECONCILED` can describe listed candidates only; RPC checks do **not** prove chain-wide ranking completeness or owner identity.
- `NOT_VERIFIED` / source failed: `value:null`, a precise reason code, no zero/false/default spoofing. Never claim missing schedule means no unlocks. Do not suppress missing data solely to make screens look complete.

Audit the chain-specific mapping of *every* provider (RPC, Blockscout, CoinGecko, DexScreener, GoPlus), contract and quote/base-token identities. Source attribution must be visible in the user evidence pane.

## 4. Verify every adapter thoroughly

**Ethereum RPC / ERC-20:** Validate `eth_chainId=1`, contract bytecode presence, eth_call return encoding, decimals 0..36, metadata bytes32/dynamic strings, proxies, supply, dead/zero balances at a pinned block. Reject wrong-chain and noncontract addresses. Do not conflate burned balances with historical burns; inspect rounding/precision and supply rebasers/nonstandard tokens.

**Circulation / CoinGecko:** Exact Ethereum contract match and positive numeric supply only; compare with on-chain supply without treating provider circulating values as on-chain proof. USDC previously returned a reconciliation mismatch: investigate identity/units/scope independently rather than weakening the check to print a number. Test 404/429, bad identity, zero/NaN, stale data, cache poisoning.

**Holder & Whale:** Inspect `lib/holders.js` and `lib/large-holders.js`, Blockscout paging, holder-count provenance, first 21 sorted distinct ranked candidates, pinned-block RPC balance checks, supply denominator, rank boundary, snapshot timing and explorer/RPC mismatch. 21 balance-matched wallets do NOT mathematically prove no larger omitted wallet. Ensure percentages are conservatively labeled or NOT VERIFIED when insufficient evidence. Test 0, <20, 20, 21, 30, >30 holders, duplicates, zero balance, rebase, RPC failure, partial pagination, count drift and ties. Do not trade accuracy for inflated coverage.

**Market & Liquidity / DexScreener:** Verify exact Ethereum contract and pair matches, de-dup pair addresses, base-vs-quote price and change, quote-denominated price traps, market cap vs FDV tags, partial pair lists, liquidity and volume aggregation, missing/negative data, arbitrary liquidity and LP status. "Tracked" and "Returned" values must not imply chain-wide completeness. LP lock/withdrawal permissions remain NOT VERIFIED until separately proven.

**Mechanics / GoPlus / storage:** Verify buy/sell/transfer fee parsing and units, missing fee components, token-specific GoPlus result and response success, proper third-party attribution. Avoid inventing mint/admin/blacklist powers from absent ABI getters. An owner() getter does not establish complete role access. Assess EIP-1967 implementation slot, admin/beacon/UUPS proxies, roles, proxy upgrades, verified source availability and tax mutability. Fail closed with understandable provenance.

## 5. Security, resilience and operations

Perform code review plus reproducible negative tests:
- GET-only method handling; strict token address validation; RPC URL/env safety; query shape and excessive query parameters; bound API response size.
- Provider outages, timeouts, 429, 500, malformed JSON, wrong chain, inconsistent decimals, RPC regressions and concurrent requests; prevent unbounded fanout and resource exhaustion.
- Safe UI text rendering, injection/XSS resistance, content security / CORS header correctness, secret leakage, server error disclosures, unexpected large outputs.
- Source caching, staleness, retry/backoff with caps and honest freshness labels. Avoid silent stale successes and unsupported automatic fallbacks.
- Measure latency and number of external calls for USDC/UNI/LINK, including repeated runs. If implementing rate limits/caching, maintain truthful snapshot evidence and tests.

## 6. Real browser / responsive E2E

Use Playwright or real Chromium, not syntax checks alone. Run isolated local UI (and Vercel preview if authorized) at desktop 1440, tablet 768, mobile 390 and small mobile 320 px. Check:
- Exactly five colored cards, 20 rows, sensible mobile ordering, no horizontal overflow, working search/Enter button, loading/disabled states, scroll, readable long contract names and numeric values.
- Full scan, invalid address, network failure, partial evidence, failed upstream provider, evidence expand/collapse. Console exceptions must be zero; inspect API network codes.
- `Next Unlock` absent from the supply card and `Burn Address %` displayed accurately. Distinguish SOURCE_REPORTED from ON_CHAIN and value zero from NOT VERIFIED.
- Current ARCY SEARCH visual identity: dark cyan/blue research aesthetic; ARCY owl and orange Y where applicable. Compare read-only production screenshots/assets/styles carefully. Do not overwrite established Arc site navigation, Pulse, burn counter, research links, X/Telegram or swap functionality.

Do not commit binary browsers, screenshots, test artifacts or credentials. If browser setup is impossible, mark as BLOCKED with exact environment reason.

## 7. Required live integration matrix

Use real Ethereum mainnet (chain ID 1), test these exact contracts at minimum:
- USDC: `0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`
- UNI: `0x1f9840a85d5af5bf1d1762f925bdaddc4201f984`
- LINK: `0x514910771af9ca656af840dff83e8264ecf986ca`

Add at least three more diverse existing ERC-20s with known address provenance (e.g. 0-decimal/nonstandard/proxy/low-liquidity when genuinely available), plus an invalid address, EOA and non-ERC20 contract. Do not invent addresses or expected external market values. For each: token symbol, address, chain, block, response time, verified/total metrics for all five cards, source identity and any failure reason. Cross-check key claims using independent chain/explorer evidence, documenting disagreements explicitly.

## 8. Scope of changes / release gate

Make minimal, focused **fixes and regression tests** on `eth-lab` only. Re-run tests and live scans after every change. Keep production repo read-only; no automatic migration or merge. If a design question cannot be safely resolved, choose NOT VERIFIED and document it.

The task is complete ONLY when you provide:
1. Exact commit(s), files changed and root causes fixed.
2. Full test commands, timestamps, results and failures (not just assertions).
3. Real provider coverage matrix, including remaining NOT VERIFIED.
4. Responsive/browser E2E matrix with artifacts path or accurate test evidence.
5. Security review with severity (Critical/High/Medium/Low), reproducibility and residual risk.
6. Module-wise verdicts for Supply, Holders, Liquidity, Activity, Mechanics, API, Browser, Arc Isolation: PASS / FAIL / BLOCKED.
7. Final decision: **READY FOR SEPARATE REVIEW**, **NOT READY**, or **BLOCKED**, with explicit launch blockers. "Ready" does not authorize production deployment or merge.

No sweeping rewrites, new features, fabricated data, marketing claims or premature release. Work autonomously and ask the user only if absolutely necessary for authorized access.