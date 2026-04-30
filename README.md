<div align="center">

# 0GENT

**Decentralized infrastructure for autonomous AI agents — on 0G Chain.**

Identity, email, AI inference, memory — paid per call with native 0G tokens via x402.
Your wallet is your identity. No accounts. No API keys.

[![npm](https://img.shields.io/npm/v/@0gent/core.svg?color=9200E1)](https://www.npmjs.com/package/@0gent/core)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![tests](https://img.shields.io/badge/contracts-98%20passing-7DEFB1.svg)](#tests)
[![chain](https://img.shields.io/badge/0G%20Chain-16602-9200E1.svg)](https://chainscan.0g.ai)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Quick Start](#quick-start) · [Services](#services) · [Live API](https://api.0gent.xyz/skill.md) · [Site](https://0gent.xyz) · [npm](https://www.npmjs.com/package/@0gent/core)

</div>

---

> Stop wiring up SaaS providers by hand. Let your agent buy what it needs, on-chain, by the call.

`0GENT` is a backend an agent can talk to. The agent calls an HTTP endpoint, the endpoint replies `402 Payment Required`, the agent's wallet signs an on-chain payment in **native 0G tokens** on **0G Chain**, and the resource is provisioned and ownership recorded on-chain. The agent then uses the resource — sends an email, asks an LLM a question, reads its memory — without ever touching a credit card or a signup form.

The agent's wallet **is** its identity. The same wallet that paid is the only wallet that can read or operate the resource.

---

## Quick Start

### As an agent (one-line npm install)

```bash
npm i -g @0gent/core

0gent setup                       # generate + encrypt a fresh BIP-39 wallet
0gent wallet fund                 # QR + faucet link (testnet 0G is free)
0gent identity mint               # mint your agent NFT (0.1 0G)
0gent email create --name scout   # claim scout@0gent.xyz (0.2 0G)
0gent email send <id>             # send a real email (0.08 0G)
0gent compute infer "What is 0G Chain in one sentence?"   # ask an LLM (0.05 0G)
```

That's it. Real email delivered, real LLM completion returned — every action paid in 0G tokens, on-chain, by the agent's own wallet.

### As an HTTP client (no SDK)

```bash
# Free: see what's available
curl https://api.0gent.xyz/skill.md
curl https://api.0gent.xyz/pricing

# Paid: hit any paid endpoint, follow the 402 challenge
curl -X POST https://api.0gent.xyz/email/provision \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent"}'
# → 402 Payment Required + payment instructions
```

---

## Services

| Service | Status | Cost (0G) | Notes |
|---|---|---|---|
| **Agent Identity** | ✅ Live | 0.1 / mint | ERC-721 on 0G Chain, metadata on 0G Storage |
| **Email** — provision / send / read / threads | ✅ Live | 0.2 / 0.08 / 0.02 / 0.02 | Resend (out) + Cloudflare Email Worker (in) |
| **AI Inference** — 0G Compute Network | ✅ Live | 0.05 / call | Pay-per-call LLM via `@0glabs/0g-serving-broker` |
| **Memory** — read/write/delete | ✅ Live | free | 0G Storage via `@0glabs/0g-ts-sdk` |
| **Wallet** — generate, balance | ✅ Live | free | Non-custodial; server forgets the seed immediately |
| **Agent Profile** — public lookup | ✅ Live | free | `GET /agent/<address>` — identity + resources + balance |
| **Phone — search / provision / SMS** | ✅ Live | free / 0.5 / 0.01 | Real numbers worldwide via Telnyx (Twilio fallback wired). Verified account, attached messaging profile, end-to-end SMS delivery confirmed. |
| **Compute (VPS)** | 🟡 In dev | 1.0 / month | Code wired to Hetzner Cloud; awaiting `HCLOUD_TOKEN` |
| **Domains** | 🟡 In dev | 2.0 / year | Code wired to Namecheap; awaiting credentials |

Live pricing: `GET /pricing`. Live skill manifest for LLMs: `GET /skill.md`.

---

## How it works

```
Agent                              0GENT API                       0G Chain
  │                                    │                                │
  │  POST /compute/infer  {prompt}     │                                │
  ├───────────────────────────────────▶│                                │
  │  ◀ 402 Payment Required            │                                │
  │    {contract, nonce, amount}       │                                │
  │                                    │                                │
  │  ZeroGentPayment.pay(nonce,        │                                │
  │   "compute-infer") with 0.05 0G    │                                │
  ├────────────────────────────────────┼───────────────────────────────▶│
  │                                    │                       ✓ Event  │
  │  POST /compute/infer +             │                                │
  │    X-Payment: {txHash, nonce}      │                                │
  ├───────────────────────────────────▶│  verify on-chain ──────────────▶│
  │                                    │  call broker, sign request     │
  │                                    │   to 0G Compute Network ──┐    │
  │                                    │                           ▼    │
  │                                    │              qwen/qwen-2.5-7b  │
  │                                    │              ◀ completion ─────┤
  │  ◀ 200 OK + LLM completion         │                                │
```

The same flow drives every paid service — only the resource type and price change.

---

## 0G Integration

0GENT touches three of 0G's core layers:

| Layer | How 0GENT uses it | Where |
|---|---|---|
| **0G Chain** | All payments settle in native 0G via `ZeroGentPayment.sol`. Resource ownership recorded in `AgentRegistry.sol`. Agent identity is a standard ERC-721 NFT on 0G Chain. | `contracts/src/*.sol` |
| **0G Storage** | Agent memory (key-value), NFT metadata, session state. | `backend/src/services/storage.ts` |
| **0G Compute Network** | Pay-per-call LLM inference. Operator (us) holds a pre-funded ledger; agents reimburse per call via x402. | `backend/src/services/inference.ts` |

**A note on identity.** We use a standard **ERC-721** for the agent NFT — not 0G's official **ERC-7857** (INFT) standard, which wasn't documented when this project started. The token still lives on 0G Chain with metadata on 0G Storage, so it remains "an identity for agents on 0G", just our implementation rather than 0G's official primitive. Migrating to ERC-7857 is a future option, not a hackathon-deadline blocker.

---

## Smart contracts (0G Chain testnet, chain ID 16602)

| Contract | Address | Purpose |
|---|---|---|
| `ZeroGentPayment` | [`0x28C212Ce343e6C7b75363638954AF5Fd10Ab411B`](https://chainscan-galileo.0g.ai/address/0x28C212Ce343e6C7b75363638954AF5Fd10Ab411B) | Treasury for x402 payments. Nonce-replay protected. |
| `AgentRegistry` | [`0xb485D45688FE1103cC457acA62217Ba586Aec71a`](https://chainscan-galileo.0g.ai/address/0xb485D45688FE1103cC457acA62217Ba586Aec71a) | Maps wallets → provisioned resources. |
| `ZeroGentIdentity` | [`0xf8F9675B9C2dDca655AD3C10550B97266327a82C`](https://chainscan-galileo.0g.ai/address/0xf8F9675B9C2dDca655AD3C10550B97266327a82C) | ERC-721 agent identity NFT. One per wallet. |
| 0G Storage flow | `0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526` | 0G Storage entry point used by `@0glabs/0g-ts-sdk`. |

---

## Tech stack

- **Chain** — 0G Chain (EVM, testnet 16602), `ethers` v6
- **Contracts** — Solidity 0.8.24, Foundry, OpenZeppelin (`ERC721`)
- **Storage** — 0G Storage via `@0glabs/0g-ts-sdk`
- **Inference** — 0G Compute Network via `@0glabs/0g-serving-broker`
- **Backend** — Node.js 22, Express, TypeScript, SQLite (better-sqlite3)
- **Frontend** — Vite + React + TypeScript, deployed on Vercel
- **CLI / SDK** — `@0gent/core` on npm
- **Email** — Resend (outbound), Cloudflare Email Workers + `postal-mime` (inbound)
- **Phone — search, provision, SMS (live)** — Telnyx (verified account with messaging profile attached), Twilio also wired as a runtime fallback via `PHONE_PROVIDER` env var
- **Compute VPS (planned)** — Hetzner Cloud
- **Domains (planned)** — Namecheap

---

## Self-host

### Prerequisites

- Node.js ≥ 18 (22 recommended)
- Foundry (`forge`, `cast`) for contracts
- A wallet with testnet 0G tokens — [faucet.0g.ai](https://faucet.0g.ai)

### 1. Clone and install

```bash
git clone https://github.com/martinvibes/0gent.git
cd 0gent

# contracts
cd contracts && forge install && cd ..

# backend
cd backend && npm install && cd ..

# frontend (optional)
cd frontend && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env. Required for the live services:
#   DEPLOYER_PRIVATE_KEY     — funded with testnet 0G
#   PAYMENT_CONTRACT_ADDRESS — from contract deploy below
#   REGISTRY_CONTRACT_ADDRESS
#   IDENTITY_CONTRACT_ADDRESS
#   RESEND_API_KEY           — outbound email
#   EMAIL_WEBHOOK_SECRET     — shared with Cloudflare Email Worker
#   DATA_DIR=/your/persistent/path  — for SQLite to survive restarts
#
# Optional (light up the 🟡 services):
#   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN  — phone search live on free trial
#   TELNYX_API_KEY, TELNYX_MESSAGING_PROFILE_ID  — alternative phone provider
#   HCLOUD_TOKEN
#   NAMECHEAP_API_KEY, NAMECHEAP_API_USER
```

### 3. Deploy contracts (one time)

```bash
cd contracts
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://evmrpc-testnet.0g.ai \
  --broadcast
```

Copy the three deployed addresses into `.env`.

### 4. Fund the 0G Compute operator ledger (one time, optional)

Required only for `/compute/infer` to succeed.

```bash
node -e "
const { ethers } = require('ethers');
(async () => {
  const lib = await import('@0glabs/0g-serving-broker');
  const provider = new ethers.JsonRpcProvider(process.env.ZG_RPC_URL || 'https://evmrpc-testnet.0g.ai');
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const broker = await lib.createZGComputeNetworkBroker(wallet);
  await broker.ledger.addLedger(5);   // 5 0G runway = 100s of inference calls
  console.log(await broker.ledger.getLedger());
})();
"
```

The minimum the broker accepts is 3 0G; 5 0G is comfortable runway for a hackathon demo.

### 5. Run

```bash
# backend
cd backend && npm run dev          # http://localhost:3000

# frontend (separate terminal)
cd frontend && npm run dev         # http://localhost:5173

# CLI (against your local backend)
cd packages/core && npm run build && npm link
OGENT_API=http://localhost:3000 0gent setup
```

### 6. Verify

```bash
curl http://localhost:3000/health
curl http://localhost:3000/pricing
curl http://localhost:3000/compute/status
```

---

## Project layout

```
0gent/
├── contracts/                 # Solidity (Foundry) — 3 contracts, 98 tests
│   ├── src/                   # ZeroGentPayment, AgentRegistry, ZeroGentIdentity
│   ├── test/                  # 98 unit + fuzz tests
│   └── script/Deploy.s.sol
├── backend/                   # Express + TypeScript
│   └── src/
│       ├── middleware/x402.ts        # 402 challenge + on-chain verification
│       ├── services/
│       │   ├── chain.ts              # ethers + ZeroGentPayment + AgentRegistry
│       │   ├── storage.ts            # 0G Storage SDK wrapper
│       │   ├── inference.ts          # 0G Compute Network broker
│       │   ├── email.ts              # Resend + Cloudflare worker normaliser
│       │   ├── phone.ts              # Telnyx (in dev)
│       │   └── compute.ts            # Hetzner VPS (in dev)
│       └── routes/                   # /identity /email /compute /memory /agent /wallet ...
├── frontend/                  # Vite + React landing + dashboard
├── packages/core/             # @0gent/core — CLI + SDK on npm
├── cloudflare/                # Email Worker (postal-mime → backend webhook)
├── public/skill.md            # LLM-readable endpoint manifest
└── docs/                      # Long-form plans + decisions
```

---

## Tests

```bash
cd contracts && forge test
```

```
ZeroGentPayment:  32 tests passing  (pay, nonce replay, withdraw, receive, fuzz)
AgentRegistry:    28 tests passing  (register, deactivate, query, stress, fuzz)
ZeroGentIdentity: 38 tests passing  (mint, metadata, ERC-721, lifecycle, fuzz)
─────────────────────────────────────────────────────────────────
98 tests passing, 0 failed
```

---

## Live deployment

| Surface | URL |
|---|---|
| Backend API | https://api.0gent.xyz |
| Skill manifest | https://api.0gent.xyz/skill.md |
| Pricing | https://api.0gent.xyz/pricing |
| Frontend | https://0gent.xyz |
| Agent profile (example) | https://0gent.xyz/agent/0xBb8021Dc9a063F4F2525f532fAA3FE1907599026 |
| npm package | https://www.npmjs.com/package/@0gent/core |

Backend is on Railway with a persistent volume (`/app/data`) so SQLite survives restarts. Frontend is on Vercel. DNS at Cloudflare.

---

## Hackathon

Built for the [0G APAC Hackathon](https://www.hackquest.io/hackathons/0G-APAC-Hackathon) — **Track 1: Agentic Infrastructure**.

`#0GHackathon` `#BuildOn0G` `@0G_labs` `@HackQuest_`

---

## License

MIT
