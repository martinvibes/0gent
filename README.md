# 0GENT — Decentralized Infrastructure for AI Agents

> An AI agent calls the 0GENT API, pays in 0G tokens via x402, and instantly gets a real phone number, email inbox, compute instance, or domain — with its identity anchored in an on-chain NFT and all state persisted in 0G Storage.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Agent (any LLM)                       │
│                                                                 │
│  1. GET /skill.md → discovers endpoints                         │
│  2. POST /phone/provision → gets 402 with payment instructions  │
│  3. Calls ZeroGentPayment.pay() on 0G Chain with 0G tokens     │
│  4. Retries with X-Payment header containing txHash + nonce     │
│  5. Gets real phone number, registered on-chain                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │  0GENT Backend   │
                   │  (Express.js)    │
                   └──┬──┬──┬──┬──┬──┘
                      │  │  │  │  │
        ┌─────────────┘  │  │  │  └─────────────┐
        ▼                ▼  ▼  ▼                ▼
   ┌─────────┐   ┌──────────────────┐   ┌──────────────┐
   │ 0G Chain │   │    Web2 APIs     │   │  0G Storage  │
   │          │   │                  │   │              │
   │ Payment  │   │ Telnyx (Phone)   │   │ Agent Memory │
   │ Registry │   │ Cloudflare(Email)│   │ Agent Meta   │
   │ Identity │   │ Hetzner (VPS)    │   │ Call/Email   │
   │ (NFT)    │   │ Namecheap (DNS)  │   │ Logs         │
   └──────────┘   └──────────────────┘   └──────────────┘
```

## 0G Integration (4 Components)

| Component | How 0GENT Uses It |
|-----------|-------------------|
| **0G Chain** | All payments settle on-chain via `ZeroGentPayment.sol`. Resource ownership tracked via `AgentRegistry.sol`. Agent identity is an ERC-721 NFT (`ZeroGentIdentity.sol`). |
| **0G Storage** | Agent memory (key-value pairs), identity metadata, and session state are persisted to 0G's decentralized storage network via the TypeScript SDK (`@0gfoundation/0g-ts-sdk`). |
| **Agent Identity (NFT)** | Each agent mints one ERC-721 identity NFT on 0G Chain. The token carries a metadata URI pointing to 0G Storage. The token ID is the agent's permanent on-chain identity. |
| **x402 Payments** | Agents pay for resources using the x402 HTTP payment protocol, adapted for 0G Chain native token transfers. No API keys — wallet = identity. |

## Smart Contracts (0G Chain)

| Contract | Address | Purpose |
|----------|---------|---------|
| ZeroGentPayment | `TODO` | Treasury: receives 0G token payments, nonce-based replay protection |
| AgentRegistry | `TODO` | On-chain registry mapping agents → provisioned resources |
| ZeroGentIdentity | `TODO` | ERC-721 identity NFT, one per agent, metadata on 0G Storage |

All contracts verified on [0G Explorer](https://chainscan.0g.ai).

## x402 Payment Flow

```
Agent                          0GENT API                    0G Chain
  │                                │                            │
  │  POST /phone/provision         │                            │
  │  (no payment header)           │                            │
  ├───────────────────────────────►│                            │
  │                                │                            │
  │  HTTP 402 + payment instruct.  │                            │
  │  {contract, nonce, amount}     │                            │
  │◄───────────────────────────────┤                            │
  │                                │                            │
  │  Call pay(nonce, "phone")      │                            │
  │  with 0.5 0G tokens           │                            │
  ├────────────────────────────────┼───────────────────────────►│
  │                                │                    ✓ Event │
  │  POST /phone/provision         │                            │
  │  X-Payment: {txHash, nonce}    │                            │
  ├───────────────────────────────►│  verify tx on-chain        │
  │                                ├───────────────────────────►│
  │                                │◄───────────────────────────┤
  │                                │                            │
  │  200 OK + phone number         │  registerResource()        │
  │◄───────────────────────────────┤───────────────────────────►│
  │                                │                            │
```

## Local Deployment

### Prerequisites
- Node.js >= 22
- Foundry (forge, cast)
- 0G testnet tokens ([faucet.0g.ai](https://faucet.0g.ai))

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/0gent.git
cd 0gent

# Install contract dependencies
cd contracts && forge install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your keys:
# - DEPLOYER_PRIVATE_KEY (funded with 0G testnet tokens)
# - TELNYX_API_KEY (for phone/SMS)
# - HCLOUD_TOKEN (for compute)
# - NAMECHEAP_API_KEY (for domains)
# - CLOUDFLARE_API_TOKEN (for email)
```

### 3. Deploy contracts to 0G testnet

```bash
cd contracts
export DEPLOYER_PRIVATE_KEY=<your-key>
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://evmrpc-testnet.0g.ai \
  --broadcast
```

Copy the three deployed addresses into `.env`.

### 4. Start the backend

```bash
cd backend
npm run dev
```

### 5. Test it

```bash
# Health check
curl http://localhost:3000/health

# Read the skill file (what agents see)
curl http://localhost:3000/skill.md

# Search for phone numbers (free endpoint)
curl http://localhost:3000/phone/search?country=US
```

### 6. Open the dashboard

Open `frontend/index.html` in a browser.

## Pricing (0G Tokens)

| Resource | Cost |
|----------|------|
| Identity NFT Mint | 0.1 0G |
| Phone Number | 0.5 0G/month |
| SMS Send | 0.01 0G |
| Email Inbox | 0.2 0G/month |
| VPS Instance | 1.0 0G/month |
| Domain Registration | 2.0 0G/year |
| Memory Read/Write | Free |

## Project Structure

```
0gent/
├── contracts/           # Solidity (Foundry) — 3 contracts, 98 tests
│   ├── src/             # ZeroGentPayment, AgentRegistry, ZeroGentIdentity
│   ├── test/            # Comprehensive test suite
│   └── script/          # Deployment script
├── backend/             # Express.js + TypeScript
│   └── src/
│       ├── middleware/   # x402 payment verification
│       ├── services/     # chain, storage, phone, email, compute, domain
│       └── routes/       # REST API endpoints
├── frontend/            # Dashboard (single HTML file)
├── public/              # skill.md (LLM endpoint catalog)
└── .env.example         # Environment configuration
```

## Tech Stack

- **Blockchain:** 0G Chain (EVM L1, Chain ID 16661/16602)
- **Smart Contracts:** Solidity 0.8.24, Foundry, OpenZeppelin
- **Storage:** 0G Storage via `@0gfoundation/0g-ts-sdk`
- **Backend:** Node.js 22, Express.js, TypeScript, ethers.js v6
- **Phone/SMS:** Telnyx API
- **Email:** Cloudflare Email Workers
- **Compute:** Hetzner Cloud API
- **Domains:** Namecheap API
- **Database:** SQLite (local cache, on-chain is source of truth)

## Test Results

```
98 tests passed, 0 failed (3 test suites)

ZeroGentPayment:  32 tests (pay, nonce, withdraw, receive, fuzz)
AgentRegistry:    28 tests (register, deactivate, query, stress, fuzz)
ZeroGentIdentity: 38 tests (mint, metadata, ERC-721, lifecycle, fuzz)
```

## Hackathon

Built for the [0G APAC Hackathon](https://www.hackquest.io/hackathons/0G-APAC-Hackathon) — Track 1: Agentic Infrastructure.

#0GHackathon #BuildOn0G @0G_labs @0g_CN @0g_Eco @HackQuest_

## License

MIT
