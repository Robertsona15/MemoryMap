import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMemory, saveMemory, getAllMemories } from '../utils/storage';
import EmotionTagger from './EmotionTagger';
import MemoryDetailsEditor from './MemoryDetailsEditor';
import { getFileUrlFromHandle } from '../utils/storage';

export default function AdvancedEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [memory, setMemory] = useState(null);
  const [allMemories, setAllMemories] = useState([]); // For dropdown linking
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const mem = await getMemory(id);
        if (!mem) {
          navigate('/');
          return;
        }
        
        // Ensure advancedDetails structure is complete for older memories
        mem.advancedDetails = {
          relationshipIntensity: 5,
          entityName: '',
          linkedMemories: [],
          isEntityCover: false,
          ...(mem.advancedDetails || {})
        };
        
        setMemory(mem);
        
        const allMems = await getAllMemories();
        setAllMemories(allMems.filter(m => m.id !== mem.id)); // Exclude self
        
        const url = await getFileUrlFromHandle(mem.fileHandle);
        setImageUrl(url);
      } catch (err) {
        console.error("Failed to load memory for advanced editing", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [id, navigate]); // Intentionally not including imageUrl to prevent re-renders on URL change

  const handleSave = async () => {
    await saveMemory(memory);
    navigate(-1); // Go back to wherever they came from
  };

  const handleLinkMemory = (linkId) => {
    if (!linkId) return;
    if (memory.advancedDetails.linkedMemories.includes(linkId)) return;
    
    setMemory({
      ...memory,
      advancedDetails: {
        ...memory.advancedDetails,
        linkedMemories: [...memory.advancedDetails.linkedMemories, linkId]
      }
    });
  };

  const handleRemoveLink = (linkId) => {
    setMemory({
      ...memory,
      advancedDetails: {
        ...memory.advancedDetails,
        linkedMemories: memory.advancedDetails.linkedMemories.filter(id => id !== linkId)
      }
    });
  };

  if (loading || !memory) return <div style={{ color: 'white', padding: '2rem' }}>Loading Advanced Editor...</div>;

  return (
    <div className="glass-panel" style={{ width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--color-primary)', textShadow: '0 0 10px var(--color-glow)' }}>Advanced Memory Editor</h2>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Left Column: Image & Advanced Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt={memory.fileName} 
              style={{ width: '100%', borderRadius: 'var(--radius)', objectFit: 'cover', maxHeight: '300px', border: '1px solid var(--color-border)' }} 
            />
          )}

          {/* Relationship Dynamics */}
          <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ color: 'var(--color-secondary)', marginBottom: '1rem', fontSize: '1.1rem' }}>Relationship Dynamics</h3>
            
            <label style={{ display: 'block', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              Intensity (Gravitational Pull): <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{memory.advancedDetails.relationshipIntensity}</span>
            </label>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={memory.advancedDetails.relationshipIntensity}
              onChange={(e) => setMemory({
                ...memory,
                advancedDetails: { ...memory.advancedDetails, relationshipIntensity: parseInt(e.target.value) }
              })}
              style={{ width: '100%', cursor: 'pointer', marginBottom: '1.5rem' }}
            />

            <label style={{ display: 'block', color: 'var(--color-text)', marginBottom: '0.5rem' }}>Entity Name (Grouping)</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Use a specific name (e.g., "John Doe") to automatically link all memories sharing this exact name.</p>
            <input 
              type="text" 
              placeholder="e.g. John Doe, Central Park..."
              value={memory.advancedDetails.entityName}
              onChange={(e) => setMemory({
                ...memory,
                advancedDetails: { ...memory.advancedDetails, entityName: e.target.value }
              })}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '5px', border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.05)', color: 'white', fontFamily: 'var(--font-body)', marginBottom: '1rem' }}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={memory.advancedDetails.isEntityCover || false}
                onChange={(e) => setMemory({
                  ...memory,
                  advancedDetails: { ...memory.advancedDetails, isEntityCover: e.target.checked }
                })}
                style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--color-primary)' }}
              />
              Use this photo as the Cover Image for the Black Hole cluster
            </label>
          </div>

          {/* Memory Linking */}
          <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ color: 'var(--color-secondary)', marginBottom: '1rem', fontSize: '1.1rem' }}>Explicit Memory Linking</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Directly link this memory to others to create a Black Hole gravitational effect.</p>
            
            <select 
              onChange={(e) => handleLinkMemory(e.target.value)}
              value=""
              style={{ width: '100%', padding: '0.8rem', borderRadius: '5px', border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.05)', color: 'white', marginBottom: '1rem', fontFamily: 'var(--font-body)' }}
            >
              <option value="" disabled>Select a memory to link...</option>
              {allMemories.map(m => (
                <option key={m.id} value={m.id}>{m.fileName} ({m.category || 'Uncategorized'})</option>
              ))}
            </select>

            {memory.advancedDetails.linkedMemories.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {memory.advancedDetails.linkedMemories.map(linkId => {
                  const linkedMem = allMemories.find(m => m.id === linkId);
                  const displayName = linkedMem ? linkedMem.fileName : linkId;
                  return (
                    <div key={linkId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '5px' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{displayName}</span>
                      <button onClick={() => handleRemoveLink(linkId)} style={{ background: 'transparent', border: 'none', color: '#F44336', cursor: 'pointer' }}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Standard Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <EmotionTagger 
            selectedEmotions={memory.emotions} 
            onChange={(emotions) => setMemory({ ...memory, emotions })} 
          />
          <MemoryDetailsEditor 
            category={memory.category}
            setCategory={(c) => setMemory({ ...memory, category: c })}
            subCategoryData={memory.subCategoryData}
            setSubCategoryData={(d) => typeof d === 'function' ? setMemory(prev => ({ ...prev, subCategoryData: d(prev.subCategoryData) })) : setMemory({ ...memory, subCategoryData: d })}
            metadata={memory.metadata}
          />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button 
              onClick={handleSave}
              style={{ padding: '1rem 2rem', borderRadius: 'var(--radius)', background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 0 15px var(--color-glow)' }}
            >
              Save Advanced Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
