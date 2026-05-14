<div align="center">

# 0GENT

**Decentralized infrastructure for autonomous AI agents — on 0G Chain.**

AI agents can think and plan, but they can't send an email, buy a phone number, or call an API without borrowing a human's credentials. 0GENT fixes that. One wallet. Zero permission.

[![npm](https://img.shields.io/npm/v/@0gent/core.svg?color=9200E1)](https://www.npmjs.com/package/@0gent/core)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![tests](https://img.shields.io/badge/contracts-98%20passing-7DEFB1.svg)](#tests)
[![chain](https://img.shields.io/badge/0G%20Chain-16661-9200E1.svg)](https://chainscan.0g.ai)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Quick Start](#quick-start) · [Services](#services) · [Live Demo](https://0gent.xyz) · [API Docs](https://api.0gent.xyz/skill.md) · [npm](https://www.npmjs.com/package/@0gent/core) · [Demo Video](#demo)

</div>

---

## The Problem

Every AI agent today is a puppet. It can reason, write code, negotiate deals — but the moment it needs real-world infrastructure (an email address, a phone number, compute, storage), it stops and waits for a human to hand it API keys and a credit card.

This creates a bottleneck. Agents can't operate autonomously. They can't own resources. They can't pay for what they need.

## The Solution

**0GENT** is a backend an agent can talk to. The agent calls an HTTP endpoint, the endpoint replies `402 Payment Required`, the agent's wallet signs an on-chain payment in **native 0G tokens**, and the resource is provisioned instantly — ownership recorded on-chain, operated by the agent, no human in the loop.

The agent's wallet **is** its identity. No accounts. No API keys. No signup forms. No credit cards.

---

## 0G Stack Integration

0GENT is built natively on three core layers of the 0G ecosystem:

| 0G Component | How 0GENT Uses It | Implementation |
|---|---|---|
| **0G Chain** | All payments settle on-chain in native 0G tokens via `ZeroGentPayment.sol`. Resource ownership tracked in `AgentRegistry.sol`. Agent identity minted as ERC-721 NFT via `ZeroGentIdentity.sol`. | [`contracts/src/`](contracts/src/) |
| **0G Storage** | Persistent agent memory (key-value store), identity NFT metadata pinning, session state. Agents read and write data that survives across sessions, reboots, and machines — fully decentralized. | [`backend/src/services/storage.ts`](backend/src/services/storage.ts) |
| **0G Compute Network** | Pay-per-call decentralized AI inference. The 0GENT operator holds a pre-funded broker ledger; agents reimburse per call via x402. No OpenAI keys, no rate limits, no centralized dependency. | [`backend/src/services/inference.ts`](backend/src/services/inference.ts) |

> **Note on Agent Identity.** We use a standard **ERC-721** for the agent NFT — not 0G's **ERC-7857** (INFT), which wasn't documented when this project started. The token lives on 0G Chain with metadata on 0G Storage. Migrating to ERC-7857 is a future option.

---

## Deployed Contracts

### 0G Testnet (Chain 16602) — Active, Real Usage

| Contract | Address | Purpose |
|---|---|---|
| `ZeroGentPayment` | [`0x28C212Ce343e6C7b75363638954AF5Fd10Ab411B`](https://chainscan-galileo.0g.ai/address/0x28C212Ce343e6C7b75363638954AF5Fd10Ab411B) | Treasury for x402 payments. Nonce-replay protected. |
| `AgentRegistry` | [`0xb485D45688FE1103cC457acA62217Ba586Aec71a`](https://chainscan-galileo.0g.ai/address/0xb485D45688FE1103cC457acA62217Ba586Aec71a) | Maps wallets → provisioned resources. |
| `ZeroGentIdentity` | [`0xf8F9675B9C2dDca655AD3C10550B97266327a82C`](https://chainscan-galileo.0g.ai/address/0xf8F9675B9C2dDca655AD3C10550B97266327a82C) | ERC-721 agent identity NFT. One per wallet. |
| 0G Storage Flow | `0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526` | 0G Storage entry point used by `@0glabs/0g-ts-sdk`. |

### 0G Mainnet (Chain 16661) — Deployed

| Contract | Address | Purpose |
|---|---|---|
| `ZeroGentPayment` | [`0x124aF88c004e9df6D444a0Afc0Fe7Ef215dc02A2`](https://chainscan.0g.ai/address/0x124aF88c004e9df6D444a0Afc0Fe7Ef215dc02A2) | Treasury for x402 payments. Nonce-replay protected. |
| `AgentRegistry` | [`0x49589C475BBB418B0E069010C923ed18D00E275b`](https://chainscan.0g.ai/address/0x49589C475BBB418B0E069010C923ed18D00E275b) | Maps wallets → provisioned resources. |
| `ZeroGentIdentity` | [`0xa601C569FD008DEd545531a5d3245B2C68ac591d`](https://chainscan.0g.ai/address/0xa601C569FD008DEd545531a5d3245B2C68ac591d) | ERC-721 agent identity NFT. One per wallet. |

---

## Demo

- **Live App:** [https://0gent.xyz](https://0gent.xyz)
- **Live API:** [https://api.0gent.xyz](https://api.0gent.xyz)
- **Live Stats Dashboard:** [https://0gent.xyz/stats](https://0gent.xyz/stats)
- **Demo Video:** [https://youtu.be/ZQR07lN39VE](https://youtu.be/ZQR07lN39VE)

---

## Traction

Real usage data from the live deployment — not simulated, not mocked. Testnet traction verifiable on the [0G Testnet Explorer](https://chainscan-galileo.0g.ai/address/0x28C212Ce343e6C7b75363638954AF5Fd10Ab411B). Mainnet activity on the [0G Mainnet Explorer](https://chainscan.0g.ai/address/0x124aF88c004e9df6D444a0Afc0Fe7Ef215dc02A2).

| Metric | Count |
|---|---|
| Unique wallets | 9 |
| On-chain transactions | 64 |
| Total 0G processed | 10.76 0G |
| Agent identities minted | 9 |
| Email inboxes provisioned | 11 |
| Emails sent | 9 |
| Emails received (inbound) | 9 |
| Phone numbers provisioned | 2 |
| SMS sent | 1 |
| AI inference calls | 6 |

**Where the usage came from:** Developer testing, community members from Telegram and X who were given the npm package and tried it end-to-end. Every transaction is a real on-chain payment — visible at [0gent.xyz/stats](https://0gent.xyz/stats).

---

## Quick Start

### Install the CLI (one line)

```bash
npm i -g @0gent/core
```

### Full agent lifecycle

```bash
# 1. Generate an encrypted local wallet (BIP-39, AES-256-GCM)
0gent setup

# 2. Fund your wallet with 0G tokens
0gent wallet fund

# 3. Mint your agent identity NFT (0.5 0G)
0gent identity mint --name my-agent

# 4. Claim a real email inbox (2.0 0G)
0gent email create --name scout
# → scout@0gent.xyz is live, can receive mail from anyone on the internet

# 5. Send a real email (0.1 0G)
0gent email send <inbox-id> --to user@example.com --subject "Hi" --body "Sent by an autonomous agent"

# 6. AI inference via 0G Compute (0.2 0G)
0gent compute infer "What is 0G Chain in one sentence?"

# 7. Persistent memory via 0G Storage (free)
0gent memory set "task" "complete hackathon submission"
0gent memory get "task"

# 8. Search real phone number inventory (free)
0gent phone search --country US --area 415

# 9. Provision a phone number (6.0 0G)
0gent phone provision --country US
```

Every paid step is a real on-chain transaction. Every resource is owned by the agent's wallet. No human approval required.

### As an HTTP client (no SDK needed)

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

The skill manifest at [`api.0gent.xyz/skill.md`](https://api.0gent.xyz/skill.md) is the LLM-readable API doc — any agent framework that can read a URL and sign EVM transactions can integrate with 0GENT.

---

## Services & Pricing

All costs are in **native 0G tokens**, settled on-chain at request time via x402.

| Service | Status | Cost (0G) | Description |
|---|---|---|---|
| **Agent Identity** | ✅ Live | 0.5 | ERC-721 NFT on 0G Chain. Metadata pinned on 0G Storage. One per wallet. |
| **Email — provision** | ✅ Live | 2.0 | Real `<name>@0gent.xyz` inbox. Outbound via Resend, inbound via Cloudflare Email Worker. |
| **Email — send** | ✅ Live | 0.1 | Deliver a real email to any address on the internet. |
| **Email — read** | ✅ Live | 0.05 | Read messages received by the agent's inbox. |
| **Email — threads** | ✅ Live | 0.05 | List conversation threads. |
| **Phone — search** | ✅ Live | free | Real-time inventory of available numbers in 50+ countries via Telnyx. |
| **Phone — provision** | ✅ Live | 6.0 | Buy a real phone number. Owned by the agent's wallet for 30 days. |
| **SMS — send** | ✅ Live | 0.1 | Send SMS from the agent's provisioned number. |
| **AI Inference** | ✅ Live | 0.2 | Pay-per-call LLM via 0G Compute Network. No API keys. |
| **Memory — read/write** | ✅ Live | free | Persistent key-value storage on 0G Storage. |
| **Agent Profile** | ✅ Live | free | Public lookup: identity + resources + balance. |
| **Compute VPS** | 🟡 In dev | 1.0/mo | Server provisioning via Hetzner Cloud. |
| **Domain registration** | 🟡 In dev | 2.0/yr | `.dev` domain via Namecheap. |

Live pricing: [`GET /pricing`](https://api.0gent.xyz/pricing). Live skill manifest: [`GET /skill.md`](https://api.0gent.xyz/skill.md).

---

## How It Works — x402 Payment Protocol

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

The same flow drives every paid service — only the resource type and price change. No API keys, no sessions, no cookies. The wallet signature IS the authentication.

---

## Architecture

```
0gent/
├── contracts/                 # Solidity (Foundry) — 3 contracts, 98 tests
│   ├── src/                   # ZeroGentPayment, AgentRegistry, ZeroGentIdentity
│   ├── test/                  # 98 unit + fuzz tests
│   └── script/Deploy.s.sol
├── backend/                   # Express + TypeScript API (Railway)
│   └── src/
│       ├── middleware/x402.ts        # 402 challenge + on-chain verification
│       ├── services/
│       │   ├── chain.ts              # ethers + contract interactions
│       │   ├── storage.ts            # 0G Storage SDK wrapper
│       │   ├── inference.ts          # 0G Compute Network broker
│       │   ├── email.ts              # Resend + Cloudflare worker
│       │   └── phone.ts              # Telnyx + Twilio fallback
│       └── routes/                   # /identity /email /compute /memory /phone ...
├── frontend/                  # Vite + React (Vercel)
│   └── src/
│       ├── components/
│       │   ├── Stats.tsx             # Public stats dashboard
│       │   ├── Dashboard.tsx         # User dashboard (wallet-connected)
│       │   ├── Docs.tsx              # Interactive documentation
│       │   └── Terminal.tsx          # Live API explorer
│       └── lib/wallet.ts            # Browser-side wallet (BIP-39, AES-256-GCM)
├── packages/core/             # @0gent/core — CLI + SDK (npm)
├── cloudflare/                # Email Worker (postal-mime → webhook)
└── docs/                      # Plans + design decisions
```

### Tech Stack

| Layer | Technology |
|---|---|
| **Blockchain** | 0G Chain (EVM, mainnet 16661), Solidity 0.8.24, Foundry, OpenZeppelin |
| **Storage** | 0G Storage via `@0glabs/0g-ts-sdk` |
| **Compute** | 0G Compute Network via `@0glabs/0g-serving-broker` |
| **Backend** | Node.js 22, Express, TypeScript, SQLite (better-sqlite3), Railway |
| **Frontend** | Vite + React + TypeScript, Vercel |
| **CLI/SDK** | `@0gent/core` on npm, ESM, compiled via tsup |
| **Email** | Resend (outbound), Cloudflare Email Workers + `postal-mime` (inbound) |
| **Phone** | Telnyx (primary, verified), Twilio (runtime fallback via env var) |
| **Wallet** | BIP-39 mnemonic, AES-256-GCM encryption, PBKDF2 key derivation |

---

## Self-Host / Local Setup

Setup time: **under 10 minutes.**

### Prerequisites

- Node.js ≥ 18 (22 recommended)
- Foundry (`forge`, `cast`) for contracts
- A wallet with 0G tokens (testnet: [faucet.0g.ai](https://faucet.0g.ai), mainnet: purchase on exchanges)

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
# Edit .env — required variables:
#   DEPLOYER_PRIVATE_KEY          — funded wallet on 0G Chain
#   PAYMENT_CONTRACT_ADDRESS      — from contract deploy (step 3)
#   REGISTRY_CONTRACT_ADDRESS
#   IDENTITY_CONTRACT_ADDRESS
#   RESEND_API_KEY                — for outbound email
#   EMAIL_WEBHOOK_SECRET          — shared with Cloudflare Worker
#   DATA_DIR=/your/persistent/path — SQLite persistence
#
# Optional:
#   TELNYX_API_KEY, TELNYX_MESSAGING_PROFILE_ID — phone features
#   HCLOUD_TOKEN — VPS provisioning
```

### 3. Deploy contracts

```bash
cd contracts
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://evmrpc.0g.ai \
  --broadcast
```

Copy the three deployed addresses into `.env`.

### 4. Fund the 0G Compute broker ledger (optional, for AI inference)

```bash
node -e "
const { ethers } = require('ethers');
(async () => {
  const lib = await import('@0glabs/0g-serving-broker');
  const provider = new ethers.JsonRpcProvider('https://evmrpc.0g.ai');
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const broker = await lib.createZGComputeNetworkBroker(wallet);
  await broker.ledger.addLedger(5);
  console.log(await broker.ledger.getLedger());
})();
"
```

### 5. Run

```bash
# backend (terminal 1)
cd backend && npm run dev          # http://localhost:3000

# frontend (terminal 2)
cd frontend && npm run dev         # http://localhost:5173

# CLI (terminal 3)
cd packages/core && npm run build && npm link
OGENT_API=http://localhost:3000 0gent setup
```

### 6. Verify

```bash
curl http://localhost:3000/health
curl http://localhost:3000/pricing
curl http://localhost:3000/compute/status
0gent doctor
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

## Security Model

| Question | Answer |
|---|---|
| Where are keys stored? | Locally at `~/.0gent/`, encrypted with AES-256-GCM, key derived via scrypt from passphrase. |
| Can the 0GENT server spend my funds? | **No.** It only sees public addresses. Every payment is signed locally by the agent. |
| Replay protection? | On-chain. Each x402 payment includes a unique nonce, enforced in `ZeroGentPayment.sol`. |
| Can I run my own backend? | Yes. Pass `OGENT_API=https://your-host` or `api: 'https://your-host'` in the SDK. |

---

## Live Deployment

| Surface | URL |
|---|---|
| Frontend | [https://0gent.xyz](https://0gent.xyz) |
| Stats Dashboard | [https://0gent.xyz/stats](https://0gent.xyz/stats) |
| Documentation | [https://0gent.xyz/docs](https://0gent.xyz/docs) |
| Backend API | [https://api.0gent.xyz](https://api.0gent.xyz) |
| Skill Manifest (LLM-readable) | [https://api.0gent.xyz/skill.md](https://api.0gent.xyz/skill.md) |
| Pricing Endpoint | [https://api.0gent.xyz/pricing](https://api.0gent.xyz/pricing) |
| npm Package | [https://www.npmjs.com/package/@0gent/core](https://www.npmjs.com/package/@0gent/core) |
| 0G Explorer (Mainnet) | [View on-chain activity](https://chainscan.0g.ai/address/0x124aF88c004e9df6D444a0Afc0Fe7Ef215dc02A2) |
| 0G Explorer (Testnet) | [View testnet traction](https://chainscan-galileo.0g.ai/address/0x28C212Ce343e6C7b75363638954AF5Fd10Ab411B) |

---

## Hackathon

Built for the [**0G APAC Hackathon**](https://www.hackquest.io/hackathons/0G-APAC-Hackathon) — **Track 1: Agentic Infrastructure & OpenClaw Lab**.

**Why this track:** 0GENT is agent infrastructure at its core. Agents discover services, pay on-chain, and own what they provision — no human intermediary. The x402 payment protocol makes every HTTP endpoint into a pay-per-call primitive that any agent framework can consume.

`#0GHackathon` `#BuildOn0G` `@0G_labs` `@0g_CN` `@0g_Eco` `@HackQuest_`

---

## License

MIT
