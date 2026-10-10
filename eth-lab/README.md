# ARCY SEARCH — Ethereum Lab (Five-Card Architecture)

**Status:** isolated implementation skeleton, not yet end-to-end audited or production-ready.

Production reference: `arcycoin-glitch/arcy-website`, main branch, `ui-model.js`.
Experiment: `arcycoin-glitch/arcy-search`, branch `eth-lab`, root directory `eth-lab/`.
The production GitHub repository and production Vercel deployment have **not** been changed.

## Five original production cards — exactly 4 metrics each
1. Unlock & Supply: Total Supply, Circulating Supply, Burn Address Balance, Burn Address % (current zero/dead-address holdings divided by current total supply).
2. Holder & Whale: Holder Count, Largest Wallet %, Top 10 Concentration, Top 20 Concentration.
3. Liquidity & Exit: Liquidity USD, 24H Volume, DEX / Pair Count, LP Status.
4. Market Activity: Price, Market Cap / FDV, 24H Change, 24H Volume.
5. Contract & Mechanics: Trading Taxes, Mint Capability, Owner / Admin, Contract Architecture.

No separate Contract Control or Claim vs Reality card. Contract authority evidence remains nested under Contract & Mechanics.

## Run locally (Node 22+)
```sh
cd eth-lab
npm test
npm run dev
```
Open `http://127.0.0.1:3001`.

## Isolated staging deployment
Create a **new** Vercel project using `arcycoin-glitch/arcy-search`, Git branch `eth-lab`, Root Directory `eth-lab` and Node 22+. Never repoint the production site or reuse the production Vercel project. A preview deploy is not automatically created by these commits.

Server-side optional `ETH_RPC_URL` must be an Ethereum Mainnet RPC (chain ID 1). Do not expose paid RPC credentials in browser source or public commits. Default public RPC is for experimentation only.

## API
- `GET /api/token?address=0x...`: on-chain ERC-20 supply/metadata and current standard burn address balances at one pinned Ethereum block.
- `GET /api/report?address=0x...`: five-card analysis with field-level verification state and source evidence.

## Sources and limitations
- Ethereum RPC: pinned-block on-chain ERC-20 metrics, selected contract getters and EIP-1967 implementation slot (not a complete admin/ownership review).
- DexScreener: exact Ethereum contract-matched pairs and source-reported liquidity, 24H volume, base-token primary-pool price, market-cap/FDV label, 24H change. DexScreener is a provider report, **not** on-chain evidence. Price and valuation are not inferred from a pool where the requested token is the quote asset.
- CoinGecko circulating supply adapter is connected with exact Ethereum contract identity, positive values and pinned on-chain supply reconciliation; it remains **SOURCE_REPORTED**, not an independent on-chain proof. CoinGecko may not list a token or may rate-limit requests.
- Blockscout holder count is connected as **SOURCE_REPORTED**, never claimed as a reconciled on-chain wallet enumeration. Holder ranking, concentration percentages, token unlock schedules, LP locks, mint authority, upgrade permissions and contract-specific trading taxes still require proven adapters and remain **NOT VERIFIED**.
- New adapters have failure isolation. Missing or inaccessible sources must never be silently converted to zero.
- `schema.js` is shared by report validation, front-end rendering and unit tests; five cards and twenty metrics are mandatory.

## Codex final audit checklist
1. Run all Node tests and inspect failures; check five cards and precisely twenty field keys.
2. Test live USDC / UNI / LINK, correct chain ID, pinned block reads, amount precision and explorer reconciliation.
3. Cover wrong RPC network, invalid address, EOA, missing optional token getters, reverted getters, provider timeouts, HTTP errors, malformed JSON and rate limits.
4. Audit market pair matching, duplicates, quote-token errors, absent pools, stale data, liquidity sums, primary pool switching, FDV vs market cap and missing data.
5. Inspect contract security: proxy variants, owner roles, paused/mint/blacklist logic, bytecode/source identity, taxes and LP ownership (never assume undetected means absent).
6. Validate holder snapshot completeness and address/supply reconciliation before showing any whale concentration; verify contract matched unlock schedule source.
7. Check desktop/mobile browser rendering, source details, input validation, no XSS, safe response sizes and no accidental private key use.
8. Cross-check against current `arcy-website/main`; preserve all Arc endpoint responses and the production holder background job.
9. Check separate Vercel staging environment and only propose production merge after all acceptance criteria pass.

**Promotion gate:** this lab must never be merged to ARCY production solely because its UI renders. Final contract-level checks and Codex QA are required. No wallet connection, token deployment, swap, private keys or fund transfers.

## Latest isolated development checkpoint — 10 Oct 2026

Added `lib/circulating.js` (CoinGecko Ethereum exact-contract source reports), `lib/holders.js` (Blockscout count only, no invented percentages), and `test/sources.test.js` for validation gates. Both sources are plugged into the existing five-card report without changing the production repository.

Live-provider integration testing, production RPC reconciliation, complete holder ranking and Codex audit are still pending. The minimal offline JavaScript test harness is not a substitute for `npm test` or network E2E testing. Do not promote to production yet.

## Small-token Holder & Whale snapshot checkpoint

- The Blockscout / Ethereum RPC adapter now attempts a full, paginated address population **only for 20–30 reported holders**. This intentionally conservative limit keeps RPC and Vercel runtime cost bounded.
- It reads `balanceOf` for every listed address at the same pinned block as the token's `totalSupply`, requires distinct valid addresses, strictly positive balances, consistent source count, and an exact raw-supply sum. Only then are largest/top-10/top-20 concentration percentages displayed as reconciled snapshots.
- For more than 30 holders, Holder Count is source-reported only. Concentration metrics remain `NOT VERIFIED` until a scalable and independently tested indexed snapshot pipeline exists.
- Full-supply reconciliation cannot establish the quality of individual project claims, economic wallet ownership, beneficial owners or multi-wallet clustering. Contracts with rebasing or nonstandard balance semantics may fail this strict test.
- No live Blockscout pagination or Ethereum mainnet end-to-end verification was completed during this implementation. Audit the API response shape and request timeouts before considering this production ready.

## Large-token Holder & Whale — ranked candidate audit

The new `lib/large-holders.js` extends support beyond small (20–30) holder tokens. For large tokens, it checks the first 21 **Blockscout balance-ranked candidate addresses**, rejects duplicate or increasing source balances, and reads every candidate's current balance at the same pinned Ethereum block. If even one candidate's pinned RPC balance differs from Blockscout's reported balance, no concentration figure is shown.

Passing fields are explicitly marked `SOURCE_REPORTED_RPC_RECONCILED` rather than `ONCHAIN_VERIFIED`. Explorer ranking may describe a different block, and the first 21 source records do not independently prove no higher-ranked wallet has been omitted. These values must never be advertised as a complete verified global holder snapshot. Explorer-reported holder counts are likewise not independent wallet enumeration.

The module is isolated and must pass live USDC, UNI, LINK and intentionally mismatched-index tests before moving to production. Unit scenarios include 21 sorted candidates, duplicates, ordering defects, malformed responses and balance disagreements. API latency, public RPC throttling, and Blockscout item encoding still need live integration verification.

## Final pre-Codex foundation checkpoint — 10 October 2026

- Five production-matched cards and 20 fields continue to use shared `schema.js`; no sixth card should be created.
- Holder candidates: limited 20–30 full-balance snapshots or source-ranked top-21 checks for large sets. Large ranked results are labeled `SOURCE_REPORTED_RPC_RECONCILED`, not absolute verification.
- Circulating Supply: CoinGecko exact Ethereum contract matching, sanity-checked against pinned total supply, explicitly `SOURCE_REPORTED`.
- Next Unlock: `lib/unlocks.js` consumes only reviewed contract-exact source schedules in `data/eth-unlocks.json`. The shipped schedule is intentionally empty; absent evidence remains NOT_VERIFIED. Do not invent unlocks.
- Contract & Mechanics: `lib/security.js` parses contract-exact GoPlus reports for buy/sell/transfer tax and mintability. These fields remain `SOURCE_REPORTED` (never on-chain proven). Independent admin/implementation readings remain separately limited.
- LP Status: NOT_VERIFIED until contract- and pool-specific LP ownership and lock evidence is integrated; displaying source-reported liquidity does not prove an LP lock.
- API requests are GET-only, contract-address validated, no-store, and public error details are generic. Serverless rate limiting, caching strategy, and third-party provider quota management require final hardening.
- The current architecture is intentionally **not production ready**. Live mainnet checks, browser regression, third-party API response fixtures, deployment isolation review, and Codex security review are required.

### Mandatory Codex acceptance gate

Run `npm test` under Node 22 in `eth-lab/`. Check USDC, UNI, LINK and invalid/non-contract addresses against live Ethereum chain ID 1, current RPC blocks, explorer evidence, and price-provider payloads. Inspect any SOURCE_REPORTED status independently. Confirm no secret-bearing RPC URL is sent to the browser. Confirm no private key, wallet connect, funds, token launches, swaps, or trading execution. Verify five cards and twenty fields exactly. Test mobile/desktop, data errors, provider 404/429/500, network delays, malformed JSON and RPC mismatches. Do not modify or redeploy production `arcy-website` until the full regression suite and independent sign-off pass.

## API throttling (test-stage defense in depth; not a public-launch gate)

- `GET /api/report` and `GET /api/token` share a **24 valid requests / 60 seconds / client IP** fixed-window quota per warm Node/Vercel function instance.
- Excess valid requests receive **HTTP 429** with `RATE_LIMITED`, `Retry-After`, and remaining-request headers, before starting expensive provider calls.
- Only Vercel-edge-supplied IP headers are trusted on Vercel; local runs use the socket peer IP. Untrusted caller-supplied forwarded headers are never used off Vercel.
- Memory is bounded to 4096 active buckets per instance; over-capacity clients are rejected rather than evicting active quotas.
- **Critical limitation:** The limiter is in memory and **NOT shared across Vercel serverless instances or regions**. It is a partial protection, NOT a globally enforced quota. A distributed Vercel WAF rate-limit rule (or another shared, authoritative limiter) must be enabled and independently tested before the service is publicly exposed. Do not disable Vercel Preview Authentication in order to test or bypass this requirement.
- Recommended future WAF configuration for this isolated test project (not active yet): limit `/api/report` and `/api/token` to **30 requests per IP per 60 seconds**, fixed window, return **HTTP 429**. Review applicable Vercel plan pricing and permissions before activation. Do not apply to the production ARCY site without separate approval.
