import { useState, useEffect } from 'react';
import { getFileUrlFromHandle } from '../utils/storage';
import { emotions } from '../data/schema';

export default function PhotoCard({ memory, onEdit }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    
    async function loadImg() {
      if (!memory.fileHandle) return;
      const url = await getFileUrlFromHandle(memory.fileHandle);
      if (active) {
        if (url) {
          setImgUrl(url);
        } else {
          setError(true);
        }
      }
    }
    
    loadImg();
    
    return () => {
      active = false;
      if (imgUrl) {
        URL.revokeObjectURL(imgUrl);
      }
    };
  }, [memory.fileHandle]);

  // Determine primary color from the first emotion for the glow effect
  let glowColor = 'rgba(255, 255, 255, 0.2)';
  if (memory.emotions && memory.emotions.length > 0) {
    const mainEmotion = emotions[memory.emotions[0]];
    if (mainEmotion) {
      glowColor = mainEmotion.color;
    }
  }

  return (
    <div 
      className="glass-panel glow-hover"
      style={{
        overflow: 'hidden',
        position: 'relative',
        cursor: onEdit ? 'pointer' : 'default',
        boxShadow: `0 8px 32px 0 ${glowColor}`
      }}
      onClick={() => onEdit && onEdit(memory)}
    >
      {imgUrl ? (
        <img 
          src={imgUrl} 
          alt={memory.fileName}
          style={{ width: '100%', height: '250px', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{ width: '100%', height: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
          {error ? <p style={{ color: '#F44336', textAlign: 'center', padding: '1rem' }}>Click to re-authorize access to this photo</p> : <p>Loading cosmic data...</p>}
        </div>
      )}
      
      <div style={{ padding: '1rem', background: 'var(--color-bg-light)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.5rem' }}>
          {memory.emotions && memory.emotions.map(emotionKey => {
            const em = emotions[emotionKey];
            if (!em) return null;
            return (
              <span key={emotionKey} style={{ 
                fontSize: '0.7rem', 
                background: em.color, 
                color: '#000', 
                padding: '2px 8px', 
                borderRadius: '10px',
                fontWeight: '600'
              }}>
                {em.label}
              </span>
            );
          })}
        </div>
        
        {memory.category && (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text)' }}>
            <strong>{memory.category.toUpperCase()}</strong>
            {memory.subCategoryData && memory.subCategoryData.relationship && ` - ${memory.subCategoryData.relationship}`}
            {memory.subCategoryData && memory.subCategoryData.characteristics && ` - ${memory.subCategoryData.characteristics}`}
          </p>
        )}
        
        {memory.metadata?.locationStr && (
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            📍 {memory.metadata.locationStr}
          </p>
        )}
      </div>
    </div>
  );
}
