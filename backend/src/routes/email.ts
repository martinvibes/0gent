import { Router, Response, Request } from "express";
import { x402, AuthenticatedRequest } from "../middleware/x402";
import { config } from "../config";
import * as emailService from "../services/email";
import { registerResourceOnChain } from "../services/chain";
import { db } from "../db";
import { ethers } from "ethers";

const router = Router();

// ─── List inboxes owned by an address (free) ───
//
// `/agent/<address>` returns on-chain numeric resource IDs; this endpoint
// returns the DB-level inbox rows including the UUID `id` that send/read/threads
// expect. Used by the user dashboard to bridge the on-chain → DB gap.
//
// Owner match is checksum-aware: the deployer wallet uses ethers' canonical
// checksumming, but the on-chain payer might come back lowercased depending
// on transaction encoding. Compare in lowercase form to be safe.
router.get("/by-owner/:address", (req: Request, res: Response) => {
  try {
    const raw = req.params.address;
    if (!ethers.isAddress(raw)) {
      res.status(400).json({ error: "Invalid address" });
      return;
    }
    const lower = raw.toLowerCase();
    const rows = db.prepare(
      "SELECT id, address, local_part, owner, created_at, active FROM email_inboxes WHERE LOWER(owner) = ? AND active = 1 ORDER BY created_at DESC"
    ).all(lower) as any[];
    res.json({ inboxes: rows, count: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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

// ─── Inbound webhook normalizer ───
//
// Accepts payloads from any of:
//   - Cloudflare Email Worker (uses our explicit shape)
//   - Resend Inbound  (event-wrapped: { type: "email.received", data: {...} })
//   - SES SNS / generic mailparser shapes
//
// Just digs through the JSON for the fields we need. If the inbound provider
// doesn't match a known shape, returns 400.
function normalizeInbound(body: any): emailService.InboundEmailPayload | null {
  if (!body || typeof body !== "object") return null;

  // Resend inbound: { type: "email.received", data: { from, to, subject, ... } }
  // Could also wrap as { event, payload } depending on version.
  const data = body.data || body.payload || body;

  // ── from ──
  let from: string | undefined;
  if (typeof data.from === "string") from = data.from;
  else if (data.from?.email) from = data.from.email;
  else if (Array.isArray(data.from) && data.from[0]?.address) from = data.from[0].address;

  // ── to ──
  let to: string | undefined;
  if (typeof data.to === "string") to = data.to;
  else if (Array.isArray(data.to)) {
    const first = data.to[0];
    to = typeof first === "string" ? first : first?.email || first?.address;
  } else if (data.to?.email) to = data.to.email;
  else if (data.envelope?.to?.[0]) to = data.envelope.to[0];

  if (!from || !to) return null;

  return {
    from: String(from).toLowerCase(),
    to: String(to).toLowerCase(),
    subject: data.subject || "",
    text: data.text || data.body_plain || data["body-plain"] || "",
    html: data.html || data.body_html || data["body-html"] || "",
    messageId: data.message_id || data.messageId || data["Message-Id"] || undefined,
    inReplyTo: data.in_reply_to || data.inReplyTo || data["In-Reply-To"] || undefined,
    receivedAt: data.received_at || data.created_at || data.date || new Date().toISOString(),
    // Resend includes email_id in webhook metadata; the body is fetched via Resend API
    emailId: data.email_id || data.emailId || undefined,
  };
}

// ─── Inbound webhook (Cloudflare Worker / Resend / generic) ───
//
// Authentication options (any one works):
//   1. X-0GENT-Webhook-Secret header matches EMAIL_WEBHOOK_SECRET
//   2. ?secret=<value> query param matches EMAIL_WEBHOOK_SECRET (for providers
//      that don't let you set custom headers, e.g. Resend free tier)
//
// Both Cloudflare Worker and Resend dashboard support setting a header, so
// option 1 is preferred. Query string is a fallback.
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const headerSecret = req.header("X-0GENT-Webhook-Secret") || "";
    const querySecret = String(req.query.secret || "");
    const presented = headerSecret || querySecret;

    if (!config.emailWebhookSecret || presented !== config.emailWebhookSecret) {
      res.status(401).json({ error: "Unauthorized webhook" });
      return;
    }

    const payload = normalizeInbound(req.body);
    if (!payload) {
      console.warn("[email/webhook] could not extract from/to from payload:", JSON.stringify(req.body).slice(0, 400));
      res.status(400).json({ error: "Could not extract from/to from payload" });
      return;
    }

    const result = await emailService.handleInboundEmail(payload);
    res.json(result);
  } catch (err: any) {
    console.error("[email/webhook]", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
