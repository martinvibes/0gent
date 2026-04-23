import { useState, useRef, useEffect } from 'react';

type Line = { type: 'cmd'|'out'|'ok'|'err'; text: string };

const CMD: Record<string, Line[]> = {
  'help': [
    { type:'out', text:'  phone search --country US     Search numbers (free)' },
    { type:'out', text:'  phone provision                Provision phone (0.5 0G)' },
    { type:'out', text:'  email provision --name agent   Provision inbox (0.2 0G)' },
    { type:'out', text:'  compute provision              Deploy VPS (1.0 0G)' },
    { type:'out', text:'  identity mint                  Mint agent NFT (0.1 0G)' },
    { type:'out', text:'  health                         API status' },
    { type:'out', text:'  pricing                        All prices' },
  ],
  'health': [
    { type:'ok',  text:'  ✓ 0GENT API ............ online' },
    { type:'ok',  text:'  ✓ 0G Chain (16602) ..... connected' },
    { type:'ok',  text:'  ✓ 0G Storage .......... available' },
    { type:'ok',  text:'  ✓ Telnyx .............. ready' },
    { type:'ok',  text:'  ✓ Hetzner ............. ready' },
  ],
  'pricing': [
    { type:'out', text:'  Service            Cost (0G)' },
    { type:'out', text:'  ─────────────────  ─────────' },
    { type:'out', text:'  Phone provision    0.5 / mo' },
    { type:'out', text:'  SMS send           0.01' },
    { type:'out', text:'  Email inbox        0.2 / mo' },
    { type:'out', text:'  Compute (VPS)      1.0 / mo' },
    { type:'out', text:'  Domain register    2.0 / yr' },
    { type:'out', text:'  Identity mint      0.1' },
  ],
  'phone search --country US': [
    { type:'out', text:'  +1 (415) 555-0142   San Francisco   local' },
    { type:'out', text:'  +1 (212) 555-0198   New York        local' },
    { type:'out', text:'  +1 (310) 555-0167   Los Angeles     local' },
    { type:'out', text:'  +1 (512) 555-0134   Austin          local' },
    { type:'out', text:'  +1 (305) 555-0189   Miami           local' },
  ],
  'phone provision': [
    { type:'out', text:'  → POST /phone/provision' },
    { type:'err', text:'  ✗ 402 Payment Required — 0.5 0G' },
    { type:'out', text:'  → ZeroGentPayment.pay(nonce, "phone") — 0.5 0G' },
    { type:'ok',  text:'  ✓ Payment verified on 0G Chain' },
    { type:'ok',  text:'  ✓ Provisioned via Telnyx' },
    { type:'ok',  text:'  ✓ Registered on AgentRegistry' },
    { type:'out', text:'' },
    { type:'out', text:'  Phone: +1 (415) 555-0142' },
    { type:'out', text:'  Owner: 0x742d...bD18  |  Resource ID: 3' },
  ],
  'identity mint': [
    { type:'out', text:'  → POST /identity/mint' },
    { type:'err', text:'  ✗ 402 Payment Required — 0.1 0G' },
    { type:'out', text:'  → ZeroGentPayment.pay(nonce, "identity")' },
    { type:'ok',  text:'  ✓ Payment verified' },
    { type:'ok',  text:'  ✓ Metadata → 0G Storage: 0g://af3b2c9d...' },
    { type:'ok',  text:'  ✓ ERC-721 minted on ZeroGentIdentity' },
    { type:'out', text:'' },
    { type:'out', text:'  Token #1  |  0x742d...bD18  |  0g://af3b2c9d...' },
  ],
  'compute provision': [
    { type:'out', text:'  → POST /compute/provision { type: "cx22" }' },
    { type:'err', text:'  ✗ 402 Payment Required — 1.0 0G' },
    { type:'out', text:'  → ZeroGentPayment.pay(nonce, "compute")' },
    { type:'ok',  text:'  ✓ Payment verified' },
    { type:'ok',  text:'  ✓ Hetzner: cx22 deployed — UFW + SSH hardened' },
    { type:'ok',  text:'  ✓ Registered on AgentRegistry' },
    { type:'out', text:'' },
    { type:'out', text:'  0gent-alpha  |  cx22  |  49.12.218.44  |  running' },
  ],
};

const CHIPS = ['health','pricing','phone search --country US','phone provision','identity mint','compute provision','help'];

export function Terminal() {
  const [lines, setLines] = useState<Line[]>([
    { type:'out', text:'  Welcome to 0GENT — agent infrastructure on 0G Chain.' },
    { type:'out', text:'  Type a command or click below. Try "help".' },
    { type:'out', text:'' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { ref.current && (ref.current.scrollTop = ref.current.scrollHeight); }, [lines]);

  const run = async (c: string) => {
    if (busy) return;
    setInput('');
    setLines(p => [...p, { type:'cmd', text:c }]);
    const out = CMD[c.trim().toLowerCase()] || [{ type:'out', text:`  Unknown: ${c}. Try "help".` }];
    setBusy(true);
    for (const l of out) {
      await new Promise(r => setTimeout(r, l.type==='ok'||l.type==='err' ? 350 : 100));
      setLines(p => [...p, l]);
    }
    setBusy(false);
  };

  const S = {
    wrap: { maxWidth:880, margin:'0 auto', padding:'0 24px 80px' } as const,
    box: { background:'#080810', border:'1px solid rgba(183,95,255,0.15)', borderRadius:12, overflow:'hidden', textAlign:'left' as const },
    header: { display:'flex', alignItems:'center', borderBottom:'1px solid rgba(183,95,255,0.1)', background:'rgba(183,95,255,0.03)' },
    dots: { display:'flex', gap:6, padding:'12px 16px' },
    dot: (c:string) => ({ width:10, height:10, borderRadius:'50%', background:c, opacity:0.7 }),
    tab: { padding:'10px 20px', fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'#B75FFF', borderBottom:'2px solid #B75FFF', display:'flex', alignItems:'center', gap:8 },
    status: { marginLeft:'auto', padding:'10px 16px', display:'flex', alignItems:'center', gap:6, fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'rgba(254,254,254,0.4)' },
    body: { fontFamily:'JetBrains Mono, monospace', fontSize:13, lineHeight:1.8, maxHeight:300, overflowY:'auto' as const, padding:16, color:'#c9d1d9' },
    input: { display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderTop:'1px solid rgba(183,95,255,0.1)' },
    chips: { display:'flex', flexWrap:'wrap' as const, gap:6, padding:'8px 16px 12px' },
    chip: { fontFamily:'JetBrains Mono, monospace', fontSize:11, padding:'5px 14px', background:'rgba(183,95,255,0.05)', border:'1px solid rgba(183,95,255,0.12)', color:'rgba(254,254,254,0.4)', cursor:'pointer', borderRadius:0, transition:'all 0.15s' },
    bar: { display:'flex', justifyContent:'space-between', padding:'5px 16px', background:'rgba(146,0,225,0.06)', borderTop:'1px solid rgba(183,95,255,0.1)', fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'rgba(254,254,254,0.35)' },
  };

  return (
    <section id="terminal" style={S.wrap}>
      <div className="glow-border">
        <div style={S.box}>
          <div style={S.header}>
            <div style={S.dots}>
              <div style={S.dot('#ff5f57')} />
              <div style={S.dot('#febc2e')} />
              <div style={S.dot('#28c840')} />
            </div>
            <div style={S.tab}>
              <span className="pulse" style={{ width:5, height:5, background:'#B75FFF', display:'inline-block', borderRadius:'50%' }} />
              terminal
            </div>
            <div style={S.status}>
              <span className="pulse" style={{ width:5, height:5, background:'#3fb950', display:'inline-block', borderRadius:'50%' }} />
              0G Chain
            </div>
          </div>

          <div ref={ref} style={S.body}>
            {lines.map((l,i) => {
              if (l.type==='cmd') return <div key={i} style={{ color:'#fff', marginBottom:2 }}><span style={{ color:'#B75FFF', fontWeight:700 }}>❯</span> {l.text}</div>;
              if (l.type==='ok') return <div key={i} className="fade-in" style={{ fontSize:12, color:'rgba(254,254,254,0.6)' }}><span style={{ color:'#3fb950', fontWeight:700 }}>✓</span>{l.text.replace('✓','')}</div>;
              if (l.type==='err') return <div key={i} className="fade-in" style={{ fontSize:12, color:'rgba(254,254,254,0.4)' }}><span style={{ color:'#f85149', fontWeight:700 }}>✗</span>{l.text.replace('✗','')}</div>;
              return <div key={i} className="fade-in" style={{ fontSize:12, color:'rgba(254,254,254,0.5)', whiteSpace:'pre-wrap' }}>{l.text}</div>;
            })}
            {busy && <span className="blink" style={{ display:'inline-block', width:8, height:16, background:'#B75FFF', verticalAlign:'middle' }} />}
          </div>

          <div style={S.input}>
            <span style={{ color:'#B75FFF', fontWeight:700, fontFamily:'JetBrains Mono, monospace', fontSize:13 }}>❯</span>
            <input
              style={{ flex:1, background:'none', border:'none', outline:'none', color:'#e6edf3', fontFamily:'JetBrains Mono, monospace', fontSize:13, caretColor:'#B75FFF' }}
              placeholder="type a command..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && input.trim()) run(input); }}
              spellCheck={false}
              disabled={busy}
            />
          </div>

          <div style={S.chips}>
            {CHIPS.map(c => (
              <button key={c} onClick={() => run(c)} disabled={busy} style={{ ...S.chip, opacity: busy ? 0.3 : 1 }}
                onMouseEnter={e => { if(!busy) { (e.target as HTMLElement).style.borderColor='#9200E1'; (e.target as HTMLElement).style.color='#B75FFF'; (e.target as HTMLElement).style.background='rgba(146,0,225,0.08)'; }}}
                onMouseLeave={e => { (e.target as HTMLElement).style.borderColor='rgba(183,95,255,0.12)'; (e.target as HTMLElement).style.color='rgba(254,254,254,0.4)'; (e.target as HTMLElement).style.background='rgba(183,95,255,0.05)'; }}
              >{c}</button>
            ))}
          </div>

          <div style={S.bar}>
            <div style={{ display:'flex', gap:12 }}>
              <span style={{ padding:'1px 6px', background:'rgba(146,0,225,0.15)', color:'#B75FFF', fontWeight:600 }}>0GENT</span>
              <span>x402</span>
              <span>0G Chain</span>
            </div>
            <span>UTF-8</span>
          </div>
        </div>
      </div>
    </section>
  );
}
