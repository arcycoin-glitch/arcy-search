# ARCY SEARCH — Existing live site parity reference (user screenshot review)
Date: 2026-10-11
Status: PRODUCT REFERENCE and RELEASE-BLOCKING AUDIT
Reference: user-supplied mobile screenshots of the current live `arcyusdc.xyz` taken 2026-10-11 at 17:39-17:41 local time.

## What the existing real live site currently offers and MUST NOT be lost
1. Distinct brand header: ARCY with orange Y, premium cyan-on-navy buttons, mobile floating/sticky site menu, Uniswap ARCY buy access.
2. Intro hero: 'ARCY SEARCH / Research First. No Hype.' with the full-size official blue-eyed owl with outstretched wing, NOT only a tiny decorative icon.
3. Burn experience: a **large prominent** on-chain dead/zero-address balance, sample on screenshot **26.23M ARCY** with Arc mainnet block label, initial/current supply, burn share and VERIFY ONCHAIN CTA, plus ARCY owl artwork. **Do not hardcode sample amount or claim lifetime burnt.**
4. Token unlocks: visual identity/logo per token; Today / Next 7 Days / Days 8–30; text search; five rows per page with more pagination; date, token name/ticker, quantity and calendar provenance / refresh timestamp. Existing screenshot includes APT, BAL, BERA, CC, TIA. Preserve underlying sourced functionality; improve *mobile table width* so unlock quantity is not clipped.
5. Weekly Pulse: an ARCY ARC PULSE #002 editorial issue with 3+ colorful but restrained fact-based story cards and source links, plus overview commentary. Current replacement only uses a short live source list, so **it is NOT functionally equivalent** to the existing rich research edition. Port original edition archive/formatter rather than claiming parity.
6. Swap: a full, original blue/gold owl + swap illustration, large 'Arc native. Trade onchain.' section, clearly labelled official Uniswap and contract CTAs. The test site's current simple text-button treatment is NOT visually equivalent.
7. Research: ARCY SEARCH compact search entry and five (or older six) analysis sections with color-accented borders, source evidence expander, compact K/M/B/T values and truthfully missing values. Existing screenshots also show that whale and mechanic cards can be 0/4 VERIFIED; don't claim these data exist if not.
8. Contact/footer: X / Telegram / source links must be preserved (the existing footer shows X, Telegram, another external link).
9. Keep old production `arcy-website` and `arcy-official` / `arcyusdc.xyz` untouched until the new project fully passes parity tests.

## Product presentation decisions
- The user wants an especially elegant, clean, premium mobile-first experience, **not** a featureless blank search screen.
- Retain hero illustration(s) and elegant premium spacing, but offer immediate access to search, on-chain summary and the next sections with clear scroll affordances.
- Use a dedicated same-tab token detail page with three concise headline data points, chart **only if correctly sourced**, expandable underlying report and advanced safety/tools.
- Existing production screenshots reveal some visual issues to avoid inheriting blindly: sticky header overlaps in scrolled screenshots, unlock table horizontally overflows and hides the far-right column. Explicit mobile viewport tests should catch both.
- If an on-chain section has successful values, surface them plainly; if provider fails, distinguish source outage from absent data and retain only properly timestamped **verified** snapshots where permitted.
- Do NOT substitute a screenshot figure as API truth; always verify against current chain block.

## Critical data truth check
- A live screenshot states '40% of trading tax allocated to Buyback & Burn' AND shows 'Burn Share 40%'. Another test screenshot shows 'Burn Address % 2.551%' corresponding to actual contract balance / supply. Those are **different denominators**, not a contradiction to fix by choosing one number. They must receive precise labels:
  * 'Fee allocation to Buyback & Burn' only if supported by the *current* documented/verified mechanism.
  * 'Current dead/zero-address share of supply' = on-chain balances / on-chain total supply, with block, freshness.
  * 'Lifetime buybacks executed' MUST NOT be inferred from address balances.
- The screenshot's historic fee description '40% of trading tax' may be **stale**; independently verify current tax parameters before any reuse. Never carry marketing numbers forward uncritically.
- The live screenshot's initial/current supply summary rounded to 1.00B despite a separate 955.9M reading. Use consistent on-chain block-specific precision and explain when 'initial supply' and 'current total supply' measure different quantities.
- Logo/meme resemblance is never proof of issuer identity. Known contracts use exact chain + full address.

## Exact release acceptance criteria
- [ ] Search across Arc, Ethereum, Robinhood with source-bound official identity status; original mascot on main page.
- [ ] Main ARCY identity and official greeting animation visibly preserved with reduced-motion and save-data fallback; don't replace it with unrelated artwork.
- [ ] Burn correctly updates after Arc RPC retrieval, reports actual block, burn holdings and burn address percentage, distinguishes trading tax allocation from burned balance.
- [ ] Unlocks: Today / 7D / 8–30 scopes, token logos and compact K/M/B quantities, 5-row pagination, search, no horizontal overflow on 320px/390px; dates independently labelled source reported or issuer confirmed.
- [ ] Pulse current weekly editorial issue + archived issue access, sourced stories and risk signal. On source outage retain last verified edition with date; no invented current-week content.
- [ ] Swap uses exact verified Arc token/USDC contracts, Uniswap official chain, external confirmation, premium artwork.
- [ ] Research archive and footer preserve issue numbering and working X/Telegram/source links.
- [ ] Analysis card field coverage documented for each chain; no fake 20/20; display source/age/NOT VERIFIED without empty oversized cards.
- [ ] User can find research via search home in one tap; detail links refresh/direct-load; no chart if token/pool cannot be uniquely verified.
- [ ] Chromium and real protected Vercel deployed browser checks at 320/390/768/1440; real upstream response and failure handling; performance/accessibility; security and source license compliance.
- [ ] No domain cutover until parity approved; preserve original live project as rollback.

**Important:** The current new test app has implemented some components (search, signed holder reader, burn summary, simple Pulse and unlock list, compact Swap/Research links), but it does NOT currently satisfy all criteria above. A Vercel `READY` status and fixture-based Chromium success are NOT proof of production feature parity.
