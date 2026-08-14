import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AppContent from './AppContent';
import AdvancedEditor from './components/AdvancedEditor'; // We'll extract App logic here

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/map" replace />} />
          <Route path="map" element={<AppContent view="map" />} />
          <Route path="gallery" element={<AppContent view="gallery" />} />
          <Route path="sort" element={<AppContent view="sort" />} />
          <Route path="editor/:id" element={<AdvancedEditor />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
