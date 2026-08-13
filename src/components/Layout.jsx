import { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { Link, Outlet, useLocation } from 'react-router-dom';

export default function Layout() {
  const [init, setInit] = useState(false);
  const location = useLocation();

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesOptions = {
    background: { color: { value: 'transparent' } },
    fpsLimit: 120,
    interactivity: {
      events: { onHover: { enable: true, mode: 'repulse' } },
      modes: { repulse: { distance: 100, duration: 0.4 } },
    },
    particles: {
      color: { value: '#C8B6E2' },
      links: { color: '#8A2BE2', distance: 150, enable: true, opacity: 0.2, width: 1 },
      move: { direction: 'none', enable: true, outModes: { default: 'bounce' }, random: false, speed: 0.5, straight: false },
      number: { density: { enable: true, area: 800 }, value: 80 },
      opacity: { value: 0.3 },
      shape: { type: 'circle' },
      size: { value: { min: 1, max: 3 } },
    },
    detectRetina: true,
  };

  return (
    <div className="app-container">
      {init && <Particles id="tsparticles" options={particlesOptions} />}
      
      <header className="glass-panel" style={{ 
        position: 'sticky', top: 0, zIndex: 100, 
        padding: '1rem 2rem', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0
      }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0, textShadow: '0 0 10px rgba(138,43,226,0.8)' }}>
          <Link to="/" style={{ color: 'var(--color-text)', textDecoration: 'none' }}>Memory Map</Link>
        </h1>
        <nav style={{ display: 'flex', gap: '1.5rem' }}>
          <Link 
            to="/map" 
            style={{ 
              color: location.pathname === '/map' || location.pathname === '/' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              textDecoration: 'none',
              fontWeight: '600',
              textShadow: location.pathname === '/map' || location.pathname === '/' ? '0 0 8px var(--color-glow)' : 'none'
            }}
          >
            Neural Map
          </Link>
          <Link 
            to="/gallery" 
            style={{ 
              color: location.pathname === '/gallery' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              textDecoration: 'none',
              fontWeight: '600',
              textShadow: location.pathname === '/gallery' ? '0 0 8px var(--color-glow)' : 'none'
            }}
          >
            Gallery
          </Link>
        </nav>
      </header>
      
      <main style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
