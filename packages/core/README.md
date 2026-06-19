# @0gent/core

> The agent-native CLI and SDK for 0GENT — real email inboxes, on-chain identity, and pay-per-call AI inference for autonomous agents on **Celo & 0G Chain**.

[![npm](https://img.shields.io/npm/v/@0gent/core.svg?color=9200E1)](https://npmjs.com/package/@0gent/core)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![Celo](https://img.shields.io/badge/Celo-42220-FCFF52.svg)](https://celoscan.io)
[![0G](https://img.shields.io/badge/0G%20Chain-16661-9200E1.svg)](https://chainscan.0g.ai)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

```bash
npm i -g @0gent/core
0gent setup                       # select Celo (default) or 0G Chain
0gent compute infer "What can you do for my agent?"
```

---

## Table of contents

- [Overview](#overview)
- [Install](#install)
- [Quick start](#quick-start)
- [Status legend](#status-legend)
- [Command reference](#command-reference)
  - [Setup & wallet](#setup--wallet)
  - [Identity](#identity)
  - [Email](#email)
  - [Compute (AI inference)](#compute-ai-inference)
  - [Memory (0G Storage)](#memory-0g-storage)
  - [Phone & SMS](#phone--sms)
  - [Utility](#utility)
- [SDK](#sdk)
- [How a paid call works](#how-a-paid-call-works)
- [Security model](#security-model)
- [Environment variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Links](#links)

---

## Overview

`@0gent/core` is the official client for the 0GENT API at `api.0gent.xyz`. One package ships two interfaces:

- **`0gent` CLI** — for terminals and agent pipelines.
- **`ZeroGent` SDK** — typed TypeScript class importable as `@0gent/core`.

**Identity model.** There are no user accounts. The wallet that signs each x402 payment becomes the owner of the resource it just paid for (an inbox, an NFT, a memory entry). Re-paying from the same wallet proves continued ownership. No API keys, no sessions.

**Payments.** **USDC** on **Celo** (chain ID 42220) or native **0G tokens** on **0G Chain** (chain ID 16661). Celo is the default — select your chain once at setup and never think about it again.

**Custody.** Non-custodial. The seed phrase never leaves your machine. The 0GENT server only ever sees public addresses and verifies payments by reading on-chain events.

---

**Multi-chain.** Pick your chain at `0gent setup`. **Celo** (pay with USDC — the default) or **0G Chain** (pay with 0G tokens). Same wallet, same commands, same services across both chains.

---

## Install

```bash
npm i -g @0gent/core
```

Or run any command without a global install — perfect for one-off agent scripts or CI:

```bash
npx @0gent/core compute providers
npx @0gent/core phone search --country US --area 415
npx @0gent/core compute infer "Summarise this in 10 words: ..."
```

Requires **Node.js ≥ 18**.

---

## Quick start

The fastest path from zero to a working agent identity with a real inbox, defaulting to **Celo + USDC**:

```bash
# 1. Generate an encrypted local wallet (BIP-39, AES-256-GCM)
#    — select Celo (default) when prompted for chain
0gent setup

# 2. Fund the wallet with USDC on Celo
#    — prints QR code + funding link; Celo faucet at faucet.celo.org
0gent wallet fund

# 3. Mint your agent identity NFT — ERC-8004 on Celo ($0.50 USDC)
0gent identity mint

# 4. Claim a real <name>@0gent.xyz inbox ($2.00 USDC)
0gent email create --name scout

# 5. Send an actual email ($0.08 USDC)
0gent email send <inbox-id> --to user@example.com --subject "Hi" --body "from the agent"

# 6. Ask an LLM, paid in USDC ($0.10 USDC)
0gent compute infer "What is Celo in one sentence?"

# 7. Search real phone-number inventory (free)
0gent phone search --country US --area 415
```

Every paid step is a real on-chain transaction. Every resource is owned by your wallet, recorded in `AgentRegistry.sol`, permanently.

> **Using 0G Chain instead?** Run `0gent setup`, select **0G Chain**, and fund with 0G tokens (free testnet tokens at [faucet.0g.ai](https://faucet.0g.ai)). All commands are identical; prices are quoted in 0G tokens.

---

## Status legend

- ✅ **Live** — wired end-to-end and verified in production at `api.0gent.xyz`.
- 🟡 **In dev** — code is shipped but the upstream provider isn't credentialed yet; calls return 5xx until it is.

---

## Command reference

Prices below are shown in **USDC** (Celo default). The equivalent 0G Chain prices are noted in parentheses where they differ. All costs are settled at request time via the x402 protocol — one payment per call, no subscriptions.

### Setup & wallet

✅ All wallet operations run **locally**. The seed phrase never touches the server.

| Command | Cost | Notes |
|---|---|---|
| `0gent setup` | free | One-time interactive setup. Generates a BIP-39 wallet, encrypts it at `~/.0gent/`, and prompts for chain (Celo is default). |
| `0gent wallet create [--name N]` | free | Generate an additional BIP-39 wallet locally. |
| `0gent wallet list` | free | List all locally stored wallets. |
| `0gent wallet show` | free | Show the active wallet's address. |
| `0gent wallet use <idOrLabel>` | free | Switch the default payer. |
| `0gent wallet fund` | free | Print the funding QR code and open the appropriate faucet/bridge link for the active chain. |
| `0gent wallet export [idOrLabel]` | free | Reveal the mnemonic. **Prints only — never transmits.** |
| `0gent balance` | free | On-chain balance read for the active wallet (USDC on Celo; 0G tokens on 0G Chain). |

### Identity

| Command | Cost | Status | Notes |
|---|---|---|---|
| `0gent identity mint [--name N]` | $0.50 USDC (0.5 0G) | ✅ | Mints an ERC-8004 agent identity NFT on Celo, or ERC-721 on 0G Chain. One per wallet. Metadata pinned on 0G Storage. |
| `0gent identity show` | free | ✅ | Show your minted token (id, metadataURI, resource count). |

### Email

End-to-end: outbound via Resend, inbound parsed by a Cloudflare Email Worker (full MIME via `postal-mime`) and pushed to the backend webhook. All inboxes are `<name>@0gent.xyz`.

| Command | Cost | Status | Notes |
|---|---|---|---|
| `0gent email create --name N` | $2.00 USDC (2.0 0G) | ✅ | Provisions `<N>@0gent.xyz` and registers it on-chain. |
| `0gent email send <id> --to A --subject S --body B` | $0.08 USDC (0.1 0G) | ✅ | Sends a real email via Resend. |
| `0gent email read <id> [--limit N] [--compact]` | $0.05 USDC (0.05 0G) | ✅ | Card view by default; `--compact` for a dense table. |
| `0gent email threads <id>` | $0.05 USDC (0.05 0G) | ✅ | List conversation threads for the inbox. |

### Compute (AI inference)

**0G Compute Network** — pay-per-call inference against decentralized model providers (e.g. `qwen/qwen-2.5-7b-instruct`). The 0GENT operator pre-funds a serving-broker ledger; agents reimburse the operator per call via x402, and the broker pays the upstream provider on-chain. Agents do **not** need to maintain their own ledger with the 0G Compute Network.

| Command | Cost | Status | Notes |
|---|---|---|---|
| `0gent compute providers` | free | ✅ | Live discovery — table of available providers and models. No wallet required. |
| `0gent compute status` | free | ✅ | Operator ledger balance + `ready` flag. `ready: true` means inference will succeed. |
| `0gent compute infer "<prompt>" [--model M] [--max-tokens N] [--system "..."]` | $0.10 USDC (0.2 0G) | ✅ | Pay-per-call LLM. Returns `{ response, model, provider, usage }` in OpenAI shape. |

Sample output on Celo:

```bash
$ 0gent compute infer "Reply with one short sentence: what is Celo?"
[x402] Paying $0.10 USDC on Celo...
[x402] Approving USDC spend...
[x402] Waiting for confirmation (0xa3f1...)
✓ Inference complete

  ┌─ response ─────────────────────────────────────────
  │ Celo is a mobile-first EVM blockchain focused on
  │ financial inclusion using stablecoin payments.
  └────────────────────────────────────────────────────

  Model:    qwen2.5-7b-instruct
  Provider: 0xa48f01…7836
  Tokens:   41 (25 in / 16 out)
```

### Memory (0G Storage)

Agent memory is stored on [0G Storage](https://0g.ai) — a decentralised storage network — indexed by your wallet address. Reads and writes are free at the API level (storage costs are absorbed by the operator).

| Command | Cost | Status | Notes |
|---|---|---|---|
| `0gent memory set <key> <value>` | free | ✅ | Persist arbitrary JSON, indexed by your wallet. |
| `0gent memory get <key>` | free | ✅ | Read a value by key. |
| `0gent memory list` | free | ✅ | List keys and 0G Storage root hashes. |
| `0gent memory delete <key>` | free | ✅ | Remove an entry. |

### Phone & SMS ✅

Live end-to-end on **Telnyx** (verified account, worldwide coverage, messaging profile attached). **Twilio** is also wired as a runtime fallback — switch providers with `PHONE_PROVIDER=twilio`, zero code edits required. Numbers are owned by your wallet and leased for 30 days.

| Command | Cost | Status | Notes |
|---|---|---|---|
| `0gent phone countries [--region <name>]` | free | ✅ | List the 50 curated supported countries; full upstream inventory is 170+. |
| `0gent phone search [--country US] [--area 415]` | free | ✅ | Real upstream inventory. Country aliases (`UK→GB`, `USA→US`, full names) resolve automatically. |
| `0gent phone provision [<phoneNumber>] [--country US]` | $3.00 USDC (6.0 0G) | ✅ | Pass an E.164 number to purchase that exact number, or `--country` to grab the first available. CLI pre-validates E.164 format before any payment. |
| `0gent phone sms <phoneId> --to +1... --body "..."` | $0.10 USDC (0.1 0G) | ✅ | End-to-end SMS delivery verified. Pre-flight catches To==From, missing fields, and invalid E.164 **before** x402 charges. |
| `0gent phone logs <phoneId>` | free | ✅ | Reads local DB; provider-agnostic. |

### Utility

| Command | Cost | Notes |
|---|---|---|
| `0gent list` | free | All on-chain resources owned by your wallet. |
| `0gent skill` | free | Print the live `skill.md` from the API — the LLM-readable capability manifest. |
| `0gent pricing` | free | Live price table from `/pricing`. |
| `0gent health` | free | API + chain status. |
| `0gent doctor` | free | Diagnose your setup (config, wallet, RPC, contracts). Non-zero exit if anything fails. |

---

## SDK

Install as a library dependency (not global):

```bash
npm i @0gent/core
```

```ts
import { ZeroGent } from '@0gent/core';

// Generate a fresh wallet locally — no network call.
const wallet = ZeroGent.createWallet('my-agent');
// → { name, address, mnemonic, privateKey, createdAt }

// Construct a client. It auto-pays x402 challenges using your private key.
// chain defaults to Celo (42220); pass chain: 16661 to use 0G Chain.
const z = new ZeroGent({
  privateKey: wallet.privateKey,
  api: 'https://api.0gent.xyz',                          // optional
  onPaymentStatus: (msg) => console.log('[pay]', msg),   // optional progress hook
});

// ── Free reads ───────────────────────────────────────
await z.health();
await z.balance();
await z.pricing();

// ── Identity (paid) ──────────────────────────────────
const id = await z.identityMint('support-bot');    // $0.50 USDC on Celo

// ── Email (paid) ─────────────────────────────────────
const inbox = await z.emailCreate('support');      // $2.00 USDC on Celo
await z.emailSend(
  inbox.id,
  'user@example.com',
  'Receipt',
  'Thanks for your order.'                         // $0.08 USDC on Celo
);
const messages = await z.emailRead(inbox.id);      // $0.05 USDC on Celo

// ── Compute (free reads + paid inference) ────────────
const providers = await z.computeProviders();      // free
const status    = await z.computeStatus();         // free
const reply     = await z.computeInfer(            // $0.10 USDC on Celo
  'What is Celo in one sentence?',
  { maxTokens: 80 }
);
// reply: { response, model, provider, usage }

// ── Memory (free) ────────────────────────────────────
await z.memory.set('last_conv', { user: 'alice', topic: 'pricing' });
const m = await z.memory.get('last_conv');

// ── On-chain reads (free) ────────────────────────────
const resources = await z.listResources();
```

---

## How a paid call works

The following diagram shows what happens when an agent calls `z.computeInfer(...)`. Every other paid endpoint follows the same flow.

```
1. Agent       z.computeInfer('what is Celo?')
                    │
2. Server      ▶ 402 Payment Required
                    "pay $0.10 USDC to ZeroGentPayment.pay(nonce, 'compute-infer')"
                    │
3. SDK         ▶ approves USDC spend (ERC-20 approve), then calls ZeroGentPayment on
                    Celo or 0G Chain, waits for on-chain confirmation
                    │
4. Server      ▶ reads PaymentReceived event for that nonce → verified
                    │
5. Server      ▶ broker.inference.getRequestHeaders(provider, body) → signed headers
                    │
6. Server      ▶ POST {provider}/chat/completions with broker headers
                    │
7. Provider    ▶ qwen-2.5-7b returns OpenAI-format completion
                    │
8. Agent       ◀ { response, model, provider, usage }
```

Three contracts are deployed on both **Celo (42220)** and **0G Chain (16661)**:

- `ZeroGentPayment` — receives x402 payments; nonce-based replay protection
- `AgentRegistry` — tracks resource ownership per wallet address
- `ZeroGentIdentity` — ERC-8004 agent NFT on Celo / ERC-721 on 0G Chain; metadata on 0G Storage

---

## Security model

| Question | Answer |
|---|---|
| Where are my keys stored? | Locally at `~/.0gent/`, encrypted with **AES-256-GCM**, key derived via PBKDF2 (200 000 iterations) from your passphrase. |
| Can the 0GENT server spend my funds? | **No.** It only sees your public address. Every payment is signed locally by the SDK before broadcast. |
| Can I run my own backend? | Yes. Pass `api: 'https://your-host'` to `ZeroGent` or set `OGENT_API`. |
| Replay protection? | On-chain. Each x402 payment includes a unique nonce, enforced in `ZeroGentPayment.sol`. The same nonce cannot be reused. |
| What if I lose my mnemonic? | Same as any self-custody wallet — funds are unrecoverable. Save the mnemonic when `0gent setup` shows it. |
| What data does the server store? | Resource metadata (inbox address, NFT token ID, etc.) in SQLite. No message content is stored server-side beyond forwarding. |

---

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `OGENT_API` | Override the API endpoint | `https://api.0gent.xyz` |
| `OGENT_CONFIG_DIR` | Override wallet and config location | `~/.0gent` |
| `OGENT_WALLET_PASSPHRASE` | Skip the passphrase prompt (CI / agent runtimes) | — |

---

## Troubleshooting

```bash
0gent doctor
```

`doctor` walks every subsystem (config, wallet, RPC, contracts) and prints a pass/fail line per check. Exits non-zero if anything is broken — safe to gate CI on.

**Common issues:**

- **`No wallet configured`** — Run `0gent setup` first. (`0gent compute providers` and `0gent compute status` are exceptions — they work without a wallet.)
- **`HTTP 503: 0G Compute ledger not yet funded`** — The operator backend hasn't deposited into its broker ledger. Check `0gent compute status`; if `ready: false`, inference is temporarily offline.
- **`Insufficient balance` on a paid call** — On **Celo**, fund your wallet with USDC (bridge from Ethereum at [app.celo.org](https://app.celo.org) or use a CEX). On **0G Chain**, fund with 0G tokens; free testnet tokens at [faucet.0g.ai](https://faucet.0g.ai).
- **Slow `[x402] Waiting for confirmation`** — Block times on Celo are ~5s; on 0G Chain ~3s. Longer delays usually indicate RPC pressure. The SDK auto-retries.
- **`USDC approve failed`** — Make sure the USDC contract address for Celo is correct. `0gent doctor` validates this automatically.

---

## FAQ

**Does it work on Celo?**
Yes — Celo is the **default chain**. Run `0gent setup`, select Celo (or just press Enter), and fund with USDC. All commands work identically. Prices are in USDC.

**Is this real or a simulation?**
Real. Real on-chain payments. Real emails delivered. Real LLM completions returned. Running on Celo mainnet and 0G mainnet.

**What if I lose my mnemonic?**
Same as MetaMask, same as any self-custody wallet. Save it when `0gent setup` shows it. There is no reset or recovery mechanism.

**Can I use this on 0G mainnet?**
Yes — 0G mainnet (chain 16661) is fully supported. Free testnet 0G is available at [faucet.0g.ai](https://faucet.0g.ai) if you want to experiment without real tokens.

**My agent is a Python script — can I use this?**
The CLI is Node-based, but every paid action is just HTTP + an EVM signature. The skill catalog at [`https://api.0gent.xyz/skill.md`](https://api.0gent.xyz/skill.md) documents the full raw HTTP API. Any language with an EVM-compatible signing library (ethers, web3.py, viem, etc.) works.

**How does the server verify my payment?**
By reading `PaymentReceived` events from `ZeroGentPayment` on-chain, matching the nonce you signed in the x402 challenge. No cookies, no API keys, no sessions — the chain is the source of truth.

**Why not USDC on 0G Chain?**
0G Chain doesn't have native USDC, so payments there use the native 0G token. On Celo, USDC is natively available and widely held — so Celo payments use USDC, which is why Celo is the default.

**Why ERC-721 (0G Chain) vs ERC-8004 (Celo)?**
On Celo we implement ERC-8004 agent identity. On 0G Chain we use vanilla ERC-721 (ERC-7857 wasn't in 0G's docs when we shipped). Both store metadata on 0G Storage. Migrating the 0G contract later is a one-contract swap.

**Can I have multiple wallets / agents?**
Yes. Use `0gent wallet create` to generate additional wallets and `0gent wallet use` to switch between them. Each wallet has its own set of owned resources.

---

## Links

- 🌐 Site — [0gent.xyz](https://0gent.xyz)
- 📘 Skill manifest (LLM-readable) — [api.0gent.xyz/skill.md](https://api.0gent.xyz/skill.md)
- 📦 Source — [github.com/0GENT-Labs/0gent](https://github.com/0GENT-Labs/0gent)
- 🔗 Celo explorer — [celoscan.io](https://celoscan.io)
- 🔗 0G explorer — [chainscan.0g.ai](https://chainscan.0g.ai)
- 💧 Free testnet 0G — [faucet.0g.ai](https://faucet.0g.ai)
- 🏆 Built for the [0G APAC Hackathon](https://www.hackquest.io/hackathons/0G-APAC-Hackathon)

---

## License

MIT © 0GENT
