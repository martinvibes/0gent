import { Router, Response, Request } from "express";
import { x402, AuthenticatedRequest } from "../middleware/x402";
import { config } from "../config";
import * as computeService from "../services/compute";
import * as inferenceService from "../services/inference";
import { registerResourceOnChain } from "../services/chain";

const router = Router();

// ─── 0G Compute (AI inference) ────────────────────────────────────────

router.get("/providers", async (_req: Request, res: Response) => {
  try {
    const providers = await inferenceService.listProviders();
    res.json({ providers, count: providers.length });
  } catch (err: any) {
    res.status(503).json({ error: err.message });
  }
});

router.get("/status", async (_req: Request, res: Response) => {
  try {
    const [providers, ledger] = await Promise.all([
      inferenceService.listProviders().catch(() => []),
      inferenceService.getLedgerStatus(),
    ]);
    res.json({
      operator: "0G Compute Network",
      providersAvailable: providers.length,
      sampleProviders: providers.slice(0, 3).map((p: any) => ({
        provider: p.provider, model: p.model, type: p.serviceType,
      })),
      ledger,
      ready: ledger.exists && Number(ledger.available) > 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  "/infer",
  x402(config.priceComputeInfer, "compute-infer"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { prompt, model, maxTokens, system } = req.body || {};
      if (!prompt || typeof prompt !== "string") {
        res.status(400).json({ error: "prompt (string) is required" });
        return;
      }
      if (prompt.length > 8000) {
        res.status(400).json({ error: "prompt too long (max 8000 chars)" });
        return;
      }

      try {
        const result = await inferenceService.infer(prompt, {
          model: typeof model === "string" ? model : undefined,
          maxTokens: typeof maxTokens === "number" ? maxTokens : undefined,
          system: typeof system === "string" ? system : undefined,
        });

        res.json({
          ...result,
          message: "Inference completed via 0G Compute Network",
          chain: { chainId: config.zgChainId },
        });
      } catch (e: any) {
        // Ledger not funded yet — return a clear actionable error instead of generic 500
        const msg = String(e?.message || e);
        if (/account does not exist|insufficient|locked/i.test(msg)) {
          res.status(503).json({
            error: "0G Compute ledger not yet funded by operator",
            detail: msg,
            hint: "GET /compute/status to see ledger state. Operator must call broker.ledger.addLedger(3) once.",
          });
          return;
        }
        throw e;
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Hetzner VPS provisioning (existing) ──────────────────────────────

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
