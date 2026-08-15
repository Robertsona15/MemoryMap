import { useState } from 'react';
import { categories, relationshipTypes } from '../data/schema';

const commonInputStyle = {
  background: 'var(--color-bg-light)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  padding: '0.5rem',
  borderRadius: 'var(--radius)',
  fontFamily: 'var(--font-body)',
  outline: 'none'
};

export default function MemoryDetailsEditor({ 
  category, 
  setCategory, 
  subCategoryData, 
  setSubCategoryData, 
  metadata 
}) {
  
  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    // Reset subcategory data when category changes
    setSubCategoryData({});
  };

  const handleSubDataChange = (key, value) => {
    setSubCategoryData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
      <h3 style={{ color: 'var(--color-text)' }}>Memory Details</h3>
      
      {/* Category Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Type of Photo</label>
        <select 
          value={category || ''} 
          onChange={handleCategoryChange}
          style={commonInputStyle}
        >
          <option value="" disabled>Select a category...</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Dynamic Sub-category Fields */}
      {category === 'person' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Relationship</label>
          <select 
            value={subCategoryData.relationship || ''} 
            onChange={(e) => handleSubDataChange('relationship', e.target.value)}
            style={commonInputStyle}
          >
            <option value="" disabled>Select relationship...</option>
            {relationshipTypes.map(rt => (
              <option key={rt} value={rt}>{rt}</option>
            ))}
          </select>
        </div>
      )}

      {(category === 'place' || category === 'object' || category === 'concept' || category === 'pet') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            {category === 'place' ? 'Location Description' : 'Defining Characteristics'}
          </label>
          <input 
            type="text"
            value={subCategoryData.characteristics || ''}
            onChange={(e) => handleSubDataChange('characteristics', e.target.value)}
            placeholder={`E.g. ${category === 'place' ? 'Cozy coffee shop' : 'Vintage style'}`}
            style={commonInputStyle}
          />
        </div>
      )}

      {/* Metadata Display */}
      {metadata && (metadata.date || metadata.locationStr) && (
        <div className="glass-panel" style={{ padding: '1rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h4 style={{ color: 'var(--color-secondary)', fontSize: '0.9rem' }}>Extracted Metadata</h4>
          {metadata.date && (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              <strong>Date:</strong> {new Date(metadata.date).toLocaleDateString()} {new Date(metadata.date).toLocaleTimeString()}
            </p>
          )}
          {metadata.locationStr && (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              <strong>Location:</strong> {metadata.locationStr}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
