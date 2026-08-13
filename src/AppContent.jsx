import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllMemories, saveMemory, deleteMemory } from './utils/storage';
import PhotoPicker from './components/PhotoPicker';
import EmotionTagger from './components/EmotionTagger';
import MemoryDetailsEditor from './components/MemoryDetailsEditor';
import NeuralNetworkMap from './components/NeuralNetworkMap';
import PhotoGallery from './components/PhotoGallery';

export default function AppContent({ view }) {
  const navigate = useNavigate();
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

  const handlePhotoSelect = (data) => {
    setActiveMemory({
      ...data, // fileHandle, fileName, metadata
      emotions: [],
      category: '',
      subCategoryData: {},
      advancedDetails: {
        relationshipIntensity: 5,
        entityName: '',
        linkedMemories: []
      },
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
    <>
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
              setCategory={(c) => setActiveMemory(prev => ({ ...prev, category: c }))}
              subCategoryData={activeMemory.subCategoryData}
              setSubCategoryData={(d) => typeof d === 'function' ? setActiveMemory(prev => ({ ...prev, subCategoryData: d(prev.subCategoryData) })) : setActiveMemory(prev => ({ ...prev, subCategoryData: d }))}
              metadata={activeMemory.metadata}
            />
          </div>
          
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button 
              onClick={async () => {
                let memToRoute = activeMemory;
                if (!memToRoute.id) {
                  memToRoute = await saveMemory(activeMemory);
                }
                navigate(`/editor/${memToRoute.id}`);
              }}
              style={{ padding: '0.8rem 1.5rem', borderRadius: 'var(--radius)', background: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Advanced Mode
            </button>
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

      {/* Main View Area */}
      {!activeMemory && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <PhotoPicker onPhotoSelect={handlePhotoSelect} />
          
          {memories.length > 0 && view === 'map' && (
            <NeuralNetworkMap memories={memories} onNodeClick={(mem) => setActiveMemory(mem)} />
          )}
          
          {memories.length > 0 && view === 'gallery' && (
            <PhotoGallery memories={memories} onEdit={(mem) => setActiveMemory(mem)} />
          )}
        </div>
      )}
    </>
  );
}
