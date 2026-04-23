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
      const name = String(req.body.name || `0gent-${payer.slice(2, 10)}`);
      const serverType = String(req.body.type || "cx22");
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
    const status = await computeService.getServerStatus(String(req.params.id));
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    await computeService.deleteServer(String(req.params.id));
    res.json({ message: "Server terminated" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
