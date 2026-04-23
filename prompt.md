Here's the full Claude Code briefing. Copy and paste the entire thing:

0GENT — CLI, Wallet & npm Package Briefing
Context
We already have working:

x402 payment flow on 0G Chain ✅
0G Storage integration ✅
Agent ID ERC-721 NFT minting ✅
Backend API (Express/TypeScript) ✅

What we are adding now is three things in one session:

A CLI tool called 0gent
A non-custodial wallet system built into the CLI
Publishing everything to npm as @0gent/core

The inspiration is AgentOS (@agntos/agentos on npm) which won $30,000 at the Colosseum Solana Agent Hackathon. They shipped a CLI where agentos wallet create --name support-bot generates a self-custodial wallet for an AI agent with passkey security, onchain spending limits, and a built-in tool marketplace. We are building the same thing but natively on 0G Chain with deeper blockchain integration.

Part 1 — CLI Architecture
Package Identity
json{
  "name": "@0gent/core",
  "version": "0.1.0",
  "description": "Decentralized infrastructure for autonomous AI agents on 0G Chain",
  "bin": {
    "0gent": "./dist/cli.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "license": "MIT"
}
Dependencies to install
bashnpm install commander chalk ora ethers inquirer cli-table3 dotenv axios
npm install --save-dev typescript @types/node tsup

Commander.js — argument parsing and subcommand structure
Chalk — colored terminal output (green for success, red for errors, yellow for pending)
Ora — animated spinners during blockchain transactions ("Verifying payment on 0G Chain...")
Ethers.js — wallet creation, private key management, signing x402 payments
Inquirer — interactive prompts during setup
cli-table3 — formatted tables for 0gent list output
tsup — bundler for TypeScript → dist


Part 2 — All CLI Commands
0gent setup
Interactive first-time setup. Does the following in order:

Asks: "Do you have an existing wallet? (yes/no)"
If no — generates a new EVM wallet using ethers.Wallet.createRandom()
If yes — prompts for private key import
Asks for a password to encrypt the private key locally
Encrypts the private key using ethers.Wallet.fromEncryptedJson pattern
Saves encrypted keystore + config to ~/.0gent/config.json
Asks for the 0GENT API endpoint (default: https://api.0gent.xyz)
Prints wallet address, tells user to fund it with USDC on 0G Chain
Automatically calls /api/identity/check — if no Agent ID NFT exists yet, asks "Would you like to mint your Agent ID? (costs 1 USDC)" and mints it

Config file structure at ~/.0gent/config.json:
json{
  "walletAddress": "0x...",
  "encryptedKey": "{ ...ethers keystore format... }",
  "apiEndpoint": "https://api.0gent.xyz",
  "agentIdTokenId": 1,
  "network": "0g-mainnet",
  "chainId": 16600
}

0gent wallet create --name <agentname>
Creates a named sub-wallet for a specific AI agent (so developers can manage multiple agents).

Generates new wallet
Registers it on-chain in ZeroGentIdentity.sol as a sub-agent linked to the master identity
Sets default onchain spending limits (see wallet limits section below)
Saves to ~/.0gent/agents/<agentname>.json
Prints: wallet address, Agent ID token ID, spending limits

0gent wallet show
Displays:

Wallet address
USDC balance on 0G Chain
Native token balance
Agent ID NFT token ID
Current daily spending limit
Amount spent today
All active resources count

Output should use a clean formatted table with Chalk colors.
0gent wallet fund --amount <usdc>
Since we can't do fiat onramp in CLI, this command:

Prints the wallet address with a QR code (use qrcode-terminal package)
Prints instructions: "Send USDC to this address on 0G Chain (Chain ID: 16600)"
Watches the chain for incoming USDC transfer (poll every 5 seconds for 2 minutes)
When detected, prints "✅ Received X USDC — wallet funded"

0gent wallet limits --daily <amount>
Sets the onchain daily spending limit.

Calls ZeroGentPayment.sol → setSpendingLimit(address, dailyLimit)
The contract enforces this — the agent literally cannot spend more per day even if compromised
Requires wallet password to authorize the transaction
Prints: "Daily spending limit set to X USDC on 0G Chain. Tx: 0x..."


0gent provision phone
Full flow:

Spinner: "Requesting phone number provisioning..."
Calls POST /api/phone/provision — receives HTTP 402 with price
Shows: "This will cost 3 USDC from your wallet. Confirm? (yes/no)"
If yes — signs USDC payment using stored wallet key, sends X-PAYMENT header
Spinner: "Verifying payment on 0G Chain..."
Spinner: "Provisioning phone number..."
Spinner: "Registering resource to your Agent ID..."
Success output:

✅ Phone number provisioned

  Number:      +1-415-555-0199
  Resource ID: 0xABC123...
  Expires:     May 16, 2027
  Owner:       0xYourWallet...
  Chain TX:    https://chainscan.0g.ai/tx/0x...

Your agent can now make calls, receive SMS, and use TTS.
Run '0gent list' to see all your resources.
0gent provision email
Same flow as phone. Output:
✅ Email inbox provisioned

  Address:     agent-abc123@0gent.xyz
  Resource ID: 0xDEF456...
  Expires:     May 16, 2027
  Owner:       0xYourWallet...
0gent provision compute
Same flow. Output:
✅ Compute instance provisioned

  IP Address:  65.21.142.190
  SSH:         ssh root@65.21.142.190
  Specs:       2 vCPU, 4GB RAM, 40GB SSD
  Location:    Nuremberg, DE (Hetzner)
  Resource ID: 0xGHI789...
  Monthly:     5 USDC
0gent provision domain <name>
bash0gent provision domain myagent.xyz
Same flow. Output:
✅ Domain registered

  Domain:      myagent.xyz
  Registrar:   Namecheap
  DNS:         Managed via Cloudflare
  Resource ID: 0xJKL012...
  Expires:     May 16, 2027

0gent list
Fetches all resources owned by the wallet from AgentResource.sol and prints a formatted table:
Agent Identity: Token #1  |  Wallet: 0xABC...  |  Balance: 14.2 USDC

┌─────────────┬──────────────────────┬───────────┬─────────────────┐
│ Type        │ Resource             │ Status    │ Expires         │
├─────────────┼──────────────────────┼───────────┼─────────────────┤
│ 📞 Phone    │ +1-415-555-0199      │ ✅ Active │ May 16, 2027    │
│ 📧 Email    │ agent@0gent.xyz      │ ✅ Active │ May 16, 2027    │
│ 🖥️  Compute  │ 65.21.142.190        │ ✅ Active │ Jun 01, 2027    │
│ 🌐 Domain   │ myagent.xyz          │ ✅ Active │ May 16, 2027    │
└─────────────┴──────────────────────┴───────────┴─────────────────┘

Total active resources: 4  |  Monthly cost: ~9 USDC

0gent identity
Displays the Agent ID NFT details:
🤖 Agent Identity

  Token ID:        #1
  Owner:           0xYourWallet...
  Minted:          Apr 16, 2026
  Resources:       4 active
  Memory Root:     0x73fa973e...  (0G Storage)
  Chain:           0G Mainnet
  Explorer:        https://chainscan.0g.ai/token/0x.../1

0gent memory get <key>
Reads from the agent's 0G Storage KV layer:
bash0gent memory get last_user_interaction
# → "User John asked about pricing on Apr 15, 2026"
0gent memory set <key> <value>
Writes to 0G Storage:
bash0gent memory set preferred_language "English"
# → ✅ Memory updated on 0G Storage
#   Key: preferred_language
#   Storage Hash: 0x73fa...
0gent memory list
Lists all memory keys stored for this agent on 0G Storage.

0gent skill
Prints the full skill.md file content to stdout so developers can pipe it into their agent:
bash0gent skill
# → prints entire skill.md

# Pipe into an agent system prompt
0gent skill | pbcopy
Also prints: "Full skill file available at: https://api.0gent.xyz/skill.md"

0gent balance
Quick shortcut. Shows just the USDC balance with a one-liner:
Wallet: 0xABC...  |  Balance: 14.2 USDC on 0G Chain

Part 3 — Dual-Purpose Library
The package must also be importable as a TypeScript/JavaScript library for developers building agents programmatically. Export a ZeroGent class from ./dist/index.js:
typescriptimport { ZeroGent } from '@0gent/core'

// Initialize with private key
const agent = new ZeroGent({
  privateKey: '0x...',
  apiEndpoint: 'https://api.0gent.xyz' // optional, defaults to production
})

// Provision resources
const phone = await agent.provision('phone')
console.log(phone.number)      // +1-415-555-0199
console.log(phone.resourceId)  // 0xABC...

const email = await agent.provision('email')
console.log(email.address)     // agent-abc@0gent.xyz

const compute = await agent.provision('compute')
console.log(compute.ip)        // 65.21.142.190
console.log(compute.ssh)       // ssh root@65.21.142.190

// Wallet operations
const balance = await agent.getBalance()
console.log(balance.usdc)      // 14.2

// Memory operations
await agent.memory.set('key', 'value')
const val = await agent.memory.get('key')

// Identity
const identity = await agent.getIdentity()
console.log(identity.tokenId)  // 1

// List owned resources
const resources = await agent.listResources()
The ZeroGent class internally handles:

x402 payment signing automatically on every provision call
Retrying if payment verification takes more than one block
Error handling with descriptive messages ("Insufficient USDC balance — need 3 USDC, have 1.2 USDC")


Part 4 — Wallet Security Architecture
The non-custodial wallet must follow this security model (matching what AgentOS shipped with AgentWallet):
Local key encryption:

Private key is NEVER stored in plaintext
Encrypted using ethers.js Wallet.encrypt(password) → produces a standard JSON keystore
Stored at ~/.0gent/config.json
Password is required to decrypt and sign any transaction
For automated agent use (no human present), support a ZEROGENT_WALLET_PASSWORD environment variable

Onchain spending limits:

ZeroGentPayment.sol must have a dailyLimit mapping: address => uint256
Every payment verification checks: totalSpentToday[agent] + amount <= dailyLimit[agent]
If limit exceeded, return HTTP 402 with message "Daily spending limit reached"
Default limit at setup: 10 USDC/day
Changeable via 0gent wallet limits --daily <amount>

Passkey support (stretch goal if time allows):

Use WebAuthn/passkey for biometric unlock instead of password
Only implement if time permits — not required for hackathon


Part 5 — File Structure
packages/
└── cli/
    ├── src/
    │   ├── cli.ts              ← entry point, Commander setup
    │   ├── commands/
    │   │   ├── setup.ts
    │   │   ├── wallet.ts       ← create, show, fund, limits
    │   │   ├── provision.ts    ← phone, email, compute, domain
    │   │   ├── list.ts
    │   │   ├── identity.ts
    │   │   ├── memory.ts
    │   │   ├── skill.ts
    │   │   └── balance.ts
    │   ├── lib/
    │   │   ├── ZeroGent.ts     ← the exportable library class
    │   │   ├── wallet.ts       ← key management, encryption
    │   │   ├── x402.ts         ← payment signing logic
    │   │   ├── storage.ts      ← 0G Storage calls
    │   │   └── config.ts       ← read/write ~/.0gent/config.json
    │   └── index.ts            ← exports ZeroGent class + types
    ├── package.json
    ├── tsconfig.json
    └── README.md               ← this becomes the npm page

Part 6 — README for npm Page
The README.md in the CLI package becomes the npm page. Write it exactly like this structure:
markdown# @0gent/core

> Decentralized real-world infrastructure for autonomous AI agents on 0G Chain

[![npm](https://img.shields.io/npm/v/@0gent/core)](https://npmjs.com/package/@0gent/core)
[![0G Chain](https://img.shields.io/badge/chain-0G%20Mainnet-blue)](https://0g.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Give your AI agent a phone number, email inbox, server, domain,
and self-custodial wallet — all paid with USDC via x402 on 0G Chain.
No accounts. No API keys. Wallet = identity.

## Install

npm i -g @0gent/core

## Quick Start

(3 example commands showing real terminal output with responses)

## Use as a Library

(the ZeroGent class example)

## How It Works

(3-sentence explanation of x402 + 0G Chain + Agent ID)

## Resources

- Full docs: https://0gent.xyz
- 0G Chain Explorer: https://chainscan.0g.ai
- skill.md for AI agents: https://api.0gent.xyz/skill.md
- GitHub: https://github.com/martinezweb3/0gent

Part 7 — Publishing Steps
After building, walk me through these exact steps:

Create npm account / login: npm login
Create the @0gent scope: npm init --scope=@0gent
Build TypeScript: npm run build (tsup compiles src → dist)
Dry run to verify: npm publish --dry-run --access public
Publish: npm publish --access public
Verify live at: https://www.npmjs.com/package/@0gent/core
Test install from npm: npm i -g @0gent/core && 0gent --version


Part 8 — Demo Video Script (CLI Scenes)
The CLI needs to look good on camera. These are the exact terminal scenes to show in the 3-minute demo video — build with this in mind:
Scene 1 (15 seconds):
bashnpm i -g @0gent/core
0gent setup
# → Interactive setup, wallet created, Agent ID minted
Scene 2 (20 seconds):
bash0gent provision phone
# → Spinner: "Requesting..."
# → "This will cost 3 USDC. Confirm?"
# → Spinner: "Verifying payment on 0G Chain..."
# → ✅ +1-415-555-0199 provisioned
Scene 3 (15 seconds):
bash0gent list
# → Clean table showing phone, email, compute, domain
Scene 4 (10 seconds):
bash0gent identity
# → Agent ID Token #1 with storage hash and explorer link
Make sure the terminal output has clear Chalk colors — green for success, cyan for addresses/hashes, yellow for prices, white for labels. It needs to look polished on a screen recording.

Summary of What Gets Built
When this is done, 0GENT will have:

A published npm package @0gent/core installable with one command
A CLI 0gent with 15+ commands covering provisioning, wallet, identity, memory
A non-custodial wallet system with onchain spending limits
A TypeScript library class ZeroGent for programmatic agent use
A professional README that serves as the npm page
Demo-ready terminal output designed for the hackathon video

This is the difference between a hackathon project and a product.