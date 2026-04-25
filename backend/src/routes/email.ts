import { Router, Response, Request } from "express";
import { x402, AuthenticatedRequest } from "../middleware/x402";
import { config } from "../config";
import * as emailService from "../services/email";
import { registerResourceOnChain } from "../services/chain";

const router = Router();

// ─── Provision an inbox (paid) ───
router.post(
  "/provision",
  x402(config.priceEmailProvision, "email"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payer = req.payment!.payer;
      const localPart = String(req.body.name || req.body.localPart || `agent-${payer.slice(2, 10)}`);
      const inbox = await emailService.provisionInbox(localPart, payer);

      const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const resourceId = await registerResourceOnChain(payer, 1, inbox.address, expiresAt);

      res.json({
        ...inbox,
        resourceId,
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        message: "Email inbox provisioned and registered on 0G Chain",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Send (paid) ───
router.post(
  "/:id/send",
  x402(config.priceEmailSend, "email-send"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payer = req.payment!.payer;
      const id = String(req.params.id);
      const to = String(req.body.to || "");
      const subject = String(req.body.subject || "");
      const body = String(req.body.body || "");
      if (!to) { res.status(400).json({ error: "to is required" }); return; }
      if (!body) { res.status(400).json({ error: "body is required" }); return; }

      const result = await emailService.sendEmail(id, payer, to, subject, body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Read inbox (paid) ───
router.get(
  "/:id/inbox",
  x402(config.priceEmailRead, "email-read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payer = req.payment!.payer;
      const id = String(req.params.id);
      const messages = emailService.listMessages(id, payer);
      res.json({ messages });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Threads (paid) ───
router.get(
  "/:id/threads",
  x402(config.priceEmailRead, "email-threads"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payer = req.payment!.payer;
      const id = String(req.params.id);
      const threads = emailService.listThreads(id, payer);
      res.json({ threads });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Inbound webhook (Cloudflare Worker → us) ───
// This endpoint is FREE (not x402-gated). It must be authenticated by the
// EMAIL_WEBHOOK_SECRET header so only your Worker can post here.
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const secret = req.header("X-0GENT-Webhook-Secret") || "";
    if (!config.emailWebhookSecret || secret !== config.emailWebhookSecret) {
      res.status(401).json({ error: "Unauthorized webhook" });
      return;
    }

    const payload = req.body as emailService.InboundEmailPayload;
    if (!payload?.from || !payload?.to) {
      res.status(400).json({ error: "from and to are required" });
      return;
    }

    const result = emailService.handleInboundEmail(payload);
    res.json(result);
  } catch (err: any) {
    console.error("[email/webhook]", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
