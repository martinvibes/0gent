const features = [
  { icon:'📞', title:'Phone & SMS', desc:'Real phone numbers in 150+ countries. Send/receive SMS. Voice calls with TTS, recording, DTMF.', code:'POST /phone/provision\n→ 402: pay 0.5 0G\n→ +1 (415) 555-0142', tag:'Telnyx' },
  { icon:'📧', title:'Email Inboxes', desc:'Dedicated email addresses for agents. Send, receive, manage email programmatically.', code:'POST /email/provision\n→ 402: pay 0.2 0G\n→ scout@0gent.xyz', tag:'Cloudflare' },
  { icon:'🖥️', title:'Compute (VPS)', desc:'Hardened VPS instances. SSH key-only, UFW firewall, Node.js 22 pre-installed.', code:'POST /compute/provision\n→ 402: pay 1.0 0G\n→ 49.12.218.44 (cx22)', tag:'Hetzner' },
  { icon:'🌐', title:'Domains', desc:'Register domains with full DNS control. .com, .dev, .ai — hundreds of TLDs.', code:'POST /domain/register\n→ 402: pay 2.0 0G\n→ agent-alpha.dev', tag:'Namecheap' },
];

const S = {
  section: { padding:'120px 0' } as const,
  container: { maxWidth:1100, margin:'0 auto', padding:'0 24px' } as const,
  label: { fontSize:12, letterSpacing:'0.12em', textTransform:'uppercase' as const, color:'#B75FFF', marginBottom:16, fontWeight:500 },
  h2: { fontSize:'min(48px, 4vw)', fontWeight:500, letterSpacing:'-0.03em', lineHeight:1.1, maxWidth:600, marginBottom:20 },
  sub: { fontSize:16, color:'rgba(254,254,254,0.5)', maxWidth:500, lineHeight:1.7, marginBottom:56 },
  grid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:2, background:'rgba(183,95,255,0.06)' } as const,
  card: { background:'#050508', padding:0, position:'relative' as const, overflow:'hidden' as const, transition:'all 0.3s' },
  inner: { padding:32, display:'flex', flexDirection:'column' as const, height:'100%' },
  icon: { width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(183,95,255,0.15)', background:'rgba(183,95,255,0.05)', fontSize:16 },
  code: { marginTop:'auto', paddingTop:20, fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'rgba(254,254,254,0.4)', lineHeight:1.8, padding:16, background:'rgba(0,0,0,0.5)', border:'1px solid rgba(183,95,255,0.08)', marginBlockStart:24 },
  tag: { display:'inline-flex', alignItems:'center', gap:6, marginTop:16, fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'rgba(254,254,254,0.35)', textTransform:'uppercase' as const, letterSpacing:'0.05em', border:'1px solid rgba(183,95,255,0.08)', padding:'3px 10px', width:'fit-content' },
};

export function Features() {
  return (
    <section id="features" style={S.section}>
      <div style={S.container}>
        <div style={S.label}>Services</div>
        <h2 style={S.h2}>Everything an agent needs</h2>
        <p style={S.sub}>Real-world infrastructure via API, paid with 0G tokens, owned by your wallet.</p>

        <div style={S.grid}>
          {features.map(f => (
            <div key={f.title} style={S.card}>
              <div style={S.inner}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                  <div style={S.icon}>{f.icon}</div>
                  <h3 style={{ fontSize:18, fontWeight:600, letterSpacing:'-0.02em' }}>{f.title}</h3>
                </div>
                <p style={{ fontSize:13, color:'rgba(254,254,254,0.5)', lineHeight:1.7 }}>{f.desc}</p>

                <div style={S.code}>
                  {f.code.split('\n').map((line,i) => (
                    <div key={i}>{line.startsWith('→') ? <><span style={{ color:'#B75FFF', fontWeight:700 }}>→</span>{line.slice(1)}</> : <span style={{ color:'#B75FFF', fontWeight:700 }}>{line}</span>}</div>
                  ))}
                </div>

                <div style={S.tag}>
                  <span style={{ width:5, height:5, background:'#9200E1', display:'inline-block' }} />
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
