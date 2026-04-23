export function Nav() {
  return (
    <nav style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', zIndex:100 }}>
      <div style={{
        display:'inline-flex', alignItems:'center', gap:28, padding:'12px 22px',
        background:'rgba(12,12,20,0.9)', backdropFilter:'blur(24px)',
        border:'1px solid rgba(183,95,255,0.15)', borderRadius:100,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:600, fontSize:15, letterSpacing:'-0.01em' }}>
          <div style={{
            width:24, height:24, borderRadius:6, background:'#9200E1',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'JetBrains Mono, monospace', fontSize:8, fontWeight:800, color:'#fff',
          }}>0G</div>
          0GENT
        </div>

        <div style={{ display:'flex', gap:22 }}>
          {['Features', 'How it Works', 'Pricing'].map(t => (
            <a key={t} href={`#${t.toLowerCase().replace(/ /g,'-')}`}
              style={{ fontSize:13, color:'rgba(254,254,254,0.5)', transition:'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(254,254,254,0.5)')}
            >{t}</a>
          ))}
        </div>

        <a href="#terminal" style={{
          display:'inline-flex', alignItems:'center', height:32, padding:'0 16px',
          background:'#9200E1', color:'#fff', fontSize:11, fontWeight:600,
          textTransform:'uppercase', letterSpacing:'0.06em', borderRadius:100, border:'none',
          transition:'filter 0.2s',
        }}>Try it</a>
      </div>
    </nav>
  );
}
