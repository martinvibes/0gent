import { useState, useEffect } from 'react';
import { useWallet } from '../lib/walletContext';
import { shortAddress, FAUCET_URL, EXPLORER_BASE } from '../lib/wallet';

const PURPLE = '#9200E1';
const LILAC = '#B75FFF';
const GREEN = '#3fb950';
const RED = '#f85149';
const TEXT = '#e6edf3';
const DIM = 'rgba(254,254,254,0.55)';
const FAINT = 'rgba(254,254,254,0.32)';
const BORDER = 'rgba(183,95,255,0.18)';
const BORDER_DIM = 'rgba(183,95,255,0.10)';
const BG_CARD = 'rgba(146,0,225,0.04)';
const BG_INNER = 'rgba(0,0,0,0.4)';

// ─── outer section + card chrome ───────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  position: 'relative',
  padding: '80px 20px',
  background: '#08080d',
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
      {/* Glow underlay */}
      <div
        style={{
          position: 'absolute',
          inset: -80,
          background: 'radial-gradient(ellipse at top, rgba(146,0,225,0.18) 0%, transparent 60%)',
          pointerEvents: 'none',
          filter: 'blur(40px)',
        }}
      />
      <div
        style={{
          position: 'relative',
          border: `1px solid ${BORDER}`,
          background: BG_CARD,
          backdropFilter: 'blur(8px)',
          overflow: 'hidden',
        }}
      >
        {/* top status bar — 3 dots like the terminal */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 22px',
          borderBottom: `1px solid ${BORDER_DIM}`,
          background: 'rgba(0,0,0,0.2)',
        }}>
          <div style={{ display: 'flex', gap: 5 }}>
            <Dot color="#f85149" />
            <Dot color="#febc2e" />
            <Dot color="#3fb950" />
          </div>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            color: FAINT,
            letterSpacing: '0.04em',
          }}>~/0gent/wallet</span>
        </div>

        <div style={{ padding: '34px 32px 32px' }}>{children}</div>
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <div style={{
      width: 11, height: 11, borderRadius: 0,
      border: `1px solid ${color}`,
      background: `${color}33`,
    }} />
  );
}

// ─── reusable bits ─────────────────────────────────────────────────────

const pillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '4px 11px',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'lowercase',
  border: `1px solid ${BORDER}`,
  background: 'rgba(146,0,225,0.14)',
};

function StatusPill({ kind, label }: { kind: 'idle' | 'active' | 'locked' | 'warn'; label: string }) {
  const colors = {
    idle:   { dot: FAINT, text: DIM, border: BORDER_DIM, bg: 'rgba(146,0,225,0.06)' },
    active: { dot: GREEN, text: GREEN, border: 'rgba(63,185,80,0.4)', bg: 'rgba(63,185,80,0.10)' },
    locked: { dot: '#febc2e', text: '#febc2e', border: 'rgba(254,188,46,0.4)', bg: 'rgba(254,188,46,0.10)' },
    warn:   { dot: RED, text: RED, border: 'rgba(248,81,73,0.4)', bg: 'rgba(248,81,73,0.10)' },
  }[kind];
  return (
    <span style={{
      ...pillStyle,
      borderColor: colors.border, background: colors.bg, color: colors.text,
    }}>
      <span className="pulse" style={{
        width: 7, height: 7, background: colors.dot, display: 'inline-block',
      }} />
      {label}
    </span>
  );
}

function H2({ children, kicker }: { children: React.ReactNode; kicker?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {kicker && (
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, letterSpacing: '0.18em',
          color: LILAC, textTransform: 'uppercase',
          marginBottom: 8,
        }}>{kicker}</div>
      )}
      <h2 style={{
        margin: 0, color: TEXT,
        fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em',
      }}>{children}</h2>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10,
  color: FAINT,
  marginBottom: 7,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: BG_INNER,
  border: `1px solid ${BORDER_DIM}`,
  color: TEXT,
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 13,
  outline: 'none',
  borderRadius: 0,
  transition: 'border-color 0.15s, background 0.15s',
};

const primaryBtn: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 12,
  fontWeight: 700,
  padding: '11px 22px',
  border: `1px solid ${LILAC}`,
  background: `linear-gradient(180deg, ${PURPLE} 0%, #6a00a8 100%)`,
  color: '#fff',
  cursor: 'pointer',
  letterSpacing: '0.06em',
  textTransform: 'lowercase',
  borderRadius: 0,
  transition: 'all 0.15s',
  boxShadow: '0 0 24px rgba(146,0,225,0.25)',
};

const ghostBtn: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 11,
  fontWeight: 600,
  padding: '8px 14px',
  border: `1px solid ${BORDER_DIM}`,
  background: 'transparent',
  color: DIM,
  cursor: 'pointer',
  letterSpacing: '0.06em',
  textTransform: 'lowercase',
  borderRadius: 0,
  transition: 'all 0.15s',
};

// ─── icons ─────────────────────────────────────────────────────────────

function CopyIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="4" y="4" width="9" height="9" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 11V3h8" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function CheckIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5l5.5 2v4.2c0 3.4-2.3 6.1-5.5 6.8-3.2-.7-5.5-3.4-5.5-6.8V3.5l5.5-2z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function KeyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="5.5" cy="9.5" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 9h6m-2 0v3m2-3v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function GlobeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 8h12M8 2c2 1.8 3 4 3 6s-1 4.2-3 6c-2-1.8-3-4-3-6s1-4.2 3-6z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

// ─── CopyButton: shows ✓ for ~1.5s after copy ──────────────────────────

function CopyButton({
  text,
  label = 'copy',
  inline = false,
  size,
}: { text: string; label?: string; inline?: boolean; size?: 'sm' | 'md' }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  const baseStyle: React.CSSProperties = inline
    ? { ...ghostBtn, padding: size === 'sm' ? '4px 10px' : '6px 12px', fontSize: 10 }
    : ghostBtn;

  const finalStyle: React.CSSProperties = copied
    ? { ...baseStyle, color: GREEN, borderColor: 'rgba(63,185,80,0.5)', background: 'rgba(63,185,80,0.08)' }
    : baseStyle;

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          /* clipboard blocked, ignore */
        }
      }}
      style={{ ...finalStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      {copied ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
      {copied ? 'copied' : label}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────
//  Main panel
// ────────────────────────────────────────────────────────────────────────

export function WalletPanel() {
  const { state, balance, create, unlock, lock, forget, refreshBalance } = useWallet();
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [justCreated, setJustCreated] = useState<{ mnemonic: string; address: string } | null>(null);

  // ── No wallet → show create CTA ─────────────────────────────────────
  if (state.kind === 'none') {
    return (
      <section id="wallet" style={sectionStyle}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <StatusPill kind="idle" label="step 01 / generate" />
          </div>

          <H2 kicker="agent identity">Create your agent's wallet</H2>

          <p style={{ color: DIM, fontSize: 14, lineHeight: 1.65, marginBottom: 22, maxWidth: 540 }}>
            Generated entirely in your browser via BIP-39 HD derivation. The mnemonic and private key never
            touch our servers. Encrypted with your passphrase and stored locally.
          </p>

          {/* security feature pills */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
            <FeaturePill icon={<KeyIcon />} label="client-side BIP-39" />
            <FeaturePill icon={<ShieldIcon />} label="AES-256-GCM" />
            <FeaturePill icon={<GlobeIcon />} label="self-custody" />
          </div>

          <form
            onSubmit={async e => {
              e.preventDefault();
              setErr('');
              if (pass !== pass2) { setErr('Passphrases do not match.'); return; }
              setBusy(true);
              try {
                const w = await create(name || undefined, pass);
                setJustCreated({ mnemonic: w.mnemonic, address: w.address });
                setName(''); setPass(''); setPass2('');
              } catch (e: any) {
                setErr(e?.message || 'Failed to create wallet');
              } finally {
                setBusy(false);
              }
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>label · optional</label>
              <input
                style={inputStyle}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="agent-bot"
                spellCheck={false}
                onFocus={e => { e.target.style.borderColor = LILAC; }}
                onBlur={e => { e.target.style.borderColor = BORDER_DIM; }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>passphrase · min 8</label>
                <input
                  type="password"
                  style={inputStyle}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  required
                  minLength={8}
                  onFocus={e => { e.target.style.borderColor = LILAC; }}
                  onBlur={e => { e.target.style.borderColor = BORDER_DIM; }}
                />
              </div>
              <div>
                <label style={labelStyle}>confirm</label>
                <input
                  type="password"
                  style={inputStyle}
                  value={pass2}
                  onChange={e => setPass2(e.target.value)}
                  required
                  minLength={8}
                  onFocus={e => { e.target.style.borderColor = LILAC; }}
                  onBlur={e => { e.target.style.borderColor = BORDER_DIM; }}
                />
              </div>
            </div>
            {err && (
              <p style={{
                color: RED, fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                marginBottom: 14, padding: '8px 12px',
                border: '1px solid rgba(248,81,73,0.3)', background: 'rgba(248,81,73,0.08)',
              }}>{err}</p>
            )}
            <button
              type="submit"
              disabled={busy}
              style={{ ...primaryBtn, opacity: busy ? 0.5 : 1, cursor: busy ? 'wait' : 'pointer' }}
            >
              {busy ? 'generating…' : '⚡ generate wallet'}
            </button>
          </form>

          <p style={{ color: FAINT, fontSize: 11, marginTop: 24, lineHeight: 1.7, fontFamily: 'JetBrains Mono, monospace' }}>
            <span style={{ color: '#febc2e' }}>⚠</span>  forget your passphrase = lose access. there is no reset.
          </p>
        </Card>
      </section>
    );
  }

  // ── Just created → show mnemonic once ────────────────────────────────
  if (justCreated && state.kind === 'unlocked') {
    const words = justCreated.mnemonic.split(' ');
    return (
      <section id="wallet" style={sectionStyle}>
        <Card>
          <StatusPill kind="warn" label="step 02 / backup" />
          <div style={{ marginTop: 18 }}>
            <H2 kicker="recovery phrase">Save these 12 words</H2>
            <p style={{ color: DIM, fontSize: 14, lineHeight: 1.65, marginBottom: 22, maxWidth: 540 }}>
              The <em>only</em> way to recover your wallet on another device. Shown once — close this view
              and the seed is gone. Write them down or save to a password manager.
            </p>
          </div>

          {/* Numbered word grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
            padding: 18,
            background: BG_INNER,
            border: `1px dashed ${LILAC}`,
            marginBottom: 20,
          }}>
            {words.map((w, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'baseline', gap: 8,
                padding: '8px 12px',
                background: 'rgba(146,0,225,0.06)',
                border: `1px solid ${BORDER_DIM}`,
              }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  color: FAINT, minWidth: 18, fontWeight: 600,
                }}>{(i + 1).toString().padStart(2, '0')}</span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 14,
                  color: TEXT, fontWeight: 500, userSelect: 'all',
                }}>{w}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <CopyButton text={justCreated.mnemonic} label="copy phrase" />
            <button
              type="button"
              style={ghostBtn}
              onClick={() => {
                const blob = new Blob([
                  `0GENT wallet recovery phrase\n` +
                  `Address: ${justCreated.address}\n` +
                  `Created: ${new Date().toISOString()}\n\n` +
                  `${justCreated.mnemonic}\n\n` +
                  `Keep this file offline and secret. Anyone with these 12 words controls the wallet.`,
                ], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `0gent-recovery-${justCreated.address.slice(0, 8)}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              ⬇ download .txt
            </button>
            <button
              type="button"
              style={primaryBtn}
              onClick={() => setJustCreated(null)}
            >
              ✓ i've saved it
            </button>
          </div>
        </Card>
      </section>
    );
  }

  // ── Locked state → unlock prompt ─────────────────────────────────────
  if (state.kind === 'locked') {
    return (
      <section id="wallet" style={sectionStyle}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
            <StatusPill kind="locked" label="locked" />
            <span style={{ color: FAINT, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
              {state.stored.name}
            </span>
          </div>

          <H2 kicker="resume session">Unlock your wallet</H2>

          {/* Read-only summary even while locked */}
          <div style={{
            padding: '16px 18px',
            background: BG_INNER,
            border: `1px solid ${BORDER_DIM}`,
            marginBottom: 22,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={labelStyle}>address</div>
                <code style={{ color: LILAC, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', userSelect: 'all' }}>
                  {shortAddress(state.stored.address)}
                </code>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={labelStyle}>balance</div>
                <span style={{ color: TEXT, fontSize: 18, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                  {balance ? Number(balance.zg).toFixed(4) : '…'}
                </span>
                <span style={{ color: FAINT, marginLeft: 5, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>0G</span>
              </div>
            </div>
          </div>

          <form
            onSubmit={async e => {
              e.preventDefault();
              setErr('');
              setBusy(true);
              try {
                await unlock(pass);
                setPass('');
              } catch (e: any) {
                setErr(e?.message || 'Failed to unlock');
              } finally {
                setBusy(false);
              }
            }}
          >
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>passphrase</label>
              <input
                type="password"
                style={inputStyle}
                value={pass}
                onChange={e => setPass(e.target.value)}
                autoFocus
                onFocus={e => { e.target.style.borderColor = LILAC; }}
                onBlur={e => { e.target.style.borderColor = BORDER_DIM; }}
              />
            </div>
            {err && (
              <p style={{
                color: RED, fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                marginBottom: 14, padding: '8px 12px',
                border: '1px solid rgba(248,81,73,0.3)', background: 'rgba(248,81,73,0.08)',
              }}>{err}</p>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.5 : 1 }}>
                {busy ? 'unlocking…' : '🔓 unlock'}
              </button>
              <button
                type="button"
                style={{ ...ghostBtn, color: RED, borderColor: 'rgba(248,81,73,0.3)' }}
                onClick={() => { if (confirm('Delete this wallet from this browser? You can restore from your recovery phrase later.')) forget(); }}
              >
                forget wallet
              </button>
            </div>
          </form>
        </Card>
      </section>
    );
  }

  // ── Unlocked state → wallet detail ───────────────────────────────────
  const w = state.wallet;
  const explorerUrl = EXPLORER_BASE + w.address;
  const zg = balance ? Number(balance.zg) : 0;
  const isFunded = zg > 0;

  return (
    <section id="wallet" style={sectionStyle}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
          <StatusPill kind="active" label="active" />
          <span style={{ color: TEXT, fontSize: 14, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
            {w.name}
          </span>
          <span style={{ color: FAINT, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
            on 0G testnet · chain 16602
          </span>
        </div>

        {/* Address row */}
        <div style={{ marginBottom: 24 }}>
          <div style={labelStyle}>wallet address</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            padding: '12px 14px',
            background: BG_INNER,
            border: `1px solid ${BORDER_DIM}`,
          }}>
            <code style={{
              color: LILAC, fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
              userSelect: 'all', wordBreak: 'break-all', flex: 1, minWidth: 280,
            }}>{w.address}</code>
            <CopyButton text={w.address} label="copy" inline size="sm" />
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                ...ghostBtn,
                padding: '4px 10px', fontSize: 10,
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
            >
              explorer ↗
            </a>
          </div>
        </div>

        {/* Big balance display */}
        <div style={{
          padding: '24px 22px',
          background: 'linear-gradient(135deg, rgba(146,0,225,0.10) 0%, rgba(146,0,225,0.02) 100%)',
          border: `1px solid ${BORDER}`,
          marginBottom: 24,
          position: 'relative',
        }}>
          <div style={{ ...labelStyle, marginBottom: 4 }}>balance</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 44, fontWeight: 700, color: TEXT,
              letterSpacing: '-0.02em', lineHeight: 1,
            }}>
              {balance ? Number(balance.zg).toFixed(4) : '0.0000'}
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 18, color: LILAC, fontWeight: 600,
            }}>0G</span>
            <button
              type="button"
              onClick={refreshBalance}
              style={{
                ...ghostBtn,
                marginLeft: 'auto', padding: '5px 11px', fontSize: 10,
              }}
              title="refresh balance"
            >
              ↻ refresh
            </button>
          </div>
          {balance && (
            <div style={{
              marginTop: 10,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11, color: FAINT,
            }}>
              {balance.wei} wei · auto-refreshes every 15s
            </div>
          )}
        </div>

        {/* Faucet card when balance is 0 */}
        {balance && !isFunded && (
          <div style={{
            padding: '18px 20px',
            background: 'rgba(254,188,46,0.06)',
            border: '1px solid rgba(254,188,46,0.3)',
            marginBottom: 24,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#febc2e',
              fontWeight: 700, letterSpacing: '0.04em',
            }}>
              <span>⚡</span> fund this wallet to start using your agent
            </div>
            <ol style={{
              margin: 0, paddingLeft: 20,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(254,254,254,0.7)',
              lineHeight: 1.9,
            }}>
              <li>open the <a href={FAUCET_URL} target="_blank" rel="noreferrer" style={{ color: LILAC }}>0G testnet faucet</a></li>
              <li>paste your address (it's already in your clipboard if you tapped <em>copy</em> above)</li>
              <li>click <em>request 0G</em> — funds arrive in &lt; 30s</li>
            </ol>
          </div>
        )}

        {/* Action row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href={FAUCET_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              ...ghostBtn,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              ...(isFunded ? {} : { borderColor: 'rgba(254,188,46,0.4)', color: '#febc2e' }),
            }}
          >
            ⚡ open faucet ↗
          </a>
          <button type="button" style={ghostBtn} onClick={lock}>🔒 lock</button>
          <button
            type="button"
            style={{ ...ghostBtn, marginLeft: 'auto', color: RED, borderColor: 'rgba(248,81,73,0.3)' }}
            onClick={() => { if (confirm('Delete this wallet from this browser? Make sure you have your recovery phrase.')) forget(); }}
          >
            forget wallet
          </button>
        </div>
      </Card>
    </section>
  );
}

// ─── small bits ───────────────────────────────────────────────────────

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '6px 12px',
      border: `1px solid ${BORDER_DIM}`,
      background: 'rgba(0,0,0,0.3)',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11, color: DIM,
      letterSpacing: '0.02em',
    }}>
      <span style={{ color: LILAC, display: 'inline-flex' }}>{icon}</span>
      {label}
    </div>
  );
}
