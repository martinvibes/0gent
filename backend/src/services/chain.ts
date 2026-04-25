import { ethers } from "ethers";
import { config } from "../config";

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
  "event ResourceRegistered(address indexed agent, uint256 indexed resourceId, uint8 resourceType, string providerRef, uint256 expiresAt)",
  "event ResourceDeactivated(uint256 indexed resourceId)",
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
  if (receipt.to?.toLowerCase() !== config.paymentContractAddress.toLowerCase()) {
    return { valid: false, payer: receipt.from, amount: 0n, reason: "wrong_contract" };
  }

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
      // Not our event
    }
  }
  return { valid: false, payer: receipt.from, amount: 0n, reason: "no_payment_event" };
}

export async function registerResourceOnChain(
  agent: string,
  resourceType: number,
  providerRef: string,
  expiresAt: number
): Promise<number> {
  const registry = getRegistryContract();
  const tx = await registry.registerResource(agent, resourceType, providerRef, expiresAt);
  const receipt = await tx.wait();

  const iface = new ethers.Interface(REGISTRY_ABI);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed && parsed.name === "ResourceRegistered") {
        return Number(parsed.args[1]);
      }
    } catch {
      // skip
    }
  }
  throw new Error("ResourceRegistered event not found in tx receipt");
}
