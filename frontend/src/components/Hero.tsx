import Orb from './Orb';

export function Hero() {
  return (
    <section style={{
      paddingTop:180, paddingBottom:170, position:'relative', textAlign:'center', overflow:'hidden',
    }}>
      {/* Orb Background */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: '100%',
        minHeight: '800px',
        zIndex: 0,
      }}>
        <Orb
          hoverIntensity={2}
          rotateOnHover={true}
          hue={0}
          forceHoverState={false}
          backgroundColor="#000000"
        />
      </div>

      {/* Purple glow */}
      <div style={{
        position:'absolute', top:-300, left:'50%', transform:'translateX(-50%)',
        width:1200, height:900, pointerEvents:'none',
        background:'radial-gradient(ellipse 50% 50%, rgba(146,0,225,0.12) 0%, rgba(183,95,255,0.04) 40%, transparent 70%)',
        zIndex: 0,
      }} />

      {/* Grid lines */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage:'linear-gradient(rgba(183,95,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(183,95,255,0.04) 1px, transparent 1px)',
        backgroundSize:'60px 60px',
        maskImage:'linear-gradient(to bottom, transparent 10%, black 30%, black 70%, transparent 90%)',
        WebkitMaskImage:'linear-gradient(to bottom, transparent 10%, black 30%, black 70%, transparent 90%)',
        zIndex: 0,
      }} />

      <div style={{ position:'relative', zIndex:1, maxWidth:1100, margin:'0 auto', padding:'0 24px', pointerEvents: 'none' }}>
        {/* Badge */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:8, padding:'8px 18px', marginBottom:32,
          background:'rgba(146,0,225,0.1)', border:'1px solid rgba(183,95,255,0.25)', borderRadius:100,
          fontSize:13, fontWeight:500, color:'#B75FFF',
          pointerEvents: 'auto',
        }}>
          <span className="pulse" style={{ width:6, height:6, borderRadius:'50%', background:'#B75FFF', display:'inline-block' }} />
          Built on 0G Chain
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize:'min(72px, 6vw)', fontWeight:500, letterSpacing:'-0.04em', lineHeight:1.05,
          marginBottom:24,
          background:'linear-gradient(180deg, #FEFEFE 30%, rgba(254,254,254,0.5))',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
          pointerEvents: 'auto',
        }}>
          Infrastructure for<br />Autonomous AI Agents
        </h1>

        <p style={{ fontSize:17, color:'rgba(254,254,254,0.7)', maxWidth:520, margin:'0 auto 40px', lineHeight:1.7, pointerEvents: 'auto' }}>
          Phone, email, compute, domains — paid with 0G tokens via x402. Your wallet is your identity. No API keys. No signup.
        </p>

        {/* Buttons */}
        <div style={{ display:'flex', gap:14, justifyContent:'center', marginBottom:56, pointerEvents: 'auto' }}>
          <a href="#terminal" style={{
            display:'inline-flex', alignItems:'center', gap:8, height:48, padding:'0 28px',
            background:'#9200E1', color:'#fff', fontSize:14, fontWeight:500, borderRadius:100,
            transition:'all 0.2s', border:'none', textDecoration: 'none'
          }}>Get Started →</a>
          <a href="https://github.com" target="_blank" style={{
            display:'inline-flex', alignItems:'center', gap:8, height:48, padding:'0 28px',
            background:'rgba(254,254,254,0.04)', color:'#fff', fontSize:14, fontWeight:500,
            borderRadius:100, border:'1px solid rgba(183,95,255,0.15)', transition:'all 0.2s', textDecoration: 'none'
          }}>View Source</a>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', justifyContent:'center', gap:56, pointerEvents: 'auto' }}>
          {([['4','0G Components'],['98','Contract Tests'],['x402','Payment Protocol']] as const).map(([v,l]) => (
            <div key={l} style={{ textAlign:'center' }}>
              <div className="mono" style={{ fontSize:28, fontWeight:600, color:'#B75FFF' }}>{v}</div>
              <div style={{ fontSize:11, color:'rgba(254,254,254,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:4 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
