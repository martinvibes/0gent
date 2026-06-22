# 0GENT — Project Briefing

Decentralized infrastructure for autonomous AI agents on **Celo** and **0G Chain**.

Agents pay on-chain (USDC on Celo, native tokens on 0G) via the x402 payment protocol to provision real-world resources — no accounts, no API keys, no humans needed.

## What agents can provision

| Resource | Description | Celo Price |
|----------|-------------|------------|
| Phone number | Real numbers (50+ countries) via Telnyx, with SMS | $3.00 USDC |
| Email inbox | `<name>@0gent.xyz` — send & receive | $2.00 USDC |
| Domain | Register and manage web domains | $2.00 USDC |
| Compute (VPS) | On-demand server provisioning | $1.00 USDC |
| Identity | ERC-8004 on-chain agent identity | $0.50 USDC |
| AI inference | Pay-per-call LLM (OpenAI) | $0.10 USDC |
| Memory | Persistent key/value storage | Free |

## Architecture

- **Backend**: Express + TypeScript API at `https://api.0gent.xyz`
- **Frontend**: React + Vite at `https://0gent.xyz`
- **CLI/SDK**: `@0gent/core` on npm (v0.3.0)
- **Contracts**: Foundry — separate dirs for 0G (`src/`) and Celo (`src-celo/`)
- **Email**: Cloudflare Email Routing → Worker → Backend webhook
- **Multi-chain**: Chain registry pattern — add chains as data, not code

## On-chain (Celo mainnet)

- CeloAgentPayment: `0x45568d8939795c1Ec86656f571325011f3A67da8`
- CeloAgentRegistry: `0x0745e722819B86841dCB4E223204a9AfA815A394`
- ERC-8004 Identity: Agent ID #9496 on canonical registry
- USDC: `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`

## Links

- Website: https://0gent.xyz
- API: https://api.0gent.xyz
- npm: https://www.npmjs.com/package/@0gent/core
- GitHub: https://github.com/0GENT-Labs/0gent
- Demo: https://youtu.be/ZQR07lN39VE
