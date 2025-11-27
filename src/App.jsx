import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginButton from './components/LoginButton';
import { Arsenal } from './components/Arsenal';
import { StarfieldBackground } from './components/StarfieldBackground';
import { Header } from './components/Header';

import { Home } from './components/Home';

function App() {
  const [currentView, setCurrentView] = useState('home');

  return (
    <Router>
      <div className="min-h-screen bg-[#0a0e14] text-[#e8e9ed] relative overflow-x-hidden font-sans">
        {/* Starfield Background */}
        <StarfieldBackground />

        {/* Scanline Overlay */}
        <div className="fixed inset-0 pointer-events-none z-50 scanline-overlay" />

        {/* Main Content */}
        <div className="relative z-10">
          <Routes>
            <Route path="/" element={
              <>
                <Header onMenuClick={() => { }} />
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
                <div className="sticky top-0 z-40 bg-[#0a0e14]/95 backdrop-blur-xl border-b border-[#252a38]">
                  <div className="container mx-auto px-4 py-4">
                    <button
                      onClick={() => window.location.href = '/'}
                      className="flex items-center gap-2 text-[#4a9eff] hover:text-[#00d4ff] transition-colors"
                    >
                      ← Back to Home
                    </button>
                  </div>
                </div>
                <Arsenal />
              </>
            } />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
