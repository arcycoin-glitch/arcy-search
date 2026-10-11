# ARCY SEARCH — Buyer-first, verified token identity (2026-10-11)

## Scope
Branch `multichain-lab` in `arcycoin-glitch/arcy-search`, Ethereum (chain ID 1) and Robinhood Chain (chain ID 4663) **only**. Current production `arcycoin-glitch/arcy-website/main` and `arcyusdc.xyz` were not modified.

## Buyer-first UI
The same 5 cards and same 20 metrics remain present, but are **visually ordered** so a buyer first sees Liquidity & Exit, Holder & Whale, Contract & Mechanics, Unlock & Supply and Market Activity. The API schema, metric keys, verification rules and computed values are unchanged. Circulating supply, holder concentration, contract rights, LP locks and burn/unlocks remain NOT VERIFIED where evidence is insufficient. The earlier production Next Unlock, Buyback & Burn, Pulse, mascot and Buy button are NOT to be removed when full Arc integration is later approved.

## Exact official token identity
A contract is flagged `OFFICIAL CONTRACT MATCHED` **only** for an exact (network slug + 40-digit Ethereum contract address) match to first-party issuer sources:
- Circle native USDC / Ethereum: `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48` — https://developers.circle.com/stablecoins/usdc-contract-addresses
- Tether USDT / Ethereum: `0xdac17f958d2ee523a2206206994597c13d831ec7` — https://tether.to/en/supported-protocols/
- Uniswap UNI / Ethereum: `0x1f9840a85d5af5bf1d1762f925bdaddc4201f984` — https://developers.uniswap.org/docs/ecosystem/governance/uni
- Chainlink LINK / Ethereum: `0x514910771af9ca656af840dff83e8264ecf986ca` — https://docs.chain.link/resources/link-token-contracts

For Robinhood Chain, the original `REGISTRY_MATCHED` badge works only for the **official Robinhood asset registry's exact chain ID 4663 and contract deployment**. There is no generic official status for arbitrary Robinhood meme tokens.

First-party identity candidates appear **above** same-symbol spoof listings, even if the latter show more market liquidity. All other matches remain `IDENTITY NOT VERIFIED`, which does **not** mean counterfeit. The user still chooses a contract before scanning; no auto-buy, no auto-select, no wallet calls.

The token scan shows official issuer/registry documentation with a live link and cautions that contract identity is **not a safety rating** and does not verify token economics, solvency, mint/transfer restrictions, market price or exit liquidity.

## Tests performed in Vercel Sandbox (no deployment consumed)
- Node regression suite: **122/122 PASS**
- Ethereum read-only smoke: **9/9 PASS**
- Robinhood read-only smoke: **10/10 PASS**
- Chromium user flows / responsive layout: 320px, 390px, 768px and 1440px: **4/4 PASS**. Five cards, twenty metrics, source link, contract identity ordering and switching networks clears old data.
- Separate browser smoke after adding Tether and Chainlink: live USDT issuer proof, LINK issuer proof and official Robinhood APLD search **3/3 PASS**.
- Unit tests guard false positives: same-symbol clone, wrong-chain contract, wrong-source registry claim, missing provider, bogus token metadata and reversed result ordering.

## Release caveats
This is deliberately a **small, maintained verified registry**. Other tokens are not verified by name, logos, CoinGecko or DexScreener listings. Extend the registry only when issuer-owned official records expose the exact contract and network, recording source provenance; this will not automatically verify every token. Robinhoood holder API remains access-limited. No change to live Arc site without the user's separate approval. Any protected Vercel preview still requires Vercel Authentication and the firewall limit; no need for paid API services.

## Broader issuer identity + source-backed catalog tiers (2026-10-11)
Buyer reported only USDC was apparently identified while other tokens and several metrics were blank.

- First-party issuer contract registry expanded from four to **ten** Ethereum contracts by adding DAI (Sky/Maker archival official developer docs), WBTC (official WBTC reserve transparency), SHIB, BONE, LEASH and TREAT (official shib.io/developers). Addresses are exact Ethereum chain=1 contract matches only; these are not token safety assessments.
- Ethereum name/ticker discovery now queries DexScreener and CoinGecko's contract directory independently even when DexScreener returns many similar tickers. CoinGecko candidates carry a validated Ethereum address and safe coin ID. Results are ordered **OFFICIAL issuer exact match**, **Robinhood official Stock Token registry**, **CoinGecko indexed (not official)**, **unverified DEX name candidates**. CoinGecko listing is NOT issuer confirmation and does not set `identityVerified` true.
- The UI labels catalog-only tokens **COINGECKO LISTED · ISSUER NOT VERIFIED** and shows the source link when a user selects a verified API-discovered catalog candidate. Browser-side catalog context is chain- and contract-address-scoped; manually entered contracts receive no borrowed catalog badge. Official badges remain derived from server-validated static issuer records or Robinhood issuer registry.
- CoinGecko public search is voluntary best-effort; upstream 429, missing contract, wrong chain or invalid coin identity degrade to DexScreener and/or issuer static records without ever assigning an official badge.
- Ethereum field counts observed in real sandbox scans (availability changes by provider and time): DAI 15/20, WBTC 15/20, SHIB 17/20, PEPE 16/20. Missing LP control, some circulation/whale/mint/tax fields remain NOT VERIFIED; do not infer them. PEPE does not have a vetted issuer proof in this implementation; its market listing is not official.
- Regressions: **131/131 PASS** Node; Chromium 320/390/768/1440 **4/4 PASS** on exact DAI, WBTC and SHIB contracts. Fresh clean Vercel Sandbox: Ethereum live mainnet smoke **9/9 PASS**, Robinhood live mainnet smoke **10/10 PASS**.
- This is a read-only **test branch**. Existing production ARCY site and its own Next Unlock, Pulse and Buyback & Burn sections remain untouched. User should test this protected preview before any Arc main-site integration.

Official references:
- https://github.com/sky-ecosystem/developerguides/blob/master/dai/dai-token/dai-token.md
- https://www.wbtc.network/transparency
- https://shib.io/developers
- https://www.coingecko.com/api (third-party directory, NOT issuer proof)
