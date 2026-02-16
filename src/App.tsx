import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Inventory from '@/pages/Inventory';
import Progress from '@/pages/Progress';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Inventory />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/vendors" element={<div className="p-4 text-white">Vendors Page (Coming Soon)</div>} />
      </Routes>
    </Router>
  );
}

export default App;
