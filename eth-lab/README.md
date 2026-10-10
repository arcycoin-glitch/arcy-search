# ARCY SEARCH — Ethereum Test Architecture

**Status:** architecture prototype; not yet live-verified or production-ready.

- GitHub repository: `arcycoin-glitch/arcy-search`
- Isolated branch: `eth-lab`, app root `eth-lab/`
- Production repository `arcycoin-glitch/arcy-website` and its deployment were **not edited**.
- No wallet connection, secrets, token swaps, private keys, blockchain writes, or fund transfers.

## Local startup
```sh
cd eth-lab
npm test
npm run dev
```
Open http://127.0.0.1:3001. Node.js 22+ required.

## APIs
- `GET /api/token?address=0x...`: pinned-block ERC-20 RPC metadata, supply, standard burn-address balances.
- `GET /api/report?address=0x...`: six distinct ARCY SEARCH evidence cards in a single scan.

## Data architecture
- `lib/eth.js`: Ethereum mainnet chain-ID check; pinned block; read-only ERC-20 calls. Default public RPC can be overridden with server-only `ETH_RPC_URL`.
- `lib/evidence.js`: mandatory source/evidence and null-with-reason verification states.
- `lib/market.js`: DexScreener exact contract/chain pair filtering, source-reported price/liquidity/volume, LP locks unverified.
- `lib/control.js`: owner()/paused() getter reads and EIP-1967 implementation storage; these do **not** establish every contract authority.
- `lib/report.js`: stable six-card shape and missing-data policy.
- `lib/config.js`: preliminary chain configuration; Arc production currently stays independent.

## Explicitly not implemented
- Full holder indexing, concentration snapshots or whale balances.
- Cross-source verified circulating supply and unlock calendars.
- Exhaustive liquidity / LP custody and unlock proof.
- Source-linked project claim auditing.
- Verified bytecode/permission-aware fee, blacklist, mint and buyback interpretation.
- Integrating with production Arc or deploying a live preview.

## Acceptance criteria for Codex audit
1. Run `npm test` and document exit codes.
2. Test live Ethereum chain ID 1 and stable block snapshots for USDC, UNI and LINK with explorer cross-checks, including token decimals and burn addresses.
3. Test rate limits, RPC downtime, malformed JSON, reverted ERC-20 getters, wrong chain ID, invalid contract, EOA addresses and tokens lacking optional getters.
4. Check DexScreener no-pairs, duplicate pairs, irrelevant chains, duplicate token symbols, missing liquidity/volume and stale market data; never infer zero data.
5. Test complete interface on mobile/desktop and detect horizontal overflow or broken View Evidence.
6. Review XSS, SSRF, endpoint input validation, rate limiting and error information exposure.
7. Evaluate all unknown / NOT_VERIFIED output semantics; do not market unverified metrics as authoritative.
8. Build holders, unlock, permissions, mechanics and LP adapters only when each has a source and contract-matched evidence; do not invent values.
9. Run a production regression suite against `arcy-website` before proposing any merge, including all current Arc endpoints and holder job behavior.
10. Deploy separate Vercel preview (branch `eth-lab`, root `eth-lab`) only; never overwrite existing ARCY production settings. Preserve all six cards and existing data semantics.

**Promotion gate:** no production integration until automated tests, explorer spot checks and browser tests pass. Any incomplete field must remain NOT_VERIFIED.
