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
