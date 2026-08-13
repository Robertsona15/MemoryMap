import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AppContent from './AppContent'; // We'll extract App logic here

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/map" replace />} />
          <Route path="map" element={<AppContent view="map" />} />
          <Route path="gallery" element={<AppContent view="gallery" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
