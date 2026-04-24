# 0GENT — Product Plan: CLI + SDK + End-to-End Live Demo

> Path from "hackathon prototype" to "real product that agents actually use."
> Deadline: **2026-05-16 23:59 UTC+8** (22 days remaining).

## ★ Scope — Primary (must ship) vs Stretch (if time)

**Primary (hackathon submission MUST have):**
- Agent Identity NFT mint (0G Chain + 0G Storage) ✅ contract done
- Self-custodial wallet CLI + SDK
- x402 payment flow on 0G Chain
- **Phone number provisioning (Telnyx)**
- **SMS send + inbound logs**
- **Email inbox provisioning (Cloudflare Email Routing — plaintext OK for v1)**
- **Email send + read inbox**
- Memory via 0G Storage
- Published `@0gent/core` on npm

**Stretch (add only if primary is shipping ahead of schedule):**
- Compute (Hetzner VPS)
- Domain registration (Namecheap)
- E2E email encryption
- On-chain spending limits
- Voice calls with TTS

**Explicitly out of scope for hackathon (post-May 16):**
- Twitter / X automation
- Passkey/WebAuthn
- Managed wallet approval flows

---

## 0. What AgentOS Actually Built (Lessons from Source)

I read the full AgentOS source at `/Users/admin/.pg/0GENT/reference/AgentOS/`. The $30K-winning anatomy:

### Single npm package, dual-purpose
`@agntos/agentos` exports both a **CLI binary** (`bin.agentos` → `dist/cli.js`) and an **SDK class** (`import { AgentOS }` → `dist/sdk.js`). Same package. One install, two interfaces.

### Wallet = BIP-39 HD + AES-256-GCM + OS keychain
- **Mnemonic** stored encrypted on disk (`~/.agentos/wallet/wallets/<id>.json`)
- Encryption: `scryptSync(passphrase, salt)` → AES-256-GCM
- Derives **both** Solana (ed25519, `m/44'/501'/0'/0'`) and EVM (secp256k1, `m/44'/60'/0'/0/0`) addresses from one seed
- Server stores **the same encrypted blob** but can't decrypt it — two paths exist: passphrase (Scrypt) or HKDF-derived session secret bound to an agent API key
- Spending policies (`per_tx_usdc`, `daily_usdc`, `allowed_chains`) enforced at sign time with a spend ledger

### x402 client flow (cli/pay.ts)
1. Call endpoint → get 402 JSON
2. Parse `accepts[]` array, pick Solana or EVM network
3. Build signed USDC transfer tx (partially signed by agent; server co-signs as fee payer — gasless for agent)
4. Re-send original request with `Payment-Signature` header (base64 JSON with `x402Version`, `payload.transaction`, `accepted.network`)

### SDK pattern (cli/sdk.ts)
```ts
class AgentOS {
  private async request(method, path, body) {
    const res = await fetch(...)
    if (res.status === 402 && this.autoPay) {
      const { paidRequest } = await import('./pay.js')  // dynamic import, only loaded when needed
      return paidRequest(this.api, method, path, body, this.passphrase)
    }
  }
}
```

### What makes it feel like a product
- Auto-detects TTY vs pipe (interactive React Ink UI vs raw JSON output)
- Exit codes 0–7 for different failure modes (scripts can branch)
- `agentos doctor` diagnoses every subsystem
- Server-side wallet-vault routes: `/wallet`, `/wallet/:id/sign`, `/wallet/:id/policy`, `/wallet/:id/api-key` — enables both local-only and server-backed modes
- Pre-flight validation before paywall (so agents don't pay for requests that'd fail)

---

## 1. Current 0GENT State (Brutal Honesty)

| Area | Status | Notes |
|------|--------|-------|
| Smart contracts | ✅ Written, 98 tests passing | Not deployed anywhere |
| Backend API | ✅ Code complete, compiles | Never successfully started E2E, no keys configured |
| Frontend landing page | ✅ Purple/0G palette, works visually | Terminal is simulated — not real |
| x402 middleware | ✅ Written | Requires deployed contracts to test |
| 0G Storage integration | ✅ Written | Requires deployed contracts + real signer |
| Agent ID ERC-721 mint | ✅ Contract + route written | Not wired E2E |
| Self-custodial wallet system | ❌ Not built | **The most missing piece** |
| CLI tool | ❌ Not built | **Critical for demo** |
| SDK package (`@0gent/core`) | ❌ Not built | **Critical for demo** |
| On-chain spending limits | ❌ Not in contracts | Need contract modification or server-side enforcement |
| npm publication | ❌ Not published | Need scope `@0gent` or `@zerogent` |
| Deployed backend | ❌ Not hosted | No `api.0gent.xyz` yet |
| Real Telnyx/Hetzner/etc keys | ❌ Not configured | User needs to sign up ($20 Telnyx) |

---

## 2. Design Decisions (Locked Before Building)

### D1: Payment token — native 0G, not USDC
**Reason:** USDC does not exist on 0G mainnet or testnet. Bridged USDC has no confirmed deployment. Native 0G token has gas + value. All pricing will be denominated in 0G tokens, not USDC. Later, when bridged USDC arrives, we can support both.

### D2: Chain IDs
- **Mainnet:** 16661 — `https://evmrpc.0g.ai`
- **Testnet (Galileo):** 16602 — `https://evmrpc-testnet.0g.ai` — **deploy here first**

### D3: Wallet architecture — CLI-local vault (non-custodial by default)
The CLI owns the wallet file at `~/.0gent/wallet/<id>.json`. Private key encrypted with scrypt+AES-256-GCM from user passphrase. Server never sees the key. For automation, env var `OGENT_WALLET_PASSPHRASE` can be set.

**Stretch:** server-side encrypted vault (identical blob format) for web dashboard, matching AgentOS.

### D4: HD derivation
0G Chain is EVM — we only need secp256k1 (path `m/44'/60'/0'/0/0`). No need for ed25519/Solana path. Simpler than AgentOS.

### D5: Spending limits — server-side first, on-chain stretch
Hackathon: enforce `daily_0g` and `per_tx_0g` policy in x402 middleware, reading from a `policies` table in SQLite. Server rejects payment if over limit.

**Stretch:** Modify `ZeroGentPayment.sol` to add `dailyLimit[agent]` mapping enforced on `pay()`. True on-chain enforcement. Requires redeploy.

### D6: Package naming
- npm name: `@0gent/core` (if scope available) or fallback to `@zerogent/core`
- Binary: `0gent`
- SDK: `import { ZeroGent } from '@0gent/core'`

### D7: Skip for v1
- Twitter / social media posting (hard, brittle, not core)
- Voice call control endpoints beyond simple outbound dial with TTS
- Email encryption (E2E NaCl box) — plaintext Cloudflare routing is fine for v1
- Passkey/WebAuthn
- Managed wallet approval flows
- Legacy keyfile import

Hackathon primary flows:
`setup` → `wallet create` → `identity mint` → `provision phone` → `phone sms` → `provision email` → `email send` → `email read` → `memory set/get` → `list`.

### D8: Email implementation (plaintext, v1)
**Inbound:** Cloudflare Email Routing catches `*@0gent.xyz` → forwards to a Cloudflare Worker → Worker POSTs raw message to `POST /email/webhook` on our backend → backend writes to SQLite + 0G Storage keyed by inbox address.

**Outbound:** Backend sends via a cheap transactional provider (Resend free tier: 3,000/month, or SendGrid free tier: 100/day). From address = `<localPart>@0gent.xyz`. DNS for `0gent.xyz` → Cloudflare with MX + SPF + DKIM set once.

**Provisioning flow:** `emailCreate(name, walletAddress)` → creates a Cloudflare email routing rule for `<name>@0gent.xyz` → stores `{ inboxId, address, owner }` in SQLite → registers resource on-chain.

**Storage:** Each received email is appended to a per-inbox log file on 0G Storage so the `emailRead()` reads from a merkle-verifiable log (same pattern as call logs).

---

## 3. 22-Day Execution Plan

Five phases. Each ends with a shippable artifact. **Priority order: Phone → SMS → Email → everything else.** Compute/domain only if we're ahead of schedule.

### Timeline overview

| Phase | Days (22 total) | Goal |
|-------|-----------------|------|
| **1. Backend on-chain + Telnyx wired** | 4 | Contracts deployed; real phone provisioning works E2E via curl |
| **2. CLI + SDK core (`@0gent/core`)** | 7 | Vault, pay, SDK class, commands: `setup`, `wallet`, `identity`, `provision phone`, `list`, `memory` |
| **3. Email + SMS commands** | 3 | Cloudflare email routing wired; `provision email`, `email send/read`, `phone sms` |
| **4. Hosted API + polish** | 4 | api.0gent.xyz live; frontend terminal wired to real API; all commands polished |
| **5. Publish + demo video + submit** | 4 | npm published; 3-min video; HackQuest submission complete |

---

### Phase 1 — Backend Lives On-Chain (Days 1–4)

**Goal:** Contracts deployed on 0G testnet. Backend actually starts, verifies a real payment, mints a real NFT, writes to 0G Storage. End-to-end `identity/mint` flow working with `curl`.

**Deliverables:**
- 3 contracts deployed + verified on `chainscan-galileo.0g.ai`
- Backend running locally with real contract addresses in `.env`
- `curl` flow: `POST /identity/mint` → 402 → manually send 0G → retry → NFT minted → metadata on 0G Storage → tx visible on explorer

**Tasks:**

1. **Get funded testnet wallet** (user action)
   - Create EVM wallet, save private key
   - Get 0G testnet tokens from https://faucet.0g.ai (0.1/day — need a few refills)
   - Put private key in root `.env` as `DEPLOYER_PRIVATE_KEY`

2. **Deploy contracts to 0G testnet**
   ```bash
   cd contracts
   forge script script/Deploy.s.sol:Deploy \
     --rpc-url https://evmrpc-testnet.0g.ai \
     --broadcast
   ```
   Copy 3 addresses into `.env` (`PAYMENT_CONTRACT_ADDRESS`, `REGISTRY_CONTRACT_ADDRESS`, `IDENTITY_CONTRACT_ADDRESS`).

3. **Verify contracts on explorer**
   ```bash
   forge verify-contract <ADDR> src/ZeroGentPayment.sol:ZeroGentPayment \
     --chain-id 16602 \
     --verifier custom \
     --verifier-url "https://chainscan-galileo.0g.ai/open/api" \
     --verifier-api-key "placeholder"
   ```
   Repeat for AgentRegistry, ZeroGentIdentity.

4. **Boot backend + smoke test**
   ```bash
   cd backend && npm run dev
   curl http://localhost:3000/health   # must show real chain + contract addresses
   ```

5. **Test real x402 flow for identity mint** (manual)
   - `POST /identity/mint` with no header → expect 402 with nonce + contract address
   - Send 0G via `cast send`:
     ```bash
     cast send $PAYMENT_CONTRACT_ADDRESS "pay(bytes32,string)" $NONCE "identity" \
       --value 0.1ether \
       --rpc-url https://evmrpc-testnet.0g.ai \
       --private-key $DEPLOYER_PRIVATE_KEY
     ```
   - `POST /identity/mint` with `X-Payment: {"txHash":"0x...","nonce":"0x..."}` → expect 200 + tokenId
   - Verify NFT on explorer + metadata on storagescan

6. **Fix whatever breaks** (expect 0G Storage SDK quirks, gas estimation issues, log parsing bugs)

**Exit criteria:** A public explorer URL shows our deployed contract + a minted NFT whose metadata root-hash is on 0G Storage. Screenshot this. It's your first demo asset.

---

### Phase 2 — Wallet Service on Backend + Skill.md (Days 5–7)

**Goal:** Backend has real wallet-vault routes and a working `skill.md` endpoint. Server enforces spending policies. Agents can store + retrieve metadata about their wallets (not keys).

**Deliverables:**
- `/wallet/*` endpoints on backend (metadata only — no key material ever)
- Policy enforcement in x402 middleware
- `GET /skill.md` returns the LLM-readable catalog
- `GET /pricing` returns live prices

**New files:**
- `backend/src/services/wallet.ts` — wallet metadata (address, label, policy, spend ledger)
- `backend/src/routes/wallet.ts` — endpoints below
- `backend/src/services/policy.ts` — policy check logic called by x402 middleware
- `backend/src/db.ts` — add `wallets` + `policies` + `spends` tables

**Wallet routes (server-side metadata only):**
```
POST   /wallet/register      { address, label } → registers wallet metadata
GET    /wallet/:address      → wallet info (not keys, ever)
GET    /wallet/:address/spending       → daily spend remaining
POST   /wallet/:address/policy         { per_tx_0g, daily_0g } → set limits
GET    /wallet/:address/resources      → all owned resources (reads from AgentRegistry)
```

**Policy check in x402:**
```ts
// backend/src/middleware/x402.ts — add before verifyPayment
const policy = db.prepare("SELECT * FROM policies WHERE address = ?").get(req.payerAddress);
if (policy) {
  if (amount > policy.per_tx_0g) return res.status(402).json({ error: "per_tx limit exceeded" });
  const spentToday = db.prepare("SELECT SUM(amount) FROM spends WHERE address=? AND date=?")...;
  if (spentToday + amount > policy.daily_0g) return res.status(402).json({ error: "daily limit exceeded" });
}
```

**skill.md** — Already exists at `public/skill.md`. Update with real contract addresses once deployed.

**Exit criteria:** `curl http://localhost:3000/skill.md` returns the current catalog. `curl /wallet/0xADDR/spending` returns structured spend info.

---

### Phase 3 — The CLI + SDK Package `@0gent/core` (Days 8–18) ⭐ BIGGEST PHASE

**Goal:** Single installable npm package. `npx @0gent/core setup` walks the user through creating a wallet, funding it, minting identity, and provisioning a real phone number.

**Package directory:** `/Users/admin/.pg/0GENT/packages/core/` (new top-level)

**Package structure:**
```
packages/core/
├── package.json              # name: @0gent/core, bin: 0gent, main: dist/sdk.js
├── tsconfig.json
├── tsup.config.ts            # two entrypoints: cli.ts, sdk.ts
├── README.md                 # becomes npm page
└── src/
    ├── sdk.ts                # export class ZeroGent  (library entrypoint)
    ├── cli.ts                # #!/usr/bin/env node — Commander setup
    ├── pay.ts                # x402 client: build/sign 0G payment tx, retry with header
    ├── vault.ts              # local HD wallet: create, encrypt, decrypt, sign
    ├── config.ts             # read/write ~/.0gent/config.json
    ├── storage.ts            # 0G Storage client (wrap @0gfoundation/0g-ts-sdk)
    ├── chain.ts              # ethers provider + ABIs for our 3 contracts
    ├── ui.ts                 # chalk/ora/cli-table3 formatters
    └── commands/
        ├── setup.ts          # 0gent setup           [PRIMARY]
        ├── wallet.ts         # 0gent wallet ...      [PRIMARY]
        ├── identity.ts       # 0gent identity        [PRIMARY]
        ├── phone.ts          # 0gent phone search/provision/sms/logs   [PRIMARY]
        ├── email.ts          # 0gent email create/read/send/threads    [PRIMARY]
        ├── list.ts           # 0gent list            [PRIMARY]
        ├── memory.ts         # 0gent memory ...      [PRIMARY]
        ├── skill.ts          # 0gent skill           [PRIMARY]
        ├── balance.ts        # 0gent balance         [PRIMARY]
        ├── pricing.ts        # 0gent pricing         [PRIMARY]
        ├── health.ts         # 0gent health          [PRIMARY]
        ├── doctor.ts         # 0gent doctor          [PRIMARY]
        ├── compute.ts        # 0gent compute ...     [STRETCH]
        └── domain.ts         # 0gent domain ...      [STRETCH]
```

**package.json:**
```json
{
  "name": "@0gent/core",
  "version": "0.1.0",
  "description": "Decentralized infrastructure for autonomous AI agents on 0G Chain",
  "type": "module",
  "bin": { "0gent": "./dist/cli.js" },
  "main": "./dist/sdk.js",
  "types": "./dist/sdk.d.ts",
  "exports": {
    ".": { "import": "./dist/sdk.js", "types": "./dist/sdk.d.ts" }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@0gfoundation/0g-ts-sdk": "^1.2.1",
    "bip39": "^3.1.0",
    "chalk": "^5.3.0",
    "cli-table3": "^0.6.5",
    "commander": "^12.1.0",
    "ethers": "^6.13.0",
    "inquirer": "^9.2.15",
    "ora": "^8.0.1",
    "qrcode-terminal": "^0.12.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/inquirer": "^9.0.7",
    "@types/qrcode-terminal": "^0.12.2",
    "tsup": "^8.0.0",
    "typescript": "^5.7.3"
  },
  "engines": { "node": ">=18" },
  "keywords": ["0g", "ai", "agent", "x402", "crypto", "infrastructure"],
  "license": "MIT"
}
```

**tsup.config.ts:**
```ts
import { defineConfig } from 'tsup'
export default defineConfig({
  entry: ['src/cli.ts', 'src/sdk.ts'],
  format: ['esm'],
  dts: { entry: { sdk: 'src/sdk.ts' } },
  clean: true,
  shims: true,
  target: 'node18',
})
```

---

#### 3.1 — Vault (local HD wallet) — `src/vault.ts`

Core responsibility: create/load/save an encrypted HD wallet. Sign transactions on demand.

**File format** (`~/.0gent/wallet/<id>.json`):
```json
{
  "ogent_version": 1,
  "id": "01HXYZ...",
  "label": "my-first-agent",
  "address": "0xABCD...",
  "derivation_path": "m/44'/60'/0'/0/0",
  "encrypted": {
    "iv": "hex", "salt": "hex", "ciphertext": "hex", "tag": "hex"
  },
  "created_at": "2026-04-13T10:00:00Z"
}
```

**Functions:**
```ts
export async function createWallet(passphrase: string, label?: string): Promise<WalletInfo>
export async function importMnemonic(mnemonic: string, passphrase: string, label?: string): Promise<WalletInfo>
export function listWallets(): WalletSummary[]
export function getWallet(idOrAddress: string): WalletInfo
export async function getSigner(idOrAddress: string, passphrase: string, provider: JsonRpcProvider): Promise<Wallet>
export async function exportMnemonic(idOrAddress: string, passphrase: string): Promise<string>
```

**Encryption (mirror AgentOS):**
```ts
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto'

function encrypt(plaintext: string, passphrase: string) {
  const salt = randomBytes(32)
  const key = scryptSync(passphrase, salt, 32)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  let enc = cipher.update(plaintext, 'utf8', 'hex')
  enc += cipher.final('hex')
  return { iv: iv.toString('hex'), salt: salt.toString('hex'), ciphertext: enc, tag: cipher.getAuthTag().toString('hex') }
}
// decrypt() mirrors this exactly
```

**HD derivation:**
```ts
import * as bip39 from 'bip39'
import { HDNodeWallet } from 'ethers'

const mnemonic = bip39.generateMnemonic()
const hd = HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0/0")
// hd.privateKey, hd.address
```

---

#### 3.2 — x402 Payment Client — `src/pay.ts`

**Entrypoint:**
```ts
export async function paidRequest(opts: {
  api: string
  method: string
  path: string
  body?: object
  signer: ethers.Wallet        // from vault.getSigner
  paymentContract: string      // from config
  rpcUrl: string
}): Promise<{ data: any; txHash: string }>
```

**Flow:**
1. `fetch(api+path, { method, body })` → if not 402, return data
2. Parse 402: `{ nonce, amountHuman, payment.contract, payment.value }`
3. Call on-chain: `paymentContract.pay(nonce, resourceType, { value: amountWei })`
4. Wait 1 confirmation
5. Retry original request with header:
   ```
   X-Payment: {"txHash":"0x...","nonce":"0x..."}
   ```
6. If still 402 after retry → throw descriptive error (quote reason from body)

**Balance pre-check** (avoid paying gas to revert):
```ts
const balance = await signer.provider.getBalance(signer.address)
if (balance < totalNeeded) throw new Error(`Insufficient 0G balance: need ${toEth(totalNeeded)}, have ${toEth(balance)}`)
```

---

#### 3.3 — SDK Class — `src/sdk.ts`

Mirror of AgentOS structure, adapted to 0G.

```ts
import { ethers } from 'ethers'
import { paidRequest } from './pay.js'

export interface ZeroGentOptions {
  api?: string                 // default https://api.0gent.xyz
  rpcUrl?: string              // default mainnet or testnet based on chainId
  chainId?: number             // default 16602 (testnet) during hackathon
  privateKey?: string          // direct private key (agents)
  walletId?: string            // use local vault
  passphrase?: string          // vault unlock (or OGENT_WALLET_PASSPHRASE env)
  autoPay?: boolean            // default true
}

export class ZeroGent {
  private api: string
  private signer: ethers.Wallet
  private paymentContract: string
  private autoPay: boolean

  constructor(opts: ZeroGentOptions) { ... }

  // ── Info ──
  async health(): Promise<HealthData>
  async pricing(): Promise<PricingData>
  async skill(): Promise<string>                   // GET /skill.md raw text

  // ── Identity ──
  async identityMint(name?: string): Promise<IdentityResult>
  async identityGet(address?: string): Promise<IdentityData>

  // ── Phone / SMS ── [PRIMARY]
  async phoneSearch(country: string, limit?: number): Promise<AvailableNumber[]>
  async phoneProvision(country: string, areaCode?: string): Promise<PhoneResult>
  async phoneSms(phoneId: string, to: string, body: string): Promise<SmsResult>
  async phoneLogs(phoneId: string): Promise<SmsLog[]>         // inbound + outbound
  // phoneCall() — stretch; basic outbound TTS only if time permits

  // ── Email ── [PRIMARY] (Cloudflare Email Routing, plaintext — encryption deferred)
  async emailCreate(name: string, walletAddress: string): Promise<EmailResult>
  async emailRead(inboxId: string): Promise<Email[]>
  async emailSend(inboxId: string, to: string, subject: string, body: string): Promise<SendResult>
  async emailThreads(inboxId: string): Promise<Thread[]>

  // ── Compute ── [STRETCH — Hetzner, skip if time tight]
  // async computePlans(): Promise<Plan[]>
  // async computeProvision(name: string, type?: string): Promise<ComputeResult>
  // async computeStatus(id: string): Promise<ComputeStatus>
  // async computeDelete(id: string): Promise<void>

  // ── Domain ── [STRETCH — Namecheap, skip if time tight]
  // async domainCheck(domain: string): Promise<{ available: boolean }>
  // async domainRegister(domain: string): Promise<DomainResult>
  // async domainDns(domain: string): Promise<DnsRecord[]>

  // ── Wallet ──
  async walletAddress(): string                    // local
  async walletBalance(): Promise<{ balance0G: string }>
  async walletResources(): Promise<Resource[]>
  async walletSetPolicy(policy: { per_tx_0g?: number; daily_0g?: number }): Promise<void>
  async walletSpending(): Promise<{ spentToday0G: string; remaining0G: string }>

  // ── Memory (0G Storage) ──
  memory = {
    get: async (key: string): Promise<any>,
    set: async (key: string, value: any): Promise<{ rootHash: string }>,
    list: async (): Promise<MemoryKey[]>,
    delete: async (key: string): Promise<void>,
  }

  // ── Resources ──
  async listResources(): Promise<Resource[]>
}

export default ZeroGent
```

**Key implementation detail:** every paid method just calls a thin wrapper:
```ts
private async paid<T>(method: string, path: string, body?: object): Promise<T> {
  if (!this.autoPay) {
    const res = await fetch(this.api + path, { method, body: JSON.stringify(body) })
    return res.json()
  }
  const { data } = await paidRequest({
    api: this.api, method, path, body,
    signer: this.signer,
    paymentContract: this.paymentContract,
    rpcUrl: this.signer.provider!.url,
  })
  return data
}
```

---

#### 3.4 — CLI — `src/cli.ts` + `src/commands/*.ts`

Entry point:
```ts
#!/usr/bin/env node
import { Command } from 'commander'
import { setupCmd } from './commands/setup.js'
// ... etc

const program = new Command()
  .name('0gent')
  .description('0GENT — Decentralized infrastructure for AI agents on 0G Chain')
  .version('0.1.0')

program.command('setup').description('Interactive first-time setup').action(setupCmd)

const wallet = program.command('wallet').description('Manage agent wallets')
wallet.command('create').option('-n, --name <name>').action(walletCreate)
wallet.command('show').action(walletShow)
wallet.command('fund').action(walletFund)
wallet.command('limits').option('-d, --daily <amount>').action(walletLimits)
wallet.command('list').action(walletList)
wallet.command('export').argument('<id>').action(walletExport)

const identity = program.command('identity').description('Manage Agent Identity NFT')
identity.command('mint').option('--name <name>').action(identityMint)
identity.command('show').action(identityShow)

const provision = program.command('provision').description('Provision a resource')
provision.command('phone').option('-c, --country <c>').option('-a, --area <code>').action(provisionPhone)
provision.command('email').option('-n, --name <localPart>').action(provisionEmail)
provision.command('compute').option('-n, --name <n>').option('-t, --type <t>').action(provisionCompute)
provision.command('domain').argument('<name>').action(provisionDomain)

program.command('list').description('List owned resources').action(listResources)

const memory = program.command('memory')
memory.command('get').argument('<key>').action(memoryGet)
memory.command('set').argument('<key>').argument('<value>').action(memorySet)
memory.command('list').action(memoryList)
memory.command('delete').argument('<key>').action(memoryDelete)

program.command('skill').description('Print skill.md catalog').action(skillCmd)
program.command('balance').description('Show wallet balance').action(balanceCmd)
program.command('pricing').description('Show service prices').action(pricingCmd)
program.command('health').description('API and chain status').action(healthCmd)
program.command('doctor').description('Diagnose setup').action(doctorCmd)

program.parse()
```

**Key command examples:**

**`setup.ts`:**
```ts
export async function setupCmd() {
  console.log(chalk.bold.magenta('\n  0GENT Setup\n'))

  const hasWallet = await inquirer.prompt([{ type: 'confirm', name: 'has', message: 'Do you have an existing wallet?', default: false }])

  let mnemonic: string
  if (hasWallet.has) {
    const { input } = await inquirer.prompt([{ type: 'input', name: 'input', message: 'Enter mnemonic (12 words):' }])
    if (!bip39.validateMnemonic(input)) throw new Error('Invalid mnemonic')
    mnemonic = input
  } else {
    mnemonic = bip39.generateMnemonic()
    console.log(chalk.yellow('\n  ⚠  Save this mnemonic somewhere safe. It will NEVER be shown again.\n'))
    console.log(chalk.cyan('  ' + mnemonic + '\n'))
    await inquirer.prompt([{ type: 'confirm', name: 'saved', message: 'I saved it securely', default: false }])
  }

  const { passphrase } = await inquirer.prompt([{ type: 'password', name: 'passphrase', message: 'Passphrase to encrypt wallet (min 8 chars):', mask: '*' }])
  const { apiEndpoint } = await inquirer.prompt([{ type: 'input', name: 'apiEndpoint', message: 'API endpoint:', default: 'https://api.0gent.xyz' }])

  const wallet = await vault.importMnemonic(mnemonic, passphrase, 'default')
  config.set({ defaultWalletId: wallet.id, apiEndpoint, chainId: 16602 })

  console.log(chalk.green('\n  ✓ Wallet created'))
  console.log(`  Address: ${chalk.cyan(wallet.address)}\n`)
  console.log('  Next: fund your wallet with 0G tokens, then run: ' + chalk.bold('0gent identity mint'))
}
```

**`provision.ts` (phone):**
```ts
export async function provisionPhone(opts: { country?: string; area?: string }) {
  const spinner = ora('Loading wallet').start()
  const z = await getZeroGent()  // reads config, prompts passphrase if needed
  spinner.text = 'Searching available numbers'
  const numbers = await z.phoneSearch(opts.country || 'US')

  const { chosen } = await inquirer.prompt([{
    type: 'list', name: 'chosen', message: 'Pick a number',
    choices: numbers.map(n => ({ name: `${n.phoneNumber}  ${n.region}`, value: n.phoneNumber }))
  }])

  const pricing = await z.pricing()
  const { confirm } = await inquirer.prompt([{
    type: 'confirm', name: 'confirm',
    message: `Provision ${chosen} for ${chalk.yellow(pricing.phone)} 0G?`, default: true
  }])
  if (!confirm) return

  spinner.start('Requesting phone number...')
  const result = await z.phoneProvision(opts.country || 'US', opts.area)
  spinner.stop()

  console.log(chalk.green('\n  ✓ Phone number provisioned\n'))
  console.log(`  Number:      ${chalk.cyan(result.phoneNumber)}`)
  console.log(`  Resource ID: ${chalk.dim(result.resourceId)}`)
  console.log(`  Expires:     ${new Date(result.expiresAt).toLocaleDateString()}`)
  console.log(`  Chain TX:    https://chainscan-galileo.0g.ai/tx/${result.txHash}\n`)
}
```

**`list.ts`:**
```ts
export async function listResources() {
  const z = await getZeroGent()
  const [identity, resources, balance] = await Promise.all([
    z.identityGet().catch(() => null),
    z.listResources(),
    z.walletBalance(),
  ])

  console.log()
  if (identity) {
    console.log(`  ${chalk.bold('Agent Identity:')} Token #${identity.tokenId}  |  ` +
      `Wallet: ${chalk.cyan(identity.agent.slice(0, 10) + '...')}  |  ` +
      `Balance: ${chalk.yellow(balance.balance0G)} 0G\n`)
  }

  const table = new Table({
    head: [chalk.dim('Type'), chalk.dim('Resource'), chalk.dim('Status'), chalk.dim('Expires')],
    style: { border: ['gray'] },
  })
  for (const r of resources) {
    table.push([
      emojiFor(r.type),
      chalk.cyan(r.providerRef),
      r.active ? chalk.green('✓ Active') : chalk.red('Inactive'),
      new Date(r.expiresAt * 1000).toLocaleDateString(),
    ])
  }
  console.log(table.toString())
  console.log(`\n  Total: ${resources.length} resources\n`)
}
```

---

#### 3.5 — Config — `src/config.ts`

```ts
import { homedir } from 'os'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

const CONFIG_DIR = process.env.OGENT_CONFIG_DIR || join(homedir(), '.0gent')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

export interface Config {
  defaultWalletId?: string
  apiEndpoint: string
  chainId: number
  rpcUrl?: string
  paymentContract?: string
  registryContract?: string
  identityContract?: string
}

export function ensureDir() {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true })
  if (!existsSync(join(CONFIG_DIR, 'wallets'))) mkdirSync(join(CONFIG_DIR, 'wallets'), { recursive: true })
}

export function load(): Config {
  ensureDir()
  if (!existsSync(CONFIG_FILE)) {
    return { apiEndpoint: 'http://localhost:3000', chainId: 16602 }
  }
  return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
}

export function save(cfg: Partial<Config>) {
  ensureDir()
  const current = load()
  writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...cfg }, null, 2))
}
```

---

#### 3.6 — Testing the CLI locally (before publishing)

```bash
cd packages/core
npm install
npm run build
npm link                         # registers 0gent globally pointing to this folder
0gent --version                  # → 0.1.0
0gent setup                      # walks the flow, writes ~/.0gent/config.json
0gent balance                    # reads balance from 0G testnet
0gent identity mint              # runs real x402 flow end-to-end
0gent provision phone            # if Telnyx configured, provisions real number
0gent list                       # shows it in a table
```

Fix bugs until every command works against **localhost backend + testnet contracts**.

**Exit criteria:** Full CLI demo works end-to-end on testnet. Video-ready.

---

### Phase 4 — Live Hosted API + Real Web2 Keys (Days 19–25)

**Goal:** `api.0gent.xyz` is live on the internet. CLI points at it by default (not localhost). At least **one real Web2 integration** actually works (Telnyx phone — the demo star).

**Deliverables:**
- Backend deployed to Railway/Fly/Render with HTTPS
- Domain `0gent.xyz` configured
- Telnyx API key set — **real phone number rings in demo**
- Cloudflare email + Hetzner compute configured if time permits
- Contracts redeployed to 0G **mainnet** (not testnet) for final demo — or stay on testnet and tell judges why

**Tasks:**

1. **Pick a host** — Railway (easiest), Fly.io (cheapest), or Render. I recommend **Railway** for speed.

2. **Env setup on host:**
   ```
   ZG_RPC_URL=https://evmrpc-testnet.0g.ai   # or mainnet
   ZG_CHAIN_ID=16602
   DEPLOYER_PRIVATE_KEY=<funded wallet>
   PAYMENT_CONTRACT_ADDRESS=0x...
   REGISTRY_CONTRACT_ADDRESS=0x...
   IDENTITY_CONTRACT_ADDRESS=0x...
   ZG_STORAGE_INDEXER_URL=https://indexer-storage-turbo.0g.ai
   TELNYX_API_KEY=<real key>
   TELNYX_MESSAGING_PROFILE_ID=<id>
   ```

3. **Telnyx signup** (user action — $20 deposit)
   - Create account → Mission Control
   - Fund $20 USD
   - Create API key → paste into Railway env
   - Create Messaging Profile → paste ID

4. **Domain setup**
   - Point `api.0gent.xyz` to the Railway app (CNAME)
   - Point `0gent.xyz` at the frontend (deploy frontend to Vercel)
   - Test: `curl https://api.0gent.xyz/health`

5. **Update CLI default**
   ```ts
   // packages/core/src/config.ts
   apiEndpoint: 'https://api.0gent.xyz'
   ```
   Rebuild and re-test.

6. **Actually provision a real phone number** via CLI pointed at hosted API.
   - Record the provisioning in a video.
   - Have it text you — record that SMS arriving on your phone.

7. **Wire frontend terminal to real API** (replace simulated data with `fetch` calls)

**Exit criteria:** Run `0gent provision phone` from anywhere on the internet → get a real phone number that rings when you dial it. Record it.

---

### Phase 5 — Publish + Demo Video + Submission (Days 26–33)

**Goal:** `@0gent/core` published to npm. 3-minute demo video recorded. Hackathon submission complete.

**Tasks:**

1. **Create npm org** (`@0gent`) — log in, claim scope:
   ```bash
   npm login
   npm org create 0gent
   ```
   (If `@0gent` is taken, use `@zerogent` — fallback already in plan.)

2. **Dry-run publish:**
   ```bash
   cd packages/core
   npm publish --dry-run --access public
   # check files list — should only include dist/ + README.md + package.json
   ```

3. **Publish for real:**
   ```bash
   npm publish --access public
   # verify at https://www.npmjs.com/package/@0gent/core
   ```

4. **Test fresh install on clean machine:**
   ```bash
   npm i -g @0gent/core
   0gent --version
   0gent setup
   # full flow
   ```

5. **README polish** — The README at `packages/core/README.md` is the npm page. Make it beautiful:
   - Hero image/badge
   - 60-second quickstart
   - All commands with example output (real terminal screenshots)
   - SDK example
   - Link to 0gent.xyz, github, 0G docs

6. **Demo video (3 min, YouTube/Loom):**
   - 0:00–0:15 — Title card + problem ("AI agents can't get phone numbers")
   - 0:15–0:45 — `npm i -g @0gent/core && 0gent setup` + wallet create + identity mint (show chain explorer)
   - 0:45–1:30 — `0gent provision phone` + live SMS arriving on real phone
   - 1:30–2:00 — `0gent provision email/compute/domain` (compressed)
   - 2:00–2:30 — `0gent list` + show all resources on-chain via explorer
   - 2:30–2:50 — Architecture diagram — highlight 4 × 0G components (Chain, Storage, Agent ID NFT, x402)
   - 2:50–3:00 — Call to action + GitHub link

7. **X/Twitter post:**
   ```
   Introducing 0GENT — decentralized infrastructure for AI agents on @0G_labs

   Give your agent a phone, email, VPS, domain, and self-custodial wallet.
   Paid per-call in 0G tokens via x402. No API keys. No signup.
   Wallet = identity.

   npm i -g @0gent/core
   0gent setup

   [video]
   [github]

   #0GHackathon #BuildOn0G @0g_CN @0g_Eco @HackQuest_
   ```

8. **HackQuest submission** — before May 16 23:59 UTC+8:
   - Project name: 0GENT
   - Description: ≤30 words
   - GitHub URL (push everything first)
   - Mainnet contract addresses + 0G Explorer verification links
   - Demo video URL
   - README architecture diagram
   - Required hashtags / tags on X post

**Exit criteria:** Submission accepted. `@0gent/core` is installable worldwide. Demo video public. At least one judge can run `npm i -g @0gent/core && 0gent setup` and successfully mint an Agent ID NFT on 0G Chain.

---

## 4. Budget

| Item | Cost |
|------|------|
| 0G testnet gas | $0 (faucet) |
| 0G mainnet gas | ~$5 (deploy 3 contracts + some transactions) |
| Telnyx (1 phone + few SMS + 1 call) | $20 minimum deposit, ~$2 actual |
| Domain `0gent.xyz` | ~$10/year |
| Railway hosting | $5/month (free tier may suffice) |
| Hetzner CX22 VPS (demo) | $0.10 if deleted after demo |
| Cloudflare email | $0 (free) |
| npm publish | $0 |
| **Total (demo)** | **~$35–40** |

---

## 5. Risks & Mitigations

| Risk | Probability | Mitigation |
|------|-------------|------------|
| 0G Storage SDK flaky on writes | Medium | Fallback: store metadata JSON on-chain as bytes if upload fails |
| Gas estimation fails on 0G Chain | Low | Use static gas limit in contract calls (200k) |
| 0G mainnet too unstable to demo | Medium | Stay on testnet (Galileo) for final demo; note clearly in submission |
| Telnyx rejects our number order | Low | Use trial numbers; have backup Twilio account ready (~$15 credit) |
| `@0gent` scope taken on npm | Low | Use `@zerogent` or `zerogent-core` |
| Host (Railway) rate-limits us | Low | Railway free tier is generous; fallback to Fly.io |
| Contract address mismatch between CLI + backend | High | Hard-code in both `.env` AND `config.ts`; add `0gent doctor` to compare |
| Agents don't pay enough gas on `pay()` | Medium | Build payment with explicit `gasLimit: 100000` override |
| Passphrase loss | High | Show mnemonic at setup, force user to confirm save; export command |

---

## 6. File Tree After Completion

```
0gent/
├── contracts/                       # ✅ exists
├── backend/                         # ✅ exists (needs Phase 2 additions)
│   └── src/routes/wallet.ts         # NEW in Phase 2
├── frontend/                        # ✅ exists (live terminal wiring in Phase 4)
├── packages/
│   └── core/                        # NEW — the npm package
│       ├── src/
│       │   ├── sdk.ts
│       │   ├── cli.ts
│       │   ├── pay.ts
│       │   ├── vault.ts
│       │   ├── config.ts
│       │   ├── storage.ts
│       │   ├── chain.ts
│       │   ├── ui.ts
│       │   └── commands/*.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       └── README.md
├── public/
│   └── skill.md                     # ✅ exists
├── docs/
│   └── superpowers/plans/           # ✅ this file
├── README.md                        # ✅ root README
├── .env.example
└── .gitignore
```

---

## 7. What I Will NOT Do (Scope Guard)

**Hard-cut for hackathon (zero work on these):**
- ❌ Twitter / X automation (post-hackathon)
- ❌ Voice call control (TTS, DTMF, recording, gather) — beyond basic outbound, if at all
- ❌ E2E email encryption (plaintext Cloudflare routing for v1)
- ❌ Managed wallet approval flows / passkey / WebAuthn
- ❌ On-chain spending limits in contracts (enforce server-side only)
- ❌ Multi-chain wallet (EVM/0G only — no Solana path)
- ❌ Tool marketplace / OpenClaw integration
- ❌ Server-side wallet vault (CLI-local only)
- ❌ Dashboard auth / multi-user accounts
- ❌ Docker deployment (Railway only)

**Stretch (touch only if phone + SMS + email ship ahead of schedule):**
- ⚠ Compute (Hetzner VPS) — save $5/mo infra cost until needed
- ⚠ Domain registration (Namecheap) — $50 API balance requirement
- ⚠ Inbound SMS webhooks (outbound-only is fine for demo)
- ⚠ Email thread listing (`emailThreads`) — single inbox read is enough

---

## 8. Daily Execution Cadence

Each day, at the start:
1. Check status against this plan
2. Pick next unchecked task
3. Ship that task today — no parallel work
4. At end of day: run `0gent doctor` + smoke-test whatever changed

---

## 9. Pick-Your-Starting-Point

I recommend **starting Phase 1, Task 1** today:

**Do this now:** Generate a fresh 0G Chain wallet, fund it at https://faucet.0g.ai, and paste the private key into your `.env` as `DEPLOYER_PRIVATE_KEY`.

Once that's done, I can run the Foundry deploy script and we'll have real contract addresses on 0G testnet within 30 minutes. Everything else in this plan unlocks from that one action.

Ready to execute?
