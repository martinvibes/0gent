import { useEffect } from 'react';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Terminal } from './components/Terminal';
import { Features } from './components/Features';
import { HowItWorks } from './components/HowItWorks';
import { ZGIntegration } from './components/ZGIntegration';
import { Footer } from './components/Footer';
import { WalletPanel } from './components/WalletPanel';
import { Logos } from './components/Logos';
import { AgentProfile } from './components/AgentProfile';
import { Docs } from './components/Docs';
import { Stats } from './components/Stats';
import { WalletProvider } from './lib/walletContext';

function App() {
  // Lightweight client-side route — `/logos` shows the logo gallery, everything else is the landing page.
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [path]);

  if (path === '/logos' || path === '/logos/') {
    return <Logos />;
  }

  // /docs — single-page developer documentation
  if (path === '/docs' || path === '/docs/') {
    return <Docs />;
  }

  // /stats — public live metrics + full transaction log
  if (path === '/stats' || path === '/stats/') {
    return <Stats />;
  }

  // /agent/0xABC... — agent profile page
  const agentMatch = path.match(/^\/agent\/([^/]+)\/?$/);
  if (agentMatch) {
    return <AgentProfile address={agentMatch[1]} />;
  }

  // /try — internal wallet sandbox. Not linked from anywhere on the marketing
  // page, used for live testing of the wallet UX without polluting the landing.
  if (path === '/try' || path === '/try/') {
    return (
      <WalletProvider>
        <Nav />
        {/* "reveal visible" forces the .reveal-up children to opacity:1 immediately
             — on the landing page this is normally toggled by the IntersectionObserver
             once the section scrolls into view, but /try is a single-section page so
             we just mark it visible from the start. */}
        <div className="reveal visible" style={{ paddingTop: 100 }}>
          <WalletPanel />
        </div>
      </WalletProvider>
    );
  }

  return (
    <WalletProvider>
      <Nav />
      <Hero />
      <div className="reveal"><Terminal /></div>
      <div className="reveal"><Features /></div>
      <div className="reveal"><HowItWorks /></div>
      <div className="reveal"><ZGIntegration /></div>
      <Footer />
    </WalletProvider>
  );
}

export default App;
