import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginButton from './components/auth/LoginButton';
import { ArsenalPage } from './pages/ArsenalPage';
import { Home } from './pages/Home';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0a0e14] text-[#e8e9ed] relative overflow-x-hidden font-sans">
        {/* Main Content */}
        <div className="relative z-10">
          <Routes>
            <Route path="/" element={
              <>
                <main>
                  <Home />
                  <div className="flex justify-center mt-8">
                    <LoginButton />
                  </div>
                </main>
              </>
            } />

            <Route path="/dashboard" element={
              <>
                {/* Arsenal Back Button */}
                <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/10">
                  <div className="container mx-auto px-4 py-4">
                    <button
                      onClick={() => window.location.href = '/'}
                      className="flex items-center gap-2 text-solar hover:text-white transition-colors font-mono text-sm uppercase tracking-wider"
                    >
                      &lt; RETURN_TO_ROOT
                    </button>
                  </div>
                </div>
                <ArsenalPage />
              </>
            } />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
