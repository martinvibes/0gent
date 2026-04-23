import { useState } from 'react';

const steps = [
  { n:'01', title:'Agent reads skill.md', body:'Fetches GET /skill.md — a plain text file describing every endpoint, cost, and how to pay.', code:'GET /skill.md\n\n# 0GENT — Real-World Infrastructure\n# for AI Agents on 0G Chain\n#\n# Wallet = identity. Pay via x402.' },
  { n:'02', title:'Agent calls paid endpoint', body:'Requests a resource. Without payment, server responds HTTP 402 with payment instructions.', code:'POST /phone/provision\n\n← 402 Payment Required\n{\n  "contract": "0x3F2a...91cB",\n  "value": "500000000000000000",\n  "nonce": "0xf7a3..."\n}' },
  { n:'03', title:'Payment on 0G Chain', body:'Agent calls ZeroGentPayment.pay() with nonce + 0G tokens. Verified on-chain.', code:'ZeroGentPayment.pay(\n  nonce: 0xf7a3...,\n  type: "phone"\n) → 0.5 0G\n\n✓ PaymentReceived emitted\n✓ Nonce marked used' },
  { n:'04', title:'Resource provisioned', body:'Backend verifies payment, provisions via Web2 API, registers on AgentRegistry.', code:'✓ Payment verified on-chain\n✓ Telnyx: +1 (415) 555-0142\n✓ AgentRegistry.registerResource()\n\n→ owner: 0x742d...bD18\n→ resourceId: 3' },
];

export function HowItWorks() {
  const [a, setA] = useState(0);

  return (
    <section id="how-it-works" style={{ padding:'120px 0' }}>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px' }}>
        <div style={{ fontSize:12, letterSpacing:'0.12em', textTransform:'uppercase', color:'#B75FFF', marginBottom:16, fontWeight:500 }}>x402 Protocol</div>
        <h2 style={{ fontSize:'min(48px, 4vw)', fontWeight:500, letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:20 }}>How it works</h2>
        <p style={{ fontSize:16, color:'rgba(254,254,254,0.5)', maxWidth:500, lineHeight:1.7, marginBottom:56 }}>
          Call API → get 402 → pay on 0G Chain → resource is yours.
        </p>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'start' }}>
          <div>
            {steps.map((s,i) => (
              <div key={s.n}
                onClick={() => setA(i)}
                style={{ padding:'24px 0', cursor:'pointer', borderBottom:'1px solid rgba(183,95,255,0.1)', ...(i===0 ? { borderTop:'1px solid rgba(183,95,255,0.1)' } : {}) }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                  <div style={{
                    width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:14, fontWeight:600, fontFamily:'JetBrains Mono, monospace', transition:'all 0.3s',
                    ...(a===i ? { background:'#9200E1', color:'#000', border:'1px solid #9200E1' } : { color:'#B75FFF', border:'1px solid rgba(183,95,255,0.3)' }),
                  }}>{s.n}</div>
                  <div style={{ fontSize:16, fontWeight:500 }}>{s.title}</div>
                </div>
                <div style={{ paddingLeft:52, marginTop:12, fontSize:14, color:'rgba(254,254,254,0.5)', lineHeight:1.7, maxHeight: a===i ? 200 : 0, overflow:'hidden', transition:'max-height 0.4s ease' }}>
                  {s.body}
                </div>
              </div>
            ))}
          </div>

          <div style={{ border:'1px solid rgba(183,95,255,0.1)', borderRadius:12, minHeight:380, display:'flex', alignItems:'center' }}>
            <pre className="mono" style={{ fontSize:12, color:'rgba(254,254,254,0.5)', padding:28, lineHeight:2, width:'100%', whiteSpace:'pre-wrap', margin:0 }}>
              {steps[a].code.split('\n').map((l,i) => (
                <div key={i}>
                  {l.startsWith('✓') ? <><span style={{ color:'#3fb950', fontWeight:700 }}>✓</span>{l.slice(1)}</> :
                   l.startsWith('←') ? <><span style={{ color:'#f85149', fontWeight:700 }}>←</span>{l.slice(1)}</> :
                   l.startsWith('→') ? <><span style={{ color:'#B75FFF', fontWeight:700 }}>→</span>{l.slice(1)}</> :
                   l.startsWith('#') ? <span style={{ color:'rgba(254,254,254,0.2)' }}>{l}</span> : l}
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
