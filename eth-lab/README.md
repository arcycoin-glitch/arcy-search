# ARCY SEARCH — Ethereum Lab (Five-Card Architecture)

**Status:** isolated implementation skeleton, not yet end-to-end audited or production-ready.

Production reference: `arcycoin-glitch/arcy-website`, main branch, `ui-model.js`.
Experiment: `arcycoin-glitch/arcy-search`, branch `eth-lab`, root directory `eth-lab/`.
The production GitHub repository and production Vercel deployment have **not** been changed.

## Five original production cards — exactly 4 metrics each
1. Unlock & Supply: Total Supply, Circulating Supply, Burn Address Balance, Next Unlock.
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
