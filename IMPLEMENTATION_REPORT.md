# ARCY Search implementation report — 1 October 2026

Inspected every tracked file at commit a093325 in https://github.com/arcycoin-glitch/arcy-search. The original checkout had all seven tracked files deleted. Work was prepared in a separate copy to preserve that state during inspection. No commit, push or deployment was performed.

## Files changed

Updated `index.html`, `api/token.js`, `api/supply.js`, `api/market.js`, `api/unlock.js`. Added `app.js`, `lib/core.js`, `lib/control.js`, `api/holders.js`, `api/control.js`, `api/liquidity.js`, `api/claims.js`, `api/mechanics.js`, `package.json`, `dev.cjs`, tests and this report. The deleted duplicate `index (2).html` is not restored.

## Bugs found and fixed

- Four cards in this commit were disconnected placeholders; there was no liquidity backend in the tracked commit. All six now run independently, with nine lowercase Vercel routes.
- Token metadata failure previously discarded supply results and prevented further requests. All requests now settle independently, including the three Supply & Unlock submodules.
- Optional name/symbol failures no longer discard ERC-20 supply. Burn balance failure does not erase total supply.
- Empty RPC return data previously became zero. Strict ABI word validation prevents that; decimals are bounded to 255 and string lengths are bounded.
- RPC chain identity is checked against 5042, readings are pinned to a block per module, concurrent requests are bounded and identical in-flight reads are shared. Transient HTTP rate-limit/upstream failures get one retry.
- CoinGecko circulating supply now requires chain_identifier 5042, exact returned platform contract match, a positive finite value and a plausible supply bound. Missing/unmatched data remain null.
- Legacy unlock feed returned HTML matched only by symbol. It cannot establish Arc contract identity; that unsafe match was removed. The route explicitly reports NO SOURCE-REPORTED SCHEDULE.
- Liquidity matches exact token address and Arc chain, deduplicates pool IDs (including 32-byte Uniswap V4 IDs), and never treats missing liquidity/volume as zero or LP locks as verified.
- EIP-1967 implementation, beacon and admin slots verified against the standard; EIP-1167 clones are detected. Implementation code is inspected. Selector candidates are not factual capability conclusions; zero owner does not become an ownership-renouncement claim.
- User-facing failures are generic. Six-card dark styling is retained; narrow screens use one column. Evidence and exact API values are available in each card.

## Sources checked live

- https://rpc.mainnet.arc.io — eth_chainId returned 0x13b2 (5042); successful on-chain reads for ARCY, ARGUS, USDT, cirBTC and USDC.
- https://docs.dexscreener.com/api/reference — documented token-pairs route; live `/token-pairs/v1/arc/{address}` responses returned matching Arc pairs, including multiple pairs for tested assets.
- https://api.coingecko.com/api/v3/asset_platforms — Arc platform reported chain_identifier 5042. Tested tokens did not yield a validated positive contract-matched circulating figure.
- https://docs.arc-scan.org/docs/api — public holder-index route documented. Live api.arc-scan.org returned HTTP 530 / Cloudflare tunnel error. Older Arcscan API documentation conflicts with current documentation; documentation alone was not promoted into facts.
- https://explorer.arc.io/api/v2 — alternative Blockscout token/holder/source endpoints returned HTTP 403 challenge HTML, not usable JSON.
- https://api.coinbell.in/token-unlocks?sort=soonest&window=30 — live HTTP 200 HTML; existing symbol-only matching does not establish contract identity.
- https://eips.ethereum.org/EIPS/eip-1967 — storage constants and beacon implementation lookup checked.

## Tests performed

- `node --test test/core.test.js test/market.test.js`: 9 passed, 0 failed. Covers exact big-integer supply, malformed ABI responses, bounded strings, mixed-chain/duplicate pools, missing market values, invalid addresses on every route, external API failures, partial burn/metadata failures and CoinGecko identity/supply constraints.
- `node test/live.cjs`: all nine routes exercised for ARCY, ARGUS, USDT, cirBTC, native USDC ERC-20 face, and 0xdead/no-contract. Raw responses with timestamps and block numbers are saved in `test/live-results.json`. Five valid token supplies were read successfully on final retest; no-contract RPC modules return unavailable.
- ARCY: total supply 1,000,000,000; nonzero burn-address balance; EIP-1167 implementation 0x1b74922c01ddfd9c77b37d02c0a236611e8fe500 and getter-reported owner were observed.
- `node test/browser.cjs`: headless Edge, 390×844 and 1280×900. Fixture-backed integration test forcibly aborts the holder network request, verifies supply/liquidity survive, all six cards settle, invalid input is rejected, no horizontal overflow, and no application console/page errors. Screenshots saved in `test/mobile.png` and `test/desktop.png` and mobile screenshot visually inspected. This browser test uses controlled API fixtures; live-source validation is the separate API suite above.

## Remaining limitations

All six cards load and fail independently. This does not mean every intelligence field is verified.

Holder service/schema/full-history coverage could not be validated live; holder figures remain NOT VERIFIED. The holders route intentionally does not decode an unvalidated payload if the service recovers. Verified ABI/source access is blocked; mint/pause/blacklist authority, fee percentages, fee mutability, burn allocation and buyback flows therefore remain NOT VERIFIED. Mechanics returns deterministic owner/proxy evidence and explicitly marks unsupported facts; token-specific source/flow adapters are still needed. Nested/custom proxy schemes are not exhaustively resolved. No contract-matched unlock integration or attributed project claims are available. Claims shows NO CLAIMS SUPPLIED, without meaningless zero counts. LP lock/burn evidence is unavailable. Rate limits or transient service failures can still cause conservative unavailable results.

Run locally with `npm run dev`; deploy this source with Vercel's Node functions. Optional server-only environment variables: ARC_RPC_URL, COINGECKO_API_KEY. Never put keys in app.js. Browser test needs Playwright and an installed Edge browser; its bundled-module fallback is specific to the current Codex host.
