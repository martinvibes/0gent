import Telnyx from "telnyx";
import { v4 as uuid } from "uuid";
import { config } from "../config";
import { db } from "../db";

let _client: InstanceType<typeof Telnyx> | null = null;

function getClient(): InstanceType<typeof Telnyx> {
  if (!config.telnyxApiKey) throw new Error("TELNYX_API_KEY not configured");
  if (!_client) _client = new Telnyx({ apiKey: config.telnyxApiKey });
  return _client;
}

export async function searchNumbers(
  country: string,
  opts?: { areaCode?: string; limit?: number }
): Promise<Array<{ phoneNumber: string; region: string; type: string }>> {
  const client = getClient();
  const params: Record<string, unknown> = {
    "filter[country_code]": country,
    "filter[limit]": opts?.limit ?? 5,
  };
  if (opts?.areaCode) params["filter[national_destination_code]"] = opts.areaCode;

  const res = await client.availablePhoneNumbers.list(params);
  const numbers = (res as any).data || [];
  return numbers.map((n: any) => ({
    phoneNumber: n.phone_number,
    region: n.region_information?.[0]?.region_name || country,
    type: n.phone_number_type || "local",
  }));
}

export async function provisionNumber(
  country: string,
  owner: string,
  areaCode?: string
): Promise<{ id: string; phoneNumber: string; country: string; owner: string; provisionedAt: string }> {
  const client = getClient();
  const available = await searchNumbers(country, { areaCode, limit: 1 });
  if (available.length === 0) throw new Error(`No numbers available in ${country}`);

  const chosen = available[0].phoneNumber;
  await client.numberOrders.create({
    phone_numbers: [{ phone_number: chosen }],
    messaging_profile_id: config.telnyxMessagingProfileId || undefined,
  } as any);

  if (config.telnyxMessagingProfileId) {
    try {
      await client.phoneNumbers.update(chosen, {
        messaging_profile_id: config.telnyxMessagingProfileId,
      } as any);
    } catch {}
  }

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO phone_numbers (id, phone_number, country, owner, provisioned_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, chosen, country, owner, now);

  return { id, phoneNumber: chosen, country, owner, provisionedAt: now };
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

  const client = getClient();
  await client.messages.send({
    from: row.phone_number,
    to,
    text: body,
    messaging_profile_id: config.telnyxMessagingProfileId || undefined,
  } as any);

  const msgId = uuid();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO sms_messages (id, phone_number_id, direction, from_number, to_number, body, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(msgId, phoneNumberId, "outbound", row.phone_number, to, body, now);

  return { id: msgId, from: row.phone_number, to, body, timestamp: now };
}

export function getLogs(phoneNumberId: string, owner: string): any[] {
  const row = db.prepare("SELECT * FROM phone_numbers WHERE id = ? AND owner = ?").get(phoneNumberId, owner) as any;
  if (!row) throw new Error("Phone number not found or not owned by you");
  return db.prepare("SELECT * FROM sms_messages WHERE phone_number_id = ? ORDER BY timestamp DESC").all(phoneNumberId);
}
