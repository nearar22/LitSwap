# LitSwap — DEX on LitVM

The first decentralized AMM exchange on [LitVM](https://litvm.com) — Litecoin's EVM rollup.

## Architecture

```
litvm/
├── contracts/     # Solidity AMM contracts (Hardhat)
└── frontend/      # Next.js frontend (wagmi + RainbowKit)
```

## Smart Contracts

Uniswap V2-style AMM with:
- `LitSwapFactory` — creates and tracks trading pairs
- `LitSwapPair` — AMM pool (x*y=k), 0.3% fee, TWAP oracle
- `LitSwapRouter` — user-facing swap/liquidity router
- `WLTC` — Wrapped zkLTC (native gas token wrapper)
- `MockERC20` — testnet mock tokens (USDC, USDT, WBTC)

### Setup Contracts

```bash
cd contracts
npm install
cp .env.example .env
# Add your PRIVATE_KEY to .env

# Compile
npm run compile

# Deploy to LitVM Testnet
npm run deploy:testnet
```

After deployment, copy the addresses from `deployments.json` into `frontend/src/lib/contracts.ts`.

## Frontend

Next.js 14 + wagmi v2 + RainbowKit + TailwindCSS

### Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Network Details (LitVM LiteForge Testnet)

| Parameter     | Value |
|---------------|-------|
| Chain ID      | 4441  |
| RPC URL       | https://liteforge.rpc.caldera.xyz/http |
| Currency      | zkLTC |
| Explorer      | https://liteforge.explorer.caldera.xyz |
| Testnet Hub   | https://testnet.litvm.com |

## Features

- **Swap** — token-to-token swaps with slippage protection
- **Liquidity** — add/remove liquidity, earn 0.3% fees
- **Pools** — browse all active pools and their reserves
- **zkLTC native** — full support for native zkLTC swaps via WLTC wrapping
