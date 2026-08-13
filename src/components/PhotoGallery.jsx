import { useState } from 'react';
import PhotoCard from './PhotoCard';

export default function PhotoGallery({ memories, onEdit }) {
  const [filterMode, setFilterMode] = useState('all');

  if (!memories || memories.length === 0) {
    return null;
  }

  const filteredMemories = memories.filter(mem => {
    if (filterMode === 'needs_tagging') {
      return !mem.emotions || mem.emotions.length === 0;
    }
    return true;
  });

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
        {filteredMemories.map(mem => (
          <PhotoCard key={mem.id} memory={mem} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}
