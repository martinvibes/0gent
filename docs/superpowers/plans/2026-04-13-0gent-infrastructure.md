# 0GENT — Decentralized Agent Infrastructure on 0G

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a decentralized infrastructure provisioning layer that gives AI agents real-world capabilities (phone, email, compute, domains) with on-chain identity and payments, all native to 0G Chain.

**Architecture:** Express.js backend receives agent HTTP requests, enforces x402 payment via 0G Chain native token transfers (verified with ethers.js), provisions real-world resources via Web2 APIs (Telnyx, Cloudflare, Hetzner, Namecheap), registers ownership on-chain via Solidity contracts, and persists all agent state to 0G Storage. Agent identity is an ERC-721 NFT on 0G Chain. The `skill.md` file lets any LLM discover and use the system.

**Tech Stack:** TypeScript, Node.js 22, Express.js, Hardhat, Solidity 0.8.24, ethers.js v6, `@0gfoundation/0g-ts-sdk`, better-sqlite3, Telnyx SDK, Hetzner Cloud API, Namecheap API, Cloudflare API

---

## Critical Reality Checks (from research)

These findings MUST inform every implementation decision:

1. **USDC does NOT exist on 0G mainnet.** All payments will use the native **0G token** (18 decimals), not USDC. The x402 payload `asset` field will reference `0x0000000000000000000000000000000000000000` (native token) or a wrapped 0G token if one exists. Pricing will be denominated in 0G tokens.
2. **ERC-7857 (iNFT) is NOT in the official 0G docs.** Agent identity will use a standard **ERC-721** with metadata stored on 0G Storage. This is still strong integration — the NFT mints on 0G Chain and metadata lives on 0G Storage.
3. **0G Chain is EVM `cancun`-compatible.** All Solidity contracts compile with `evmVersion: "cancun"`. OpenZeppelin works. Standard ERC patterns work.
4. **0G Mainnet**: Chain ID `16661`, RPC `https://evmrpc.0g.ai`, Explorer `https://chainscan.0g.ai`
5. **0G Testnet (Galileo)**: Chain ID `16602`, RPC `https://evmrpc-testnet.0g.ai`, Explorer `https://chainscan-galileo.0g.ai`, Faucet `https://faucet.0g.ai`
6. **0G Storage SDK**: `@0gfoundation/0g-ts-sdk` v1.2.1, uses `ZgFile`, `Indexer`, `Batcher`, `KvClient`
7. **0G Storage Indexer (mainnet)**: `https://indexer-storage-turbo.0g.ai`
8. **0G Storage Contracts (mainnet)**: Flow `0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526`
9. **RIP-7212 (P-256 precompile)** is NOT confirmed on 0G Chain. The AgentWallet passkey feature is a **stretch goal** — skip it for MVP. Use simple EOA ownership.
10. **Development uses testnet first**, deploy to mainnet only for final submission.

---

## File Structure

```
0gent/
├── contracts/                          # Solidity smart contracts
│   ├── src/
│   │   ├── ZeroGentPayment.sol         # x402 payment verification + treasury
│   │   ├── AgentRegistry.sol           # On-chain resource registry
│   │   └── ZeroGentIdentity.sol        # ERC-721 agent identity NFT
│   ├── test/
│   │   ├── ZeroGentPayment.t.sol       # Payment contract tests
│   │   ├── AgentRegistry.t.sol         # Registry contract tests
│   │   └── ZeroGentIdentity.t.sol      # Identity NFT tests
│   ├── script/
│   │   └── Deploy.s.sol                # Deployment script
│   ├── foundry.toml                    # Foundry config targeting 0G Chain
│   └── remappings.txt                  # OpenZeppelin remappings
├── backend/
│   ├── src/
│   │   ├── index.ts                    # Express app entry, route mounting, server start
│   │   ├── config.ts                   # Environment variable loader
│   │   ├── db.ts                       # SQLite schema + initialization
│   │   ├── middleware/
│   │   │   └── x402.ts                 # x402 payment verification middleware
│   │   ├── services/
│   │   │   ├── chain.ts                # 0G Chain ethers.js provider + contract wrappers
│   │   │   ├── storage.ts              # 0G Storage SDK wrapper (KV + file)
│   │   │   ├── phone.ts               # Telnyx phone/SMS provisioning
│   │   │   ├── email.ts               # Cloudflare email provisioning
│   │   │   ├── compute.ts             # Hetzner VPS provisioning
│   │   │   └── domain.ts              # Namecheap domain registration
│   │   └── routes/
│   │       ├── identity.ts             # /identity — mint + query agent NFTs
│   │       ├── phone.ts               # /phone — provision, SMS, call, logs
│   │       ├── email.ts               # /email — provision, send, inbox
│   │       ├── compute.ts             # /compute — provision, status, execute
│   │       ├── domain.ts              # /domain — register, DNS, status
│   │       ├── memory.ts              # /memory — 0G Storage KV read/write
│   │       └── health.ts              # /health + /skill.md
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   └── index.html                      # Minimal dashboard (static HTML)
├── public/
│   └── skill.md                        # LLM-readable endpoint catalog
├── .env.example                        # All required env vars documented
├── README.md                           # Architecture, setup, 0G integration docs
└── docs/
    └── architecture.png                # System diagram for README
```

**Responsibilities:**
- `contracts/` — All on-chain logic. Three focused contracts: payment treasury, resource registry, identity NFT. Foundry for compilation, testing, deployment, and verification on 0G Explorer.
- `backend/src/middleware/x402.ts` — Single middleware: intercepts requests, checks for payment header, verifies native 0G token transfer on-chain, attaches payer info to request.
- `backend/src/services/chain.ts` — Ethers.js provider for 0G Chain, typed contract instances for all three contracts.
- `backend/src/services/storage.ts` — 0G Storage SDK wrapper: write/read agent memory KV pairs, upload/download metadata blobs.
- `backend/src/services/{phone,email,compute,domain}.ts` — Each wraps one Web2 API. Copied from AgentOS with Solana references removed.
- `backend/src/routes/` — Express route handlers. Each file handles one resource type. Applies x402 middleware for paid endpoints.
- `backend/src/db.ts` — SQLite local cache. Mirrors on-chain state for fast queries. Source of truth is always on-chain + 0G Storage.
- `frontend/index.html` — Static dashboard showing agent resources. Reads from backend API.
- `public/skill.md` — The agent-readable API catalog. Served at GET /skill.md.

---

## Task 1: Foundry Project Setup + ZeroGentPayment Contract

**Files:**
- Create: `contracts/foundry.toml`
- Create: `contracts/remappings.txt`
- Create: `contracts/src/ZeroGentPayment.sol`
- Create: `contracts/test/ZeroGentPayment.t.sol`
- Create: `contracts/script/Deploy.s.sol`

This contract is the treasury. It receives native 0G token payments and emits events that the backend listens for to verify payments.

- [ ] **Step 1: Initialize Foundry project**

```bash
cd /Users/admin/.pg/0GENT
mkdir -p contracts/src contracts/test contracts/script
cd contracts
forge init --no-git --no-commit .
```

- [ ] **Step 2: Create foundry.toml**

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"
evm_version = "cancun"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
0g_testnet = "${ZG_TESTNET_RPC}"
0g_mainnet = "${ZG_MAINNET_RPC}"

[etherscan]
0g_testnet = { key = "placeholder", url = "https://chainscan-galileo.0g.ai/open/api" }
0g_mainnet = { key = "placeholder", url = "https://chainscan.0g.ai/open/api" }
```

- [ ] **Step 3: Install OpenZeppelin**

```bash
cd /Users/admin/.pg/0GENT/contracts
forge install OpenZeppelin/openzeppelin-contracts --no-git --no-commit
```

- [ ] **Step 4: Create remappings.txt**

```
@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
```

- [ ] **Step 5: Write ZeroGentPayment.sol**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ZeroGentPayment
 * @notice Treasury contract for 0GENT x402 payments.
 *         Agents send native 0G tokens. Backend verifies via events.
 *         Each payment is tagged with a nonce to prevent replay.
 */
contract ZeroGentPayment is ReentrancyGuard {
    address public owner;
    uint256 public totalReceived;

    // nonce => true (prevents double-spend verification)
    mapping(bytes32 => bool) public usedNonces;

    event PaymentReceived(
        address indexed payer,
        uint256 amount,
        bytes32 indexed nonce,
        string resourceType,
        uint256 timestamp
    );

    event Withdrawn(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "ZGP: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Pay for a resource. Called by agents.
     * @param nonce Unique nonce (generated by backend, prevents replay)
     * @param resourceType Type of resource being paid for (e.g. "phone", "email")
     */
    function pay(bytes32 nonce, string calldata resourceType) external payable nonReentrant {
        require(msg.value > 0, "ZGP: zero payment");
        require(!usedNonces[nonce], "ZGP: nonce already used");

        usedNonces[nonce] = true;
        totalReceived += msg.value;

        emit PaymentReceived(msg.sender, msg.value, nonce, resourceType, block.timestamp);
    }

    /**
     * @notice Withdraw accumulated funds.
     */
    function withdraw(address payable to, uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "ZGP: insufficient balance");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "ZGP: transfer failed");
        emit Withdrawn(to, amount);
    }

    /**
     * @notice Check if a nonce has been used.
     */
    function isNonceUsed(bytes32 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }

    receive() external payable {
        totalReceived += msg.value;
    }
}
```

- [ ] **Step 6: Write ZeroGentPayment test**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ZeroGentPayment.sol";

contract ZeroGentPaymentTest is Test {
    ZeroGentPayment public payment;
    address public agent = makeAddr("agent");
    address public treasury = makeAddr("treasury");

    function setUp() public {
        payment = new ZeroGentPayment();
        vm.deal(agent, 100 ether);
    }

    function test_pay_emits_event() public {
        bytes32 nonce = keccak256("test-nonce-1");
        vm.prank(agent);
        vm.expectEmit(true, true, false, true);
        emit ZeroGentPayment.PaymentReceived(agent, 1 ether, nonce, "phone", block.timestamp);
        payment.pay{value: 1 ether}(nonce, "phone");
    }

    function test_pay_updates_total() public {
        bytes32 nonce = keccak256("test-nonce-2");
        vm.prank(agent);
        payment.pay{value: 2 ether}(nonce, "email");
        assertEq(payment.totalReceived(), 2 ether);
    }

    function test_pay_rejects_zero() public {
        bytes32 nonce = keccak256("test-nonce-3");
        vm.prank(agent);
        vm.expectRevert("ZGP: zero payment");
        payment.pay{value: 0}(nonce, "phone");
    }

    function test_pay_rejects_replay() public {
        bytes32 nonce = keccak256("test-nonce-4");
        vm.prank(agent);
        payment.pay{value: 1 ether}(nonce, "phone");
        vm.prank(agent);
        vm.expectRevert("ZGP: nonce already used");
        payment.pay{value: 1 ether}(nonce, "phone");
    }

    function test_nonce_marked_used() public {
        bytes32 nonce = keccak256("test-nonce-5");
        assertFalse(payment.isNonceUsed(nonce));
        vm.prank(agent);
        payment.pay{value: 1 ether}(nonce, "compute");
        assertTrue(payment.isNonceUsed(nonce));
    }

    function test_withdraw_by_owner() public {
        bytes32 nonce = keccak256("test-nonce-6");
        vm.prank(agent);
        payment.pay{value: 5 ether}(nonce, "domain");

        uint256 before = treasury.balance;
        payment.withdraw(payable(treasury), 3 ether);
        assertEq(treasury.balance, before + 3 ether);
    }

    function test_withdraw_rejects_non_owner() public {
        bytes32 nonce = keccak256("test-nonce-7");
        vm.prank(agent);
        payment.pay{value: 1 ether}(nonce, "phone");

        vm.prank(agent);
        vm.expectRevert("ZGP: not owner");
        payment.withdraw(payable(agent), 1 ether);
    }

    function test_withdraw_rejects_insufficient() public {
        vm.expectRevert("ZGP: insufficient balance");
        payment.withdraw(payable(treasury), 1 ether);
    }
}
```

- [ ] **Step 7: Run tests**

```bash
cd /Users/admin/.pg/0GENT/contracts
forge test -vvv
```

Expected: All 8 tests PASS.

- [ ] **Step 8: Commit**

```bash
cd /Users/admin/.pg/0GENT
git init
git add contracts/
git commit -m "feat: add ZeroGentPayment contract with nonce-based replay protection"
```

---

## Task 2: AgentRegistry Contract (On-Chain Resource Tracking)

**Files:**
- Create: `contracts/src/AgentRegistry.sol`
- Create: `contracts/test/AgentRegistry.t.sol`

This contract maps agent wallet addresses to their provisioned resources (phone numbers, emails, servers, domains). The backend calls `registerResource()` after successful provisioning.

- [ ] **Step 1: Write AgentRegistry.sol**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentRegistry
 * @notice On-chain registry of resources owned by AI agents.
 *         Backend calls registerResource() after provisioning.
 *         Agents can query their resources directly on-chain.
 */
contract AgentRegistry {
    address public admin;

    enum ResourceType { Phone, Email, Compute, Domain }
    enum ResourceStatus { Active, Inactive, Expired }

    struct Resource {
        uint256 id;
        ResourceType resourceType;
        ResourceStatus status;
        string providerRef;     // e.g. phone number, email address, server IP
        uint256 createdAt;
        uint256 expiresAt;
    }

    uint256 private _nextId = 1;

    // agent address => resource IDs
    mapping(address => uint256[]) private _agentResources;
    // resource ID => Resource
    mapping(uint256 => Resource) private _resources;
    // resource ID => owner
    mapping(uint256 => address) private _resourceOwner;

    event ResourceRegistered(
        address indexed agent,
        uint256 indexed resourceId,
        ResourceType resourceType,
        string providerRef,
        uint256 expiresAt
    );

    event ResourceDeactivated(uint256 indexed resourceId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "AR: not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerResource(
        address agent,
        ResourceType resourceType,
        string calldata providerRef,
        uint256 expiresAt
    ) external onlyAdmin returns (uint256 resourceId) {
        resourceId = _nextId++;

        _resources[resourceId] = Resource({
            id: resourceId,
            resourceType: resourceType,
            status: ResourceStatus.Active,
            providerRef: providerRef,
            createdAt: block.timestamp,
            expiresAt: expiresAt
        });

        _resourceOwner[resourceId] = agent;
        _agentResources[agent].push(resourceId);

        emit ResourceRegistered(agent, resourceId, resourceType, providerRef, expiresAt);
    }

    function deactivateResource(uint256 resourceId) external onlyAdmin {
        require(_resources[resourceId].createdAt != 0, "AR: resource not found");
        _resources[resourceId].status = ResourceStatus.Inactive;
        emit ResourceDeactivated(resourceId);
    }

    function getResource(uint256 resourceId) external view returns (Resource memory) {
        require(_resources[resourceId].createdAt != 0, "AR: resource not found");
        return _resources[resourceId];
    }

    function getAgentResourceIds(address agent) external view returns (uint256[] memory) {
        return _agentResources[agent];
    }

    function getAgentResourceCount(address agent) external view returns (uint256) {
        return _agentResources[agent].length;
    }

    function getResourceOwner(uint256 resourceId) external view returns (address) {
        return _resourceOwner[resourceId];
    }
}
```

- [ ] **Step 2: Write AgentRegistry test**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;
    address public agent = makeAddr("agent");

    function setUp() public {
        registry = new AgentRegistry();
    }

    function test_register_resource() public {
        uint256 expires = block.timestamp + 30 days;
        uint256 id = registry.registerResource(
            agent,
            AgentRegistry.ResourceType.Phone,
            "+15551234567",
            expires
        );
        assertEq(id, 1);

        AgentRegistry.Resource memory r = registry.getResource(id);
        assertEq(uint8(r.resourceType), uint8(AgentRegistry.ResourceType.Phone));
        assertEq(r.providerRef, "+15551234567");
        assertEq(r.expiresAt, expires);
        assertEq(uint8(r.status), uint8(AgentRegistry.ResourceStatus.Active));
    }

    function test_agent_resource_list() public {
        registry.registerResource(agent, AgentRegistry.ResourceType.Phone, "+1555", block.timestamp + 30 days);
        registry.registerResource(agent, AgentRegistry.ResourceType.Email, "bot@0gent.xyz", block.timestamp + 30 days);

        uint256[] memory ids = registry.getAgentResourceIds(agent);
        assertEq(ids.length, 2);
        assertEq(registry.getAgentResourceCount(agent), 2);
    }

    function test_deactivate_resource() public {
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Compute, "192.168.1.1", block.timestamp + 30 days);
        registry.deactivateResource(id);

        AgentRegistry.Resource memory r = registry.getResource(id);
        assertEq(uint8(r.status), uint8(AgentRegistry.ResourceStatus.Inactive));
    }

    function test_only_admin_can_register() public {
        vm.prank(agent);
        vm.expectRevert("AR: not admin");
        registry.registerResource(agent, AgentRegistry.ResourceType.Phone, "+1", block.timestamp + 30 days);
    }

    function test_resource_owner_tracking() public {
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Domain, "myagent.dev", block.timestamp + 365 days);
        assertEq(registry.getResourceOwner(id), agent);
    }

    function test_get_nonexistent_reverts() public {
        vm.expectRevert("AR: resource not found");
        registry.getResource(999);
    }
}
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/admin/.pg/0GENT/contracts
forge test -vvv
```

Expected: All tests PASS (both ZeroGentPayment and AgentRegistry).

- [ ] **Step 4: Commit**

```bash
cd /Users/admin/.pg/0GENT
git add contracts/src/AgentRegistry.sol contracts/test/AgentRegistry.t.sol
git commit -m "feat: add AgentRegistry contract for on-chain resource tracking"
```

---

## Task 3: ZeroGentIdentity NFT Contract

**Files:**
- Create: `contracts/src/ZeroGentIdentity.sol`
- Create: `contracts/test/ZeroGentIdentity.t.sol`

ERC-721 NFT representing an agent's on-chain identity. One NFT per agent. Metadata URI points to 0G Storage. The token ID is the agent's permanent identity.

- [ ] **Step 1: Write ZeroGentIdentity.sol**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title ZeroGentIdentity
 * @notice ERC-721 identity NFT for AI agents on 0G Chain.
 *         Each agent mints one NFT. Metadata stored on 0G Storage.
 *         Token ID = agent's permanent on-chain identity.
 */
contract ZeroGentIdentity is ERC721 {
    address public admin;
    uint256 private _nextTokenId = 1;

    // agent address => token ID (0 = not minted)
    mapping(address => uint256) public agentTokenId;
    // token ID => metadata URI (0G Storage root hash or URL)
    mapping(uint256 => string) private _tokenMetadataURI;
    // token ID => resource count (updated by admin/backend)
    mapping(uint256 => uint256) public resourceCount;

    event AgentIdentityMinted(address indexed agent, uint256 indexed tokenId, string metadataURI);
    event MetadataUpdated(uint256 indexed tokenId, string metadataURI);

    modifier onlyAdmin() {
        require(msg.sender == admin, "ZGI: not admin");
        _;
    }

    constructor() ERC721("0GENT Identity", "0GENT-ID") {
        admin = msg.sender;
    }

    /**
     * @notice Mint identity NFT for an agent. One per agent.
     * @param agent The agent's wallet address
     * @param metadataURI 0G Storage root hash or URI for agent metadata
     */
    function mintIdentity(address agent, string calldata metadataURI) external onlyAdmin returns (uint256 tokenId) {
        require(agentTokenId[agent] == 0, "ZGI: already minted");
        require(agent != address(0), "ZGI: zero address");

        tokenId = _nextTokenId++;
        _mint(agent, tokenId);
        agentTokenId[agent] = tokenId;
        _tokenMetadataURI[tokenId] = metadataURI;

        emit AgentIdentityMinted(agent, tokenId, metadataURI);
    }

    function updateMetadata(uint256 tokenId, string calldata metadataURI) external onlyAdmin {
        require(ownerOf(tokenId) != address(0), "ZGI: token does not exist");
        _tokenMetadataURI[tokenId] = metadataURI;
        emit MetadataUpdated(tokenId, metadataURI);
    }

    function incrementResourceCount(uint256 tokenId) external onlyAdmin {
        require(ownerOf(tokenId) != address(0), "ZGI: token does not exist");
        resourceCount[tokenId]++;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "ZGI: token does not exist");
        return _tokenMetadataURI[tokenId];
    }

    function hasIdentity(address agent) external view returns (bool) {
        return agentTokenId[agent] != 0;
    }
}
```

- [ ] **Step 2: Write ZeroGentIdentity test**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ZeroGentIdentity.sol";

contract ZeroGentIdentityTest is Test {
    ZeroGentIdentity public identity;
    address public agent = makeAddr("agent");
    address public agent2 = makeAddr("agent2");

    function setUp() public {
        identity = new ZeroGentIdentity();
    }

    function test_mint_identity() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://abc123");
        assertEq(tokenId, 1);
        assertEq(identity.ownerOf(tokenId), agent);
        assertEq(identity.agentTokenId(agent), 1);
        assertTrue(identity.hasIdentity(agent));
    }

    function test_token_uri() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://metadata-hash");
        assertEq(identity.tokenURI(tokenId), "0g://metadata-hash");
    }

    function test_one_per_agent() public {
        identity.mintIdentity(agent, "0g://first");
        vm.expectRevert("ZGI: already minted");
        identity.mintIdentity(agent, "0g://second");
    }

    function test_update_metadata() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://old");
        identity.updateMetadata(tokenId, "0g://new");
        assertEq(identity.tokenURI(tokenId), "0g://new");
    }

    function test_increment_resource_count() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://meta");
        assertEq(identity.resourceCount(tokenId), 0);
        identity.incrementResourceCount(tokenId);
        identity.incrementResourceCount(tokenId);
        assertEq(identity.resourceCount(tokenId), 2);
    }

    function test_only_admin_can_mint() public {
        vm.prank(agent);
        vm.expectRevert("ZGI: not admin");
        identity.mintIdentity(agent, "0g://test");
    }

    function test_multiple_agents() public {
        uint256 id1 = identity.mintIdentity(agent, "0g://a");
        uint256 id2 = identity.mintIdentity(agent2, "0g://b");
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertFalse(id1 == id2);
    }

    function test_zero_address_reverts() public {
        vm.expectRevert("ZGI: zero address");
        identity.mintIdentity(address(0), "0g://test");
    }
}
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/admin/.pg/0GENT/contracts
forge test -vvv
```

Expected: All tests PASS across all three contracts.

- [ ] **Step 4: Write deployment script**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/ZeroGentPayment.sol";
import "../src/AgentRegistry.sol";
import "../src/ZeroGentIdentity.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        ZeroGentPayment payment = new ZeroGentPayment();
        AgentRegistry registry = new AgentRegistry();
        ZeroGentIdentity identity = new ZeroGentIdentity();

        vm.stopBroadcast();

        console.log("ZeroGentPayment:", address(payment));
        console.log("AgentRegistry:  ", address(registry));
        console.log("ZeroGentIdentity:", address(identity));
    }
}
```

- [ ] **Step 5: Deploy to 0G testnet**

```bash
cd /Users/admin/.pg/0GENT/contracts
export ZG_TESTNET_RPC=https://evmrpc-testnet.0g.ai
export DEPLOYER_PRIVATE_KEY=<your-key>

forge script script/Deploy.s.sol:Deploy \
  --rpc-url $ZG_TESTNET_RPC \
  --broadcast \
  --verify \
  --verifier custom \
  --verifier-api-key "placeholder" \
  --verifier-url "https://chainscan-galileo.0g.ai/open/api"
```

Save the three deployed contract addresses — they go into `.env`.

- [ ] **Step 6: Commit**

```bash
cd /Users/admin/.pg/0GENT
git add contracts/
git commit -m "feat: add ZeroGentIdentity ERC-721 + Deploy script, all contract tests passing"
```

---

## Task 4: Backend Skeleton + Config + Database

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/config.ts`
- Create: `backend/src/db.ts`
- Create: `backend/src/index.ts`
- Create: `.env.example`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@0gent/core",
  "version": "0.1.0",
  "description": "Decentralized infrastructure provisioning for AI agents on 0G Chain",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "ts-node-dev --respawn src/index.ts",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@0gfoundation/0g-ts-sdk": "^1.2.1",
    "better-sqlite3": "^12.6.2",
    "dotenv": "^16.4.7",
    "ethers": "^6.13.0",
    "express": "^4.21.2",
    "express-validator": "^7.3.1",
    "helmet": "^8.1.0",
    "telnyx": "^5.25.0",
    "uuid": "^11.0.5"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "@types/express": "^5.0.0",
    "@types/node": "^22.12.0",
    "@types/uuid": "^10.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Write config.ts**

```typescript
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: parseInt(optional("PORT", "3000"), 10),
  nodeEnv: optional("NODE_ENV", "development"),

  // 0G Chain
  zgRpcUrl: optional("ZG_RPC_URL", "https://evmrpc-testnet.0g.ai"),
  zgChainId: parseInt(optional("ZG_CHAIN_ID", "16602"), 10),
  deployerPrivateKey: optional("DEPLOYER_PRIVATE_KEY", ""),
  paymentContractAddress: optional("PAYMENT_CONTRACT_ADDRESS", ""),
  registryContractAddress: optional("REGISTRY_CONTRACT_ADDRESS", ""),
  identityContractAddress: optional("IDENTITY_CONTRACT_ADDRESS", ""),

  // 0G Storage
  zgStorageIndexerUrl: optional("ZG_STORAGE_INDEXER_URL", "https://indexer-storage-turbo.0g.ai"),
  zgStorageFlowContract: optional("ZG_STORAGE_FLOW_CONTRACT", "0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526"),

  // Telnyx
  telnyxApiKey: optional("TELNYX_API_KEY", ""),
  telnyxMessagingProfileId: optional("TELNYX_MESSAGING_PROFILE_ID", ""),

  // Cloudflare (Email)
  cloudflareApiToken: optional("CLOUDFLARE_API_TOKEN", ""),
  cloudflareZoneId: optional("CLOUDFLARE_ZONE_ID", ""),
  emailDomain: optional("EMAIL_DOMAIN", "0gent.xyz"),

  // Hetzner (Compute)
  hcloudToken: optional("HCLOUD_TOKEN", ""),
  hcloudLocation: optional("HCLOUD_LOCATION", "fsn1"),

  // Namecheap (Domains)
  namecheapApiKey: optional("NAMECHEAP_API_KEY", ""),
  namecheapApiUser: optional("NAMECHEAP_API_USER", ""),

  // Pricing (in 0G tokens, 18 decimals — human-readable values here)
  pricePhoneProvision: optional("PRICE_PHONE", "0.5"),
  priceSmsSend: optional("PRICE_SMS", "0.01"),
  priceEmailProvision: optional("PRICE_EMAIL", "0.2"),
  priceComputeProvision: optional("PRICE_COMPUTE", "1.0"),
  priceDomainRegister: optional("PRICE_DOMAIN", "2.0"),
  priceIdentityMint: optional("PRICE_IDENTITY_MINT", "0.1"),
} as const;
```

- [ ] **Step 4: Write db.ts**

```typescript
import Database from "better-sqlite3";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const DATA_DIR = join(process.cwd(), "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

export const db: Database.Database = new Database(join(DATA_DIR, "0gent.db"));
db.pragma("journal_mode = WAL");

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS phone_numbers (
      id TEXT PRIMARY KEY,
      phone_number TEXT UNIQUE NOT NULL,
      country TEXT NOT NULL,
      owner TEXT NOT NULL,
      resource_id INTEGER,
      provisioned_at TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_phone_owner ON phone_numbers(owner);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sms_messages (
      id TEXT PRIMARY KEY,
      phone_number_id TEXT NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
      from_number TEXT NOT NULL,
      to_number TEXT NOT NULL,
      body TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (phone_number_id) REFERENCES phone_numbers(id)
    );
    CREATE INDEX IF NOT EXISTS idx_sms_phone ON sms_messages(phone_number_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS email_inboxes (
      id TEXT PRIMARY KEY,
      address TEXT UNIQUE NOT NULL,
      local_part TEXT UNIQUE NOT NULL,
      owner TEXT NOT NULL,
      resource_id INTEGER,
      created_at TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_email_owner ON email_inboxes(owner);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      server_type TEXT NOT NULL,
      status TEXT NOT NULL,
      ipv4 TEXT,
      owner TEXT NOT NULL,
      resource_id INTEGER,
      price_monthly TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_server_owner ON servers(owner);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS domains (
      id TEXT PRIMARY KEY,
      domain TEXT UNIQUE NOT NULL,
      owner TEXT NOT NULL,
      resource_id INTEGER,
      status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'failed', 'expired')),
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_domain_owner ON domains(owner);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS used_payments (
      nonce TEXT PRIMARY KEY,
      payer TEXT NOT NULL,
      amount TEXT NOT NULL,
      tx_hash TEXT,
      endpoint TEXT NOT NULL,
      verified_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_payment_payer ON used_payments(payer);
  `);

  console.log("Database initialized");
}

initDatabase();
```

- [ ] **Step 5: Write minimal index.ts**

```typescript
import express from "express";
import helmet from "helmet";
import { config } from "./config";
import path from "path";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "100kb" }));

// Serve skill.md and static files
app.use(express.static(path.join(__dirname, "../../public")));

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "0GENT",
    chain: `0G Chain (${config.zgChainId})`,
    timestamp: new Date().toISOString(),
  });
});

app.listen(config.port, () => {
  console.log(`0GENT API running on port ${config.port}`);
  console.log(`Chain: 0G (${config.zgChainId}) via ${config.zgRpcUrl}`);
});

export { app };
```

- [ ] **Step 6: Create .env.example at project root**

```bash
# 0G Chain
ZG_RPC_URL=https://evmrpc-testnet.0g.ai
ZG_CHAIN_ID=16602
DEPLOYER_PRIVATE_KEY=
PAYMENT_CONTRACT_ADDRESS=
REGISTRY_CONTRACT_ADDRESS=
IDENTITY_CONTRACT_ADDRESS=

# 0G Storage
ZG_STORAGE_INDEXER_URL=https://indexer-storage-turbo.0g.ai
ZG_STORAGE_FLOW_CONTRACT=0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526

# Telnyx (Phone/SMS)
TELNYX_API_KEY=
TELNYX_MESSAGING_PROFILE_ID=

# Cloudflare (Email)
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=
EMAIL_DOMAIN=0gent.xyz

# Hetzner (Compute)
HCLOUD_TOKEN=
HCLOUD_LOCATION=fsn1

# Namecheap (Domains)
NAMECHEAP_API_KEY=
NAMECHEAP_API_USER=

# Pricing (in 0G tokens)
PRICE_PHONE=0.5
PRICE_SMS=0.01
PRICE_EMAIL=0.2
PRICE_COMPUTE=1.0
PRICE_DOMAIN=2.0
PRICE_IDENTITY_MINT=0.1
```

- [ ] **Step 7: Install deps and verify server starts**

```bash
cd /Users/admin/.pg/0GENT/backend
npm install
npx ts-node-dev src/index.ts &
sleep 2
curl http://localhost:3000/health
kill %1
```

Expected: `{"status":"ok","service":"0GENT",...}`

- [ ] **Step 8: Commit**

```bash
cd /Users/admin/.pg/0GENT
git add backend/ .env.example
git commit -m "feat: backend skeleton with config, database, and health endpoint"
```

---

## Task 5: 0G Chain Service + x402 Middleware

**Files:**
- Create: `backend/src/services/chain.ts`
- Create: `backend/src/middleware/x402.ts`

The chain service wraps ethers.js for 0G Chain. The x402 middleware verifies native 0G token payments on-chain before allowing requests through.

**Design decision:** Unlike AgentOS which uses Solana SVM verification, 0GENT uses a simpler EVM approach. The agent sends 0G tokens to the payment contract's `pay()` function, and the backend verifies the transaction receipt + event emission. The 402 response tells the agent: (1) how much to pay, (2) which contract to call, (3) what nonce to use.

- [ ] **Step 1: Write chain.ts**

```typescript
import { ethers } from "ethers";
import { config } from "../config";

// ABI fragments — only the functions we call
const PAYMENT_ABI = [
  "function pay(bytes32 nonce, string calldata resourceType) external payable",
  "function isNonceUsed(bytes32 nonce) external view returns (bool)",
  "event PaymentReceived(address indexed payer, uint256 amount, bytes32 indexed nonce, string resourceType, uint256 timestamp)",
];

const REGISTRY_ABI = [
  "function registerResource(address agent, uint8 resourceType, string calldata providerRef, uint256 expiresAt) external returns (uint256)",
  "function deactivateResource(uint256 resourceId) external",
  "function getAgentResourceIds(address agent) external view returns (uint256[])",
  "function getResource(uint256 resourceId) external view returns (tuple(uint256 id, uint8 resourceType, uint8 status, string providerRef, uint256 createdAt, uint256 expiresAt))",
  "function getAgentResourceCount(address agent) external view returns (uint256)",
];

const IDENTITY_ABI = [
  "function mintIdentity(address agent, string calldata metadataURI) external returns (uint256)",
  "function updateMetadata(uint256 tokenId, string calldata metadataURI) external",
  "function incrementResourceCount(uint256 tokenId) external",
  "function agentTokenId(address agent) external view returns (uint256)",
  "function hasIdentity(address agent) external view returns (bool)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function resourceCount(uint256 tokenId) external view returns (uint256)",
  "event AgentIdentityMinted(address indexed agent, uint256 indexed tokenId, string metadataURI)",
];

let _provider: ethers.JsonRpcProvider | null = null;
let _signer: ethers.Wallet | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(config.zgRpcUrl, {
      chainId: config.zgChainId,
      name: "0g-chain",
    });
  }
  return _provider;
}

export function getSigner(): ethers.Wallet {
  if (!_signer) {
    if (!config.deployerPrivateKey) throw new Error("DEPLOYER_PRIVATE_KEY not set");
    _signer = new ethers.Wallet(config.deployerPrivateKey, getProvider());
  }
  return _signer;
}

export function getPaymentContract(): ethers.Contract {
  if (!config.paymentContractAddress) throw new Error("PAYMENT_CONTRACT_ADDRESS not set");
  return new ethers.Contract(config.paymentContractAddress, PAYMENT_ABI, getSigner());
}

export function getRegistryContract(): ethers.Contract {
  if (!config.registryContractAddress) throw new Error("REGISTRY_CONTRACT_ADDRESS not set");
  return new ethers.Contract(config.registryContractAddress, REGISTRY_ABI, getSigner());
}

export function getIdentityContract(): ethers.Contract {
  if (!config.identityContractAddress) throw new Error("IDENTITY_CONTRACT_ADDRESS not set");
  return new ethers.Contract(config.identityContractAddress, IDENTITY_ABI, getSigner());
}

/**
 * Verify a payment transaction on 0G Chain.
 * Checks: tx confirmed, correct contract, correct nonce, sufficient amount.
 */
export async function verifyPayment(
  txHash: string,
  expectedNonce: string,
  minAmount: bigint
): Promise<{ valid: boolean; payer: string; amount: bigint; reason?: string }> {
  const provider = getProvider();
  const receipt = await provider.getTransactionReceipt(txHash);

  if (!receipt) {
    return { valid: false, payer: "", amount: 0n, reason: "tx_not_found" };
  }

  if (receipt.status !== 1) {
    return { valid: false, payer: receipt.from, amount: 0n, reason: "tx_reverted" };
  }

  // Check it was sent to our payment contract
  if (receipt.to?.toLowerCase() !== config.paymentContractAddress.toLowerCase()) {
    return { valid: false, payer: receipt.from, amount: 0n, reason: "wrong_contract" };
  }

  // Parse PaymentReceived event from logs
  const iface = new ethers.Interface(PAYMENT_ABI);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed && parsed.name === "PaymentReceived") {
        const payer = parsed.args[0] as string;
        const amount = parsed.args[1] as bigint;
        const nonce = parsed.args[2] as string;

        if (nonce !== expectedNonce) {
          return { valid: false, payer, amount, reason: "nonce_mismatch" };
        }
        if (amount < minAmount) {
          return { valid: false, payer, amount, reason: "insufficient_amount" };
        }
        return { valid: true, payer, amount };
      }
    } catch {
      // Not our event, skip
    }
  }

  return { valid: false, payer: receipt.from, amount: 0n, reason: "no_payment_event" };
}

/**
 * Register a resource on-chain via AgentRegistry.
 * Returns the on-chain resource ID.
 */
export async function registerResourceOnChain(
  agent: string,
  resourceType: number, // 0=Phone, 1=Email, 2=Compute, 3=Domain
  providerRef: string,
  expiresAt: number
): Promise<number> {
  const registry = getRegistryContract();
  const tx = await registry.registerResource(agent, resourceType, providerRef, expiresAt);
  const receipt = await tx.wait();

  // Parse ResourceRegistered event to get resourceId
  const iface = new ethers.Interface(REGISTRY_ABI);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed && parsed.name === "ResourceRegistered") {
        return Number(parsed.args[1]); // resourceId
      }
    } catch {
      // skip
    }
  }

  throw new Error("ResourceRegistered event not found in tx receipt");
}
```

- [ ] **Step 2: Write x402.ts middleware**

```typescript
import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { verifyPayment } from "../services/chain";
import { db } from "../db";
import { ethers } from "ethers";
import crypto from "crypto";

export interface PaymentInfo {
  txHash: string;
  payer: string;
  amount: bigint;
  nonce: string;
  verifiedAt: number;
}

export interface AuthenticatedRequest extends Request {
  payment?: PaymentInfo;
}

/**
 * Build the 402 Payment Required response for 0G Chain.
 */
function build402Response(req: Request, priceInZG: string, resourceType: string) {
  const nonce = "0x" + crypto.randomBytes(32).toString("hex");
  const amountWei = ethers.parseEther(priceInZG).toString();

  return {
    x402Version: 1,
    network: `eip155:${config.zgChainId}`,
    description: `0GENT: ${req.method} ${req.originalUrl}`,
    payment: {
      contract: config.paymentContractAddress,
      function: "pay(bytes32,string)",
      args: { nonce, resourceType },
      value: amountWei,
      token: "native",
      tokenSymbol: "0G",
    },
    nonce,
    amountHuman: `${priceInZG} 0G`,
  };
}

/**
 * Express middleware that enforces x402 payment on 0G Chain.
 *
 * Usage: app.post("/phone/provision", x402("0.5", "phone"), handler)
 *
 * Flow:
 * 1. No payment header → respond 402 with payment instructions
 * 2. Payment header present → verify tx on-chain → attach payer info → next()
 */
export function x402(priceInZG: string, resourceType: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const paymentHeader = (req.headers["x-payment"] || req.headers["payment-signature"]) as string | undefined;

    if (!paymentHeader) {
      const paymentRequired = build402Response(req, priceInZG, resourceType);
      res.status(402).json({
        error: "Payment Required",
        message: `This endpoint costs ${priceInZG} 0G tokens. Send payment to the contract and include the tx hash in the X-Payment header.`,
        ...paymentRequired,
      });
      return;
    }

    try {
      // Parse payment header — expects JSON with { txHash, nonce }
      let paymentData: { txHash: string; nonce: string };
      try {
        paymentData = JSON.parse(paymentHeader);
      } catch {
        // Fallback: header is just the tx hash, nonce from body
        paymentData = {
          txHash: paymentHeader,
          nonce: req.body?.nonce || "",
        };
      }

      if (!paymentData.txHash || !paymentData.nonce) {
        res.status(400).json({ error: "Payment header must include txHash and nonce" });
        return;
      }

      // Check for replay
      const existing = db.prepare("SELECT nonce FROM used_payments WHERE nonce = ?").get(paymentData.nonce);
      if (existing) {
        res.status(400).json({ error: "Payment nonce already used (replay detected)" });
        return;
      }

      // Verify on-chain
      const minAmount = ethers.parseEther(priceInZG);
      const result = await verifyPayment(paymentData.txHash, paymentData.nonce, minAmount);

      if (!result.valid) {
        res.status(402).json({
          error: "Payment verification failed",
          reason: result.reason,
          ...build402Response(req, priceInZG, resourceType),
        });
        return;
      }

      // Record payment to prevent replay
      db.prepare(
        "INSERT INTO used_payments (nonce, payer, amount, tx_hash, endpoint, verified_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(
        paymentData.nonce,
        result.payer,
        result.amount.toString(),
        paymentData.txHash,
        req.originalUrl,
        new Date().toISOString()
      );

      req.payment = {
        txHash: paymentData.txHash,
        payer: result.payer,
        amount: result.amount,
        nonce: paymentData.nonce,
        verifiedAt: Date.now(),
      };

      next();
    } catch (err) {
      console.error("[x402] Error:", err);
      res.status(500).json({
        error: "Payment verification failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };
}
```

- [ ] **Step 3: Verify compilation**

```bash
cd /Users/admin/.pg/0GENT/backend
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/admin/.pg/0GENT
git add backend/src/services/chain.ts backend/src/middleware/x402.ts
git commit -m "feat: 0G Chain service + x402 payment middleware with on-chain verification"
```

---

## Task 6: 0G Storage Service

**Files:**
- Create: `backend/src/services/storage.ts`

Wraps `@0gfoundation/0g-ts-sdk` for agent memory persistence and metadata storage on 0G's decentralized storage network.

- [ ] **Step 1: Write storage.ts**

```typescript
import { Indexer, ZgFile, Batcher } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";
import { config } from "../config";
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import path from "path";

const TEMP_DIR = join(process.cwd(), "data", "tmp");
if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

let _indexer: Indexer | null = null;

function getIndexer(): Indexer {
  if (!_indexer) {
    _indexer = new Indexer(config.zgStorageIndexerUrl);
  }
  return _indexer;
}

function getSigner(): ethers.Wallet {
  const provider = new ethers.JsonRpcProvider(config.zgRpcUrl);
  return new ethers.Wallet(config.deployerPrivateKey, provider);
}

/**
 * Upload a JSON object to 0G Storage.
 * Returns the root hash (content identifier).
 */
export async function uploadJson(key: string, data: Record<string, unknown>): Promise<string> {
  const content = JSON.stringify(data);
  const tempPath = join(TEMP_DIR, `${key}-${Date.now()}.json`);

  try {
    writeFileSync(tempPath, content);
    const file = await ZgFile.fromFilePath(tempPath);
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr || !tree) throw new Error(`Merkle tree error: ${treeErr}`);

    const rootHash = tree.rootHash();
    const indexer = getIndexer();
    const [tx, uploadErr] = await indexer.upload(file, config.zgRpcUrl, getSigner());
    if (uploadErr) throw new Error(`Upload error: ${uploadErr}`);

    await file.close();
    return rootHash;
  } finally {
    try { unlinkSync(tempPath); } catch {}
  }
}

/**
 * Download content from 0G Storage by root hash.
 */
export async function downloadByHash(rootHash: string): Promise<Buffer> {
  const tempPath = join(TEMP_DIR, `download-${Date.now()}.bin`);
  try {
    const indexer = getIndexer();
    const err = await indexer.download(rootHash, tempPath, true);
    if (err) throw new Error(`Download error: ${err}`);

    const { readFileSync } = await import("fs");
    return readFileSync(tempPath);
  } finally {
    try { unlinkSync(tempPath); } catch {}
  }
}

/**
 * Upload agent metadata (for identity NFT) to 0G Storage.
 * Returns the root hash to use as tokenURI.
 */
export async function uploadAgentMetadata(
  agentAddress: string,
  name: string,
  createdAt: string
): Promise<string> {
  const metadata = {
    name: name || `Agent ${agentAddress.slice(0, 8)}`,
    description: "0GENT Agent Identity",
    agent: agentAddress,
    createdAt,
    platform: "0GENT",
    chain: "0G",
  };

  return uploadJson(`identity-${agentAddress}`, metadata);
}

/**
 * Upload agent memory entry to 0G Storage.
 * Returns the root hash.
 */
export async function uploadMemory(
  agentAddress: string,
  key: string,
  value: unknown
): Promise<string> {
  const memoryEntry = {
    agent: agentAddress,
    key,
    value,
    updatedAt: new Date().toISOString(),
  };

  return uploadJson(`memory-${agentAddress}-${key}`, memoryEntry);
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd /Users/admin/.pg/0GENT/backend
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd /Users/admin/.pg/0GENT
git add backend/src/services/storage.ts
git commit -m "feat: 0G Storage service for agent memory and metadata persistence"
```

---

## Task 7: Phone Service + Route

**Files:**
- Create: `backend/src/services/phone.ts`
- Create: `backend/src/routes/phone.ts`
- Modify: `backend/src/index.ts`

Adapted from AgentOS `src/services/phone.ts` and `src/routes/phone.ts`. Telnyx integration stays the same — what changes is payment (x402 on 0G Chain) and resource registration (on-chain via AgentRegistry).

- [ ] **Step 1: Write phone service**

```typescript
import Telnyx from "telnyx";
import { v4 as uuid } from "uuid";
import { config } from "../config";
import { db } from "../db";

let _client: InstanceType<typeof Telnyx> | null = null;

function getClient(): InstanceType<typeof Telnyx> {
  if (!config.telnyxApiKey) throw new Error("TELNYX_API_KEY not configured");
  if (!_client) _client = new Telnyx({ apiKey: config.telnyxApiKey });
  return _client;
}

export async function searchNumbers(
  country: string,
  opts?: { areaCode?: string; limit?: number }
): Promise<Array<{ phoneNumber: string; region: string; type: string }>> {
  const client = getClient();
  const params: Record<string, unknown> = {
    "filter[country_code]": country,
    "filter[limit]": opts?.limit ?? 5,
  };
  if (opts?.areaCode) params["filter[national_destination_code]"] = opts.areaCode;

  const res = await client.availablePhoneNumbers.list(params);
  const numbers = (res as any).data || [];
  return numbers.map((n: any) => ({
    phoneNumber: n.phone_number,
    region: n.region_information?.[0]?.region_name || country,
    type: n.phone_number_type || "local",
  }));
}

export async function provisionNumber(
  country: string,
  owner: string,
  areaCode?: string
): Promise<{ id: string; phoneNumber: string; country: string; owner: string; provisionedAt: string }> {
  const client = getClient();
  const available = await searchNumbers(country, { areaCode, limit: 1 });
  if (available.length === 0) throw new Error(`No numbers available in ${country}`);

  const chosen = available[0].phoneNumber;
  await client.numberOrders.create({
    phone_numbers: [{ phone_number: chosen }],
    messaging_profile_id: config.telnyxMessagingProfileId || undefined,
  } as any);

  if (config.telnyxMessagingProfileId) {
    try {
      await client.phoneNumbers.update(chosen, {
        messaging_profile_id: config.telnyxMessagingProfileId,
      } as any);
    } catch {}
  }

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO phone_numbers (id, phone_number, country, owner, provisioned_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, chosen, country, owner, now);

  return { id, phoneNumber: chosen, country, owner, provisionedAt: now };
}

export async function sendSms(
  phoneNumberId: string,
  to: string,
  body: string,
  owner: string
): Promise<{ id: string; from: string; to: string; body: string; timestamp: string }> {
  const row = db.prepare("SELECT * FROM phone_numbers WHERE id = ? AND owner = ?").get(phoneNumberId, owner) as any;
  if (!row) throw new Error("Phone number not found or not owned by you");
  if (!row.active) throw new Error("Phone number is deactivated");

  const client = getClient();
  await client.messages.send({
    from: row.phone_number,
    to,
    text: body,
    messaging_profile_id: config.telnyxMessagingProfileId || undefined,
  } as any);

  const msgId = uuid();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO sms_messages (id, phone_number_id, direction, from_number, to_number, body, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(msgId, phoneNumberId, "outbound", row.phone_number, to, body, now);

  return { id: msgId, from: row.phone_number, to, body, timestamp: now };
}

export function getLogs(phoneNumberId: string, owner: string): any[] {
  const row = db.prepare("SELECT * FROM phone_numbers WHERE id = ? AND owner = ?").get(phoneNumberId, owner) as any;
  if (!row) throw new Error("Phone number not found or not owned by you");
  return db.prepare("SELECT * FROM sms_messages WHERE phone_number_id = ? ORDER BY timestamp DESC").all(phoneNumberId);
}
```

- [ ] **Step 2: Write phone route**

```typescript
import { Router, Response } from "express";
import { x402, AuthenticatedRequest } from "../middleware/x402";
import { config } from "../config";
import * as phoneService from "../services/phone";
import { registerResourceOnChain } from "../services/chain";

const router = Router();

// Search available numbers (free)
router.get("/search", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const country = (req.query.country as string) || "US";
    const areaCode = req.query.areaCode as string | undefined;
    const numbers = await phoneService.searchNumbers(country, { areaCode });
    res.json({ numbers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Provision a phone number (paid)
router.post(
  "/provision",
  x402(config.pricePhoneProvision, "phone"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payer = req.payment!.payer;
      const country = req.body.country || "US";
      const areaCode = req.body.areaCode;

      const phone = await phoneService.provisionNumber(country, payer, areaCode);

      // Register on-chain
      const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
      const resourceId = await registerResourceOnChain(payer, 0, phone.phoneNumber, expiresAt);

      res.json({
        ...phone,
        resourceId,
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        message: "Phone number provisioned and registered on 0G Chain",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Send SMS (paid)
router.post(
  "/:id/sms",
  x402(config.priceSmsSend, "sms"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payer = req.payment!.payer;
      const msg = await phoneService.sendSms(req.params.id, req.body.to, req.body.body, payer);
      res.json(msg);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Get SMS logs (free — agent must own the number)
router.get("/:id/logs", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const owner = req.query.owner as string;
    if (!owner) { res.status(400).json({ error: "owner query param required" }); return; }
    const logs = phoneService.getLogs(req.params.id, owner);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 3: Mount route in index.ts**

Replace the contents of `backend/src/index.ts` with:

```typescript
import express from "express";
import helmet from "helmet";
import { config } from "./config";
import path from "path";
import phoneRouter from "./routes/phone";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "100kb" }));

// Static files + skill.md
app.use(express.static(path.join(__dirname, "../../public")));

// Health
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "0GENT",
    chain: `0G Chain (${config.zgChainId})`,
    contracts: {
      payment: config.paymentContractAddress || "not deployed",
      registry: config.registryContractAddress || "not deployed",
      identity: config.identityContractAddress || "not deployed",
    },
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/phone", phoneRouter);

app.listen(config.port, () => {
  console.log(`0GENT API running on port ${config.port}`);
});

export { app };
```

- [ ] **Step 4: Verify compilation**

```bash
cd /Users/admin/.pg/0GENT/backend
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd /Users/admin/.pg/0GENT
git add backend/src/services/phone.ts backend/src/routes/phone.ts backend/src/index.ts
git commit -m "feat: phone service + route with Telnyx integration and on-chain resource registration"
```

---

## Task 8: Email, Compute, Domain Services + Routes

**Files:**
- Create: `backend/src/services/email.ts`
- Create: `backend/src/services/compute.ts`
- Create: `backend/src/services/domain.ts`
- Create: `backend/src/routes/email.ts`
- Create: `backend/src/routes/compute.ts`
- Create: `backend/src/routes/domain.ts`
- Modify: `backend/src/index.ts` (mount new routes)

All three follow the same pattern as phone: Web2 API call → SQLite cache → on-chain registration.

- [ ] **Step 1: Write email service**

```typescript
import { v4 as uuid } from "uuid";
import { config } from "../config";
import { db } from "../db";

const CF_API = "https://api.cloudflare.com/client/v4";

async function cfFetch(path: string, method: string, body?: unknown): Promise<any> {
  const res = await fetch(`${CF_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.cloudflareApiToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare API error (${res.status}): ${text}`);
  }
  return res.json();
}

export async function provisionInbox(
  localPart: string,
  owner: string
): Promise<{ id: string; address: string; localPart: string; owner: string; createdAt: string }> {
  const address = `${localPart}@${config.emailDomain}`;

  // Create Cloudflare email routing rule
  if (config.cloudflareApiToken && config.cloudflareZoneId) {
    try {
      await cfFetch(`/zones/${config.cloudflareZoneId}/email/routing/rules`, "POST", {
        name: `0gent-${localPart}`,
        enabled: true,
        matchers: [{ type: "literal", field: "to", value: address }],
        actions: [{ type: "worker", value: ["0gent-email-worker"] }],
      });
    } catch (err: any) {
      console.warn("[email] Cloudflare routing rule creation failed:", err.message);
    }
  }

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO email_inboxes (id, address, local_part, owner, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, address, localPart, owner, now);

  return { id, address, localPart, owner, createdAt: now };
}

export function getInbox(id: string, owner: string): any {
  return db.prepare("SELECT * FROM email_inboxes WHERE id = ? AND owner = ?").get(id, owner);
}
```

- [ ] **Step 2: Write compute service**

```typescript
import { v4 as uuid } from "uuid";
import { config } from "../config";
import { db } from "../db";

const HCLOUD_API = "https://api.hetzner.cloud/v1";

function headers() {
  return {
    Authorization: `Bearer ${config.hcloudToken}`,
    "Content-Type": "application/json",
  };
}

async function hcloud(method: string, path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${HCLOUD_API}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hetzner API ${method} ${path} failed (${res.status}): ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function generateCloudInit(): string {
  return `#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq unattended-upgrades
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y -qq nodejs
echo "0GENT provisioning complete" > /var/log/0gent-provision.log
`;
}

export async function provisionServer(
  name: string,
  serverType: string,
  owner: string
): Promise<{ id: string; name: string; serverType: string; status: string; ipv4: string | null; owner: string; createdAt: string }> {
  const data = await hcloud("POST", "/servers", {
    name,
    server_type: serverType,
    image: "ubuntu-24.04",
    location: config.hcloudLocation,
    user_data: generateCloudInit(),
    labels: { managed_by: "0gent" },
  });

  const s = data.server;
  const id = String(s.id);
  const now = new Date().toISOString();

  db.prepare(
    "INSERT INTO servers (id, name, server_type, status, ipv4, owner, price_monthly, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, s.name, serverType, s.status, s.public_net?.ipv4?.ip ?? null, owner, "0", now);

  return {
    id,
    name: s.name,
    serverType,
    status: s.status,
    ipv4: s.public_net?.ipv4?.ip ?? null,
    owner,
    createdAt: now,
  };
}

export async function getServerStatus(id: string): Promise<any> {
  const data = await hcloud("GET", `/servers/${id}`);
  return {
    id: String(data.server.id),
    name: data.server.name,
    status: data.server.status,
    ipv4: data.server.public_net?.ipv4?.ip,
  };
}

export async function deleteServer(id: string): Promise<void> {
  await hcloud("DELETE", `/servers/${id}`);
  db.prepare("DELETE FROM servers WHERE id = ?").run(id);
}
```

- [ ] **Step 3: Write domain service**

```typescript
import { v4 as uuid } from "uuid";
import { config } from "../config";
import { db } from "../db";

const NC_API = "https://api.namecheap.com/xml.response";

async function ncFetch(command: string, params: Record<string, string> = {}): Promise<string> {
  const baseParams = {
    ApiUser: config.namecheapApiUser,
    ApiKey: config.namecheapApiKey,
    UserName: config.namecheapApiUser,
    ClientIp: "127.0.0.1",
    Command: command,
    ...params,
  };
  const qs = new URLSearchParams(baseParams).toString();
  const res = await fetch(`${NC_API}?${qs}`);
  return res.text();
}

export async function checkDomain(domain: string): Promise<{ available: boolean; domain: string }> {
  const xml = await ncFetch("namecheap.domains.check", { DomainList: domain });
  const available = xml.includes('Available="true"');
  return { available, domain };
}

export async function registerDomain(
  domain: string,
  owner: string
): Promise<{ id: string; domain: string; owner: string; status: string; createdAt: string; expiresAt: string }> {
  const [sld, tld] = domain.split(".");
  if (!sld || !tld) throw new Error("Invalid domain format");

  await ncFetch("namecheap.domains.create", {
    DomainName: domain,
    Years: "1",
  });

  const id = uuid();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    "INSERT INTO domains (id, domain, owner, status, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, domain, owner, "active", expiresAt, now);

  return { id, domain, owner, status: "active", createdAt: now, expiresAt };
}
```

- [ ] **Step 4: Write route files (email, compute, domain)**

Create `backend/src/routes/email.ts`:

```typescript
import { Router, Response } from "express";
import { x402, AuthenticatedRequest } from "../middleware/x402";
import { config } from "../config";
import * as emailService from "../services/email";
import { registerResourceOnChain } from "../services/chain";

const router = Router();

router.post(
  "/provision",
  x402(config.priceEmailProvision, "email"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payer = req.payment!.payer;
      const localPart = req.body.name || req.body.localPart || `agent-${payer.slice(2, 10)}`;
      const inbox = await emailService.provisionInbox(localPart, payer);

      const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const resourceId = await registerResourceOnChain(payer, 1, inbox.address, expiresAt);

      res.json({ ...inbox, resourceId, message: "Email inbox provisioned and registered on 0G Chain" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
```

Create `backend/src/routes/compute.ts`:

```typescript
import { Router, Response } from "express";
import { x402, AuthenticatedRequest } from "../middleware/x402";
import { config } from "../config";
import * as computeService from "../services/compute";
import { registerResourceOnChain } from "../services/chain";

const router = Router();

router.post(
  "/provision",
  x402(config.priceComputeProvision, "compute"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payer = req.payment!.payer;
      const name = req.body.name || `0gent-${payer.slice(2, 10)}`;
      const serverType = req.body.type || "cx22";
      const server = await computeService.provisionServer(name, serverType, payer);

      const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const resourceId = await registerResourceOnChain(payer, 2, server.ipv4 || server.id, expiresAt);

      res.json({ ...server, resourceId, message: "Compute instance provisioned and registered on 0G Chain" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get("/:id/status", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = await computeService.getServerStatus(req.params.id);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    await computeService.deleteServer(req.params.id);
    res.json({ message: "Server terminated" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

Create `backend/src/routes/domain.ts`:

```typescript
import { Router, Response } from "express";
import { x402, AuthenticatedRequest } from "../middleware/x402";
import { config } from "../config";
import * as domainService from "../services/domain";
import { registerResourceOnChain } from "../services/chain";

const router = Router();

router.get("/check", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const domain = req.query.domain as string;
    if (!domain) { res.status(400).json({ error: "domain query param required" }); return; }
    const result = await domainService.checkDomain(domain);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  "/register",
  x402(config.priceDomainRegister, "domain"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payer = req.payment!.payer;
      const domain = req.body.domain;
      if (!domain) { res.status(400).json({ error: "domain field required" }); return; }

      const result = await domainService.registerDomain(domain, payer);
      const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      const resourceId = await registerResourceOnChain(payer, 3, domain, expiresAt);

      res.json({ ...result, resourceId, message: "Domain registered and recorded on 0G Chain" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
```

- [ ] **Step 5: Update index.ts to mount all routes**

```typescript
import express from "express";
import helmet from "helmet";
import { config } from "./config";
import path from "path";
import phoneRouter from "./routes/phone";
import emailRouter from "./routes/email";
import computeRouter from "./routes/compute";
import domainRouter from "./routes/domain";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "../../public")));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "0GENT",
    chain: `0G Chain (${config.zgChainId})`,
    contracts: {
      payment: config.paymentContractAddress || "not deployed",
      registry: config.registryContractAddress || "not deployed",
      identity: config.identityContractAddress || "not deployed",
    },
    timestamp: new Date().toISOString(),
  });
});

app.use("/phone", phoneRouter);
app.use("/email", emailRouter);
app.use("/compute", computeRouter);
app.use("/domain", domainRouter);

app.listen(config.port, () => {
  console.log(`0GENT API running on port ${config.port}`);
});

export { app };
```

- [ ] **Step 6: Verify compilation**

```bash
cd /Users/admin/.pg/0GENT/backend
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
cd /Users/admin/.pg/0GENT
git add backend/src/services/email.ts backend/src/services/compute.ts backend/src/services/domain.ts
git add backend/src/routes/email.ts backend/src/routes/compute.ts backend/src/routes/domain.ts
git add backend/src/index.ts
git commit -m "feat: email, compute, domain services + routes with on-chain registration"
```

---

## Task 9: Identity + Memory Routes

**Files:**
- Create: `backend/src/routes/identity.ts`
- Create: `backend/src/routes/memory.ts`
- Modify: `backend/src/index.ts`

Identity route mints the ERC-721 NFT on 0G Chain with metadata stored on 0G Storage. Memory route reads/writes agent memory to 0G Storage.

- [ ] **Step 1: Write identity route**

```typescript
import { Router, Response } from "express";
import { x402, AuthenticatedRequest } from "../middleware/x402";
import { config } from "../config";
import { getIdentityContract } from "../services/chain";
import { uploadAgentMetadata } from "../services/storage";

const router = Router();

// Mint agent identity NFT (paid)
router.post(
  "/mint",
  x402(config.priceIdentityMint, "identity"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payer = req.payment!.payer;
      const name = req.body.name || "";
      const identity = getIdentityContract();

      // Check if already minted
      const existing = await identity.agentTokenId(payer);
      if (existing > 0n) {
        res.status(409).json({
          error: "Identity already minted",
          tokenId: Number(existing),
        });
        return;
      }

      // Upload metadata to 0G Storage
      const metadataHash = await uploadAgentMetadata(payer, name, new Date().toISOString());
      const metadataURI = `0g://${metadataHash}`;

      // Mint on-chain
      const tx = await identity.mintIdentity(payer, metadataURI);
      const receipt = await tx.wait();

      // Parse event for tokenId
      let tokenId = 0;
      for (const log of receipt.logs) {
        try {
          const parsed = identity.interface.parseLog({ topics: log.topics as string[], data: log.data });
          if (parsed && parsed.name === "AgentIdentityMinted") {
            tokenId = Number(parsed.args[1]);
          }
        } catch {}
      }

      res.json({
        tokenId,
        agent: payer,
        metadataURI,
        txHash: receipt.hash,
        message: "Agent identity minted on 0G Chain, metadata stored on 0G Storage",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Get agent identity (free)
router.get("/:address", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const identity = getIdentityContract();
    const tokenId = await identity.agentTokenId(req.params.address);

    if (tokenId === 0n) {
      res.status(404).json({ error: "No identity found for this address" });
      return;
    }

    const [metadataURI, resCount] = await Promise.all([
      identity.tokenURI(tokenId),
      identity.resourceCount(tokenId),
    ]);

    res.json({
      tokenId: Number(tokenId),
      agent: req.params.address,
      metadataURI,
      resourceCount: Number(resCount),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 2: Write memory route**

```typescript
import { Router, Response } from "express";
import { AuthenticatedRequest } from "../middleware/x402";
import { uploadMemory, downloadByHash } from "../services/storage";
import { db } from "../db";

const router = Router();

// In-memory index of agent memory keys → 0G Storage root hashes
// In production this would be a persistent index, but for the hackathon SQLite works
db.exec(`
  CREATE TABLE IF NOT EXISTS memory_index (
    agent TEXT NOT NULL,
    key TEXT NOT NULL,
    root_hash TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (agent, key)
  );
`);

// Write memory (agent sends their address + key/value)
router.post("/:address", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agent = req.params.address;
    const { key, value } = req.body;
    if (!key) { res.status(400).json({ error: "key field required" }); return; }

    const rootHash = await uploadMemory(agent, key, value);

    db.prepare(
      "INSERT OR REPLACE INTO memory_index (agent, key, root_hash, updated_at) VALUES (?, ?, ?, ?)"
    ).run(agent, key, rootHash, new Date().toISOString());

    res.json({ agent, key, rootHash, message: "Memory stored on 0G Storage" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Read memory
router.get("/:address", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agent = req.params.address;
    const key = req.query.key as string;

    if (key) {
      const row = db.prepare("SELECT * FROM memory_index WHERE agent = ? AND key = ?").get(agent, key) as any;
      if (!row) { res.status(404).json({ error: "Memory key not found" }); return; }

      const data = await downloadByHash(row.root_hash);
      res.json({ agent, key, value: JSON.parse(data.toString()), rootHash: row.root_hash });
    } else {
      const rows = db.prepare("SELECT key, root_hash, updated_at FROM memory_index WHERE agent = ?").all(agent);
      res.json({ agent, keys: rows });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete memory key
router.delete("/:address/key/:key", async (req: AuthenticatedRequest, res: Response) => {
  try {
    db.prepare("DELETE FROM memory_index WHERE agent = ? AND key = ?").run(req.params.address, req.params.key);
    res.json({ message: "Memory key deleted from index" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 3: Mount in index.ts**

Add to the imports and route mounting in `backend/src/index.ts`:

```typescript
import identityRouter from "./routes/identity";
import memoryRouter from "./routes/memory";
// ... after existing app.use lines:
app.use("/identity", identityRouter);
app.use("/memory", memoryRouter);
```

- [ ] **Step 4: Verify compilation**

```bash
cd /Users/admin/.pg/0GENT/backend
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd /Users/admin/.pg/0GENT
git add backend/src/routes/identity.ts backend/src/routes/memory.ts backend/src/index.ts
git commit -m "feat: identity NFT minting + 0G Storage memory routes"
```

---

## Task 10: skill.md File

**Files:**
- Create: `public/skill.md`

This is the most critical file for the demo. It's how any LLM discovers and uses 0GENT.

- [ ] **Step 1: Write skill.md**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/admin/.pg/0GENT
git add public/skill.md
git commit -m "feat: skill.md — LLM-readable endpoint catalog for 0GENT"
```

---

## Task 11: README + Architecture Documentation

**Files:**
- Create: `README.md`

The README is explicitly judged. It must include: system architecture diagram, 0G module explanations, local deployment instructions, and test account details.

- [ ] **Step 1: Write README.md**

```markdown
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
   │ Registry │   │ Cloudflare(Email)│   │ Agent Metadata│
   │ Identity │   │ Hetzner (VPS)    │   │ Call/Email   │
   │ (NFT)    │   │ Namecheap (DNS)  │   │ Logs         │
   └──────────┘   └──────────────────┘   └──────────────┘
```

## 0G Integration (4 Components)

| Component | How 0GENT Uses It |
|-----------|-------------------|
| **0G Chain** | All payments settle on-chain via `ZeroGentPayment.sol`. Resource ownership tracked via `AgentRegistry.sol`. Agent identity is an ERC-721 NFT (`ZeroGentIdentity.sol`). |
| **0G Storage** | Agent memory (key-value pairs), identity metadata, call logs, and email history are persisted to 0G's decentralized storage network via the TypeScript SDK. |
| **Agent Identity (NFT)** | Each agent mints one ERC-721 identity NFT. The token carries a metadata URI pointing to 0G Storage. The token ID is the agent's permanent on-chain identity. |
| **x402 Payments** | Agents pay for resources using the x402 HTTP payment protocol, adapted for 0G Chain native token transfers. |

## Smart Contracts (0G Mainnet)

| Contract | Address | Explorer |
|----------|---------|----------|
| ZeroGentPayment | `TODO` | [View](https://chainscan.0g.ai/address/TODO) |
| AgentRegistry | `TODO` | [View](https://chainscan.0g.ai/address/TODO) |
| ZeroGentIdentity | `TODO` | [View](https://chainscan.0g.ai/address/TODO) |

## Local Deployment

### Prerequisites
- Node.js >= 22
- Foundry (forge, cast)
- 0G testnet tokens (https://faucet.0g.ai)

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
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://evmrpc-testnet.0g.ai \
  --broadcast
```

Copy the deployed addresses into `.env`.

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

# Search for phone numbers (free)
curl http://localhost:3000/phone/search?country=US
```

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

## Hackathon

Built for the [0G APAC Hackathon](https://www.hackquest.io/hackathons/0G-APAC-Hackathon) — Track 1: Agentic Infrastructure.

#0GHackathon #BuildOn0G @0G_labs @0g_CN @0g_Eco @HackQuest_
```

- [ ] **Step 2: Commit**

```bash
cd /Users/admin/.pg/0GENT
git add README.md
git commit -m "docs: comprehensive README with architecture diagram and deployment guide"
```

---

## Task 12: Frontend Dashboard

**Files:**
- Create: `frontend/index.html`

Minimal static dashboard. Connects to backend API, shows agent identity and provisioned resources. This is for the demo video — not a full app.

- [ ] **Step 1: Write index.html**

This is a single-page static HTML dashboard with embedded CSS and JS. It calls the backend API to display:
- Agent identity (NFT info)
- List of provisioned resources (phone, email, compute, domain)
- Memory keys
- Health status

The dashboard should use the design language from the hackathon (dark theme, accent color). Build it as a single HTML file with embedded `<style>` and `<script>` tags — no build step needed. Use `fetch()` to call the backend API.

Key sections:
1. Header with "0GENT" branding and chain status badge
2. Input field for agent wallet address
3. Identity card (tokenId, metadata URI, resource count)
4. Resource grid (cards for each provisioned resource)
5. Memory viewer (list of keys with expandable values)

Keep it under 500 lines. Prioritize looking good in the demo video over feature completeness.

- [ ] **Step 2: Commit**

```bash
cd /Users/admin/.pg/0GENT
git add frontend/
git commit -m "feat: minimal dashboard for demo"
```

---

## Task 13: Deploy to 0G Mainnet + Final Verification

**Files:**
- Modify: `.env` (mainnet contract addresses)
- Modify: `README.md` (fill in contract addresses)

- [ ] **Step 1: Get 0G mainnet tokens**

Fund the deployer wallet with 0G tokens on mainnet.

- [ ] **Step 2: Deploy contracts to mainnet**

```bash
cd /Users/admin/.pg/0GENT/contracts
export ZG_MAINNET_RPC=https://evmrpc.0g.ai
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $ZG_MAINNET_RPC \
  --broadcast \
  --verify \
  --verifier custom \
  --verifier-api-key "placeholder" \
  --verifier-url "https://chainscan.0g.ai/open/api"
```

- [ ] **Step 3: Verify contracts on 0G Explorer**

```bash
forge verify-contract \
  --chain-id 16661 \
  --verifier custom \
  --verifier-api-key "placeholder" \
  --verifier-url "https://chainscan.0g.ai/open/api" \
  --compiler-version 0.8.24 \
  <PAYMENT_ADDRESS> \
  src/ZeroGentPayment.sol:ZeroGentPayment
```

Repeat for AgentRegistry and ZeroGentIdentity.

- [ ] **Step 4: Update .env with mainnet addresses**

- [ ] **Step 5: Update README.md with contract addresses and explorer links**

- [ ] **Step 6: End-to-end test on mainnet**

```bash
# Start backend pointing to mainnet
cd /Users/admin/.pg/0GENT/backend
npm run dev

# Test health
curl http://localhost:3000/health

# Test skill.md
curl http://localhost:3000/skill.md
```

- [ ] **Step 7: Commit**

```bash
cd /Users/admin/.pg/0GENT
git add .env.example README.md
git commit -m "feat: mainnet deployment — contracts verified on 0G Explorer"
```

---

## Task 14: Demo Video Script + Submission Prep

**Files:**
- Create: `docs/demo-script.md`

- [ ] **Step 1: Write demo script (3 minutes max)**

The demo video must show product functionality, user flow, and 0G integration in action. No slide-only presentations.

**Suggested script:**

```
[0:00-0:15] Title card: "0GENT — Decentralized Infrastructure for AI Agents"
Show: 0G Chain logo, the problem statement

[0:15-0:40] The Problem
"AI agents today are second-class citizens. They can't get a phone number,
an email, or a server without a human signing up for them.
0GENT changes that. An agent's wallet IS its identity."

[0:40-1:15] Live Demo: Agent reads skill.md
Show: curl GET /skill.md — the agent discovers what 0GENT offers
Show: The 402 response when calling without payment
Show: The payment transaction on 0G Chain Explorer

[1:15-1:45] Live Demo: Agent provisions a phone number
Show: The x402 flow — 402 → pay → provision → on-chain registration
Show: The phone number in the AgentRegistry on 0G Explorer
Show: Agent sends an SMS

[1:45-2:15] Live Demo: Agent memory on 0G Storage
Show: Agent writes memory to 0G Storage
Show: Agent reads it back
Show: The data on 0G Storage Explorer

[2:15-2:40] Architecture + 0G Integration
Show: Architecture diagram from README
Highlight: 4 components — Chain (payments + registry + identity), Storage (memory)

[2:40-3:00] Closing
"0GENT: sovereign infrastructure for AI agents.
Built on 0G Chain. Open source."
Show: GitHub link, contract addresses on Explorer
```

- [ ] **Step 2: Record and upload to YouTube/Loom**

- [ ] **Step 3: Post on X**

```
Introducing 0GENT — decentralized infrastructure for AI agents, built on @0G_labs

An agent pays with 0G tokens and instantly gets:
- Phone numbers
- Email inboxes
- Compute instances
- Domains

Identity = on-chain NFT. Memory = 0G Storage. Payments = x402.

No API keys. No signup. Wallet = identity.

[demo video link]
[github link]

#0GHackathon #BuildOn0G @0G_labs @0g_CN @0g_Eco @HackQuest_
```

- [ ] **Step 4: Submit on HackQuest before May 16, 2026 23:59 UTC+8**

Submission checklist:
- [ ] Project name + one-sentence description (max 30 words)
- [ ] Public GitHub repo with real code
- [ ] 0G mainnet contract address + Explorer verification link
- [ ] 3-minute demo video (YouTube/Loom)
- [ ] README with architecture diagram, 0G module docs, deployment instructions
- [ ] X/Twitter post with required hashtags and tags

---

## Self-Review

**Spec coverage:**
- x402 payments on 0G Chain: Task 1 (contract) + Task 5 (middleware) ✓
- On-chain resource registry: Task 2 ✓
- Agent identity NFT: Task 3 ✓
- Phone/SMS via Telnyx: Task 7 ✓
- Email via Cloudflare: Task 8 ✓
- Compute via Hetzner: Task 8 ✓
- Domains via Namecheap: Task 8 ✓
- 0G Storage for memory: Task 6 (service) + Task 9 (routes) ✓
- skill.md: Task 10 ✓
- README with architecture: Task 11 ✓
- Dashboard: Task 12 ✓
- Mainnet deployment + verification: Task 13 ✓
- Demo video + submission: Task 14 ✓

**Placeholder scan:** No TBD/TODO in implementation steps. Contract addresses marked `TODO` in README are filled in Task 13.

**Type consistency:** `AuthenticatedRequest` used consistently across all routes. `PaymentInfo` interface matches what x402 middleware attaches. `registerResourceOnChain` signature matches across all route files (agent: string, type: number, ref: string, expires: number).

**Reality checks incorporated:**
- Native 0G token used (not USDC) ✓
- ERC-721 used (not ERC-7857) ✓
- `evmVersion: "cancun"` in foundry.toml ✓
- Correct chain IDs (16661 mainnet, 16602 testnet) ✓
- Correct 0G Storage SDK package name ✓
- Passkey/P-256 features deliberately excluded from MVP ✓
