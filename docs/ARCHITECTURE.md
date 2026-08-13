# Memory Map Application Architecture & Component Documentation

This document serves as backend documentation for the Memory Map application. It outlines the core components of the system, their intended functions, and their underlying code operations.

---

## 1. Photo Uploader (`src/components/PhotoPicker.jsx`)

### Intended Function
The Photo Uploader acts as the primary entry point for users to add new memories to their map. Rather than uploading photos to a server or storing heavy base64 strings in local databases, it allows the user to securely reference photos directly from their local file system. It also automatically extracts relevant metadata to reduce manual data entry.

### Code Operation
- **File System Access API**: Uses `window.showOpenFilePicker()` to prompt the user to select an image file. This returns a `FileSystemFileHandle` which we store in IndexedDB. This handle can be used across sessions (with re-authorization) to read the file directly from the user's disk.
- **EXIF Extraction**: Utilizes the `exifr` library to parse the raw image binary. It extracts `DateTimeOriginal` (for the memory's timestamp) and GPS coordinates (`latitude`, `longitude`).
- **Reverse Geocoding**: Automatically passes extracted coordinates to the free OpenStreetMap Nominatim API via `fetch` to convert raw coordinates into a human-readable location string (e.g., "Brooklyn, New York"), attaching it to the memory's metadata.

---

## 2. Memory Detail Window (`src/components/MemoryDetailsEditor.jsx` & `src/components/EmotionTagger.jsx`)

### Intended Function
The detail window serves as the semantic and emotional tagging interface. Users attach deep, highly definable context to their photos here. This context dictates how the photo will interact with other photos in the neural network map.

### Code Operation
- **Emotion Tagger (`EmotionTagger.jsx`)**: 
  - Iterates over Plutchik's Wheel data defined in `src/data/schema.js`.
  - Supports multi-selection, maintaining an array of emotion keys (e.g., `['joy', 'ecstasy']`).
  - **Dynamic UI**: Applies a dynamic `boxShadow` glow based on the emotion's `level` (intensity). A Level 1 emotion (most intense) receives a massive 25px glow, while a Level 3 emotion receives a subtle 5px glow, visually reinforcing the weight of the emotion being tagged.
- **Details Editor (`MemoryDetailsEditor.jsx`)**:
  - Dynamically renders input fields based on the selected `category` (Person, Place, Object, Concept, Pet).
  - If "Person" is selected, it presents a predefined dropdown of relationships (Family, Friend, Self). If a "Place" is selected, it provides an open text field for custom characteristics.
  - Updates the active memory object state, which is eventually serialized and saved to IndexedDB.

---

## 3. Neural Network Map (`src/components/NeuralNetworkMap.jsx` & `src/utils/math.js`)

### Intended Function
The centerpiece of the application. It visualizes the user's memories as a living constellation or neural network. Memories that share emotional weight or specific contextual details physically attract each other, creating distinct, organic clusters that reflect the user's mental state.

### Code Operation
- **Coordinate Mapping (`math.js`)**: 
  - Each of the 8 core emotions is assigned an angle (0° to 315°) on a polar grid.
  - The intensity of the emotion determines its radius (distance from the center of the graph).
  - A function computes a "target coordinate" `(x, y)` for a memory by averaging the distinct polar coordinates of all its tagged emotions.
- **Physics Engine (`react-force-graph-2d` & `d3-force`)**:
  - **Emotional Gravity**: Uses `d3.forceX()` and `d3.forceY()` to exert a steady gravitational pull on each memory node, drawing it toward its calculated target coordinate.
  - **Contextual Links (Secondary Gravity)**: Computes a "link weight" between every pair of nodes. If Node A and Node B share the same location, the same relationship type (e.g., both are "Friends"), or share specific overlapping emotions, a `d3.forceLink` is established between them. Stronger weights result in shorter link distances, physically pulling related nodes together and creating tension against the emotional grid.

---

## 4. Memory Gallery (`src/components/PhotoGallery.jsx` & `src/components/PhotoCard.jsx`)

### Intended Function
A more traditional, linear way to browse added memories. It displays a responsive grid of photo cards, allowing the user to quickly view metadata, attached tags, and click on a photo to modify its details.

### Code Operation
- **Component Lifecycle (`PhotoCard.jsx`)**: 
  - Uses a `useEffect` hook to asynchronously request read access to the local file using `getFileUrlFromHandle(memory.fileHandle)`. 
  - Converts the secure file handle into an ephemeral `Blob URL` using `URL.createObjectURL()`, which is passed to the `<img src>` tag.
  - **Memory Cleanup**: Explicitly revokes the `ObjectURL` on component unmount to prevent memory leaks in the browser.
- **Grid Layout (`PhotoGallery.jsx`)**: Iterates through the global array of memories fetched from IndexedDB and utilizes CSS Grid (`grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`) to ensure a responsive, cosmic-themed card display.
