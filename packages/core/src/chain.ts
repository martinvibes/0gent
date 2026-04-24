import { JsonRpcProvider, Contract, Wallet } from 'ethers';
import { load } from './config.js';

export const PAYMENT_ABI = [
  'function pay(bytes32 nonce, string calldata resourceType) external payable',
  'function isNonceUsed(bytes32 nonce) external view returns (bool)',
  'event PaymentReceived(address indexed payer, uint256 amount, bytes32 indexed nonce, string resourceType, uint256 timestamp)',
];

export const REGISTRY_ABI = [
  'function getAgentResourceIds(address agent) external view returns (uint256[])',
  'function getResource(uint256 resourceId) external view returns (tuple(uint256 id, uint8 resourceType, uint8 status, string providerRef, uint256 createdAt, uint256 expiresAt))',
  'function getAgentResourceCount(address agent) external view returns (uint256)',
];

export const IDENTITY_ABI = [
  'function agentTokenId(address agent) external view returns (uint256)',
  'function hasIdentity(address agent) external view returns (bool)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function resourceCount(uint256 tokenId) external view returns (uint256)',
];

export enum ResourceType {
  Phone = 0,
  Email = 1,
  Compute = 2,
  Domain = 3,
}

export const RESOURCE_LABEL = ['phone', 'email', 'compute', 'domain'];

export function getProvider(rpcUrl?: string): JsonRpcProvider {
  const cfg = load();
  return new JsonRpcProvider(rpcUrl || cfg.rpcUrl, {
    chainId: cfg.chainId,
    name: '0g-chain',
  });
}

export function getPaymentContract(signerOrProvider: Wallet | JsonRpcProvider): Contract {
  const cfg = load();
  return new Contract(cfg.paymentContract, PAYMENT_ABI, signerOrProvider);
}

export function getRegistryContract(signerOrProvider: Wallet | JsonRpcProvider): Contract {
  const cfg = load();
  return new Contract(cfg.registryContract, REGISTRY_ABI, signerOrProvider);
}

export function getIdentityContract(signerOrProvider: Wallet | JsonRpcProvider): Contract {
  const cfg = load();
  return new Contract(cfg.identityContract, IDENTITY_ABI, signerOrProvider);
}

export function explorerTx(txHash: string): string {
  const cfg = load();
  const base = cfg.chainId === 16661 ? 'https://chainscan.0g.ai' : 'https://chainscan-galileo.0g.ai';
  return `${base}/tx/${txHash}`;
}

export function explorerAddress(addr: string): string {
  const cfg = load();
  const base = cfg.chainId === 16661 ? 'https://chainscan.0g.ai' : 'https://chainscan-galileo.0g.ai';
  return `${base}/address/${addr}`;
}
