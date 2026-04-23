import { Router, Response } from "express";
import { x402, AuthenticatedRequest } from "../middleware/x402";
import { config } from "../config";
import { getIdentityContract } from "../services/chain";
import { uploadAgentMetadata } from "../services/storage";

const router = Router();

router.post(
  "/mint",
  x402(config.priceIdentityMint, "identity"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payer = req.payment!.payer;
      const name = req.body.name || "";
      const identity = getIdentityContract();

      const existing = await identity.agentTokenId(payer);
      if (existing > 0n) {
        res.status(409).json({ error: "Identity already minted", tokenId: Number(existing) });
        return;
      }

      const metadataHash = await uploadAgentMetadata(payer, name, new Date().toISOString());
      const metadataURI = `0g://${metadataHash}`;

      const tx = await identity.mintIdentity(payer, metadataURI);
      const receipt = await tx.wait();

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
