# ARCY SEARCH — Confirmed FINAL Home Page (11 October 2026)

**User approved — must be preserved as release gate, not optional concept art.**

## Single premium home page in this order
1. **Search:** Minimal, mobile-first dark premium token discovery for Arc (5042), Ethereum (1), Robinhood Chain (4663). Network names and logos only; deep navy in-app picker, not a native white Android menu. Same-tab exact-contract token detail pages with verified evidence and shareable URLs.
2. **Original animated ARCY greeting owl:** Reuse the **existing official site animation** from `arcy-website/main/assets/1000266146.mp4`, with exact original still image `assets/hero-arcy.png` as fallback. Motion-reduction, constrained-data and offscreen behavior must be respected.
3. **Buyback & Burn:** Live **on-chain** ARCY supply and standard burn address balances with source, block, scan age. Distinguish **current burn-address custody** from verifiable lifetime burns and actual buyback transactions; never claim one proves the other.
4. **Token Unlocks:** Date-scoped, source-verified token unlocks, preserving existing released on-chain/source evidence and no unverified calendar filler. Show explicit no-confirmed-events if unavailable.
5. **Weekly Pulse:** Existing source-backed weekly Pulse edition (five items per page), logo matching, timestamps and automatic safe refresh, preserving last successful edition on provider failure.
6. **ARCY Swap:** Verified Arc router / contract and buy CTA after route confirmation; don't add a nonfunctional or invented URL. It is a link/action, not an unsanctioned trading bot.
7. **Research and footer:** ARCY Research library/issue numbers plus working social and public GitHub source links, source attribution and minimum disclaimers.

## Token detail page
- On selecting a token, navigate in the same tab to `/token/{chain}/{verified-contract}`; never silently choose similarly named contracts.
- Header: token identity, contract/source/chain, three concise headline facts.
- One historical price chart **only if** bound to exact chain + contract + verifiable pool.
- User-expandable five analysis cards / 20 verified metrics; concise K/M/B display (max four significant digits), exact raw values in Evidence.
- Four further optional modules: Before You Buy; Exit Reality; What Changed?; Claim vs Reality. Never promise functions that are not implemented and verified.

## Style contract
- Synthra/Argus-inspired **restraint and premium craft, not visual copying**.
- Deep navy, subtle cyan, original official ARCY mascot, plenty of whitespace, minimal borders, no dense dashboard above the fold, no clutter.
- Keyboard/mobile navigation and responsive 320 / 390 / 768 / 1440px support. No white browser-native chain selection sheet.

## Release rule
**OLD PUBLIC SITE MUST REMAIN LIVE** on `arcyusdc.xyz` and `arcy-official` until the **new isolated test project** reaches feature parity, tested mobile/browser API and security checks, source/usage reviews, verified provider/environment configuration, and rollback plan.
- Never transplant the final new test files back into the old production repository.
- On approval, reassign `arcyusdc.xyz` to the finished new Vercel project directly and retain old project for rollback.
- Before that, never say an unimplemented component is finished or a READY build has passed live HTTP checks.

## Progress
- Three-chain search, detailed token pages, verified exact-source historical chart, compact figures, official static owl, navy network picker and original greeting MP4 are staged in the isolated testing branch.
- Source-backed ARCY Burn holdings summary, issuer-confirmed-vs-calendar Unlocks, official-first-party Weekly Pulse, Arc prefilled Uniswap external link, and Research X/GitHub launch links are implemented in the test branch.
- **Still incomplete:** lifetime onchain buyback transaction counter (current custody is not lifetime burns), durable publisher/last edition cache, issuer-confirmed unlock coverage, the full Research #001–#029 article archive, signed COMPLETE holder worker feed, validated LP/tax roles, all-network history for Robinhood, commercial provider permission, deployment E2E and rollback test.
- **Real 3-chain coverage 2026-10-11:** ARC ARCY 11/20 source-backed, Ethereum USDC 12/20, Robinhood APLD 3/20. See GitHub Actions run 38146687892. Unsupported metrics remain NOT VERIFIED.
- First-party ARCY contract is now explicitly documented with a provenance link to old official website repository, but identity verification **does not establish investment safety**.
- A public Arcscan concentration API was investigated but returned HTTP 530 Cloudflare Tunnel errors for 6/6 probes; no reported concentration was fabricated.
