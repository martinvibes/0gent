import { ethers } from "ethers";
import { type ChainConfig } from "../chains";
import { config } from "../config";

const ERC8004_ABI = [
  "function register(string memory agentURI) external returns (uint256 agentId)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
];

export async function registerAgent(
  payer: string,
  name: string,
  chainConfig: ChainConfig
) {
  const agentURI = JSON.stringify({
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: name || "0gent-agent",
    description: `AI agent on 0GENT (${chainConfig.name})`,
    services: [
      { name: "web", endpoint: "https://0gent.xyz" },
      { name: "A2A", endpoint: "https://api.0gent.xyz/skill.md" },
    ],
    x402Support: true,
    active: true,
  });

  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const signer = new ethers.Wallet(config.deployerPrivateKey, provider);
  const registry = new ethers.Contract(chainConfig.identityContract, ERC8004_ABI, signer);

  const tx = await registry.register(agentURI);
  const receipt = await tx.wait();

  const event = receipt.logs
    .map((log: any) => { try { return registry.interface.parseLog(log); } catch { return null; } })
    .find((e: any) => e?.name === "Registered");

  return {
    agentId: event ? Number(event.args.agentId) : 0,
    agentURI,
    owner: payer,
    txHash: tx.hash,
    registry: chainConfig.identityContract,
  };
}

export async function getAgentIdentity(address: string, chainConfig: ChainConfig) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const registry = new ethers.Contract(chainConfig.identityContract, ERC8004_ABI, provider);

  try {
    const balance = await registry.balanceOf(address);
    if (balance === 0n) return null;
    const tokenId = await registry.tokenOfOwnerByIndex(address, 0);
    const uri = await registry.tokenURI(Number(tokenId));
    return { agentId: Number(tokenId), agentURI: uri, owner: address };
  } catch {
    return null;
  }
}
