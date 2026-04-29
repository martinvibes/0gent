import type { ReactNode } from 'react';

// ─── Inline SVG icons (purple, stroke-based, consistent line weight) ──

const PhoneIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
  </svg>
);

const EmailIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <polyline points="3 7 12 13 21 7" />
  </svg>
);

const ServerIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="7" rx="1.5" />
    <rect x="3" y="14" width="18" height="7" rx="1.5" />
    <line x1="7" y1="6.5" x2="7.01" y2="6.5" />
    <line x1="7" y1="17.5" x2="7.01" y2="17.5" />
  </svg>
);

const GlobeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

interface Feature {
  icon: ReactNode;
  title: string;
  desc: string;
  code: string;
  tag: string;
}

const features: Feature[] = [
  { icon: PhoneIcon,  title: 'Phone & SMS',     desc: 'Real phone numbers in 150+ countries. Send/receive SMS. Voice calls with TTS, recording, DTMF.', code: 'POST /phone/provision\n→ 402: pay 0.5 0G\n→ +1 (415) 555-0142', tag: 'Telnyx' },
  { icon: EmailIcon,  title: 'Email Inboxes',   desc: 'Dedicated email addresses for agents. Send, receive, manage email programmatically.',           code: 'POST /email/provision\n→ 402: pay 0.2 0G\n→ scout@0gent.xyz',     tag: 'Cloudflare' },
  { icon: ServerIcon, title: 'Compute (VPS)',   desc: 'Hardened VPS instances. SSH key-only, UFW firewall, Node.js 22 pre-installed.',                  code: 'POST /compute/provision\n→ 402: pay 1.0 0G\n→ 49.12.218.44 (cx22)', tag: 'Hetzner' },
  { icon: GlobeIcon,  title: 'Domains',         desc: 'Register domains with full DNS control. .com, .dev, .ai — hundreds of TLDs.',                    code: 'POST /domain/register\n→ 402: pay 2.0 0G\n→ agent-alpha.dev',      tag: 'Namecheap' },
];

const S = {
  section: { padding: '120px 0' } as const,
  container: { maxWidth: 1100, margin: '0 auto', padding: '0 24px' } as const,
  label: { fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#B75FFF', marginBottom: 16, fontWeight: 500 },
  h2: { fontSize: 'min(48px, 4vw)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: 600, marginBottom: 20 },
  sub: { fontSize: 16, color: 'rgba(254,254,254,0.5)', maxWidth: 500, lineHeight: 1.7, marginBottom: 56 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, background: 'rgba(183,95,255,0.06)' } as const,
  card: { background: '#050508', padding: 0, position: 'relative' as const, overflow: 'hidden' as const, transition: 'all 0.3s' },
  inner: { padding: 32, display: 'flex', flexDirection: 'column' as const, height: '100%' },
  iconBox: {
    width: 40, height: 40,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(183,95,255,0.18)',
    background: 'linear-gradient(135deg, rgba(146,0,225,0.08) 0%, rgba(146,0,225,0.02) 100%)',
    color: '#B75FFF',
    transition: 'all 0.3s',
  },
  code: { marginTop: 'auto', paddingTop: 20, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(254,254,254,0.4)', lineHeight: 1.8, padding: 16, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(183,95,255,0.08)', marginBlockStart: 24 },
  tag: { display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(254,254,254,0.35)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', border: '1px solid rgba(183,95,255,0.08)', padding: '3px 10px', width: 'fit-content' },
};

export function Features() {
  return (
    <section id="features" style={{ ...S.section, position: 'relative', overflow: 'hidden' }}>
      {/* Subtle bg glow — center-left */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse 45% 35% at 25% 55%, rgba(146,0,225,0.06), transparent 70%)',
      }} />
      <div style={{ ...S.container, position: 'relative' }}>
        <div className="reveal-up" style={S.label}>Services</div>
        <h2 className="reveal-up" style={S.h2}>Everything an agent needs</h2>
        <p className="reveal-up" style={S.sub}>Real-world infrastructure via API, paid with 0G tokens, owned by your wallet.</p>

        <div style={S.grid}>
          {features.map((f, i) => (
            <div
              key={f.title}
              className="reveal-up feature-card"
              style={{
                ...S.card,
                transitionDelay: `${i * 80}ms`,
              }}
            >
              <div style={S.inner}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div className="feature-icon" style={S.iconBox}>{f.icon}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>{f.title}</h3>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(254,254,254,0.5)', lineHeight: 1.7 }}>{f.desc}</p>

                <div style={S.code}>
                  {f.code.split('\n').map((line, idx) => (
                    <div key={idx}>
                      {line.startsWith('→') ? (
                        <>
                          <span style={{ color: '#B75FFF', fontWeight: 700 }}>→</span>
                          {line.slice(1)}
                        </>
                      ) : (
                        <span style={{ color: '#B75FFF', fontWeight: 700 }}>{line}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div style={S.tag}>
                  <span style={{ width: 5, height: 5, background: '#9200E1', display: 'inline-block' }} />
                  Powered by {f.tag}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
