/**
 * /stats — public live metrics + full transaction log.
 *
 * Aggregates at top, per-service breakdown, full paginated transaction list.
 * Pulls from GET /stats and GET /stats/transactions on the live API.
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { LogoLockup } from './Logo';

const API = (import.meta.env.VITE_API_URL as string) || 'https://api.0gent.xyz';

// ─── Tokens ───────────────────────────────────────────────────────────
const LILAC = '#B75FFF';
const TEXT = '#fefefe';
const TEXT_DIM = 'rgba(254,254,254,0.7)';
const TEXT_FAINT = 'rgba(254,254,254,0.5)';
const TEXT_GHOST = 'rgba(254,254,254,0.35)';
const BG_PAGE = '#050508';
const BG_CARD = '#0c0c14';
const BG_ROW = 'rgba(146,0,225,0.025)';
const BORDER = 'rgba(183,95,255,0.12)';
const BORDER_HOVER = 'rgba(183,95,255,0.30)';
const GREEN = '#7DEFB1';

// ─── Types ────────────────────────────────────────────────────────────
interface StatsResponse {
  headline: { wallets: number; resources: number; volume_0g: number };
  totals: {
    transactions: number; wallets: number; volume_0g: number;
    identities_minted: number; email_inboxes: number;
    emails_sent: number; emails_received: number;
    phone_numbers: number; sms_sent: number;
    inference_calls: number; memory_entries: number;
    total_resources: number;
  };
  last_24h: { transactions: number; wallets: number; volume_0g: number };
  by_endpoint: Record<string, { count: number; volume_0g: number }>;
  updated_at: string;
}

interface Tx {
  payer: string; amount_0g: number; tx_hash: string | null;
  endpoint: string; timestamp: string; nonce?: string;
}

const ENDPOINT_META: Record<string, { label: string; emoji: string; color: string }> = {
  identity:        { label: 'Identity NFT mint',  emoji: '🪪', color: LILAC },
  email:           { label: 'Email inbox',        emoji: '📧', color: '#7DEFB1' },
  'email-send':    { label: 'Email sent',         emoji: '📤', color: '#7DEFB1' },
  'email-read':    { label: 'Email read',         emoji: '📥', color: '#7DEFB1' },
  'email-threads': { label: 'Email threads',      emoji: '🧵', color: '#7DEFB1' },
  phone:           { label: 'Phone number',       emoji: '📞', color: '#FFC97A' },
  sms:             { label: 'SMS sent',           emoji: '💬', color: '#FFC97A' },
  'compute-infer': { label: 'AI inference',       emoji: '🧠', color: '#CB8AFF' },
  compute:         { label: 'Compute VPS',        emoji: '💻', color: '#CB8AFF' },
  domain:          { label: 'Domain register',    emoji: '🌐', color: '#FFC97A' },
};

// ─── Helpers ──────────────────────────────────────────────────────────
function shortAddr(a: string): string {
  if (!a) return '—';
  return a.slice(0, 6) + '…' + a.slice(-4);
}
function shortHash(h: string | null): string {
  if (!h) return '—';
  return h.slice(0, 10) + '…' + h.slice(-6);
}
function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const s = Math.floor(ms / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
function fmt0G(n: number): string {
  if (n === 0) return '0';
  if (n < 0.0001) return n.toExponential(1);
  if (n < 1) return n.toFixed(4);
  if (n < 100) return n.toFixed(2);
  return n.toFixed(0);
}
function fmtN(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// ─── Sub-components ───────────────────────────────────────────────────

function HeadlineCard({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div style={{
      background: BG_CARD, border: `1px solid ${BORDER}`, padding: '32px 28px',
      flex: '1 1 220px', minWidth: 0,
    }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 600, color: LILAC, lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace' }}>
        {label}
      </div>
      {sub && <div style={{ marginTop: 8, fontSize: 11, color: TEXT_GHOST, fontFamily: 'JetBrains Mono, monospace' }}>{sub}</div>}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderTop: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 13, color: TEXT_DIM }}>{label}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: TEXT, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

const EXPLORER_TX = 'https://chainscan-galileo.0g.ai/tx/';
const EXPLORER_ADDR = 'https://chainscan-galileo.0g.ai/address/';

function TxRow({ tx, idx }: { tx: Tx; idx: number }) {
  const meta = ENDPOINT_META[tx.endpoint] || { label: tx.endpoint, emoji: '📦', color: LILAC };
  const rowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(140px,1.2fr) minmax(140px,1fr) minmax(110px,0.9fr) minmax(180px,1.1fr) minmax(120px,0.9fr)',
    gap: 12, alignItems: 'center', padding: '12px 16px',
    background: idx % 2 === 0 ? BG_ROW : 'transparent',
    fontSize: 12.5, fontFamily: 'JetBrains Mono, monospace',
  };
  return (
    <div style={rowStyle} className="stats-tx-row">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: meta.color, minWidth: 0 }}>
        <span>{meta.emoji}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.label}</span>
      </div>
      <div>
        <a href={EXPLORER_ADDR + tx.payer} target="_blank" rel="noreferrer" style={{ color: TEXT, textDecoration: 'none' }}
           onMouseEnter={e => { e.currentTarget.style.color = LILAC; }}
           onMouseLeave={e => { e.currentTarget.style.color = TEXT; }}
        >{shortAddr(tx.payer)}</a>
      </div>
      <div style={{ color: LILAC }}>{fmt0G(tx.amount_0g)} 0G</div>
      <div>
        {tx.tx_hash ? (
          <a href={EXPLORER_TX + tx.tx_hash} target="_blank" rel="noreferrer" style={{ color: TEXT_FAINT, textDecoration: 'none' }}
             onMouseEnter={e => { e.currentTarget.style.color = LILAC; }}
             onMouseLeave={e => { e.currentTarget.style.color = TEXT_FAINT; }}
          >{shortHash(tx.tx_hash)} ↗</a>
        ) : (
          <span style={{ color: TEXT_GHOST }}>—</span>
        )}
      </div>
      <div style={{ color: TEXT_GHOST, textAlign: 'right' }}>{timeAgo(tx.timestamp)}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export function Stats() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [txs, setTxs]     = useState<Tx[]>([]);
  const [pagination, setPagination] = useState<{ total: number; limit: number; offset: number; has_more: boolean }>({ total: 0, limit: 50, offset: 0, has_more: false });
  const [filter, setFilter]    = useState<string>('');
  const [loading, setLoading]  = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Aggregates — fetch once on mount, then poll every 30s
  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const r = await fetch(API + '/stats');
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        if (!cancelled) setStats(d);
      } catch (e: any) {
        if (!cancelled) setErrorMsg(e.message || 'failed to load stats');
      }
    };
    fetchStats();
    const id = setInterval(fetchStats, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Transactions — re-fetch on filter or pagination change
  useEffect(() => {
    let cancelled = false;
    const fetchTxs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', String(pagination.limit));
        params.set('offset', String(pagination.offset));
        if (filter) params.set('endpoint', filter);
        const r = await fetch(API + '/stats/transactions?' + params.toString());
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        if (!cancelled) {
          setTxs(d.transactions || []);
          setPagination(p => ({ ...p, total: d.pagination?.total ?? 0, has_more: d.pagination?.has_more ?? false }));
        }
      } catch (e: any) {
        if (!cancelled) setErrorMsg(e.message || 'failed to load transactions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTxs();
    return () => { cancelled = true; };
  }, [pagination.offset, pagination.limit, filter]);

  return (
    <div style={{ background: BG_PAGE, color: TEXT, minHeight: '100vh' }}>
      <Nav />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '120px 24px 40px' }}>

        {/* ── Header ───────────────────────────── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 32 }}>
            <LogoLockup size={28} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN, display: 'inline-block', boxShadow: `0 0 8px ${GREEN}` }} />
            <span style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, fontFamily: 'JetBrains Mono, monospace' }}>
              live · {stats ? 'updated ' + timeAgo(stats.updated_at) : 'connecting…'}
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 5.5vw, 56px)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 16 }}>
            What agents have done on 0GENT.
          </h1>
          <p style={{ fontSize: 17, color: TEXT_DIM, lineHeight: 1.7, maxWidth: 640 }}>
            Every paid endpoint settles a real transaction on 0G Chain. These numbers are aggregated from the on-chain payment log — same data
            anyone can pull from{' '}
            <a href="https://chainscan-galileo.0g.ai" target="_blank" rel="noreferrer" style={{ color: LILAC, textDecoration: 'underline' }}>chainscan-galileo</a>.
          </p>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.25)', color: '#f85149', padding: '12px 16px', marginBottom: 24, fontSize: 13 }}>
            {errorMsg}
          </div>
        )}

        {/* ── Headline counters (3 big numbers) ─ */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 32 }}>
          <HeadlineCard
            value={stats ? fmtN(stats.headline.wallets) : '…'}
            label="Wallets"
            sub={stats ? `${stats.last_24h.wallets} active in last 24h` : ''}
          />
          <HeadlineCard
            value={stats ? fmtN(stats.headline.resources) : '…'}
            label="Resources on-chain"
            sub={stats ? `identities + emails + phones` : ''}
          />
          <HeadlineCard
            value={stats ? fmt0G(stats.headline.volume_0g) : '…'}
            label="0G processed in payments"
            sub={stats ? `${fmt0G(stats.last_24h.volume_0g)} 0G in last 24h` : ''}
          />
        </div>

        {/* ── Detailed totals ─────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 40 }}>
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            <div style={{ padding: '14px 18px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: LILAC, fontFamily: 'JetBrains Mono, monospace' }}>
              All-time totals
            </div>
            <StatRow label="Total transactions"  value={stats ? fmtN(stats.totals.transactions) : '…'} />
            <StatRow label="Unique wallets"      value={stats ? fmtN(stats.totals.wallets)      : '…'} />
            <StatRow label="0G volume processed" value={stats ? fmt0G(stats.totals.volume_0g) + ' 0G' : '…'} />
            <StatRow label="Total resources"     value={stats ? fmtN(stats.totals.total_resources) : '…'} />
          </div>

          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            <div style={{ padding: '14px 18px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: LILAC, fontFamily: 'JetBrains Mono, monospace' }}>
              By service
            </div>
            <StatRow label="🪪 Identity NFTs minted" value={stats ? fmtN(stats.totals.identities_minted) : '…'} />
            <StatRow label="📧 Email inboxes"        value={stats ? fmtN(stats.totals.email_inboxes)     : '…'} />
            <StatRow label="📤 Emails sent"          value={stats ? fmtN(stats.totals.emails_sent)        : '…'} />
            <StatRow label="📥 Emails received"      value={stats ? fmtN(stats.totals.emails_received)    : '…'} />
            <StatRow label="📞 Phone numbers"        value={stats ? fmtN(stats.totals.phone_numbers)      : '…'} />
            <StatRow label="💬 SMS sent"             value={stats ? fmtN(stats.totals.sms_sent)           : '…'} />
            <StatRow label="🧠 AI inference calls"   value={stats ? fmtN(stats.totals.inference_calls)    : '…'} />
            <StatRow label="🗂  Memory entries"       value={stats ? fmtN(stats.totals.memory_entries)     : '…'} />
          </div>
        </div>

        {/* ── Transaction log ─────────────────── */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: LILAC, fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>
              Transaction log
            </div>
            <div style={{ fontSize: 22, fontWeight: 500 }}>Every paid call ever made on 0GENT</div>
            <div style={{ fontSize: 13, color: TEXT_FAINT, marginTop: 4 }}>
              {stats ? `${fmtN(pagination.total)} transactions${filter ? ` · filtered by "${filter}"` : ''}` : 'loading…'}
            </div>
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {[
            ['', 'All'],
            ['identity', '🪪 Identity'],
            ['email', '📧 Email inbox'],
            ['email-send', '📤 Email sent'],
            ['phone', '📞 Phone'],
            ['sms', '💬 SMS'],
            ['compute-infer', '🧠 AI'],
          ].map(([v, l]) => {
            const active = filter === v;
            return (
              <button
                key={v}
                onClick={() => { setFilter(v); setPagination(p => ({ ...p, offset: 0 })); }}
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  padding: '6px 12px',
                  border: `1px solid ${active ? BORDER_HOVER : BORDER}`,
                  background: active ? 'rgba(146,0,225,0.10)' : 'transparent',
                  color: active ? LILAC : TEXT_DIM,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {l}
              </button>
            );
          })}
        </div>

        {/* Tx table */}
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, marginBottom: 24 }}>
          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(140px,1.2fr) minmax(140px,1fr) minmax(110px,0.9fr) minmax(180px,1.1fr) minmax(120px,0.9fr)',
            gap: 12, padding: '12px 16px', borderBottom: `1px solid ${BORDER}`,
            fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace',
          }}>
            <div>Service</div><div>Payer</div><div>Amount</div><div>Tx hash</div><div style={{ textAlign: 'right' }}>When</div>
          </div>

          {loading && txs.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: TEXT_FAINT, fontSize: 13 }}>Loading transactions…</div>
          ) : txs.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: TEXT_FAINT, fontSize: 13 }}>
              {filter ? `No ${filter} transactions yet.` : 'No transactions yet — be the first to use 0GENT!'}
            </div>
          ) : (
            txs.map((tx, i) => <TxRow key={(tx.nonce || tx.tx_hash || i) + ''} tx={tx} idx={i} />)
          )}
        </div>

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
              disabled={pagination.offset === 0}
              style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                padding: '8px 16px', cursor: pagination.offset === 0 ? 'not-allowed' : 'pointer',
                border: `1px solid ${BORDER}`, background: 'transparent',
                color: pagination.offset === 0 ? TEXT_GHOST : TEXT_DIM,
                opacity: pagination.offset === 0 ? 0.5 : 1,
              }}
            >← Previous</button>
            <div style={{ fontSize: 11, color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace' }}>
              {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {fmtN(pagination.total)}
            </div>
            <button
              onClick={() => setPagination(p => ({ ...p, offset: p.offset + p.limit }))}
              disabled={!pagination.has_more}
              style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                padding: '8px 16px', cursor: !pagination.has_more ? 'not-allowed' : 'pointer',
                border: `1px solid ${BORDER}`, background: 'transparent',
                color: !pagination.has_more ? TEXT_GHOST : TEXT_DIM,
                opacity: !pagination.has_more ? 0.5 : 1,
              }}
            >Next →</button>
          </div>
        )}

      </div>

      <Footer />
    </div>
  );
}
