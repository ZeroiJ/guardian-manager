import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginButton from './components/LoginButton';
import { Arsenal } from './components/Arsenal';
import { StarfieldBackground } from './components/StarfieldBackground';
import { Header } from './components/Header';

// Home Component (Placeholder for the Landing Page)
const Home = ({ onOpenArsenal }) => (
  <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
    <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-[#4a9eff] to-[#00d4ff] bg-clip-text text-transparent">
      Guardian Nexus
    </h1>
    <p className="text-xl text-[#9199a8] max-w-2xl mb-12">
      The ultimate companion for your Destiny 2 journey. Manage your inventory, track your stats, and optimize your builds.
    </p>

    <button
      onClick={onOpenArsenal}
      className="px-8 py-4 rounded-lg bg-gradient-to-r from-[#4a9eff] to-[#00d4ff] hover:from-[#3a8eef] hover:to-[#00c4ef] text-white shadow-lg shadow-[#4a9eff]/30 transition-all font-bold text-lg"
    >
      🗡️ Open Arsenal
    </button>
  </div>
);

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
                  <Home onOpenArsenal={() => window.location.href = '/dashboard'} />
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
