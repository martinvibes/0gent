import { v4 as uuid } from "uuid";
import { config } from "../config";
import { db } from "../db";

const NC_API = "https://api.namecheap.com/xml.response";

async function ncFetch(command: string, params: Record<string, string> = {}): Promise<string> {
  const baseParams = {
    ApiUser: config.namecheapApiUser,
    ApiKey: config.namecheapApiKey,
    UserName: config.namecheapApiUser,
    ClientIp: "127.0.0.1",
    Command: command,
    ...params,
  };
  const qs = new URLSearchParams(baseParams).toString();
  const res = await fetch(`${NC_API}?${qs}`);
  return res.text();
}

export async function checkDomain(domain: string): Promise<{ available: boolean; domain: string }> {
  const xml = await ncFetch("namecheap.domains.check", { DomainList: domain });
  const available = xml.includes('Available="true"');
  return { available, domain };
}

export async function registerDomain(
  domain: string,
  owner: string
): Promise<{ id: string; domain: string; owner: string; status: string; createdAt: string; expiresAt: string }> {
  const parts = domain.split(".");
  if (parts.length < 2) throw new Error("Invalid domain format");

  await ncFetch("namecheap.domains.create", { DomainName: domain, Years: "1" });

  const id = uuid();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    "INSERT INTO domains (id, domain, owner, status, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, domain, owner, "active", expiresAt, now);

  return { id, domain, owner, status: "active", createdAt: now, expiresAt };
}
