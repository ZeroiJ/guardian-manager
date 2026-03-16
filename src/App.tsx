import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import Inventory from '@/pages/Inventory';
import Progress from '@/pages/Progress';
import Loadouts from '@/pages/Loadouts';
import { NotificationContainer } from '@/components/ui/NotificationToast';
import { useClarityStore } from '@/store/clarityStore';
import { ItemFeedPanel } from '@/components/ui/ItemFeedPanel';
import { createContext, useContext } from 'react';

// Context for global feed panel
export const FeedContext = createContext<{ onOpenFeed: () => void }>({ onOpenFeed: () => {} });
export const useFeed = () => useContext(FeedContext);

const Organizer = lazy(() => import('@/pages/Organizer'));
const Vendors = lazy(() => import('@/pages/Vendors'));
const Collections = lazy(() => import('@/pages/Collections'));
const LoadoutOptimizer = lazy(() => import('@/pages/LoadoutOptimizer'));
const Settings = lazy(() => import('@/pages/Settings'));

function App() {
  const [isFeedOpen, setIsFeedOpen] = useState(false);
  const loadDescriptions = useClarityStore(s => s.loadDescriptions);

  // Initialize Clarity descriptions on startup
  useEffect(() => {
    loadDescriptions();
  }, [loadDescriptions]);

  return (
    <FeedContext.Provider value={{ onOpenFeed: () => setIsFeedOpen(true) }}>
      <NotificationContainer />
      <ItemFeedPanel isOpen={isFeedOpen} onClose={() => setIsFeedOpen(false)} />
      <Router>
        <Suspense fallback={<div className="min-h-screen bg-void-bg flex items-center justify-center text-void-text">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Inventory />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/loadouts" element={<Loadouts />} />
            <Route path="/organizer" element={<Organizer />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/optimizer" element={<LoadoutOptimizer />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </Router>
    </FeedContext.Provider>
  );
}

export default App;
