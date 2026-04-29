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

  return (
    <WalletProvider>
      <Nav />
      <Hero />
      <div className="reveal"><WalletPanel /></div>
      <div className="reveal"><Terminal /></div>
      <div className="reveal"><Features /></div>
      <div className="reveal"><HowItWorks /></div>
      <div className="reveal"><ZGIntegration /></div>
      <Footer />
    </WalletProvider>
  );
}

export default App;
