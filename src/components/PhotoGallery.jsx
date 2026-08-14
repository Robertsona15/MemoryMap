import { useState, useEffect } from 'react';
import PhotoCard from './PhotoCard';

export default function PhotoGallery({ memories, onEdit }) {
  const [filterMode, setFilterMode] = useState(() => {
    return localStorage.getItem('galleryFilterMode') || 'all';
  });
  const [expandedGroup, setExpandedGroup] = useState(null);

  useEffect(() => {
    localStorage.setItem('galleryFilterMode', filterMode);
  }, [filterMode]);

  if (!memories || memories.length === 0) {
    return null;
  }

  const filteredMemories = memories.filter(mem => {
    if (filterMode === 'needs_tagging') {
      return !mem.emotions || mem.emotions.length === 0;
    }
    return true;
  });

  // Group memories
  const grouped = {};
  const ungrouped = [];
  
  filteredMemories.forEach(mem => {
    const name = mem.advancedDetails?.entityName?.trim();
    if (name) {
      const key = name.toLowerCase();
      if (!grouped[key]) grouped[key] = { name: mem.advancedDetails.entityName, memories: [] };
      grouped[key].memories.push(mem);
    } else {
      ungrouped.push(mem);
    }
  });

  // If in drill-down view
  if (expandedGroup) {
    const groupData = grouped[expandedGroup.toLowerCase()];
    const groupMemories = groupData ? groupData.memories : [];

    return (
      <div style={{ width: '100%', marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
          <button 
            onClick={() => setExpandedGroup(null)}
            style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--color-border)', color: 'white', borderRadius: '5px', cursor: 'pointer' }}
          >
            ← Back to Gallery
          </button>
          <h3 style={{ color: 'var(--color-primary)', margin: 0, textShadow: '0 0 5px var(--color-glow)' }}>
            Album: {groupData?.name || expandedGroup}
          </h3>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          {groupMemories.map(mem => (
            <PhotoCard key={mem.id} memory={mem} onEdit={onEdit} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ color: 'var(--color-text)', margin: 0 }}>Your Cosmic Gallery</h3>
        <select 
          value={filterMode} 
          onChange={(e) => setFilterMode(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '5px', background: 'rgba(255,255,255,0.1)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
        >
          <option value="all">All Memories</option>
          <option value="needs_tagging">Needs Tagging</option>
        </select>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Render Group Covers */}
        {Object.values(grouped).map(group => {
          const cover = group.memories.find(m => m.advancedDetails?.isEntityCover) || group.memories[0];
          return (
            <PhotoCard 
              key={`group-${group.name}`} 
              memory={cover} 
              isGroupCover={true} 
              groupCount={group.memories.length} 
              groupName={group.name} 
              onEdit={() => setExpandedGroup(group.name)} 
            />
          );
        })}

        {/* Render Ungrouped Memories */}
        {ungrouped.map(mem => (
          <PhotoCard key={mem.id} memory={mem} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}
