import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import { config } from "../config";
import {
  getProvider,
  getIdentityContract,
  getRegistryContract,
} from "../services/chain";

const router = Router();

// Resource types from AgentRegistry.sol
const RESOURCE_TYPE_LABEL: Record<number, string> = {
  0: "phone",
  1: "email",
  2: "compute",
  3: "domain",
};

const RESOURCE_STATUS_LABEL: Record<number, string> = {
  0: "active",
  1: "expired",
  2: "revoked",
};

/**
 * Public agent profile: identity NFT + resources + balance, all read from chain.
 * No payment required, no auth.
 */
router.get("/:address", async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    if (!ethers.isAddress(address)) {
      res.status(400).json({ error: "Invalid address" });
      return;
    }

    const provider = getProvider();
    const identity = getIdentityContract();
    const registry = getRegistryContract();

    // Read everything in parallel
    const [balance, tokenIdRaw, resourceIdsRaw] = await Promise.all([
      provider.getBalance(address),
      identity.agentTokenId(address),
      registry.getAgentResourceIds(address),
    ]);

    const tokenId = Number(tokenIdRaw);
    let identityData: { tokenId: number; metadataURI: string; resourceCount: number } | null = null;
    if (tokenId > 0) {
      const [metadataURI, resourceCount] = await Promise.all([
        identity.tokenURI(tokenIdRaw),
        identity.resourceCount(tokenIdRaw),
      ]);
      identityData = {
        tokenId,
        metadataURI,
        resourceCount: Number(resourceCount),
      };
    }

    // Detail each resource id (may be 0 results)
    const resourceIds = (resourceIdsRaw as bigint[]).map((b) => b);
    const resources = await Promise.all(
      resourceIds.map(async (id) => {
        const r = await registry.getResource(id);
        const type = Number(r.resourceType);
        const status = Number(r.status);
        return {
          id: Number(r.id),
          type,
          typeLabel: RESOURCE_TYPE_LABEL[type] || "unknown",
          status,
          statusLabel: RESOURCE_STATUS_LABEL[status] || "unknown",
          providerRef: r.providerRef,
          createdAt: new Date(Number(r.createdAt) * 1000).toISOString(),
          expiresAt: Number(r.expiresAt) > 0
            ? new Date(Number(r.expiresAt) * 1000).toISOString()
            : null,
        };
      })
    );

    res.json({
      address,
      identity: identityData,
      resources,
      balance: ethers.formatEther(balance),
      balanceWei: balance.toString(),
      chain: { chainId: config.zgChainId },
      explorer: `https://chainscan-galileo.0g.ai/address/${address}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
