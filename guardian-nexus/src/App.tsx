import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginButton from './components/auth/LoginButton';
import { ArsenalPage } from './pages/ArsenalPage';
import { Home } from './pages/Home';
import { ErrorBoundary } from './pages/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
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

            {/* Catch-all 404 route */}
            <Route path="*" element={
              <div className="h-screen bg-[#050505] text-yellow-500 flex flex-col items-center justify-center font-mono p-4">
                <div className="text-2xl mb-4">⚠️ PAGE NOT FOUND</div>
                <div className="text-gray-400 mb-8">The requested page does not exist.</div>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-black rounded font-bold transition-colors"
                >
                  RETURN HOME
                </button>
              </div>
            } />
          </Routes>
        </div>
      </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
