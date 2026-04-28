# @0gent/core

> Real phone numbers, email inboxes, and on-chain identity for AI agents.
> Your agent pays per-use with **0G tokens**. No accounts, no API keys, no humans in the loop.

[![npm](https://img.shields.io/npm/v/@0gent/core.svg)](https://npmjs.com/package/@0gent/core)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![0G Chain](https://img.shields.io/badge/chain-0G-9200E1.svg)](https://0g.ai)

---

## In 30 seconds

Your agent has a **wallet**. The wallet pays for things — phone numbers, email
inboxes, identity NFTs, persistent memory — by signing transactions on **0G Chain**.
Our backend provisions the real resource *only after* on-chain payment is verified.
Resources are owned by the wallet, recorded on-chain, **forever**.

Three rules:

1. **Wallet = identity.** No accounts. No passwords. No "log in".
2. **Payments are native 0G.** Free testnet faucet — you can demo end-to-end without spending real money.
3. **Your keys never leave your machine.** The server has *no way* to spend your funds. Ever.

---

## 4-command demo

```bash
npm i -g @0gent/core

0gent setup                       # creates + encrypts a fresh wallet
0gent wallet fund                 # shows QR + opens the testnet faucet
0gent identity mint               # mint your Agent NFT (0.1 0G)
0gent email create --name scout   # claim scout@0gent.xyz (0.2 0G)
```

That's it. You now have a real `<name>@0gent.xyz` email address, owned by your
wallet, recorded on-chain. You can `0gent email send …` and `0gent email read …`.

Requires **Node.js ≥ 18**.

---

## What your agent gets

| Capability | Command | Cost |
|---|---|---|
| 🪪 On-chain identity NFT | `0gent identity mint` | 0.1 0G |
| 📧 Real email inbox | `0gent provision email --name <n>` | 0.2 0G |
| 📨 Send email | `0gent email send <id>` | 0.08 0G |
| 📥 Read inbox | `0gent email read <id>` | 0.02 0G |
| 📞 Real phone number (US) | `0gent provision phone` | 0.5 0G |
| 💬 Send SMS | `0gent phone sms <id>` | 0.01 0G |
| 🧠 Persistent memory | `0gent memory set/get <key>` | free |
| 💰 Wallet ops | `0gent wallet *` | free |

Get free testnet 0G at **https://faucet.0g.ai**.

---

## Use from code

Everything the CLI does, the SDK does — type-safe, no extra deps.

### Generate a fresh wallet (no network, no server call)

```ts
import { ZeroGent } from '@0gent/core'

const wallet = ZeroGent.createWallet('my-agent')
// { name, address, mnemonic, privateKey, createdAt }
```

### Use the wallet

```ts
const z = new ZeroGent({
  privateKey: wallet.privateKey,
  onPaymentStatus: (msg) => console.log('[pay]', msg), // optional
})

// Free
await z.health()                                            // chain status
await z.balance()                                           // your 0G balance

// Paid — SDK auto-signs the on-chain x402 payment
const id = await z.identityMint('support-bot')              // 0.1 0G
const inbox = await z.emailCreate('support')                // 0.2 0G
await z.emailSend(inbox.id,
  'user@example.com', 'Receipt', 'Thanks!'                  // 0.08 0G
)
const messages = await z.emailRead(inbox.id)                // 0.02 0G

// 0G Storage (free)
await z.memory.set('last_conv', { user: 'alice' })
const m = await z.memory.get('last_conv')

// On-chain reads (free)
const resources = await z.listResources()
const { balance0G } = await z.balance()
```

---

## How a paid call actually works

```text
1. Agent       z.emailCreate('support')
                     │
2. Server      ▶ 402 Payment Required: 0.2 0G to ZeroGentPayment.pay(nonce, "email")
                     │
3. SDK         ▶ signs tx on 0G Chain, broadcasts, waits for confirmation
                     │
4. Server      ▶ reads PaymentReceived event for that nonce → verified
                     │
5. Server      ▶ provisions support@0gent.xyz via Cloudflare Email Routing
                     │
6. Server      ▶ registers ownership on AgentRegistry contract
                     │
7. Agent       ◀ { id, address, owner, resourceId, registeredAt }
```

Three contracts on **0G Chain testnet (chain 16602)**:

- `ZeroGentPayment` — receives payments, nonce replay-protected
- `AgentRegistry` — tracks resource ownership per wallet
- `ZeroGentIdentity` — ERC-721 Agent NFT, metadata on 0G Storage

---

## Security model

| Question | Answer |
|---|---|
| Where are my keys stored? | Locally at `~/.0gent/` (or browser localStorage), encrypted with **AES-256-GCM**, key derived via scrypt/PBKDF2 from your passphrase. |
| Can the 0gent server spend my funds? | **No.** It only ever sees your public address. Every payment is signed locally. |
| Can I run my own backend? | Yes. Pass `api: 'https://your-backend'` to `ZeroGent` or set `OGENT_API`. |
| Is this custodial? | **Non-custodial.** Lose your mnemonic = lose access. Like any self-custody wallet. |
| Replay protection? | On-chain. Each x402 payment includes a unique nonce, enforced in `ZeroGentPayment.sol`. |

---

## All commands

| Command | What it does |
|---|---|
| `0gent setup` | One-time interactive wallet + config setup |
| `0gent wallet create [--name X]` | Create a new wallet locally |
| `0gent wallet list` / `show` / `use` | Manage multiple wallets |
| `0gent wallet fund` | QR code + faucet link |
| `0gent wallet export` | Reveal mnemonic |
| `0gent identity mint` | Mint your Agent NFT |
| `0gent identity show` | Show your Agent NFT |
| `0gent provision email --name X` | Real `X@0gent.xyz` inbox |
| `0gent email send <id>` | Send email |
| `0gent email read <id>` | Read inbox |
| `0gent email threads <id>` | List threads |
| `0gent provision phone` | Real US phone number |
| `0gent phone search` | Search available numbers |
| `0gent phone sms <id>` | Send SMS |
| `0gent phone logs <id>` | SMS history |
| `0gent memory set/get/list` | 0G Storage memory |
| `0gent list` | All your on-chain resources |
| `0gent balance` | Your 0G balance |
| `0gent pricing` | Live service prices |
| `0gent health` | API + chain status |
| `0gent doctor` | Diagnose setup issues |
| `0gent skill` | LLM-readable catalog of all endpoints |

---

## FAQ

**Is this real or a simulation?**
Real. Real on-chain payments. Real emails delivered. Real numbers. Just on testnet, where 0G has no dollar value.

**What if I lose my mnemonic?**
You lose access — same as MetaMask, same as any self-custody wallet. Save the mnemonic to a password manager when `0gent setup` shows it. There is no reset.

**Can I use this on 0G mainnet?**
Mainnet contracts coming soon. Testnet (chain 16602) for now.

**My agent is a Python script — can I use this?**
The CLI is Node-based, but every paid action is just an HTTP request + an EVM signature. The skill catalog at `https://api.0gent.xyz/skill.md` documents the raw HTTP API. Any language with `eth_signTransaction` works.

**How does the server verify my payment?**
By reading `PaymentReceived` events from `ZeroGentPayment` on-chain, matching the nonce you signed against the request. No cookies, no API keys, no sessions.

**Why not USDC?**
0G mainnet doesn't have USDC. Native 0G is the on-chain unit, so there's no bridging step.

---

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `OGENT_API` | Override API endpoint | `https://api.0gent.xyz` |
| `OGENT_CONFIG_DIR` | Override wallet/config location | `~/.0gent` |
| `OGENT_WALLET_PASSPHRASE` | Skip the passphrase prompt (for CI / agent runtimes) | — |

---

## Links

- 🌐 Website — https://0gent.xyz
- 📘 LLM endpoint catalog — https://api.0gent.xyz/skill.md
- 📦 Source — https://github.com/martinvibes/0gent
- 🔗 0G testnet explorer — https://chainscan-galileo.0g.ai
- 💧 Free testnet 0G — https://faucet.0g.ai
- 🏆 Built for the [0G APAC Hackathon](https://www.hackquest.io/hackathons/0G-APAC-Hackathon)

---

## License

MIT © 0GENT
