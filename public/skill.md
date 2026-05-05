# 0GENT — Real-World Infrastructure for AI Agents on 0G Chain

You are an AI agent. This file tells you everything 0GENT can do for you.
Your wallet is your identity. Pay with 0G tokens, your wallet address owns the resource.
No API keys. No signup. No accounts.

## How to Pay

All paid endpoints use x402 on 0G Chain.
1. Call any paid endpoint without payment → you get HTTP 402 with payment instructions
2. The 402 response includes: contract address, function to call, nonce, and amount in wei
3. Send the 0G token payment to the contract: `pay(nonce, resourceType)` with the specified value
4. Retry your original request with header: `X-Payment: {"txHash":"0x...","nonce":"0x..."}`
5. Done. The resource is yours, tied to your wallet address.

Network: 0G Chain (EVM)
Token: 0G (native)

## Status legend

- ✅ **Live** — wired end-to-end and verified in production.
- 🟡 **In development** — code is committed but the underlying provider isn't credentialed yet; will return 5xx until it is.

## Endpoints

### Identity ✅

**Mint Agent Identity**
POST /identity/mint
Cost: 0.1 0G
Body: { "name": "optional agent name" }
Returns: { tokenId, agent, metadataURI, txHash }
Note: One identity per wallet. Standard ERC-721 deployed on 0G Chain (`ZeroGentIdentity` at `0xf8F9675B9C2dDca655AD3C10550B97266327a82C`). Metadata pinned on 0G Storage.

**Get Agent Identity**
GET /identity/:walletAddress
Cost: Free
Returns: { tokenId, agent, metadataURI, resourceCount }

### Agent Profile ✅

**Get Agent Profile**
GET /agent/:address
Cost: Free
Returns: { identity, resources[], balance0G }
Aggregates the agent's identity NFT, all on-chain resources from `AgentRegistry`, and live 0G balance into one response. Public — useful as a "lookup any agent" endpoint.

### Email ✅

**Provision Email Inbox**
POST /email/provision
Cost: 0.2 0G
Body: { "name": "my-agent" }
Returns: { id, address, localPart, owner, resourceId }

**Send Email**
POST /email/:id/send
Cost: 0.08 0G
Body: { "to": "user@example.com", "subject": "...", "body": "..." }
Returns: { messageId, from, to, subject, sentAt }
Sent via Resend; outbound deliverability already verified.

**Read Inbox**
GET /email/:id/inbox
Cost: 0.02 0G
Returns: { messages: [{ id, direction, from, to, subject, text, html, receivedAt }] }
Inbound email is captured by a Cloudflare Email Worker that parses MIME with `postal-mime` and posts to our backend webhook.

**List Threads**
GET /email/:id/threads
Cost: 0.02 0G
Returns: { threads: [{ subject, count, lastReceivedAt }] }

### Compute (AI Inference) ✅

**Note:** "Compute" on 0GENT means **paid LLM inference via the 0G Compute Network**, not VPS provisioning. The 0G Compute Network is a decentralized serving layer where providers host models behind a broker; our backend acts as the operator (pays providers from a pre-funded ledger), and agents reimburse us per-call via x402. Agents do not need their own compute ledger.

**List Inference Providers**
GET /compute/providers
Cost: Free
Returns: { providers: [{ provider, model, serviceType, url }], count }
Live discovery of upstream inference providers on the 0G Compute Network.

**Inference Status**
GET /compute/status
Cost: Free
Returns: { operator, providersAvailable, sampleProviders[], ledger: { exists, totalBalance, locked, available }, ready }
`ready: true` means our operator ledger is funded and inference calls will succeed.

**Run Inference**
POST /compute/infer
Cost: 0.05 0G
Body: { "prompt": "...", "model": "<optional>", "maxTokens": 500, "system": "<optional system prompt>" }
Returns: { response, model, provider, usage: { promptTokens, completionTokens, totalTokens } }
Hits an OpenAI-compatible `/chat/completions` endpoint at the chosen 0G Compute provider with broker-signed headers, returns the completion to the agent.

### Compute (VPS) 🟡

**Provision VPS Instance**
POST /compute/provision
Cost: 1.0 0G
Body: { "name": "my-vps", "type": "cx22" }
Returns: { id, name, serverType, status, ipv4, resourceId }
Hardened Linux VPS via Hetzner Cloud (cloud-init firewall + Node.js 22). Requires `HCLOUD_TOKEN` on the operator side; not yet credentialed.

**Get Server Status**
GET /compute/:id/status
Cost: Free
Returns: { id, name, status, ipv4 }

**Terminate Server**
DELETE /compute/:id
Cost: Free

### Phone & SMS ✅

Live end-to-end on Telnyx (verified account, worldwide coverage, attached messaging profile). Twilio code path also wired as a fallback — set `PHONE_PROVIDER=twilio` to switch. Real numbers are owned by the agent's wallet, recorded on `AgentRegistry`, leased for 30 days at a time.

**Provider Status**
GET /phone/status
Cost: Free
Returns: { provider: "telnyx" | "twilio", ready, capabilities: { search, provision, sms } }

**Search Available Numbers**
GET /phone/search?country=US&areaCode=415
Cost: Free
Returns: { numbers: [{ phoneNumber, region, type }], country: { code, name, curated }, provider }
Live inventory. Aliases like `country=UK` resolve to GB; full names like `country=United Kingdom` also work; any 2-letter ISO code is passed through to the upstream provider (170+ countries on Telnyx).

**List Curated Countries**
GET /phone/countries
Cost: Free
Returns: { countries: [{ code, name, region, popular }], count, note }
50 curated picks with names + region grouping. Twilio/Telnyx both serve more than these — list is a hint, not a hard limit.

**Provision Phone Number**
POST /phone/provision
Cost: 3.0 0G
Body: { "country": "US", "areaCode": "415" }            ← any-available mode
   or  { "phoneNumber": "+18164961100" }                ← exact-number mode
Returns: { id, phoneNumber, country, owner, resourceId, expiresAt }
Pre-flight validates E.164 BEFORE x402 charges, so typos cost nothing. Country mode rotates through 5 candidates if the upstream returns inventory churn (Telnyx 10027). Number is owned by your wallet for 30 days.

**Send SMS**
POST /phone/:id/sms
Cost: 0.01 0G
Body: { "to": "+15551234567", "body": "Hello from 0GENT" }
Returns: { id, from, to, body, timestamp }
Pre-flight catches To==From, missing fields, and malformed E.164 BEFORE x402 charges. Telnyx-specific errors (caller-ID restrictions, region locks) translate to actionable messages instead of raw upstream JSON.

**SMS Logs**
GET /phone/:id/logs?owner=0xYOUR_WALLET
Cost: Free
Returns: { logs: [{ direction, from, to, body, timestamp }] }

### Domain 🟡

**Check Domain Availability**
GET /domain/check?domain=myagent.dev
Cost: Free

**Register Domain**
POST /domain/register
Cost: 2.0 0G
Body: { "domain": "myagent.dev" }
Returns: { id, domain, owner, status, resourceId, expiresAt }

Namecheap integration; awaiting `NAMECHEAP_API_KEY`.

### Memory (0G Storage) ✅

**Write Memory**
POST /memory/:walletAddress
Cost: Free
Body: { "key": "preferences", "value": { "language": "en", "tone": "professional" } }
Returns: { agent, key, rootHash }

**Read Memory**
GET /memory/:walletAddress?key=preferences
Cost: Free
Returns: { agent, key, value, rootHash }

**List All Memory Keys**
GET /memory/:walletAddress
Cost: Free
Returns: { agent, keys: [{ key, rootHash, updatedAt }] }

**Delete Memory Key**
DELETE /memory/:walletAddress/key/:key
Cost: Free

### Wallet ✅

**Generate Wallet**
POST /wallet/create
Cost: Free
Body: { "name": "optional label" }
Returns: { name, address, mnemonic, privateKey, createdAt }
Server-side BIP-39 generation. Server forgets the mnemonic immediately after the response — non-custodial.

**Get Balance**
GET /wallet/:address/balance
Cost: Free
Returns: { address, balance0G, balanceWei, blockNumber }
Live read from 0G Chain RPC.

### System ✅

**Health Check**
GET /health
Cost: Free
Returns: { service, version, chain, contracts, timestamp }

**Live Pricing**
GET /pricing
Cost: Free
Returns: { currency, network, services: { identity, email, compute, ... } }
Authoritative pricing source — always pull live, never hardcode.

**This Skill File**
GET /skill.md
Cost: Free
