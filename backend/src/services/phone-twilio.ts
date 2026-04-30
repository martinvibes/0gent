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
// Twilio uses ISO 3166-1 alpha-2 codes (US, GB, CA, AU, DE, FR, IE, NL, ES,
// IT, BR, MX, SE, JP, ...). Common mistakes: "UK" should be "GB", "NGN" is
// the Naira currency code not Nigeria. When Twilio doesn't sell numbers in
// a country at all (e.g. Nigeria), they return 404 — we translate that into
// a friendlier "country not supported" message instead of leaking the raw
// upstream error.
//
const SUPPORTED_HINT =
  "Twilio supports 170+ countries but doesn't have local-number inventory in every one. " +
  "Try a different country — call GET /phone/countries (or `0gent phone countries`) for 50 curated picks. " +
  "Use ISO 3166-1 alpha-2 codes (e.g. GB not UK).";

export async function searchNumbers(
  country: string,
  opts?: { areaCode?: string; limit?: number }
): Promise<Array<{ phoneNumber: string; region: string; type: string }>> {
  const limit = Math.max(1, Math.min(opts?.limit ?? 5, 20));
  const params = new URLSearchParams({ PageSize: String(limit) });
  if (opts?.areaCode) params.set("AreaCode", opts.areaCode);

  const cc = country.toUpperCase();
  const path = `/AvailablePhoneNumbers/${cc}/Local.json?${params.toString()}`;
  let data: any;
  try {
    data = await twilioGet(path);
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/\(404\)/.test(msg)) {
      throw new Error(`No phone-number inventory available for "${cc}". ${SUPPORTED_HINT}`);
    }
    throw e;
  }
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
// Two modes:
//   1. specific: pass `phoneNumber` → buys that exact E.164 if Twilio still
//      has it in inventory. (Numbers can disappear seconds after a search if
//      someone else buys them.)
//   2. country: omit phoneNumber → searches inventory in {country, areaCode}
//      and buys the first available.
//
export async function provisionNumber(
  country: string,
  owner: string,
  areaCode?: string,
  phoneNumber?: string
): Promise<{ id: string; phoneNumber: string; country: string; owner: string; provisionedAt: string }> {
  let chosen: string;
  let recordedCountry: string;

  if (phoneNumber) {
    // Specific-number mode — let Twilio be the source of truth on availability.
    chosen = phoneNumber;
    recordedCountry = country || ""; // caller may pass empty; we'll use whatever Twilio returns if needed
  } else {
    const available = await searchNumbers(country, { areaCode, limit: 1 });
    if (available.length === 0) throw new Error(`No numbers available in ${country}`);
    chosen = available[0].phoneNumber;
    recordedCountry = country;
  }

  try {
    await twilioPostForm("/IncomingPhoneNumbers.json", { PhoneNumber: chosen });
  } catch (e: any) {
    const msg = String(e?.message || e);
    // Twilio returns 400 with code 21452 / 21404 when a specific number is no
    // longer available (someone else just bought it, or it isn't sold by Twilio).
    if (phoneNumber && /\(40[04]\)/.test(msg)) {
      throw new Error(
        `Twilio doesn't have ${phoneNumber} in inventory anymore. Numbers disappear seconds after a search if someone else buys them — re-run "phone search --country ${country}" and pick another.`
      );
    }
    throw e;
  }

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO phone_numbers (id, phone_number, country, owner, provisioned_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, chosen, recordedCountry, owner, now);

  return { id, phoneNumber: chosen, country: recordedCountry, owner, provisionedAt: now };
}

// ─── Send SMS ─────────────────────────────────────────────────────────
//
// POST /Messages.json with form { From, To, Body }
//
// Twilio trial accounts can ONLY deliver to numbers verified as caller-IDs in
// the Twilio console (Phone Numbers → Verified Caller IDs). Sending to anywhere
// else returns 21408. We translate that into a clear actionable error rather
// than leaking the raw upstream JSON.
//
function translateTwilioSmsError(rawMessage: string): string {
  // rawMessage shape from twilioPostForm: 'Twilio POST /Messages.json failed (400): {"code":21408,...}'
  const match = rawMessage.match(/\((\d{3})\):\s*(\{[\s\S]*\})/);
  if (!match) return rawMessage;
  let body: any = {};
  try { body = JSON.parse(match[2]); } catch { return rawMessage; }
  const code = body.code;
  switch (code) {
    case 21266:
      return "SMS rejected: 'to' and 'from' cannot be the same number.";
    case 21408:
      return "SMS rejected: this Twilio account isn't allowed to send to that region. " +
             "On a Twilio TRIAL account, you can only send to numbers verified as caller-IDs " +
             "(Twilio Console → Phone Numbers → Verified Caller IDs). " +
             "Verify the destination there, or upgrade the operator's Twilio account out of trial.";
    case 21610:
      return "SMS rejected: this destination has unsubscribed (replied STOP).";
    case 21614:
      return "SMS rejected: 'to' is not a valid mobile number.";
    case 21612:
      return "SMS rejected: 'to' is not currently reachable via SMS.";
    case 30003:
      return "SMS rejected: destination handset is unreachable (off / no signal).";
    case 30005:
      return "SMS rejected: destination is unknown to the carrier.";
    case 30006:
      return "SMS rejected: destination is on a landline or unreachable carrier.";
    default:
      return `SMS rejected by Twilio (${code}): ${body.message || rawMessage.slice(0, 200)}`;
  }
}

export async function sendSms(
  phoneNumberId: string,
  to: string,
  body: string,
  owner: string
): Promise<{ id: string; from: string; to: string; body: string; timestamp: string }> {
  const row = db.prepare("SELECT * FROM phone_numbers WHERE id = ? AND owner = ?").get(phoneNumberId, owner) as any;
  if (!row) throw new Error("Phone number not found or not owned by you");
  if (!row.active) throw new Error("Phone number is deactivated");

  try {
    await twilioPostForm("/Messages.json", {
      From: row.phone_number,
      To: to,
      Body: body,
    });
  } catch (e: any) {
    throw new Error(translateTwilioSmsError(String(e?.message || e)));
  }

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
