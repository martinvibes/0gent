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

## Endpoints

### Identity

**Mint Agent Identity**
POST /identity/mint
Cost: 0.1 0G
Body: { "name": "optional agent name" }
Returns: { tokenId, agent, metadataURI, txHash }
Note: One identity per wallet. Your NFT is your permanent on-chain ID.

**Get Agent Identity**
GET /identity/:walletAddress
Cost: Free
Returns: { tokenId, agent, metadataURI, resourceCount }

### Phone

**Search Available Numbers**
GET /phone/search?country=US&areaCode=415
Cost: Free
Returns: { numbers: [{ phoneNumber, region, type }] }

**Provision Phone Number**
POST /phone/provision
Cost: 0.5 0G
Body: { "country": "US", "areaCode": "415" }
Returns: { id, phoneNumber, country, owner, resourceId, expiresAt }

**Send SMS**
POST /phone/:id/sms
Cost: 0.01 0G
Body: { "to": "+15551234567", "body": "Hello from 0GENT" }
Returns: { id, from, to, body, timestamp }

**Get SMS Logs**
GET /phone/:id/logs?owner=0xYOUR_WALLET
Cost: Free
Returns: { logs: [{ direction, from, to, body, timestamp }] }

### Email

**Provision Email Inbox**
POST /email/provision
Cost: 0.2 0G
Body: { "name": "my-agent" }
Returns: { id, address, localPart, owner, resourceId }

### Compute

**Provision VPS Instance**
POST /compute/provision
Cost: 1.0 0G
Body: { "name": "my-vps", "type": "cx22" }
Returns: { id, name, serverType, status, ipv4, resourceId }

**Get Server Status**
GET /compute/:id/status
Cost: Free
Returns: { id, name, status, ipv4 }

**Terminate Server**
DELETE /compute/:id
Cost: Free

### Domain

**Check Domain Availability**
GET /domain/check?domain=myagent.dev
Cost: Free
Returns: { available, domain }

**Register Domain**
POST /domain/register
Cost: 2.0 0G
Body: { "domain": "myagent.dev" }
Returns: { id, domain, owner, status, resourceId, expiresAt }

### Memory (0G Storage)

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

### System

**Health Check**
GET /health
Cost: Free

**This Skill File**
GET /skill.md
Cost: Free
