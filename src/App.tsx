import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Inventory from '@/pages/Inventory';
import Progress from '@/pages/Progress';
import Loadouts from '@/pages/Loadouts';

const Organizer = lazy(() => import('@/pages/Organizer'));
const Vendors = lazy(() => import('@/pages/Vendors'));
const Collections = lazy(() => import('@/pages/Collections'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div className="min-h-screen bg-void-bg flex items-center justify-center text-void-text">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Inventory />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/loadouts" element={<Loadouts />} />
          <Route path="/organizer" element={<Organizer />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/collections" element={<Collections />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
