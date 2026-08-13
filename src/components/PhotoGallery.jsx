import PhotoCard from './PhotoCard';

export default function PhotoGallery({ memories, onEdit }) {
  if (!memories || memories.length === 0) {
    return null;
  }

  return (
    <div style={{ width: '100%', marginTop: '2rem' }}>
      <h3 style={{ color: 'var(--color-text)', marginBottom: '1rem' }}>Your Cosmic Gallery</h3>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem'
      }}>
        {memories.map(mem => (
          <PhotoCard key={mem.id} memory={mem} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}
