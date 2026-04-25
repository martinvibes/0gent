/**
 * 0GENT inbound email worker.
 *
 * Cloudflare Email Routing receives a message at <local>@0gent.xyz, runs this
 * worker, which then POSTs the parsed message to our backend webhook.
 *
 * Setup:
 *   1. Cloudflare Dashboard → your domain → Email → Email Routing → Email Workers
 *   2. Create a new worker with this code
 *   3. Set the secret BACKEND_URL  (e.g. https://api.0gent.xyz)
 *   4. Set the secret WEBHOOK_SECRET  (must match backend EMAIL_WEBHOOK_SECRET)
 *   5. Email Routing → Routing rules → Catch-all → Send to a Worker → pick this
 *
 * Notes:
 *   - Cloudflare workers receive ReadableStream for the raw message; we just
 *     extract from/to/subject and the text/html bodies via the postal-mime
 *     parser.
 *   - Anything that fails parsing is forwarded with raw=true so the backend
 *     can still log it.
 */
import PostalMime from "postal-mime";

export default {
  async email(message, env, _ctx) {
    const backend = env.BACKEND_URL;
    const secret = env.WEBHOOK_SECRET;
    if (!backend || !secret) {
      console.error("Missing BACKEND_URL or WEBHOOK_SECRET");
      return;
    }

    let payload;
    try {
      const raw = new Response(message.raw);
      const parsed = await PostalMime.parse(await raw.arrayBuffer());
      payload = {
        from: message.from,
        to: message.to,
        subject: parsed.subject || "",
        text: parsed.text || "",
        html: parsed.html || "",
        messageId: parsed.messageId || null,
        inReplyTo: parsed.inReplyTo || null,
        receivedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.warn("Parse failed, forwarding raw envelope only:", err);
      payload = {
        from: message.from,
        to: message.to,
        subject: message.headers.get("subject") || "",
        text: "",
        html: "",
        receivedAt: new Date().toISOString(),
      };
    }

    const res = await fetch(backend.replace(/\/$/, "") + "/email/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-0GENT-Webhook-Secret": secret,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("Backend rejected webhook:", res.status, await res.text());
      message.setReject("Backend unavailable");
    }
  },
};
