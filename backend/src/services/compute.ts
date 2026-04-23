import { config } from "../config";
import { db } from "../db";

const HCLOUD_API = "https://api.hetzner.cloud/v1";

function headers() {
  return {
    Authorization: `Bearer ${config.hcloudToken}`,
    "Content-Type": "application/json",
  };
}

async function hcloud(method: string, path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${HCLOUD_API}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hetzner API ${method} ${path} failed (${res.status}): ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function generateCloudInit(): string {
  return `#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq unattended-upgrades
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y -qq nodejs
echo "0GENT provisioning complete" > /var/log/0gent-provision.log
`;
}

export async function provisionServer(
  name: string,
  serverType: string,
  owner: string
): Promise<{ id: string; name: string; serverType: string; status: string; ipv4: string | null; owner: string; createdAt: string }> {
  const data = await hcloud("POST", "/servers", {
    name,
    server_type: serverType,
    image: "ubuntu-24.04",
    location: config.hcloudLocation,
    user_data: generateCloudInit(),
    labels: { managed_by: "0gent" },
  });

  const s = data.server;
  const id = String(s.id);
  const now = new Date().toISOString();

  db.prepare(
    "INSERT INTO servers (id, name, server_type, status, ipv4, owner, price_monthly, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, s.name, serverType, s.status, s.public_net?.ipv4?.ip ?? null, owner, "0", now);

  return { id, name: s.name, serverType, status: s.status, ipv4: s.public_net?.ipv4?.ip ?? null, owner, createdAt: now };
}

export async function getServerStatus(id: string): Promise<any> {
  const data = await hcloud("GET", `/servers/${id}`);
  return { id: String(data.server.id), name: data.server.name, status: data.server.status, ipv4: data.server.public_net?.ipv4?.ip };
}

export async function deleteServer(id: string): Promise<void> {
  await hcloud("DELETE", `/servers/${id}`);
  db.prepare("DELETE FROM servers WHERE id = ?").run(id);
}
