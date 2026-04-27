/**
 * Email service for 0GENT.
 *
 * Inbound: Cloudflare Email Routing catches *@<emailDomain> and forwards
 *          to a Worker which POSTs to /email/webhook on this server.
 * Outbound: Resend SDK sends from <localPart>@<emailDomain>.
 *
 * The local SQLite cache is the canonical record agents read from.
 */
import { v4 as uuid } from "uuid";
import { Resend } from "resend";
import { config } from "../config";
import { db } from "../db";

const CF_API = "https://api.cloudflare.com/client/v4";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!config.resendApiKey) {
    throw new Error("RESEND_API_KEY not configured. See README to obtain one.");
  }
  if (!_resend) _resend = new Resend(config.resendApiKey);
  return _resend;
}

// ─── Cloudflare Email Routing ───

async function cfFetch<T = any>(path: string, method: string, body?: unknown): Promise<T> {
  if (!config.cloudflareApiToken) {
    throw new Error("CLOUDFLARE_API_TOKEN not configured");
  }
  const res = await fetch(`${CF_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.cloudflareApiToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Create a Cloudflare Email Routing rule:
 *   <localPart>@<emailDomain>  →  forwards to CLOUDFLARE_INBOUND_DESTINATION
 *
 * The destination should be a Cloudflare Worker that POSTs the email to
 * /email/webhook on this backend (with header X-0GENT-Webhook-Secret).
 *
 * If Cloudflare creds are not set, the inbox is created locally only —
 * outbound still works, inbound is disabled until creds are added.
 */
async function createCloudflareRoutingRule(address: string, localPart: string): Promise<string | null> {
  if (!config.cloudflareApiToken || !config.cloudflareZoneId) return null;

  const destination = config.cloudflareInboundDestination;
  if (!destination) return null;

  const action = destination.startsWith("worker:")
    ? { type: "worker", value: [destination.slice(7)] }
    : { type: "forward", value: [destination] };

  const result = await cfFetch<{ result: { id: string } }>(
    `/zones/${config.cloudflareZoneId}/email/routing/rules`,
    "POST",
    {
      name: `0gent-${localPart}`,
      enabled: true,
      matchers: [{ type: "literal", field: "to", value: address }],
      actions: [action],
      priority: 0,
    }
  );
  return result.result?.id || null;
}

// ─── Inbox provisioning ───

export interface ProvisionedInbox {
  id: string;
  address: string;
  localPart: string;
  owner: string;
  createdAt: string;
}

export async function provisionInbox(localPart: string, owner: string): Promise<ProvisionedInbox> {
  const cleaned = localPart.toLowerCase().replace(/[^a-z0-9._-]/g, "");
  if (!cleaned || cleaned.length > 32) {
    throw new Error("Invalid local part. Use 1–32 characters: letters, numbers, . _ -");
  }

  const address = `${cleaned}@${config.emailDomain}`;
  const existing = db.prepare("SELECT id FROM email_inboxes WHERE local_part = ?").get(cleaned);
  if (existing) throw new Error(`Address ${address} is already taken`);

  let cfRuleId: string | null = null;
  try {
    cfRuleId = await createCloudflareRoutingRule(address, cleaned);
  } catch (err: any) {
    console.warn("[email] Cloudflare routing setup skipped:", err.message);
  }

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO email_inboxes (id, address, local_part, owner, cf_routing_rule_id, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, address, cleaned, owner, cfRuleId, now);

  return { id, address, localPart: cleaned, owner, createdAt: now };
}

export function getInbox(id: string, owner: string): any {
  return db.prepare("SELECT * FROM email_inboxes WHERE id = ? AND owner = ?").get(id, owner);
}

export function getInboxByAddress(address: string): any {
  return db.prepare("SELECT * FROM email_inboxes WHERE address = ?").get(address);
}

// ─── Sending ───

export interface SendResult {
  id: string;
  from: string;
  to: string;
  subject: string;
  timestamp: string;
  providerId?: string;
}

export async function sendEmail(
  inboxId: string,
  owner: string,
  to: string,
  subject: string,
  body: string
): Promise<SendResult> {
  const inbox = getInbox(inboxId, owner);
  if (!inbox) throw new Error("Inbox not found or not owned by you");
  if (!inbox.active) throw new Error("Inbox is deactivated");

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    throw new Error("Invalid recipient address");
  }

  const fromName = config.resendFromName || "0GENT Agent";
  const fromHeader = `${fromName} <${inbox.address}>`;

  let providerId: string | undefined;
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: fromHeader,
      to,
      subject,
      text: body,
    });
    providerId = (result as any)?.data?.id || (result as any)?.id;
  } catch (err: any) {
    throw new Error(`Resend send failed: ${err?.message || String(err)}`);
  }

  const id = uuid();
  const now = new Date().toISOString();
  const threadId = `thr_${id}`;

  db.prepare(
    `INSERT INTO email_messages
     (id, inbox_id, direction, from_address, to_address, subject, body_text, thread_id, provider_id, timestamp)
     VALUES (?, ?, 'outbound', ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, inboxId, inbox.address, to, subject, body, threadId, providerId || null, now);

  return { id, from: inbox.address, to, subject, timestamp: now, providerId };
}

// ─── Reading ───

export interface EmailMessage {
  id: string;
  inboxId: string;
  direction: "inbound" | "outbound";
  from: string;
  to: string;
  subject: string;
  body: string;
  threadId: string | null;
  timestamp: string;
}

export function listMessages(inboxId: string, owner: string, limit = 50): EmailMessage[] {
  const inbox = getInbox(inboxId, owner);
  if (!inbox) throw new Error("Inbox not found or not owned by you");

  const rows = db
    .prepare(
      `SELECT id, inbox_id, direction, from_address, to_address, subject, body_text, thread_id, timestamp
       FROM email_messages WHERE inbox_id = ? ORDER BY timestamp DESC LIMIT ?`
    )
    .all(inboxId, limit) as any[];

  return rows.map(r => ({
    id: r.id,
    inboxId: r.inbox_id,
    direction: r.direction,
    from: r.from_address,
    to: r.to_address,
    subject: r.subject,
    body: r.body_text,
    threadId: r.thread_id,
    timestamp: r.timestamp,
  }));
}

export interface ThreadSummary {
  threadId: string;
  subject: string;
  lastMessageAt: string;
  messageCount: number;
  participants: string[];
}

export function listThreads(inboxId: string, owner: string): ThreadSummary[] {
  const inbox = getInbox(inboxId, owner);
  if (!inbox) throw new Error("Inbox not found or not owned by you");

  const rows = db
    .prepare(
      `SELECT thread_id, subject, MAX(timestamp) AS last_ts, COUNT(*) AS msg_count,
              GROUP_CONCAT(DISTINCT from_address) AS senders
       FROM email_messages WHERE inbox_id = ? AND thread_id IS NOT NULL
       GROUP BY thread_id ORDER BY last_ts DESC`
    )
    .all(inboxId) as any[];

  return rows.map(r => ({
    threadId: r.thread_id,
    subject: r.subject,
    lastMessageAt: r.last_ts,
    messageCount: r.msg_count,
    participants: String(r.senders || "").split(",").filter(Boolean),
  }));
}

// ─── Inbound webhook (Cloudflare Worker → us) ───

export interface InboundEmailPayload {
  from: string;
  to: string;
  subject?: string;
  text?: string;
  html?: string;
  messageId?: string;
  inReplyTo?: string;
  receivedAt?: string;
}

/**
 * Strip HTML to readable plaintext. Used when senders (e.g. Gmail) supply
 * an HTML-only body. Cheap regex pass — good enough for a hackathon-grade
 * agent inbox. Strip styles/scripts, convert breaks to newlines, decode
 * the most common entities, collapse whitespace.
 */
export function htmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&[a-z]+;/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function handleInboundEmail(payload: InboundEmailPayload): { stored: boolean; inboxId?: string } {
  const inbox = getInboxByAddress(payload.to.toLowerCase());
  if (!inbox) {
    console.warn(`[email] Inbound email to unknown address: ${payload.to}`);
    return { stored: false };
  }

  const id = uuid();
  const now = payload.receivedAt || new Date().toISOString();
  const subject = payload.subject || "(no subject)";

  // Derive plaintext from HTML when senders supply HTML-only (common for Gmail)
  const bodyText = payload.text && payload.text.trim().length > 0
    ? payload.text
    : payload.html
      ? htmlToText(payload.html)
      : "";

  // Reuse thread if Re: prefix matches an existing subject
  let threadId: string | null = null;
  const cleanSubject = subject.replace(/^(re:|fwd?:)\s*/i, "").trim();
  if (cleanSubject) {
    const prior = db
      .prepare(
        "SELECT thread_id FROM email_messages WHERE inbox_id = ? AND subject LIKE ? ORDER BY timestamp DESC LIMIT 1"
      )
      .get(inbox.id, `%${cleanSubject}%`) as any;
    if (prior?.thread_id) threadId = prior.thread_id;
  }
  if (!threadId) threadId = `thr_${id}`;

  db.prepare(
    `INSERT INTO email_messages
     (id, inbox_id, direction, from_address, to_address, subject, body_text, body_html, thread_id, message_id, in_reply_to, timestamp)
     VALUES (?, ?, 'inbound', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    inbox.id,
    payload.from,
    payload.to,
    subject,
    bodyText,
    payload.html || null,
    threadId,
    payload.messageId || null,
    payload.inReplyTo || null,
    now
  );

  return { stored: true, inboxId: inbox.id };
}
