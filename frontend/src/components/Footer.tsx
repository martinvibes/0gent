export function Footer() {
  return (
    <>
      <section style={{ padding:'140px 0', textAlign:'center' }}>
        <h2 style={{ fontSize:'min(48px, 4vw)', fontWeight:500, letterSpacing:'-0.03em', marginBottom:20 }}>
          Give your agent superpowers
        </h2>
        <p style={{ fontSize:17, color:'rgba(254,254,254,0.5)', maxWidth:500, margin:'0 auto 36px', lineHeight:1.7 }}>
          Real infrastructure. On-chain identity. Decentralized memory. All on 0G.
        </p>
        <a href="#terminal" style={{
          display:'inline-flex', alignItems:'center', height:48, padding:'0 28px',
          background:'#9200E1', color:'#fff', fontSize:14, fontWeight:500, borderRadius:100,
          border:'none', transition:'filter 0.2s',
        }}>Get Started →</a>
      </section>

      <footer style={{ borderTop:'1px solid rgba(183,95,255,0.1)', padding:'48px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:600, fontSize:15 }}>
            <div style={{ width:22, height:22, borderRadius:6, background:'#9200E1', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'JetBrains Mono, monospace', fontSize:8, fontWeight:800, color:'#fff' }}>0G</div>
            0GENT
          </div>
          <div style={{ display:'flex', gap:24 }}>
            {[['skill.md','/skill.md'],['0G Docs','https://docs.0g.ai'],['Hackathon','https://www.hackquest.io/hackathons/0G-APAC-Hackathon']].map(([l,h]) => (
              <a key={l} href={h} target="_blank" style={{ fontSize:14, color:'rgba(254,254,254,0.35)', transition:'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color='#fff')}
                onMouseLeave={e => (e.currentTarget.style.color='rgba(254,254,254,0.35)')}
              >{l}</a>
            ))}
          </div>
          <div className="mono" style={{ fontSize:12, color:'rgba(254,254,254,0.15)' }}>#0GHackathon #BuildOn0G</div>
        </div>
      </footer>
    </>
  );
}
