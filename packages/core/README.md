# @0gent/core

> The agent-native CLI and SDK for 0GENT — real email inboxes, on-chain identity, and pay-per-call AI inference for AI agents on 0G Chain.

[![npm](https://img.shields.io/npm/v/@0gent/core.svg?color=9200E1)](https://npmjs.com/package/@0gent/core)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![chain](https://img.shields.io/badge/0G%20Chain-16602-9200E1.svg)](https://chainscan.0g.ai)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

```bash
npm i -g @0gent/core
0gent setup
0gent compute infer "What is 0G Chain in one sentence?"
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

**Identity model.** There are no user accounts. The wallet that signs each x402 payment becomes the owner of the resource it just paid for (an inbox, an NFT, a memory entry). Re-paying from the same wallet proves continued ownership.

**Payments.** Native **0G tokens** on **0G Chain testnet** (chain ID 16602). Free testnet tokens at [faucet.0g.ai](https://faucet.0g.ai) — full demo costs nothing.

**Custody.** Non-custodial. The seed phrase never leaves your machine. The 0GENT server only ever sees public addresses.

---

## Install

```bash
npm i -g @0gent/core
```

Or run any command without installing — perfect for one-off agent scripts or CI:

```bash
npx @0gent/core compute providers
npx @0gent/core phone search --country US --area 415
npx @0gent/core compute infer "what is 0G Chain?"
```

Requires Node.js ≥ 18.

---

## Quick start

```bash
# 1. Generate an encrypted local wallet (BIP-39, AES-256-GCM)
0gent setup

# 2. Fund it with a few testnet 0G — opens a faucet link + QR
0gent wallet fund

# 3. Mint your agent identity NFT (0.1 0G)
0gent identity mint

# 4. Claim a real <name>@0gent.xyz inbox (0.2 0G)
0gent email create --name scout

# 5. Send an actual email (0.08 0G)
0gent email send <inbox-id> --to user@example.com --subject "Hi" --body "from the agent"

# 6. Ask an LLM, paid in 0G (0.05 0G)
0gent compute infer "What is 0G Chain in one sentence?"

# 7. Search real phone-number inventory (free)
0gent phone search --country US --area 415
```

Every paid step is a real on-chain transaction on 0G Chain. Every resource is owned by your wallet, recorded in `AgentRegistry.sol`, forever.

---

## Status legend

- ✅ **Live** — wired end-to-end and verified in production at `api.0gent.xyz`.
- 🟡 **In dev** — code is shipped but the upstream provider isn't credentialed yet; calls return 5xx until it is.

---

## Command reference

Costs are **0G** (native), settled at request time via x402. Free commands hit only public read endpoints — no wallet required.

### Setup & wallet

✅ All wallet operations except `balance` run **locally**. The seed never touches the server.

| Command | Cost | Notes |
|---|---|---|
| `0gent setup` | free | One-time interactive setup. Generates wallet, encrypts at `~/.0gent/`, picks a default. |
| `0gent wallet create [--name N]` | free | Generate a new BIP-39 wallet locally. |
| `0gent wallet list` | free | List local wallets. |
| `0gent wallet show` | free | Show the default wallet (address only). |
| `0gent wallet use <idOrLabel>` | free | Set the default payer. |
| `0gent wallet fund` | free | Print the funding QR + open the testnet faucet. |
| `0gent wallet export [idOrLabel]` | free | Reveal the mnemonic. **Print only — never transmits.** |
| `0gent balance` | free | On-chain balance read for the active wallet. |

### Identity

| Command | Cost | Status | Notes |
|---|---|---|---|
| `0gent identity mint [--name N]` | 0.1 | ✅ | Mints `ZeroGentIdentity` ERC-721 NFT on 0G Chain. One per wallet. Metadata pinned on 0G Storage. |
| `0gent identity show` | free | ✅ | Show your minted token (id, metadataURI, resource count). |

### Email

End-to-end: outbound via Resend, inbound parsed by a Cloudflare Email Worker (full MIME via `postal-mime`) and pushed to the backend webhook.

| Command | Cost | Status | Notes |
|---|---|---|---|
| `0gent email create --name N` | 0.2 | ✅ | Provisions `<N>@0gent.xyz`. |
| `0gent email send <id> --to A --subject S --body B` | 0.08 | ✅ | Send a real email. |
| `0gent email read <id> [--limit N] [--compact]` | 0.02 | ✅ | Cards by default; `--compact` for table view. |
| `0gent email threads <id>` | 0.02 | ✅ | List conversation threads. |

### Compute (AI inference)

**0G Compute Network** — pay-per-call inference against decentralized model providers (e.g. `qwen/qwen-2.5-7b-instruct`). The 0GENT operator pre-funds a serving-broker ledger; agents reimburse the operator per call via x402, and the broker pays the upstream provider on-chain. Agents do **not** maintain their own ledger.

| Command | Cost | Status | Notes |
|---|---|---|---|
| `0gent compute providers` | free | ✅ | Live discovery — table of available providers + models. |
| `0gent compute status` | free | ✅ | Operator ledger balance + `ready` flag. `ready: true` means inference will succeed. |
| `0gent compute infer "<prompt>" [--model M] [--max-tokens N] [--system "..."]` | 0.05 | ✅ | Pay-per-call LLM. Returns OpenAI-shaped `{ response, model, provider, usage }`. |

Sample:

```bash
$ 0gent compute infer "Reply with one short sentence: what is 0G Chain?"
[x402] Paying 0.05 0G on 0G Chain...
[x402] Waiting for confirmation (0x791e6608...)
✓ Inference complete

  ┌─ response ────────────────────────────────────
  │ 0G Chain is a blockchain platform that focuses
  │ on zero-knowledge proofs to enhance privacy
  │ and efficiency in cryptographic applications.
  └──────────────────────────────────────────────

  Model:    qwen2.5-7b-instruct
  Provider: 0xa48f01…7836
  Tokens:   43 (27 in / 16 out)
```

### Memory (0G Storage)

| Command | Cost | Status | Notes |
|---|---|---|---|
| `0gent memory set <key> <value>` | free | ✅ | Persist arbitrary JSON to 0G Storage, indexed by your wallet. |
| `0gent memory get <key>` | free | ✅ | Read by key. |
| `0gent memory list` | free | ✅ | List keys + 0G Storage root hashes. |
| `0gent memory delete <key>` | free | ✅ | Remove the entry. |

### Phone & SMS ✅

Live end-to-end on **Telnyx** (verified account, worldwide coverage, messaging profile attached). **Twilio** also wired as a runtime fallback — switch with `PHONE_PROVIDER=twilio` env var, zero code edits required. Numbers are owned by your wallet, leased for 30 days at a time.

| Command | Cost | Status | Notes |
|---|---|---|---|
| `0gent phone countries [--region <name>]` | free | ✅ | List the 50 curated supported countries; full inventory is 170+ via the upstream provider. |
| `0gent phone search [--country US] [--area 415]` | free | ✅ | Real upstream inventory. Aliases (`UK→GB`, `USA→US`, full names) resolve automatically. |
| `0gent phone provision [<phoneNumber>] [--country US]` | 0.5 | ✅ | Pass a specific E.164 to buy that exact number, or `--country` to grab the first available. CLI pre-validates E.164 before any payment. |
| `0gent phone sms <phoneId> --to +1... --body "..."` | 0.01 | ✅ | End-to-end SMS delivery verified. Pre-flight catches To==From, missing fields, and bad E.164 BEFORE x402 charges. |
| `0gent phone logs <phoneId>` | free | ✅ | Reads local DB; provider-agnostic. |

### Utility

| Command | Cost | Notes |
|---|---|---|
| `0gent list` | free | All on-chain resources owned by your wallet. |
| `0gent skill` | free | Print the live `skill.md` from the API — what an LLM agent sees. |
| `0gent pricing` | free | Live price table from `/pricing`. |
| `0gent health` | free | API + chain status. |
| `0gent doctor` | free | Diagnose setup (config, wallet, RPC, contracts). Non-zero exit if anything fails. |

---

## SDK

```ts
import { ZeroGent } from '@0gent/core';

// Generate a fresh wallet locally — no network call.
const wallet = ZeroGent.createWallet('my-agent');
// → { name, address, mnemonic, privateKey, createdAt }

// Construct a client and let it auto-pay x402 challenges.
const z = new ZeroGent({
  privateKey: wallet.privateKey,
  api: 'https://api.0gent.xyz',                          // optional
  onPaymentStatus: (msg) => console.log('[pay]', msg),   // optional
});

// ── Free reads ───────────────────────────────────────
await z.health();
await z.balance();
await z.pricing();

// ── Identity (paid) ──────────────────────────────────
const id = await z.identityMint('support-bot');         // 0.1 0G

// ── Email (paid) ─────────────────────────────────────
const inbox = await z.emailCreate('support');           // 0.2 0G
await z.emailSend(inbox.id,
  'user@example.com',
  'Receipt',
  'Thanks for your order.'                              // 0.08 0G
);
const messages = await z.emailRead(inbox.id);           // 0.02 0G

// ── 0G Compute (free reads + paid call) ──────────────
const providers = await z.computeProviders();           // free
const status    = await z.computeStatus();              // free
const reply     = await z.computeInfer(                 // 0.05 0G
  'What is 0G Chain in one sentence?',
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

```
1. Agent       z.computeInfer('what is 0G chain?')
                    │
2. Server      ▶ 402 Payment Required: 0.05 0G to ZeroGentPayment.pay(nonce, "compute-infer")
                    │
3. SDK         ▶ signs tx on 0G Chain, broadcasts, waits for confirmation
                    │
4. Server      ▶ reads PaymentReceived event for that nonce → verified
                    │
5. Server      ▶ broker.inference.getRequestHeaders(provider, body)  → signed headers
                    │
6. Server      ▶ POST {provider}/chat/completions with broker headers
                    │
7. Provider    ▶ qwen-2.5-7b returns OpenAI-format completion
                    │
8. Agent       ◀ { response, model, provider, usage }
```

Three contracts on **0G Chain testnet (chain 16602)**:

- `ZeroGentPayment` — receives x402 payments, nonce replay-protected
- `AgentRegistry` — tracks resource ownership per wallet
- `ZeroGentIdentity` — ERC-721 agent NFT, metadata on 0G Storage

> **Note on identity.** This is a standard ERC-721, not 0G's ERC-7857 INFT (which wasn't documented when this project started). The token still lives on 0G Chain with metadata on 0G Storage, so it's "an identity for agents on 0G" — just our implementation, not 0G's official primitive.

---

## Security model

| Question | Answer |
|---|---|
| Where are my keys stored? | Locally at `~/.0gent/`, encrypted with **AES-256-GCM**, key derived via PBKDF2 (200k iterations) from your passphrase. |
| Can the 0GENT server spend my funds? | **No.** It only sees your public address. Every payment is signed locally. |
| Can I run my own backend? | Yes. Pass `api: 'https://your-host'` to `ZeroGent` or set `OGENT_API`. |
| Replay protection? | On-chain. Each x402 payment includes a unique nonce, enforced in `ZeroGentPayment.sol`. |
| What if I lose my mnemonic? | Same as any self-custody wallet — funds are gone. Save the mnemonic when `setup` shows it. |

---

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `OGENT_API` | Override API endpoint | `https://api.0gent.xyz` |
| `OGENT_CONFIG_DIR` | Override wallet/config location | `~/.0gent` |
| `OGENT_WALLET_PASSPHRASE` | Skip the passphrase prompt (CI / agent runtimes) | — |

---

## Troubleshooting

```bash
0gent doctor
```

`doctor` walks every subsystem (config, wallet, RPC, contracts) and prints a pass/fail line per check. Non-zero exit if anything fails.

Common issues:

- **`No wallet configured`** — Run `0gent setup` first. (`0gent compute providers` and `0gent compute status` are exceptions — they need no wallet.)
- **`HTTP 503: 0G Compute ledger not yet funded`** — The operator backend hasn't deposited into its broker ledger. `0gent compute status` shows `ready: false`. Inference is offline until the operator runs `broker.ledger.addLedger(3)`.
- **`Insufficient balance`** on a paid call — Top up at [faucet.0g.ai](https://faucet.0g.ai) (testnet is free) and retry.
- **Slow `[x402] Waiting for confirmation`** — Block times on 0G testnet typically settle in ~3s; longer means RPC pressure. The SDK auto-retries.

---

## FAQ

**Is this real or a simulation?**
Real. Real on-chain payments. Real emails delivered. Real LLM completions returned. Just on testnet, where 0G has no dollar value.

**What if I lose my mnemonic?**
Same as MetaMask, same as any self-custody wallet. Save it when `0gent setup` shows it. There is no reset.

**Can I use this on 0G mainnet?**
Mainnet contracts coming after the hackathon. Testnet (chain 16602) for now.

**My agent is a Python script — can I use this?**
The CLI is Node-based, but every paid action is just HTTP + an EVM signature. The skill catalog at `https://api.0gent.xyz/skill.md` documents the raw HTTP API. Any language with `eth_signTransaction` works.

**How does the server verify my payment?**
By reading `PaymentReceived` events from `ZeroGentPayment` on-chain, matching the nonce you signed. No cookies, no API keys, no sessions.

**Why not USDC?**
0G mainnet doesn't have USDC. Native 0G is the on-chain unit, so there's no bridging step.

**Why ERC-721 and not 0G's ERC-7857 (INFT)?**
ERC-7857 wasn't in 0G's docs when we shipped. We use vanilla ERC-721 on 0G Chain with metadata on 0G Storage. Migrating later is a one-contract swap.

---

## Links

- 🌐 Site — [0gent.xyz](https://0gent.xyz)
- 📘 Skill manifest (LLM-readable) — [api.0gent.xyz/skill.md](https://api.0gent.xyz/skill.md)
- 📦 Source — [github.com/martinvibes/0gent](https://github.com/martinvibes/0gent)
- 🔗 Explorer — [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai)
- 💧 Free testnet 0G — [faucet.0g.ai](https://faucet.0g.ai)
- 🏆 Built for the [0G APAC Hackathon](https://www.hackquest.io/hackathons/0G-APAC-Hackathon)

---

## License

MIT © 0GENT
