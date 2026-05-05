/**
 * Public stats endpoints — aggregate counters + the full on-chain transaction
 * log. Everything is built off existing tables; no new schema required.
 *
 * Privacy: aggregate counts are public (the underlying x402 transactions are
 * already on-chain). Transaction list shows wallet address, endpoint, amount,
 * tx hash, timestamp — never message body or recipient PII.
 */

import { Router, Request, Response } from "express";
import { db } from "../db";

const router = Router();

// ─── Light in-memory cache (60s TTL) — these queries are cheap on
// small datasets but we'll save Railway some CPU as it scales.
let _cache: { at: number; payload: any } | null = null;
const TTL_MS = 60 * 1000;

interface PaymentRow {
  nonce: string;
  payer: string;
  amount: string;
  tx_hash: string | null;
  endpoint: string;
  verified_at: string;
}

function weiToZG(weiStr: string): number {
  // amount column is wei as string. JS Number is fine for typical x402 amounts
  // (0.01–3.0 0G) but BigInt → divide → Number to be safe.
  try {
    const w = BigInt(weiStr);
    // Divide by 1e10 first (keeps 8 decimals of precision), then Number()
    const big = Number(w / 10n ** 10n);
    return big / 1e8;
  } catch {
    return 0;
  }
}

// The `endpoint` column in `used_payments` stores the raw URL path (e.g.
// `/email/7a37e868…/send`), so we normalize to canonical resource categories
// before aggregating. Anything that doesn't match a known pattern returns
// 'other' rather than blowing the bucket count up with per-UUID rows.
function normalizeEndpoint(raw: string): string {
  if (!raw) return 'other';
  const p = raw.toLowerCase();
  if (p.includes('/identity/mint'))      return 'identity';
  if (p.match(/\/email\/[^/]+\/send/))   return 'email-send';
  if (p.match(/\/email\/[^/]+\/inbox/))  return 'email-read';
  if (p.match(/\/email\/[^/]+\/threads/))return 'email-threads';
  if (p.includes('/email/provision'))    return 'email';
  if (p.match(/\/phone\/[^/]+\/sms/))    return 'sms';
  if (p.includes('/phone/provision'))    return 'phone';
  if (p.includes('/compute/infer'))      return 'compute-infer';
  if (p.includes('/compute/provision'))  return 'compute-vps';
  if (p.includes('/domain/register'))    return 'domain';
  return 'other';
}

function getAggregates() {
  // Total payment counts + volume + unique wallets that paid
  const allPayments = db.prepare("SELECT amount, endpoint, verified_at, payer FROM used_payments").all() as Array<{
    amount: string;
    endpoint: string;
    verified_at: string;
    payer: string;
  }>;

  let totalVolumeWei = 0n;
  for (const p of allPayments) {
    try { totalVolumeWei += BigInt(p.amount); } catch {}
  }

  const distinctPayers = new Set(allPayments.map(p => p.payer.toLowerCase()));

  // 24h window
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const last24hPayments = allPayments.filter(p => p.verified_at >= dayAgo);
  let last24hVolumeWei = 0n;
  for (const p of last24hPayments) {
    try { last24hVolumeWei += BigInt(p.amount); } catch {}
  }
  const last24hPayers = new Set(last24hPayments.map(p => p.payer.toLowerCase()));

  // Per-endpoint breakdown — normalize URL paths to canonical resource keys
  // (e.g. '/email/<uuid>/send' → 'email-send') so we don't end up with one
  // bucket per UUID.
  const endpointMap = new Map<string, { count: number; volume_wei: bigint }>();
  for (const p of allPayments) {
    const key = normalizeEndpoint(p.endpoint);
    const cur = endpointMap.get(key) || { count: 0, volume_wei: 0n };
    cur.count += 1;
    try { cur.volume_wei += BigInt(p.amount); } catch {}
    endpointMap.set(key, cur);
  }
  const byEndpoint: Record<string, { count: number; volume_0g: number }> = {};
  for (const [k, v] of endpointMap.entries()) {
    byEndpoint[k] = {
      count: v.count,
      volume_0g: weiToZG(v.volume_wei.toString()),
    };
  }

  // Resource-level totals (counts from concrete tables, not just payments)
  const inboxCount     = (db.prepare("SELECT COUNT(*) as n FROM email_inboxes").get() as any).n as number;
  const emailsSent     = (db.prepare("SELECT COUNT(*) as n FROM email_messages WHERE direction = 'outbound'").get() as any).n as number;
  const emailsReceived = (db.prepare("SELECT COUNT(*) as n FROM email_messages WHERE direction = 'inbound'").get()  as any).n as number;
  const phoneCount     = (db.prepare("SELECT COUNT(*) as n FROM phone_numbers").get() as any).n as number;
  const smsSent        = (db.prepare("SELECT COUNT(*) as n FROM sms_messages WHERE direction = 'outbound'").get()  as any).n as number;
  const memoryEntries  = (db.prepare("SELECT COUNT(*) as n FROM memory_index").get()  as any).n as number;

  // Identity mints come from the payments log (no separate table)
  const identityMints  = byEndpoint['identity']?.count ?? 0;
  const inferenceCalls = byEndpoint['compute-infer']?.count ?? 0;

  // Resources on-chain — sum of identities + email inboxes + phone numbers
  const totalResources = identityMints + inboxCount + phoneCount;

  return {
    headline: {
      wallets: distinctPayers.size,
      resources: totalResources,
      volume_0g: weiToZG(totalVolumeWei.toString()),
    },
    totals: {
      transactions: allPayments.length,
      wallets: distinctPayers.size,
      volume_0g: weiToZG(totalVolumeWei.toString()),
      identities_minted: identityMints,
      email_inboxes: inboxCount,
      emails_sent: emailsSent,
      emails_received: emailsReceived,
      phone_numbers: phoneCount,
      sms_sent: smsSent,
      inference_calls: inferenceCalls,
      memory_entries: memoryEntries,
      total_resources: totalResources,
    },
    last_24h: {
      transactions: last24hPayments.length,
      wallets: last24hPayers.size,
      volume_0g: weiToZG(last24hVolumeWei.toString()),
    },
    by_endpoint: byEndpoint,
    updated_at: new Date().toISOString(),
  };
}

router.get("/", (_req: Request, res: Response) => {
  if (_cache && Date.now() - _cache.at < TTL_MS) {
    res.json(_cache.payload);
    return;
  }
  try {
    const payload = getAggregates();
    _cache = { at: Date.now(), payload };
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Full transaction log — paginated, newest-first.
// Privacy: shows payer address (already public on-chain), endpoint, amount,
// tx hash, timestamp. Never shows message body, recipient, prompt content.
router.get("/transactions", (req: Request, res: Response) => {
  try {
    const limit = Math.max(1, Math.min(parseInt((req.query.limit as string) || "50", 10), 200));
    const offset = Math.max(0, parseInt((req.query.offset as string) || "0", 10));
    const endpointFilter = req.query.endpoint as string | undefined;

    // The DB stores raw URL paths but the UI filters by canonical keys
    // (`identity`, `sms`, etc.), so we pull all rows then filter in-memory
    // after normalizing. With small data this is fine; if used_payments grows
    // past ~10K rows, replace with a denormalized column or a CASE-WHEN query.
    const allRows = db.prepare(
      `SELECT nonce, payer, amount, tx_hash, endpoint, verified_at
         FROM used_payments
         ORDER BY verified_at DESC`
    ).all() as PaymentRow[];

    const filtered = endpointFilter
      ? allRows.filter(r => normalizeEndpoint(r.endpoint) === endpointFilter)
      : allRows;
    const total = filtered.length;
    const rows = filtered.slice(offset, offset + limit);

    res.json({
      transactions: rows.map(r => ({
        nonce: r.nonce,
        payer: r.payer,
        amount_0g: weiToZG(r.amount),
        amount_wei: r.amount,
        tx_hash: r.tx_hash,
        endpoint: normalizeEndpoint(r.endpoint),
        endpoint_raw: r.endpoint,
        timestamp: r.verified_at,
      })),
      pagination: { total, limit, offset, has_more: offset + rows.length < total },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Lightweight recent-activity feed for the landing/stats page.
// Same privacy posture as /transactions, just smaller default limit.
router.get("/transactions/recent", (req: Request, res: Response) => {
  try {
    const limit = Math.max(1, Math.min(parseInt((req.query.limit as string) || "10", 10), 50));
    const rows = db.prepare(
      `SELECT nonce, payer, amount, tx_hash, endpoint, verified_at
         FROM used_payments
         ORDER BY verified_at DESC
         LIMIT ?`
    ).all(limit) as PaymentRow[];
    res.json({
      transactions: rows.map(r => ({
        payer: r.payer,
        amount_0g: weiToZG(r.amount),
        tx_hash: r.tx_hash,
        endpoint: normalizeEndpoint(r.endpoint),
        endpoint_raw: r.endpoint,
        timestamp: r.verified_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
