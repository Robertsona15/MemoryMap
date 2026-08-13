import { useState } from 'react';
import exifr from 'exifr';
import { UploadCloud } from 'lucide-react';

const geocodeCache = new Map();

export default function PhotoPicker({ onPhotoSelect }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const reverseGeocode = async (latitude, longitude) => {
    const cacheKey = `${latitude},${longitude}`;
    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey);
    }

    try {
      // Using OpenStreetMap Nominatim for free client-side reverse geocoding
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
      const data = await res.json();
      if (data && data.display_name) {
        geocodeCache.set(cacheKey, data.display_name);
        return data.display_name;
      }
    } catch (err) {
      console.warn('Reverse geocoding failed:', err);
    }
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`; // fallback
  };

  const handleSelectPhoto = async () => {
    try {
      setError(null);
      setIsProcessing(true);
      
      // Request file handle using File System Access API
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Images',
            accept: {
              'image/*': ['.png', '.gif', '.jpeg', '.jpg', '.webp', '.heic']
            }
          }
        ],
        multiple: false
      });

      const file = await fileHandle.getFile();
      
      // Extract EXIF data
      let metadata = { date: null, locationStr: null };
      try {
        const exifData = await exifr.parse(file);
        if (exifData) {
          if (exifData.DateTimeOriginal) {
            metadata.date = exifData.DateTimeOriginal.toISOString();
          }
          if (exifData.latitude && exifData.longitude) {
            metadata.locationStr = await reverseGeocode(exifData.latitude, exifData.longitude);
          }
        }
      } catch (exifErr) {
        console.warn('Could not parse EXIF data', exifErr);
      }

      onPhotoSelect({
        fileHandle,
        fileName: file.name,
        metadata
      });

    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        console.error(err);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="glass-panel glow-hover" 
      onClick={handleSelectPhoto}
      style={{
        padding: '3rem',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        minHeight: '200px'
      }}
    >
      <UploadCloud size={48} color="var(--color-primary)" />
      <h3 style={{ color: 'var(--color-text)' }}>Select a Memory</h3>
      <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>
        {isProcessing ? 'Processing cosmic dust...' : 'Click to choose a photo from your local universe.'}
      </p>
      {error && <p style={{ color: '#F44336' }}>{error}</p>}
    </div>
  );
}
