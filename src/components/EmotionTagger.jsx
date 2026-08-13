import { useState, useMemo } from 'react';
import { emotions, coreEmotionTypes } from '../data/schema';

export default function EmotionTagger({ selectedEmotions, onChange }) {
  // selectedEmotions is an array of emotion keys, e.g. ['joy', 'ecstasy']
  
  const [expandedType, setExpandedType] = useState(null);

  // Group emotions by type
  const emotionsByType = useMemo(() => {
    const grouped = {};
    coreEmotionTypes.forEach(type => {
      grouped[type] = [];
    });
    Object.entries(emotions).forEach(([key, data]) => {
      if (grouped[data.type]) {
        grouped[data.type].push({ key, ...data });
      }
    });
    // Sort by intensity (level)
    Object.keys(grouped).forEach(type => {
      grouped[type].sort((a, b) => a.level - b.level);
    });
    return grouped;
  }, []);

  const handleToggleEmotion = (key) => {
    if (selectedEmotions.includes(key)) {
      onChange(selectedEmotions.filter(e => e !== key));
    } else {
      onChange([...selectedEmotions, key]);
    }
  };

  // Determine if a specific type has any selected emotions
  const hasSelectedEmotionsInType = (type) => {
    return emotionsByType[type].some(e => selectedEmotions.includes(e.key));
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ color: 'var(--color-text)' }}>Tag Emotions</h3>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {coreEmotionTypes.map(type => {
          const isActive = expandedType === type;
          const hasSelection = hasSelectedEmotionsInType(type);
          
          return (
            <button
              key={type}
              onClick={() => setExpandedType(isActive ? null : type)}
              style={{
                background: isActive || hasSelection ? 'var(--color-primary)' : 'var(--color-bg-light)',
                border: `1px solid ${isActive || hasSelection ? 'var(--color-secondary)' : 'var(--color-border)'}`,
                color: 'var(--color-text)',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                cursor: 'pointer',
                boxShadow: (isActive || hasSelection) ? '0 0 10px var(--color-glow)' : 'none',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-body)'
              }}
            >
              {type}
            </button>
          );
        })}
      </div>

      {expandedType && (
        <div className="glass-panel" style={{ padding: '1rem', marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {emotionsByType[expandedType].map(emotion => {
            const isSelected = selectedEmotions.includes(emotion.key);
            
            // Calculate glow based on intensity level (1 is most intense)
            let glowSize = '10px';
            if (emotion.level === 1) glowSize = '25px';
            else if (emotion.level === 2) glowSize = '15px';
            else if (emotion.level === 3) glowSize = '5px';

            return (
              <button
                key={emotion.key}
                onClick={() => handleToggleEmotion(emotion.key)}
                style={{
                  background: isSelected ? emotion.color : 'transparent',
                  color: isSelected ? '#000' : emotion.color,
                  border: `1px solid ${emotion.color}`,
                  padding: '0.4rem 0.8rem',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? `0 0 ${glowSize} ${emotion.color}` : 'none',
                  transition: 'all 0.2s',
                  fontFamily: 'var(--font-body)',
                  fontWeight: isSelected ? '600' : '400'
                }}
              >
                {emotion.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
