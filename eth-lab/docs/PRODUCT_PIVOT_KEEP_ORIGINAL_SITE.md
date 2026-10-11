# Product pivot — retain existing live ARCY site (2026-10-11)

## Product owner decision
**DO NOT replace the live ARCY website with the standalone three-chain test app.** This is a change from the earlier plan to migrate the domain to the new Vercel project.

The old live site `https://arcyusdc.xyz` and production repository `arcycoin-glitch/arcy-website` remain the canonical website. Preserve its existing hero/waving mascot, Buyback & Burn, Token Unlocks, Pulse, full-size artworks, Uniswap Swap, research, social links and footer. Minor corrections to the old site may be considered later, but NOT now.

## Only desired new product scope
- Upgrade the **existing ARCY SEARCH entry** in the original website, rather than replacing the site's homepage.
- The two **new** networks are **Ethereum and Robinhood Chain**, supplementing the already-supported **Arc** network (3 networks total).
- Search page: professional minimal search with selector showing network name/logo, full-contract identity verification, and logo-first token results; don't show five large, empty/unscanned metric cards before a token is selected.
- Clicking a token opens a dedicated premium token research view **within the original website**, using an exact chain ID and full token contract route, clean price history chart when genuinely sourced, concise facts, and source-backed, optionally expandable analysis cards.
- Move the existing large research cards to the **token details view**, do not throw away their tested API capabilities or evidence. Missing metrics must say NOT VERIFIED, not pretend to be zero.
- Source discovery/holder/governance/liquidity per network needs real provider/API verification and coverage checks. Ethereum data coverage is stronger than Robinhood; Robinhood source gaps must be stated, not fabricated.
- Optimize phone layout: navy/cyan premium, original ARCY owl brand, 4 significant digit numbers, no mobile horizontal overflow, fast first paint and stable navigation.
- Preserve production deploy safety. Develop in a new feature branch of `arcy-website` and test a separate preview before merging. Actual production modification/promotion requires a tested change and the user's later authorization.

## Existing test app status
- `arcycoin-glitch/arcy-search` and Vercel `arcy-ethereum-test` are **prototype/reference material only**. Keep the source and historical tests for selective, reviewed reuse.
- **DO NOT connect `arcyusdc.xyz` to that project, do not move aliases/domains or present its READY previews as the public replacement.**
- Close the old standalone-site migration PR; no need to delete prototype code.
- Avoid new work porting existing home Burn/Unlock/Pulse/Swap into the standalone app: those working features remain on the old live website.

This file records the revised approved product direction and supersedes earlier instructions saying to replace the main website with the new test Vercel project.
