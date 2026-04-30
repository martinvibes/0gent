/**
 * Twilio phone-service implementation.
 *
 * Mirrors the same exported function signatures as `./phone.ts` (Telnyx)
 * so they can be swapped at the dispatcher level (see `./phone-provider.ts`).
 *
 * On a Twilio TRIAL account:
 *   - searchNumbers()   → works (free, returns real available inventory)
 *   - provisionNumber() → fails (trial accounts can't actually own numbers
 *                         without upgrading; Twilio returns a clear error)
 *   - sendSms()         → works only to verified caller-IDs on trial
 *   - getLogs()         → works (reads our local DB only)
 *
 * Auth uses Basic auth with Account SID as username + Auth Token as password.
 * No SDK dependency — Node 18+ has built-in fetch.
 */

import { v4 as uuid } from "uuid";
import { config } from "../config";
import { db } from "../db";

const TWILIO_API = "https://api.twilio.com/2010-04-01";

function authHeader(): string {
  if (!config.twilioAccountSid || !config.twilioAuthToken) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must both be set");
  }
  const creds = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64");
  return `Basic ${creds}`;
}

function accountUrl(path: string): string {
  return `${TWILIO_API}/Accounts/${config.twilioAccountSid}${path}`;
}

async function twilioGet(path: string): Promise<any> {
  const res = await fetch(accountUrl(path), { headers: { Authorization: authHeader() } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio GET ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function twilioPostForm(path: string, body: Record<string, string>): Promise<any> {
  const form = new URLSearchParams(body).toString();
  const res = await fetch(accountUrl(path), {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio POST ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json();
}

// ─── Search inventory ─────────────────────────────────────────────────
//
// GET /AvailablePhoneNumbers/{Country}/Local.json
//   ?AreaCode={areaCode}&PageSize=5
//
export async function searchNumbers(
  country: string,
  opts?: { areaCode?: string; limit?: number }
): Promise<Array<{ phoneNumber: string; region: string; type: string }>> {
  const limit = Math.max(1, Math.min(opts?.limit ?? 5, 20));
  const params = new URLSearchParams({ PageSize: String(limit) });
  if (opts?.areaCode) params.set("AreaCode", opts.areaCode);

  const path = `/AvailablePhoneNumbers/${country.toUpperCase()}/Local.json?${params.toString()}`;
  const data: any = await twilioGet(path);
  const list: any[] = data.available_phone_numbers || [];
  return list.map((n: any) => ({
    phoneNumber: n.phone_number,
    region: n.region || n.locality || country,
    type: "local",
  }));
}

// ─── Provision a number ───────────────────────────────────────────────
//
// POST /IncomingPhoneNumbers.json with form { PhoneNumber: "+1..." }
//
// On Twilio trial this will fail; Twilio returns a clean error which we
// surface to the caller as-is.
//
export async function provisionNumber(
  country: string,
  owner: string,
  areaCode?: string
): Promise<{ id: string; phoneNumber: string; country: string; owner: string; provisionedAt: string }> {
  const available = await searchNumbers(country, { areaCode, limit: 1 });
  if (available.length === 0) throw new Error(`No numbers available in ${country}`);

  const chosen = available[0].phoneNumber;
  await twilioPostForm("/IncomingPhoneNumbers.json", { PhoneNumber: chosen });

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO phone_numbers (id, phone_number, country, owner, provisioned_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, chosen, country, owner, now);

  return { id, phoneNumber: chosen, country, owner, provisionedAt: now };
}

// ─── Send SMS ─────────────────────────────────────────────────────────
//
// POST /Messages.json with form { From, To, Body }
//
// Twilio trial will only deliver to verified caller-ID numbers.
//
export async function sendSms(
  phoneNumberId: string,
  to: string,
  body: string,
  owner: string
): Promise<{ id: string; from: string; to: string; body: string; timestamp: string }> {
  const row = db.prepare("SELECT * FROM phone_numbers WHERE id = ? AND owner = ?").get(phoneNumberId, owner) as any;
  if (!row) throw new Error("Phone number not found or not owned by you");
  if (!row.active) throw new Error("Phone number is deactivated");

  await twilioPostForm("/Messages.json", {
    From: row.phone_number,
    To: to,
    Body: body,
  });

  const msgId = uuid();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO sms_messages (id, phone_number_id, direction, from_number, to_number, body, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(msgId, phoneNumberId, "outbound", row.phone_number, to, body, now);

  return { id: msgId, from: row.phone_number, to, body, timestamp: now };
}

// ─── Local DB read — provider-agnostic ────────────────────────────────
export function getLogs(phoneNumberId: string, owner: string): any[] {
  const row = db.prepare("SELECT * FROM phone_numbers WHERE id = ? AND owner = ?").get(phoneNumberId, owner) as any;
  if (!row) throw new Error("Phone number not found or not owned by you");
  return db.prepare("SELECT * FROM sms_messages WHERE phone_number_id = ? ORDER BY timestamp DESC").all(phoneNumberId);
}
