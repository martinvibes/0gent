# @0gent/core

> Decentralized infrastructure for autonomous AI agents on 0G Chain

[![npm](https://img.shields.io/npm/v/@0gent/core.svg)](https://npmjs.com/package/@0gent/core)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![0G Chain](https://img.shields.io/badge/chain-0G-9200E1.svg)](https://0g.ai)

Give your AI agent a phone number, email inbox, on-chain identity, and
self-custodial wallet — all paid per-call with 0G tokens via x402.
**No accounts. No API keys. Wallet = identity.**

```bash
npm i -g @0gent/core

0gent setup                     # create + encrypt an HD wallet
0gent identity mint             # mint your Agent Identity NFT (0.1 0G)
0gent provision phone           # real phone number on 0G Chain (0.5 0G)
0gent email create --name bot   # real email inbox (0.2 0G)
0gent list                      # all your on-chain resources
```

---

## What it does

Every 0GENT resource lives behind an **HTTP 402 paywall on 0G Chain**.

1. Agent calls `POST /phone/provision`
2. Server replies `402 Payment Required` with a nonce + amount
3. CLI (or SDK) signs a 0G token transfer to `ZeroGentPayment.pay(nonce, "phone")`
4. Backend verifies the on-chain tx, provisions the real-world resource,
   and records ownership on `AgentRegistry`

Your wallet signs → your wallet owns. Forever. No migrations. No account recovery.
Your wallet _is_ your agent's identity on the network.

---

## Install

```bash
npm i -g @0gent/core
```

Or run once without install:

```bash
npx @0gent/core setup
```

Requires **Node.js ≥ 18**.

---

## Quick start

```bash
# 1. One-time interactive setup
$ 0gent setup
  ✓ Wallet ready
  Address       0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18
  API           https://api.0gent.xyz

# 2. Fund your wallet from the testnet faucet
$ 0gent wallet fund
  <QR code>
  › Watching for incoming 0G tokens...
  ✓ Received 0.1 0G

# 3. Mint your on-chain identity (one per wallet, forever)
$ 0gent identity mint
  [x402] Paying 0.1 0G on 0G Chain...
  [x402] Waiting for confirmation (0x1008d79a...)
  ✓ Agent Identity minted
  Token ID      #1
  Metadata      0g://0x73fa973e2552bf9feb58dc47269c760c1ee8e83230296d309af8784b512b949f
  Tx            https://chainscan-galileo.0g.ai/tx/0x1008d79a...

# 4. Get a real phone number
$ 0gent provision phone
  [x402] Paying 0.5 0G on 0G Chain...
  ✓ Phone number provisioned
  Number        +1 (415) 555-0142
  Resource ID   3
  Expires       May 24, 2026

# 5. Send SMS from your agent
$ 0gent phone sms <phoneId> --to +15551234567 --body "hi from the machine"
  ✓ SMS sent

# 6. Get a real email address
$ 0gent email create --name scout
  ✓ Email inbox provisioned
  Address       scout@0gent.xyz

# 7. See all your resources on-chain
$ 0gent list
  Agent #1  │  0x742d35…bD18  │  14.2000 0G

  ┌─────────┬───────────────────┬──────────┬─────────────┐
  │ Type    │ Resource          │ Status   │ Expires     │
  ├─────────┼───────────────────┼──────────┼─────────────┤
  │ 📞 phone│ +1 (415) 555-0142 │ ✓ active │ May 24, 2026│
  │ 📧 email│ scout@0gent.xyz   │ ✓ active │ May 24, 2026│
  └─────────┴───────────────────┴──────────┴─────────────┘
```

---

## Use as a library

Everything the CLI can do, you can do from code:

```ts
import { ZeroGent } from '@0gent/core'

const z = new ZeroGent({
  privateKey: process.env.AGENT_PK,  // or omit to use `0gent setup` vault
  api: 'https://api.0gent.xyz',
  autoPay: true,                      // auto-sign x402 challenges
  onPaymentStatus: (msg) => console.log('[pay]', msg),
})

// Free
const available = await z.phoneSearch('US')
const health    = await z.health()

// Paid — triggers x402 flow, signs 0G payment on-chain, retries
const identity  = await z.identityMint('support-bot')
const phone     = await z.phoneProvision('US', '415')
const email     = await z.emailCreate('support', z.address)

await z.phoneSms(phone.id, '+15551234567', 'Your order has shipped')
await z.emailSend(email.id, 'user@example.com', 'Receipt', 'Thank you for your order')

// Memory on 0G Storage
await z.memory.set('last_conversation', { user: 'alice', resolved: true })
const memory = await z.memory.get('last_conversation')

// Read your agent's on-chain state
const resources = await z.listResources()   // from AgentRegistry
const { balance0G } = await z.balance()
```

---

## All commands

| Command | What it does | Cost |
|---------|--------------|------|
| `0gent setup` | Interactive wallet creation + config | Free |
| `0gent wallet create --name <label>` | New HD wallet (encrypted locally) | Free |
| `0gent wallet list` | List all wallets | Free |
| `0gent wallet show` | Show default wallet + balance | Free |
| `0gent wallet fund` | QR + watcher for incoming 0G | Free |
| `0gent wallet export` | Reveal mnemonic | Free |
| `0gent wallet use <id>` | Set default wallet | Free |
| `0gent identity mint` | Mint ERC-721 Agent Identity | 0.1 0G |
| `0gent identity show` | Show Agent Identity | Free |
| `0gent phone search` | Search available numbers | Free |
| `0gent provision phone` | Provision a real phone number | 0.5 0G |
| `0gent phone sms <id>` | Send SMS | 0.01 0G |
| `0gent phone logs <id>` | Read SMS history | Free |
| `0gent provision email` | Provision email inbox | 0.2 0G |
| `0gent email send <id>` | Send email | 0.08 0G |
| `0gent email read <id>` | Read inbox | 0.02 0G |
| `0gent email threads <id>` | List threads | 0.02 0G |
| `0gent memory set <k> <v>` | Store on 0G Storage | Free |
| `0gent memory get <k>` | Read from 0G Storage | Free |
| `0gent memory list` | List memory keys | Free |
| `0gent list` | All on-chain resources | Free |
| `0gent balance` | Wallet balance | Free |
| `0gent pricing` | Live service prices | Free |
| `0gent health` | API + chain status | Free |
| `0gent doctor` | Diagnose setup | Free |
| `0gent skill` | Print the LLM skill catalog | Free |

---

## Security model

- **Keys never leave your machine.** `0gent setup` creates a BIP-39 HD wallet locally. The mnemonic is encrypted with `AES-256-GCM` using a key derived via `scrypt` from your passphrase.
- **Server-side:** only the wallet address is ever stored. No private keys, no passphrases, no passwords.
- **Automation-friendly:** set `OGENT_WALLET_PASSPHRASE` to let the CLI sign without prompting (CI, cron, agent runtimes).
- **Pre-flight balance check** before every paid request — you never waste gas on a request the network can't afford.
- **Nonce replay protection** enforced on-chain in `ZeroGentPayment.sol`.

---

## Under the hood

**Blockchain:** 0G Chain (EVM L1) — testnet chain ID `16602`, mainnet `16661`.

**Three contracts:**
- `ZeroGentPayment` — Receives x402 payments, nonce-based replay protection
- `AgentRegistry` — Tracks resource ownership per agent wallet
- `ZeroGentIdentity` — ERC-721 agent identity NFT, metadata on 0G Storage

**Payment token:** native **0G**. No USDC dependency.

**Storage:** agent memory + identity metadata persisted to **0G Storage** via `@0gfoundation/0g-ts-sdk`. Every memory key is a merkle-verifiable blob.

**Providers wrapped:** Telnyx (phone + SMS), Cloudflare Email Routing (email), Hetzner Cloud (compute, _stretch_), Namecheap (domains, _stretch_).

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `OGENT_API` | Override API endpoint |
| `OGENT_CONFIG_DIR` | Override config/wallet location (default: `~/.0gent`) |
| `OGENT_WALLET_PASSPHRASE` | Let the CLI sign without prompting |

---

## Links

- 🌐 Site: https://0gent.xyz
- 📘 skill.md: https://api.0gent.xyz/skill.md (the LLM-readable endpoint catalog)
- 📦 GitHub: https://github.com/martinvibes/0gent
- 🔗 0G Chain Explorer: https://chainscan-galileo.0g.ai
- 💧 0G Testnet Faucet: https://faucet.0g.ai
- 🏆 Built for the [0G APAC Hackathon](https://www.hackquest.io/hackathons/0G-APAC-Hackathon)

---

## License

MIT © 0GENT
