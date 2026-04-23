const items = [
  { title:'0G Chain', desc:'Payments, resource registry, agent identity — all on-chain.', detail:'Chain ID 16661 / 16602' },
  { title:'0G Storage', desc:'Agent memory, metadata, session state on decentralized storage.', detail:'@0gfoundation/0g-ts-sdk' },
  { title:'Agent Identity', desc:'One ERC-721 per agent. Metadata on 0G Storage. Permanent ID.', detail:'ZeroGentIdentity.sol' },
  { title:'x402 Payments', desc:'HTTP 402 protocol for 0G Chain native token payments.', detail:'ZeroGentPayment.sol' },
];

export function ZGIntegration() {
  return (
    <section id="pricing" style={{ padding:'120px 0', borderTop:'1px solid rgba(183,95,255,0.1)' }}>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px', textAlign:'center' }}>
        <div style={{ fontSize:12, letterSpacing:'0.12em', textTransform:'uppercase', color:'#B75FFF', marginBottom:16, fontWeight:500 }}>Deep Integration</div>
        <h2 style={{ fontSize:'min(48px, 4vw)', fontWeight:500, letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:20 }}>4 Components. Native 0G.</h2>
        <p style={{ fontSize:16, color:'rgba(254,254,254,0.5)', maxWidth:500, margin:'0 auto 56px', lineHeight:1.7 }}>
          Every core 0G component used where it matters most.
        </p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16, textAlign:'left' }}>
          {items.map(it => (
            <div key={it.title} className="card" style={{ padding:32 }}>
              <div style={{ fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(254,254,254,0.3)', marginBottom:12, fontWeight:500 }}>0G Component</div>
              <h3 style={{ fontSize:18, fontWeight:600, letterSpacing:'-0.02em', marginBottom:8 }}>{it.title}</h3>
              <p style={{ fontSize:14, color:'rgba(254,254,254,0.5)', lineHeight:1.6, marginBottom:16 }}>{it.desc}</p>
              <div className="mono" style={{ fontSize:10, color:'rgba(254,254,254,0.2)' }}>{it.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
