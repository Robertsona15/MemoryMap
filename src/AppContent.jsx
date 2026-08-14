import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllMemories, saveMemory, deleteMemory } from './utils/storage';
import PhotoPicker from './components/PhotoPicker';
import EmotionTagger from './components/EmotionTagger';
import MemoryDetailsEditor from './components/MemoryDetailsEditor';
import NeuralNetworkMap from './components/NeuralNetworkMap';
import PhotoGallery from './components/PhotoGallery';
import QuickSortMap from './components/QuickSortMap';
import exifr from 'exifr';

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
        entityName: '',
        linkedMemories: [],
                isEntityCover: false,
                entityRelationships: [],
                pastEmotions: [],
                pastDate: '',
                currentDate: ''
              },
      notes: ''
    });
  };

  const handleBulkImport = async (dirHandle) => {
    const newMemories = [];
    
    async function processDirectory(dir) {
      for await (const entry of dir.values()) {
        if (entry.kind === 'file') {
          if (entry.name.match(/\.(jpg|jpeg|png|webp|gif|heic)$/i)) {
            const file = await entry.getFile();
            let metadata = { locationStr: '', date: '' };
            try {
              const exifData = await exifr.parse(file);
              if (exifData && exifData.DateTimeOriginal) {
                metadata.date = exifData.DateTimeOriginal.toISOString();
              }
            } catch (e) {
              console.warn('Could not parse EXIF data during bulk import', e);
            }
            if (!metadata.date && file.lastModified) {
              metadata.date = new Date(file.lastModified).toISOString();
            }

            const mem = {
              fileHandle: entry,
              fileName: entry.name,
              emotions: [],
              category: '',
              subCategoryData: {},
              advancedDetails: {
                entityName: '',
                linkedMemories: [],
                isEntityCover: false,
                entityRelationships: [],
                pastEmotions: [],
                pastDate: '',
                currentDate: ''
              },
              notes: '',
              metadata
            };
            const savedMem = await saveMemory(mem);
            newMemories.push(savedMem);
          }
        } else if (entry.kind === 'directory') {
          await processDirectory(entry);
        }
      }
    }
    
    await processDirectory(dirHandle);
    
    const updatedMemories = await getAllMemories();
    setMemories(updatedMemories);
    navigate('/gallery');
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <PhotoPicker onPhotoSelect={handlePhotoSelect} onBulkImport={handleBulkImport} />
          
          {memories.length > 0 && view === 'map' && (
            <NeuralNetworkMap 
              memories={memories} 
              onNodeClick={(mem) => setActiveMemory(mem)} 
              onMemoryUpdated={async (updatedMemory) => {
                const newMemories = memories.map(m => m.id === updatedMemory.id ? updatedMemory : m);
                setMemories(newMemories);
              }}
            />
          )}
          
          {memories.length > 0 && view === 'gallery' && (
            <PhotoGallery memories={memories} onEdit={(mem) => setActiveMemory(mem)} />
          )}

          {view === 'sort' && (
            <QuickSortMap 
              memories={memories} 
              onMemorySorted={async (updatedMemory) => {
                const newMemories = memories.map(m => m.id === updatedMemory.id ? updatedMemory : m);
                setMemories(newMemories);
              }} 
            />
          )}
        </div>
      )}
    </>
  );
}
