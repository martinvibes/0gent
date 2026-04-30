import { LogoLockup } from './Logo';

export function Footer() {
  return (
    <>
      <section className="final-cta" style={{ padding: '140px 0', textAlign: 'center' }}>
        <h2 className="final-cta-h2" style={{ fontSize: 'min(48px, 4vw)', fontWeight: 500, letterSpacing: '-0.03em', marginBottom: 20 }}>
          Give your agent superpowers
        </h2>
        <p style={{ fontSize: 17, color: 'rgba(254,254,254,0.5)', maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.7 }}>
          Real infrastructure. On-chain identity. Decentralized memory. All on 0G.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', padding: '0 24px' }}>
          <a
            href="https://www.npmjs.com/package/@0gent/core"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', height: 48, padding: '0 28px',
              background: '#9200E1', color: '#fff', fontSize: 14, fontWeight: 500, borderRadius: 100,
              border: 'none', transition: 'filter 0.2s', textDecoration: 'none',
            }}
          >
            Install the CLI →
          </a>
          <a
            href="https://www.npmjs.com/package/@0gent/core"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, height: 48, padding: '0 24px',
              background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 500,
              borderRadius: 100, border: '1px solid rgba(183,95,255,0.25)',
              transition: 'border-color 0.2s', textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#B75FFF'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(183,95,255,0.25)'; }}
          >
            npm i -g @0gent/core
          </a>
        </div>
      </section>

      <footer className="footer-row" style={{ borderTop: '1px solid rgba(183,95,255,0.1)', padding: '48px 24px' }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 24, flexWrap: 'wrap',
        }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <LogoLockup size={22} color="#B75FFF" />
          </a>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              ['Docs',       '/docs',                                                           false],
              ['skill.md',   '/skill.md',                                                       false],
              ['npm',        'https://www.npmjs.com/package/@0gent/core',                      true],
              ['GitHub',     'https://github.com/martinvibes/0gent',                            true],
              ['0G Docs',    'https://docs.0g.ai',                                              true],
              ['Hackathon',  'https://www.hackquest.io/hackathons/0G-APAC-Hackathon',           true],
            ].map(([l, h, ext]) => (
              <a
                key={l as string}
                href={h as string}
                target={ext ? '_blank' : undefined}
                rel={ext ? 'noreferrer' : undefined}
                style={{ fontSize: 14, color: 'rgba(254,254,254,0.35)', transition: 'color 0.2s', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(254,254,254,0.35)')}
              >
                {l}
              </a>
            ))}
          </div>
          <div className="mono" style={{ fontSize: 12, color: 'rgba(254,254,254,0.15)' }}>
            #0GHackathon #BuildOn0G
          </div>
        </div>
      </footer>
    </>
  );
}
