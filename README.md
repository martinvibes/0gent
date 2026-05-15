<div align="center">

<br/>

```
 ██████╗  ██████╗ ███████╗███╗   ██╗████████╗
██╔═████╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝
██║██╔██║██║  ███╗█████╗  ██╔██╗ ██║   ██║   
████╔╝██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   
╚██████╔╝╚██████╔╝███████╗██║ ╚████║   ██║   
 ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   
```

**Infrastructure for autonomous AI agents — on 0G Chain.**

Give your agent a wallet. Let it work.

[![npm](https://img.shields.io/npm/v/@0gent/core.svg?color=9200E1)](https://www.npmjs.com/package/@0gent/core)
[![tests](https://img.shields.io/badge/contracts-98%20passing-7DEFB1.svg)](#tests)
[![chain](https://img.shields.io/badge/0G%20Mainnet-16661-9200E1.svg)](https://chainscan.0g.ai)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

<br/>

[**Demo Video**](https://youtu.be/ZQR07lN39VE) | [Live App](https://0gent.xyz) | [Live API](https://api.0gent.xyz/skill.md) | [npm](https://www.npmjs.com/package/@0gent/core) | [Stats](https://0gent.xyz/stats)

<br/>

</div>

---

## Demo Video

**Watch the full demo (4+ min):** [https://youtu.be/ZQR07lN39VE](https://youtu.be/ZQR07lN39VE)

Shows: wallet setup → identity mint → email provision → send email to Gmail (live delivery) → AI inference via 0G Compute → persistent memory on 0G Storage → phone search → on-chain proof on 0G Explorer.

---

## What is 0GENT?

AI agents can think and plan, but they can't send an email, buy a phone number, or call an API without borrowing a human's credentials.

**0GENT** fixes that. It's a backend an agent can talk to:

1. Agent calls an HTTP endpoint
2. Server replies `402 Payment Required`
3. Agent's wallet pays on-chain in native **0G tokens**
4. Resource is provisioned instantly — owned by the agent's wallet

No accounts. No API keys. No credit cards. No human in the loop. The wallet **is** the identity.

```bash
npm i -g @0gent/core
0gent setup && 0gent identity mint && 0gent email create --name my-agent
```

Three commands. The agent now has an on-chain identity and a real email inbox.

---

## 0G Stack Integration

0GENT is built natively on three core layers of the 0G ecosystem:

| 0G Component | How 0GENT Uses It | Implementation |
|---|---|---|
| **0G Chain** | All payments settle on-chain in native 0G tokens via `ZeroGentPayment.sol`. Resource ownership tracked in `AgentRegistry.sol`. Agent identity minted as ERC-721 NFT via `ZeroGentIdentity.sol`. | [`contracts/src/`](contracts/src/) |
| **0G Storage** | Persistent agent memory (key-value store), identity NFT metadata pinning, session state. Agents read and write data that survives across sessions, reboots, and machines — fully decentralized. | [`backend/src/services/storage.ts`](backend/src/services/storage.ts) |
| **0G Compute Network** | Pay-per-call decentralized AI inference. The 0GENT operator holds a pre-funded broker ledger; agents reimburse per call via x402. No OpenAI keys, no rate limits, no centralized dependency. | [`backend/src/services/inference.ts`](backend/src/services/inference.ts) |

---

## Deployed Contracts

### 0G Mainnet (Chain 16661) — Live

| Contract | Address | Purpose |
|---|---|---|
| `ZeroGentPayment` | [`0x124aF88c004e9df6D444a0Afc0Fe7Ef215dc02A2`](https://chainscan.0g.ai/address/0x124aF88c004e9df6D444a0Afc0Fe7Ef215dc02A2) | Treasury for x402 payments. Nonce-replay protected. |
| `AgentRegistry` | [`0x49589C475BBB418B0E069010C923ed18D00E275b`](https://chainscan.0g.ai/address/0x49589C475BBB418B0E069010C923ed18D00E275b) | Maps wallets → provisioned resources. |
| `ZeroGentIdentity` | [`0xa601C569FD008DEd545531a5d3245B2C68ac591d`](https://chainscan.0g.ai/address/0xa601C569FD008DEd545531a5d3245B2C68ac591d) | ERC-721 agent identity NFT. One per wallet. |

### 0G Testnet (Chain 16602) — Development & Traction History

| Contract | Address | Purpose |
|---|---|---|
| `ZeroGentPayment` | [`0x28C212Ce343e6C7b75363638954AF5Fd10Ab411B`](https://chainscan-galileo.0g.ai/address/0x28C212Ce343e6C7b75363638954AF5Fd10Ab411B) | Treasury for x402 payments. Nonce-replay protected. |
| `AgentRegistry` | [`0xb485D45688FE1103cC457acA62217Ba586Aec71a`](https://chainscan-galileo.0g.ai/address/0xb485D45688FE1103cC457acA62217Ba586Aec71a) | Maps wallets → provisioned resources. |
| `ZeroGentIdentity` | [`0xf8F9675B9C2dDca655AD3C10550B97266327a82C`](https://chainscan-galileo.0g.ai/address/0xf8F9675B9C2dDca655AD3C10550B97266327a82C) | ERC-721 agent identity NFT. One per wallet. |
| 0G Storage Flow | `0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526` | 0G Storage entry point used by `@0glabs/0g-ts-sdk`. |

---

## Traction

Real usage data from the live deployment — not simulated, not mocked. Every number below is a real on-chain transaction verifiable on the [0G Mainnet Explorer](https://chainscan.0g.ai/address/0x124aF88c004e9df6D444a0Afc0Fe7Ef215dc02A2) and [Testnet Explorer](https://chainscan-galileo.0g.ai/address/0x28C212Ce343e6C7b75363638954AF5Fd10Ab411B).

| Metric | Count |
|---|---|
| Unique wallets | 9 |
| On-chain transactions | 69 |
| Total 0G processed | 13.61 0G |
| Agent identities minted | 10 |
| Email inboxes provisioned | 12 |
| Emails sent + received | 20 |
| Phone numbers provisioned | 2 |
| SMS sent | 1 |
| AI inference calls (0G Compute) | 7 |
| Memory entries (0G Storage) | 1 |

**Source:** Developer testing + community members from Telegram and X who installed the npm package and ran it end-to-end. Live dashboard at [0gent.xyz/stats](https://0gent.xyz/stats).

---

## Live Deployment

| Surface | URL |
|---|---|
| Frontend | [https://0gent.xyz](https://0gent.xyz) |
| Stats Dashboard | [https://0gent.xyz/stats](https://0gent.xyz/stats) |
| Documentation | [https://0gent.xyz/docs](https://0gent.xyz/docs) |
| Backend API | [https://api.0gent.xyz](https://api.0gent.xyz) |
| Skill Manifest (LLM-readable) | [https://api.0gent.xyz/skill.md](https://api.0gent.xyz/skill.md) |
| npm Package | [https://www.npmjs.com/package/@0gent/core](https://www.npmjs.com/package/@0gent/core) |
| 0G Explorer (Mainnet) | [View on-chain activity](https://chainscan.0g.ai/address/0x124aF88c004e9df6D444a0Afc0Fe7Ef215dc02A2) |

---

## Quick Start

```bash
npm i -g @0gent/core

0gent setup                       # generate + encrypt a local wallet
0gent wallet fund                 # get 0G tokens
0gent identity mint --name scout  # mint agent NFT (0.5 0G)
0gent email create --name scout   # real inbox: scout@0gent.xyz (2.0 0G)
0gent email send <id> --to user@example.com --subject "Hi" --body "From an agent"  # (0.1 0G)
0gent compute infer "What is 0G Chain?"   # AI inference via 0G Compute (0.2 0G)
0gent memory set "task" "win hackathon"   # persistent memory on 0G Storage (free)
0gent phone search --country US --area 415   # real phone inventory (free)
```

Every paid step is a real on-chain transaction. Every resource is owned by the agent's wallet.

### As an HTTP client (no SDK needed)

```bash
curl https://api.0gent.xyz/skill.md     # LLM-readable API docs
curl https://api.0gent.xyz/pricing      # live pricing

curl -X POST https://api.0gent.xyz/email/provision \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent"}'
# → 402 Payment Required + payment instructions
```

Any agent framework that can read a URL and sign EVM transactions can integrate with 0GENT.

---

## Services & Pricing

All costs in **native 0G tokens**, settled on-chain via x402.

| Service | Status | Cost (0G) | Description |
|---|---|---|---|
| **Agent Identity** | ✅ Live | 0.5 | ERC-721 NFT on 0G Chain. Metadata on 0G Storage. |
| **Email — provision** | ✅ Live | 2.0 | Real `<name>@0gent.xyz` inbox. |
| **Email — send** | ✅ Live | 0.1 | Deliver email to any address on the internet. |
| **Email — read** | ✅ Live | 0.05 | Read messages in the agent's inbox. |
| **Email — threads** | ✅ Live | 0.05 | List conversation threads. |
| **Phone — search** | ✅ Live | free | Real-time inventory in 50+ countries via Telnyx. |
| **Phone — provision** | ✅ Live | 6.0 | Buy a real phone number, owned for 30 days. |
| **SMS — send** | ✅ Live | 0.1 | Send SMS from the agent's number. |
| **AI Inference** | ✅ Live | 0.2 | Pay-per-call LLM via 0G Compute Network. |
| **Memory** | ✅ Live | free | Persistent key-value store on 0G Storage. |
| **Agent Profile** | ✅ Live | free | Public lookup: identity + resources + balance. |

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
  │   "compute-infer") with 0.2 0G     │                                │
  ├────────────────────────────────────┼───────────────────────────────▶│
  │                                    │                       ✓ Event  │
  │  POST /compute/infer +             │                                │
  │    X-Payment: {txHash, nonce}      │                                │
  ├───────────────────────────────────▶│  verify on-chain ──────────────▶│
  │                                    │  call broker, sign request     │
  │                                    │   to 0G Compute Network ──┐    │
  │                                    │                           ▼    │
  │                                    │               qwen3.6-plus     │
  │                                    │              ◀ completion ─────┤
  │  ◀ 200 OK + LLM completion         │                                │
```

No API keys, no sessions, no cookies. The wallet signature IS the authentication.

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
│       └── routes/
├── frontend/                  # Vite + React (Vercel)
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
| **CLI/SDK** | `@0gent/core` on npm, ESM via tsup |
| **Email** | Resend (outbound), Cloudflare Email Workers + `postal-mime` (inbound) |
| **Phone** | Telnyx (primary, verified), Twilio (runtime fallback) |
| **Wallet** | BIP-39 mnemonic, AES-256-GCM encryption, scrypt key derivation |

---

## Self-Host / Local Setup

Setup time: **under 10 minutes.**

### Prerequisites

- Node.js >= 18 (22 recommended)
- Foundry (`forge`, `cast`) for contracts
- A wallet with 0G tokens (testnet: [faucet.0g.ai](https://faucet.0g.ai), mainnet: purchase on exchanges)

### 1. Clone and install

```bash
git clone https://github.com/martinvibes/0gent.git
cd 0gent

cd contracts && forge install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
# Required:
#   DEPLOYER_PRIVATE_KEY          — funded wallet on 0G Chain
#   PAYMENT_CONTRACT_ADDRESS      — from contract deploy
#   REGISTRY_CONTRACT_ADDRESS
#   IDENTITY_CONTRACT_ADDRESS
#   RESEND_API_KEY                — for outbound email
#   EMAIL_WEBHOOK_SECRET          — shared with Cloudflare Worker
#   DATA_DIR=/your/persistent/path — SQLite persistence
```

### 3. Deploy contracts

```bash
cd contracts
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://evmrpc.0g.ai \
  --broadcast
```

### 4. Run

```bash
cd backend && npm run dev          # http://localhost:3000
cd frontend && npm run dev         # http://localhost:5173
cd packages/core && npm run build && npm link
OGENT_API=http://localhost:3000 0gent setup
```

### 5. Verify

```bash
curl http://localhost:3000/health
curl http://localhost:3000/pricing
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
| Where are keys stored? | Locally at `~/.0gent/`, encrypted with AES-256-GCM, key derived via scrypt. |
| Can the server spend my funds? | **No.** It only sees public addresses. Every payment is signed locally. |
| Replay protection? | On-chain. Each x402 payment has a unique nonce enforced in `ZeroGentPayment.sol`. |
| Can I run my own backend? | Yes. Set `OGENT_API=https://your-host` or pass `api` in the SDK constructor. |

---

## Hackathon

Built for the [**0G APAC Hackathon**](https://www.hackquest.io/hackathons/0G-APAC-Hackathon) — **Track 1: Agentic Infrastructure & OpenClaw Lab**.

0GENT is agent infrastructure at its core. Agents discover services, pay on-chain, and own what they provision — no human intermediary. The x402 payment protocol makes every HTTP endpoint into a pay-per-call primitive that any agent framework can consume.

`#0GHackathon` `#BuildOn0G` `@0G_labs` `@0g_CN` `@0g_Eco` `@HackQuest_`

---

## License

MIT
