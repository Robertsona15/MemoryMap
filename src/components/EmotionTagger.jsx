import { useState, useMemo, useCallback } from 'react';
import { emotions, coreEmotionTypes, compoundEmotions } from '../data/schema';

export default function EmotionTagger({ selectedEmotions, onChange, title = "Tag Emotions" }) {
  // selectedEmotions is an array of emotion keys, e.g. ['joy', 'ecstasy']
  
  const [expandedType, setExpandedType] = useState(null);

  const selectedEmotionsSet = useMemo(() => new Set(selectedEmotions), [selectedEmotions]);

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
    if (selectedEmotionsSet.has(key)) {
      onChange(selectedEmotions.filter(e => e !== key));
    } else {
      onChange([...selectedEmotions, key]);
    }
  };

  // Determine if a specific type has any selected emotions
  const hasSelectedEmotionsInType = useCallback((type) => {
    return emotionsByType[type].some(e => selectedEmotionsSet.has(e.key));
  }, [emotionsByType, selectedEmotionsSet]);

  const getBaseColorForType = (type) => {
    const ems = emotionsByType[type];
    if (!ems) return '#FFFFFF';
    const baseEm = ems.find(e => e.level === 2) || ems[0];
    return baseEm.color;
  };

  // Determine which compound emotions should be visible
  const visibleCompounds = useMemo(() => {
    return compoundEmotions.filter(c => {
      // Visible if already selected OR if both its component types have at least one selection
      return selectedEmotionsSet.has(c.id) ||
             (hasSelectedEmotionsInType(c.components[0]) && hasSelectedEmotionsInType(c.components[1]));
    });
  }, [selectedEmotionsSet, hasSelectedEmotionsInType]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ color: 'var(--color-text)' }}>{title}</h3>
      
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
            const isSelected = selectedEmotionsSet.has(emotion.key);
            
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

      {/* Compound Emotions Section */}
      {visibleCompounds.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ color: 'var(--color-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Compound Emotions</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {visibleCompounds.map(compound => {
              const isSelected = selectedEmotionsSet.has(compound.id);
              const color1 = getBaseColorForType(compound.components[0]);
              const color2 = getBaseColorForType(compound.components[1]);
              const gradient = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;

              return (
                <button
                  key={compound.id}
                  onClick={() => handleToggleEmotion(compound.id)}
                  style={{
                    background: isSelected ? gradient : 'transparent',
                    color: isSelected ? '#000' : 'var(--color-text)',
                    border: `1px solid ${isSelected ? 'transparent' : 'var(--color-border)'}`,
                    borderImage: isSelected ? 'none' : `${gradient} 1`,
                    padding: '0.4rem 0.8rem',
                    borderRadius: '15px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? `0 0 15px ${color1}` : 'none', // Glow using color1
                    transition: 'all 0.2s',
                    fontFamily: 'var(--font-body)',
                    fontWeight: isSelected ? '700' : '500'
                  }}
                >
                  {compound.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
