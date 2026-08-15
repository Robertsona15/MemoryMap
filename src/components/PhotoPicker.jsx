import { useState } from 'react';
import exifr from 'exifr';
import { UploadCloud } from 'lucide-react';

const geocodeCache = new Map();

export default function PhotoPicker({ onPhotoSelect, onBulkImport }) {
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
          if (exifData.DateTimeOriginal && exifData.DateTimeOriginal instanceof Date) {
            metadata.date = exifData.DateTimeOriginal.toISOString();
          }
          if (exifData.latitude && exifData.longitude) {
            metadata.locationStr = await reverseGeocode(exifData.latitude, exifData.longitude);
          }
        }
      } catch (exifErr) {
        console.warn('Could not parse EXIF data', exifErr);
      }

      // Fallback to file creation date (lastModified)
      if (!metadata.date && file.lastModified) {
        metadata.date = new Date(file.lastModified).toISOString();
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

  const handleFolderSelect = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      const dirHandle = await window.showDirectoryPicker();
      if (onBulkImport) {
        await onBulkImport(dirHandle);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        console.error("Error picking directory:", err);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
      <h2 style={{ color: 'white', marginBottom: '1rem', textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>Add to your Memory Map</h2>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button 
          onClick={handleSelectPhoto}
          disabled={isProcessing}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.2rem',
            borderRadius: 'var(--radius)',
            border: 'none',
            background: 'var(--color-primary)',
            color: 'white',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            boxShadow: '0 0 15px var(--color-glow)'
          }}
        >
          {isProcessing ? 'Processing...' : 'Select Photo'}
        </button>

        <button 
          onClick={handleFolderSelect}
          disabled={isProcessing}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.2rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-primary)',
            background: 'transparent',
            color: 'var(--color-primary)',
            cursor: isProcessing ? 'not-allowed' : 'pointer'
          }}
        >
          Import Folder
        </button>
      </div>
      {error && <p style={{ color: '#F44336', marginTop: '1rem' }}>{error}</p>}
    </div>
  );
}
