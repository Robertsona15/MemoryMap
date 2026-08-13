import { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import './index.css';
import { getAllMemories, saveMemory, deleteMemory, getFileUrlFromHandle } from './utils/storage';
import PhotoPicker from './components/PhotoPicker';
import EmotionTagger from './components/EmotionTagger';
import MemoryDetailsEditor from './components/MemoryDetailsEditor';
import NeuralNetworkMap from './components/NeuralNetworkMap';
import PhotoGallery from './components/PhotoGallery';

function App() {
  const [init, setInit] = useState(false);
  const [memories, setMemories] = useState([]);
  const [activeMemory, setActiveMemory] = useState(null); // The memory currently being edited/added

  // Load memories on mount
  useEffect(() => {
    async function load() {
      const data = await getAllMemories();
      setMemories(data);
    }
    load();
  }, []);

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

  const handlePhotoSelect = (data) => {
    setActiveMemory({
      ...data, // fileHandle, fileName, metadata
      emotions: [],
      category: '',
      subCategoryData: {},
      notes: ''
    });
  };

  const handleSaveMemory = async () => {
    if (!activeMemory) return;
    const saved = await saveMemory(activeMemory);
    
    // Update local state
    const existingIndex = memories.findIndex(m => m.id === saved.id);
    if (existingIndex >= 0) {
      const newMemories = [...memories];
      newMemories[existingIndex] = saved;
      setMemories(newMemories);
    } else {
      setMemories([...memories, saved]);
    }
    
    setActiveMemory(null); // Close editor
  };

  return (
    <div className="app-container">
      {init && <Particles id="tsparticles" options={particlesOptions} />}
      
      <main style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '2rem', textShadow: '0 0 10px rgba(138,43,226,0.8)' }}>Memory Map</h1>
        
        {/* Memory Editor Modal / Section */}
        {activeMemory && (
          <div className="glass-panel" style={{ width: '100%', padding: '2rem', marginBottom: '2rem', border: '1px solid var(--color-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ color: 'var(--color-secondary)' }}>{activeMemory.id ? 'Edit Memory' : 'New Memory'}</h2>
              <button onClick={() => setActiveMemory(null)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>File: {activeMemory.fileName}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <EmotionTagger 
                selectedEmotions={activeMemory.emotions} 
                onChange={(emotions) => setActiveMemory({ ...activeMemory, emotions })} 
              />
              
              <MemoryDetailsEditor 
                category={activeMemory.category}
                setCategory={(c) => setActiveMemory({ ...activeMemory, category: c })}
                subCategoryData={activeMemory.subCategoryData}
                setSubCategoryData={(d) => typeof d === 'function' ? setActiveMemory(prev => ({ ...prev, subCategoryData: d(prev.subCategoryData) })) : setActiveMemory({ ...activeMemory, subCategoryData: d })}
                metadata={activeMemory.metadata}
              />
            </div>
            
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              {activeMemory.id && (
                <button 
                  onClick={async () => {
                    await deleteMemory(activeMemory.id);
                    setMemories(memories.filter(m => m.id !== activeMemory.id));
                    setActiveMemory(null);
                  }}
                  style={{ padding: '0.8rem 1.5rem', borderRadius: 'var(--radius)', background: 'transparent', color: '#F44336', border: '1px solid #F44336', cursor: 'pointer' }}
                >
                  Delete
                </button>
              )}
              <button 
                onClick={handleSaveMemory}
                style={{ padding: '0.8rem 2rem', borderRadius: 'var(--radius)', background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Save Memory
              </button>
            </div>
          </div>
        )}

        {/* Dashboard / Main View */}
        {!activeMemory && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <PhotoPicker onPhotoSelect={handlePhotoSelect} />
            
            {memories.length > 0 && (
              <>
                <NeuralNetworkMap memories={memories} onNodeClick={(mem) => setActiveMemory(mem)} />
                <PhotoGallery memories={memories} onEdit={(mem) => setActiveMemory(mem)} />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
