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
