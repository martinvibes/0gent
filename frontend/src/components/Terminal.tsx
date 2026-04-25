import { useState, useRef, useEffect } from 'react';
import { apiCall, getLogs, subscribe, summary, type RequestLog } from '../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
//  Color tokens (0G purple palette)
// ─────────────────────────────────────────────────────────────────────────────
const PURPLE = '#9200E1';
const LILAC = '#B75FFF';
const GREEN = '#3fb950';
const RED = '#f85149';
const YELLOW = '#febc2e';
const TEXT = '#e6edf3';
const DIM = 'rgba(254,254,254,0.5)';
const FAINT = 'rgba(254,254,254,0.25)';
const W12 = 'rgba(254,254,254,0.12)';
const W08 = 'rgba(254,254,254,0.08)';
const BG = '#08080d';
const BG2 = 'rgba(146,0,225,0.04)';
const BORDER = 'rgba(183,95,255,0.12)';

// ─────────────────────────────────────────────────────────────────────────────
//  Simulated commands (purely cosmetic — running these doesn't pay anything)
//  Free commands like `health` and `pricing` actually hit the live backend.
// ─────────────────────────────────────────────────────────────────────────────
type Line = { type: 'cmd' | 'out' | 'ok' | 'err' | 'dim'; text: string };

const SIM: Record<string, Line[]> = {
  'help': [
    { type: 'out', text: 'phone search --country US      Search numbers      free' },
    { type: 'out', text: 'phone provision                Provision phone     0.5 0G' },
    { type: 'out', text: 'phone sms <id>                 Send SMS            0.01 0G' },
    { type: 'out', text: 'email create --name agent      Create inbox        0.2 0G' },
    { type: 'out', text: 'email send <id>                Send email          0.08 0G' },
    { type: 'out', text: 'email read <id>                Read inbox          0.02 0G' },
    { type: 'out', text: 'identity mint                  Mint Agent NFT      0.1 0G' },
    { type: 'out', text: 'memory set <key> <value>       Write to 0G Storage free' },
    { type: 'out', text: 'health                         API status          free' },
    { type: 'out', text: 'pricing                        Service prices      free' },
  ],
  'phone search --country US': [
    { type: 'out', text: '+1 (415) 555-0142    San Francisco    local' },
    { type: 'out', text: '+1 (212) 555-0198    New York         local' },
    { type: 'out', text: '+1 (310) 555-0167    Los Angeles      local' },
    { type: 'out', text: '+1 (512) 555-0134    Austin           local' },
    { type: 'out', text: '+1 (305) 555-0189    Miami            local' },
  ],
  'phone provision': [
    { type: 'out', text: '→ POST /phone/provision' },
    { type: 'err', text: '402 Payment Required — 0.5 0G' },
    { type: 'out', text: '→ ZeroGentPayment.pay(nonce, "phone")' },
    { type: 'ok', text: 'Payment verified on 0G Chain' },
    { type: 'ok', text: 'Provisioned via Telnyx' },
    { type: 'ok', text: 'Registered on AgentRegistry' },
    { type: 'out', text: '' },
    { type: 'out', text: '  Number      +1 (415) 555-0142' },
    { type: 'out', text: '  Owner       0x742d...bD18' },
    { type: 'out', text: '  Resource ID 3' },
  ],
  'identity mint': [
    { type: 'out', text: '→ POST /identity/mint' },
    { type: 'err', text: '402 Payment Required — 0.1 0G' },
    { type: 'out', text: '→ ZeroGentPayment.pay(nonce, "identity")' },
    { type: 'ok', text: 'Payment verified' },
    { type: 'ok', text: 'Metadata → 0G Storage: 0g://0x73fa973e...' },
    { type: 'ok', text: 'ERC-721 minted on ZeroGentIdentity' },
    { type: 'out', text: '' },
    { type: 'out', text: '  Token #1  |  0x742d...bD18  |  0g://0x73fa…' },
  ],
  'email create --name agent': [
    { type: 'out', text: '→ POST /email/provision' },
    { type: 'err', text: '402 Payment Required — 0.2 0G' },
    { type: 'out', text: '→ ZeroGentPayment.pay(nonce, "email")' },
    { type: 'ok', text: 'Payment verified' },
    { type: 'ok', text: 'Cloudflare routing rule created' },
    { type: 'ok', text: 'Registered on AgentRegistry' },
    { type: 'out', text: '' },
    { type: 'out', text: '  Address     agent@0gent.xyz' },
    { type: 'out', text: '  Owner       0x742d...bD18' },
  ],
};

const CHIPS = [
  'health',
  'pricing',
  'phone provision',
  'email create --name agent',
  'identity mint',
  'help',
];

// ─────────────────────────────────────────────────────────────────────────────
//  Status colors
// ─────────────────────────────────────────────────────────────────────────────
function statusColor(s: number): string {
  if (s === 0) return RED;
  if (s >= 500) return RED;
  if (s >= 400) return RED;
  if (s >= 300) return YELLOW;
  return GREEN;
}

function methodColor(_m: string): string {
  return LILAC;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function WindowDots() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '14px 18px' }}>
      <div style={{ width: 11, height: 11, border: `1px solid ${RED}`, background: 'rgba(248,81,73,0.18)' }} />
      <div style={{ width: 11, height: 11, border: `1px solid ${YELLOW}`, background: 'rgba(254,188,46,0.18)' }} />
      <div style={{ width: 11, height: 11, border: `1px solid ${GREEN}`, background: 'rgba(63,185,80,0.18)' }} />
    </div>
  );
}

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '14px 20px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'lowercase',
        letterSpacing: '0.04em',
        color: active ? LILAC : 'rgba(254,254,254,0.35)',
        borderBottom: active ? `2px solid ${LILAC}` : '2px solid transparent',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(254,254,254,0.7)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(254,254,254,0.35)'; }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          background: active ? LILAC : FAINT,
          display: 'inline-block',
        }}
      />
      {label}
    </button>
  );
}

function Waveform() {
  // 6 animated bars, fixed seed-ish heights
  const bars = [4, 9, 5, 11, 6, 8];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
      {bars.map((h, i) => (
        <span
          key={i}
          className="wave-bar"
          style={{
            width: 2,
            height: h,
            background: LILAC,
            opacity: 0.55,
            animation: `eqBar 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 16px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
        color: connected ? 'rgba(254,254,254,0.55)' : 'rgba(254,254,254,0.3)',
      }}
    >
      <span
        className="pulse"
        style={{
          width: 7,
          height: 7,
          background: connected ? GREEN : RED,
          display: 'inline-block',
        }}
      />
      {connected ? 'connected' : 'offline'}
    </div>
  );
}

function StatusBar({ requests, lineNum }: { requests: number; lineNum: number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 14px',
        background: 'rgba(146,0,225,0.06)',
        borderTop: `1px solid ${BORDER}`,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
        color: DIM,
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <span
          style={{
            padding: '2px 7px',
            background: 'rgba(146,0,225,0.18)',
            color: LILAC,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          x402
        </span>
        <span style={{ color: 'rgba(254,254,254,0.4)' }}>0G testnet</span>
        <span style={{ color: 'rgba(254,254,254,0.25)' }}>·</span>
        <span style={{ color: 'rgba(254,254,254,0.4)' }}>chain 16602</span>
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        <span>{requests} {requests === 1 ? 'request' : 'requests'}</span>
        <span style={{ color: 'rgba(254,254,254,0.25)' }}>·</span>
        <span>Ln {lineNum}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shell tab
// ─────────────────────────────────────────────────────────────────────────────

function ShellTab({
  lines,
  input,
  setInput,
  onRun,
  busy,
  onChip,
}: {
  lines: Line[];
  input: string;
  setInput: (s: string) => void;
  onRun: (s: string) => void;
  busy: boolean;
  onChip: (s: string) => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines]);

  // Number of lines for the gutter
  const total = Math.max(15, lines.length + 4);

  return (
    <div style={{ display: 'flex', minHeight: 360 }}>
      {/* Line number gutter */}
      <div
        style={{
          width: 44,
          padding: '14px 0',
          textAlign: 'right',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          color: 'rgba(254,254,254,0.18)',
          userSelect: 'none',
          borderRight: `1px solid ${W08}`,
          background: 'rgba(0,0,0,0.2)',
        }}
      >
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ paddingRight: 12, lineHeight: '22px', height: 22 }}>
            {i + 1}
          </div>
        ))}
      </div>

      {/* Body + input */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          ref={bodyRef}
          style={{
            flex: 1,
            padding: '14px 18px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 13,
            lineHeight: '22px',
            color: TEXT,
            overflowY: 'auto',
            maxHeight: 360,
          }}
        >
          {lines.map((l, i) => {
            if (l.type === 'cmd') {
              return (
                <div key={i} style={{ color: '#fff', marginBottom: 2 }}>
                  <span style={{ color: GREEN, fontWeight: 700 }}>agent</span>
                  <span style={{ color: 'rgba(254,254,254,0.4)' }}> @ </span>
                  <span style={{ color: LILAC, fontWeight: 700 }}>0gent</span>
                  <span style={{ color: 'rgba(254,254,254,0.4)' }}> ❯ </span>
                  <span>{l.text}</span>
                </div>
              );
            }
            if (l.type === 'ok') {
              return (
                <div key={i} className="fade-in" style={{ fontSize: 13, color: 'rgba(254,254,254,0.7)' }}>
                  <span style={{ color: GREEN, fontWeight: 700, marginRight: 8 }}>✓</span>
                  {l.text}
                </div>
              );
            }
            if (l.type === 'err') {
              return (
                <div key={i} className="fade-in" style={{ fontSize: 13, color: 'rgba(254,254,254,0.55)' }}>
                  <span style={{ color: RED, fontWeight: 700, marginRight: 8 }}>✗</span>
                  {l.text}
                </div>
              );
            }
            if (l.type === 'dim') {
              return (
                <div key={i} className="fade-in" style={{ fontSize: 13, color: FAINT, whiteSpace: 'pre-wrap' }}>
                  {l.text}
                </div>
              );
            }
            return (
              <div key={i} className="fade-in" style={{ fontSize: 13, color: 'rgba(254,254,254,0.7)', whiteSpace: 'pre-wrap' }}>
                {l.text}
              </div>
            );
          })}

          {/* Input on the same line treatment */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <span style={{ color: GREEN, fontWeight: 700 }}>agent</span>
            <span style={{ color: 'rgba(254,254,254,0.4)' }}>@</span>
            <span style={{ color: LILAC, fontWeight: 700 }}>0gent</span>
            <span style={{ color: 'rgba(254,254,254,0.4)' }}>❯</span>
            <input
              autoFocus
              spellCheck={false}
              disabled={busy}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && input.trim()) onRun(input); }}
              placeholder="type a command or click below…"
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: TEXT,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 13,
                caretColor: LILAC,
              }}
            />
            {busy && <span className="blink" style={{ display: 'inline-block', width: 8, height: 16, background: LILAC }} />}
          </div>
        </div>

        {/* Suggestion chips */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: '10px 18px 14px',
            borderTop: `1px solid ${W08}`,
          }}
        >
          {CHIPS.map(s => (
            <button
              key={s}
              onClick={() => onChip(s)}
              disabled={busy}
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                padding: '5px 12px',
                background: 'rgba(146,0,225,0.06)',
                border: `1px solid ${BORDER}`,
                color: 'rgba(254,254,254,0.55)',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.4 : 1,
                transition: 'all 0.15s',
                borderRadius: 0,
              }}
              onMouseEnter={e => {
                if (busy) return;
                const el = e.currentTarget;
                el.style.borderColor = LILAC;
                el.style.color = LILAC;
                el.style.background = 'rgba(146,0,225,0.14)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.borderColor = BORDER;
                el.style.color = 'rgba(254,254,254,0.55)';
                el.style.background = 'rgba(146,0,225,0.06)';
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Logs tab
// ─────────────────────────────────────────────────────────────────────────────

function LogsTab({ logs }: { logs: readonly RequestLog[] }) {
  return (
    <div
      style={{
        minHeight: 360,
        maxHeight: 360,
        padding: '16px 22px',
        overflowY: 'auto',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13,
        lineHeight: '24px',
        color: TEXT,
      }}
    >
      {logs.length === 0 ? (
        <div style={{ color: FAINT, padding: 20, textAlign: 'center' }}>
          No requests yet — click a chip in the shell or wait for the health check
        </div>
      ) : (
        logs.map(l => (
          <div key={l.id} style={{ display: 'flex', gap: 14 }}>
            <span style={{ color: 'rgba(254,254,254,0.3)' }}>{fmtTime(l.timestamp)}</span>
            <span style={{ color: methodColor(l.method), fontWeight: 700, minWidth: 44 }}>{l.method}</span>
            <span style={{ color: '#79c0ff', flex: 1 }}>{l.path}</span>
            <span style={{ color: statusColor(l.status), fontWeight: 700 }}>{l.status || '--'}</span>
            <span style={{ color: 'rgba(254,254,254,0.4)', minWidth: 60, textAlign: 'right' }}>{l.durationMs}ms</span>
          </div>
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Network tab
// ─────────────────────────────────────────────────────────────────────────────

function NetworkTab({ stats }: { stats: ReturnType<typeof summary> }) {
  const max = Math.max(1, ...stats.buckets);
  return (
    <div style={{ minHeight: 360, padding: '24px 26px' }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard label="Requests / min" value={String(stats.requestsPerMin)} accent={false} />
        <StatCard label="Avg latency" value={stats.avgLatency + 'ms'} accent />
        <StatCard label="Uptime" value={stats.uptime.toFixed(1) + '%'} accent={false} />
      </div>

      {/* Traffic chart */}
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: FAINT, letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>
        Traffic — last 60s
      </div>
      <div
        style={{
          padding: '14px 16px',
          border: `1px solid ${BORDER}`,
          background: 'rgba(0,0,0,0.3)',
          height: 88,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
        }}
      >
        {stats.buckets.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minHeight: 2,
              height: `${(v / max) * 100}%`,
              background: v > 0 ? LILAC : 'rgba(146,0,225,0.15)',
              opacity: v > 0 ? 0.85 : 1,
              transition: 'height 0.4s',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: boolean }) {
  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        padding: '18px 20px',
        background: 'rgba(146,0,225,0.03)',
      }}
    >
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: FAINT,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 28,
          fontWeight: 700,
          color: accent ? LILAC : '#fff',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Terminal
// ─────────────────────────────────────────────────────────────────────────────

type TabKey = 'shell' | 'logs' | 'network';

export function Terminal() {
  const [tab, setTab] = useState<TabKey>('shell');
  const [connected, setConnected] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    { type: 'dim', text: '0GENT v0.1.0 — try a command below, or type one' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [, forceTick] = useState(0);

  // Subscribe to log changes for re-render
  useEffect(() => {
    const unsub = subscribe(() => forceTick(t => t + 1));
    return unsub;
  }, []);

  // Periodic health check — populates connected state + logs
  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      const { status } = await apiCall('GET', '/health');
      if (!cancelled) setConnected(status >= 200 && status < 400);
    };
    ping();
    const id = setInterval(ping, 15_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Re-render network tab once per second so chart slides
  useEffect(() => {
    if (tab !== 'network') return;
    const id = setInterval(() => forceTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [tab]);

  const run = async (raw: string) => {
    if (busy) return;
    const cmd = raw.trim();
    setInput('');
    setLines(p => [...p, { type: 'cmd', text: cmd }]);

    // Live commands hit the real API
    if (cmd === 'health') {
      setBusy(true);
      const { status, data } = await apiCall('GET', '/health');
      const d = data as any;
      if (status === 200 && d) {
        setLines(p => [
          ...p,
          { type: 'ok', text: `${d.service} v${d.version}` },
          { type: 'out', text: `  chain        0G Chain (${d.chain.chainId})` },
          { type: 'out', text: `  rpc          ${d.chain.rpc}` },
          { type: 'out', text: `  payment      ${d.contracts.payment}` },
          { type: 'out', text: `  registry     ${d.contracts.registry}` },
          { type: 'out', text: `  identity     ${d.contracts.identity}` },
        ]);
      } else {
        setLines(p => [...p, { type: 'err', text: 'API unreachable' }]);
      }
      setBusy(false);
      return;
    }

    if (cmd === 'pricing') {
      setBusy(true);
      await apiCall('GET', '/pricing');
      const items: [string, string][] = [
        ['phone provision', '0.5 0G / mo'],
        ['sms send', '0.01 0G'],
        ['email inbox', '0.2 0G / mo'],
        ['email send', '0.08 0G'],
        ['email read', '0.02 0G'],
        ['identity mint', '0.1 0G'],
        ['memory r/w', 'free'],
      ];
      setLines(p => [
        ...p,
        { type: 'out', text: 'service              cost' },
        { type: 'out', text: '─────────────────  ──────────' },
        ...items.map(([k, v]) => ({ type: 'out' as const, text: `  ${k.padEnd(18)} ${v}` })),
      ]);
      setBusy(false);
      return;
    }

    // Simulated commands
    const out = SIM[cmd.toLowerCase()] || [{ type: 'err' as const, text: `unknown command: ${cmd} — try "help"` }];
    setBusy(true);
    for (const l of out) {
      await new Promise(r => setTimeout(r, l.type === 'ok' || l.type === 'err' ? 320 : 80));
      setLines(p => [...p, l]);
    }
    setBusy(false);
  };

  const stats = summary();
  const logs = getLogs();

  return (
    <section
      id="terminal"
      style={{
        maxWidth: 980,
        margin: '0 auto',
        padding: '0 24px 100px',
      }}
    >
      <div className="glow-border" style={{ borderRadius: 14 }}>
        <div
          style={{
            background: BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            overflow: 'hidden',
            textAlign: 'left',
            boxShadow: '0 30px 80px -30px rgba(146,0,225,0.35)',
          }}
        >
          {/* ─── Header bar ─── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              borderBottom: `1px solid ${BORDER}`,
              background: BG2,
              minHeight: 44,
            }}
          >
            <WindowDots />

            <div style={{ display: 'flex', flex: 1 }}>
              <Tab label="shell" active={tab === 'shell'} onClick={() => setTab('shell')} />
              <Tab label="logs" active={tab === 'logs'} onClick={() => setTab('logs')} />
              <Tab label="network" active={tab === 'network'} onClick={() => setTab('network')} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 16 }}>
              <Waveform />
              <ConnectionStatus connected={connected} />
            </div>
          </div>

          {/* ─── Body (per tab) ─── */}
          {tab === 'shell' && (
            <ShellTab
              lines={lines}
              input={input}
              setInput={setInput}
              onRun={run}
              busy={busy}
              onChip={run}
            />
          )}
          {tab === 'logs' && <LogsTab logs={logs} />}
          {tab === 'network' && <NetworkTab stats={stats} />}

          {/* ─── Status bar ─── */}
          <StatusBar requests={logs.length} lineNum={lines.length + 1} />
        </div>
      </div>
    </section>
  );
}
