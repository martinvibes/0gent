import { v4 as uuid } from "uuid";
import { config } from "../config";
import { db } from "../db";

const CF_API = "https://api.cloudflare.com/client/v4";

async function cfFetch(path: string, method: string, body?: unknown): Promise<any> {
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
    throw new Error(`Cloudflare API error (${res.status}): ${text}`);
  }
  return res.json();
}

export async function provisionInbox(
  localPart: string,
  owner: string
): Promise<{ id: string; address: string; localPart: string; owner: string; createdAt: string }> {
  const address = `${localPart}@${config.emailDomain}`;

  if (config.cloudflareApiToken && config.cloudflareZoneId) {
    try {
      await cfFetch(`/zones/${config.cloudflareZoneId}/email/routing/rules`, "POST", {
        name: `0gent-${localPart}`,
        enabled: true,
        matchers: [{ type: "literal", field: "to", value: address }],
        actions: [{ type: "worker", value: ["0gent-email-worker"] }],
      });
    } catch (err: any) {
      console.warn("[email] Cloudflare routing rule creation failed:", err.message);
    }
  }

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO email_inboxes (id, address, local_part, owner, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, address, localPart, owner, now);

  return { id, address, localPart, owner, createdAt: now };
}

export function getInbox(id: string, owner: string): any {
  return db.prepare("SELECT * FROM email_inboxes WHERE id = ? AND owner = ?").get(id, owner);
}
