import { useState, useEffect, useMemo } from 'react';
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
          entityName: '',
          linkedMemories: [],
          isEntityCover: false,
          entityRelationships: [],
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

  const uniqueEntities = useMemo(() => {
    const names = new Set();
    allMemories.forEach(m => {
      if (m.advancedDetails?.entityName) {
        names.add(m.advancedDetails.entityName.trim().toLowerCase());
      }
    });
    const formattedNames = [];
    allMemories.forEach(m => {
      const en = m.advancedDetails?.entityName;
      if (en && names.has(en.trim().toLowerCase())) {
        formattedNames.push(en.trim());
        names.delete(en.trim().toLowerCase());
      }
    });
    return formattedNames.sort();
  }, [allMemories]);

  const handleAddEntityRel = (targetEntity) => {
    if (!targetEntity) return;
    const rels = memory.advancedDetails.entityRelationships || [];
    if (rels.some(r => r.targetEntity === targetEntity)) return;

    setMemory({
      ...memory,
      advancedDetails: {
        ...memory.advancedDetails,
        entityRelationships: [...rels, { targetEntity, intensity: 5 }]
      }
    });
  };

  const handleUpdateEntityRel = (targetEntity, intensity) => {
    const rels = (memory.advancedDetails.entityRelationships || []).map(r => 
      r.targetEntity === targetEntity ? { ...r, intensity } : r
    );
    setMemory({
      ...memory,
      advancedDetails: { ...memory.advancedDetails, entityRelationships: rels }
    });
  };

  const handleRemoveEntityRel = (targetEntity) => {
    const rels = (memory.advancedDetails.entityRelationships || []).filter(r => r.targetEntity !== targetEntity);
    setMemory({
      ...memory,
      advancedDetails: { ...memory.advancedDetails, entityRelationships: rels }
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
            <h3 style={{ color: 'var(--color-secondary)', marginBottom: '1rem', fontSize: '1.1rem' }}>Group & Entity Identity</h3>
            
            <label style={{ display: 'block', color: 'var(--color-text)', marginBottom: '0.5rem' }}>Entity Name</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Use a specific name (e.g., "John Doe") to group all memories sharing this exact name into a Black Hole.</p>
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

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)', cursor: 'pointer', marginBottom: '2rem' }}>
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

            <h3 style={{ color: 'var(--color-secondary)', marginBottom: '1rem', fontSize: '1.1rem' }}>Group Relationships</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Define how strongly this Entity is gravitationally pulled toward other known Entities on the map.</p>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <select 
                id="entity-rel-select"
                style={{ flex: 1, padding: '0.8rem', borderRadius: '5px', border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.05)', color: 'white', fontFamily: 'var(--font-body)' }}
                defaultValue=""
              >
                <option value="" disabled>Select an entity to relate to...</option>
                {uniqueEntities.filter(e => e.toLowerCase() !== memory.advancedDetails.entityName?.trim().toLowerCase()).map(entity => (
                  <option key={entity} value={entity}>{entity}</option>
                ))}
              </select>
              <button 
                onClick={(e) => {
                  const select = document.getElementById('entity-rel-select');
                  if (select && select.value) {
                    handleAddEntityRel(select.value);
                    select.value = "";
                  }
                }}
                style={{ padding: '0.8rem 1.5rem', borderRadius: '5px', background: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Add
              </button>
            </div>

            {memory.advancedDetails.entityRelationships?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {memory.advancedDetails.entityRelationships.map(rel => (
                  <div key={rel.targetEntity} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--color-text)' }}>Relationship with: {rel.targetEntity}</span>
                      <button onClick={() => handleRemoveEntityRel(rel.targetEntity)} style={{ background: 'transparent', border: 'none', color: '#F44336', cursor: 'pointer' }}>✕</button>
                    </div>
                    <label style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      Intensity Multiplier: <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{rel.intensity}</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={rel.intensity}
                      onChange={(e) => handleUpdateEntityRel(rel.targetEntity, parseInt(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>
                ))}
              </div>
            )}
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
              <option value="" disabled>Select a memory or group to link...</option>
              <optgroup label="Entities / Groups">
                {uniqueEntities.map(entity => (
                  <option key={`GROUP:${entity}`} value={`GROUP:${entity}`}>{entity}</option>
                ))}
              </optgroup>
              <optgroup label="Ungrouped Individual Memories">
                {allMemories.filter(m => !m.advancedDetails?.entityName?.trim()).map(m => (
                  <option key={m.id} value={m.id}>{m.fileName}</option>
                ))}
              </optgroup>
            </select>

            {memory.advancedDetails.linkedMemories.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {memory.advancedDetails.linkedMemories.map(linkId => {
                  const isGroup = linkId.startsWith('GROUP:');
                  let displayName = linkId;
                  if (isGroup) {
                    displayName = `Entity Group: ${linkId.replace('GROUP:', '')}`;
                  } else {
                    const linkedMem = allMemories.find(m => m.id === linkId);
                    if (linkedMem) displayName = linkedMem.fileName;
                  }
                  
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
