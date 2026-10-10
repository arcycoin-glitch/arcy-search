# ARCY SEARCH Ethereum Lab

Separate read-only Ethereum prototype in the arcy-search repository, branch eth-lab. The production arcy-website repository is untouched.

Deploy as a *new* Vercel project with branch eth-lab, root directory eth-lab, and Node.js >=22. Do not change the current production Vercel project or domain.

For local testing: cd eth-lab; npm test; npm run dev. Open http://localhost:3001.

Optional server-only ETH_RPC_URL overrides the public Ethereum mainnet RPC. The app checks chain ID 1 and pinned block on each read. No keys or transactions are needed.

API: GET /api/token?address=0x... returns real ERC-20 supply, decimals, metadata and zero/dead balances. Unsupported circulating supply and unlock are explicit NOT_VERIFIED. No fabricated values.

Before merging to production: validate USDC, UNI and LINK against trusted Ethereum explorer; test wrong chain, invalid address and EOA; build and verify Holder/Whale, Liquidity, Control, Claim vs Reality and Mechanics; run production regression tests. This prototype is not yet a complete six-card Ethereum scanner.
