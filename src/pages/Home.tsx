import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeaturesViewer } from '../components/docs/FeaturesViewer';
import { ChangelogViewer } from '../components/docs/ChangelogViewer';

export function Home() {
    const navigate = useNavigate();
    const [text, setText] = useState('');
    const fullText = "Meet your Arsenal.";

    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            setText(fullText.slice(0, index + 1));
            index++;
            if (index > fullText.length) clearInterval(interval);
        }, 100);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative min-h-[90vh] flex flex-col px-4 overflow-hidden">

            {/* Background Noise/Gradient Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />

            {/* Main Content Container */}
            <div className="relative z-10 max-w-6xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center py-24">

                {/* Left: Typography & Hero Text */}
                <div className="col-span-1 md:col-span-7 space-y-8">
                    <h1 className="font-serif text-7xl md:text-9xl leading-[0.85] text-white tracking-tighter">
                        You've <br />
                        <span className="italic text-gray-400 font-light">never</span> met <br />
                        AI like this
                    </h1>

                    <div className="h-20 flex items-center">
                        <p className="font-mono text-xl md:text-2xl text-tavus-pink">
                            {text}<span className="animate-pulse bg-tavus-pink text-black px-1 ml-1">_</span>
                        </p>
                    </div>

                    <p className="font-sans text-xl text-gray-400 max-w-md leading-relaxed">
                        The Guardian Nexus isn't just a manager. It's a conversational interface for your Destiny 2 journey.
                        See, track, and optimize.
                    </p>

                    {/* Neo-Brutalist Button */}
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="group relative inline-flex items-center justify-center px-10 py-5 bg-tavus-pink text-black font-sans font-bold uppercase tracking-widest text-sm border-2 border-black shadow-neo hover:shadow-neo-hover hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-200"
                    >
                        Initialize System
                    </button>
                </div>

                {/* Right: Floating "Windows" */}
                <div className="col-span-1 md:col-span-5 relative h-[600px] hidden md:block perspective-1000">
                    {/* Window 1: Chat Interface (White Theme) */}
                    <div className="absolute top-10 right-0 w-96 bg-[#f0f0f0] border-2 border-black shadow-neo p-0 transform rotate-2 hover:rotate-0 transition-transform duration-500 z-10">
                        <div className="flex items-center justify-between px-3 py-2 bg-white border-b-2 border-black">
                            <span className="text-xs font-mono text-black uppercase tracking-widest">Input.log</span>
                            <div className="flex gap-1">
                                <div className="w-3 h-3 border border-black bg-white hover:bg-black transition-colors" />
                            </div>
                        </div>
                        <div className="p-6 font-mono text-sm text-black space-y-4">
                            <div className="bg-white border border-black p-3 shadow-sm">
                                <p className="text-gray-500 text-xs mb-1">USER</p>
                                <p>&gt; show_vault_status()</p>
                            </div>
                            <div className="bg-tavus-pink/20 border border-tavus-pink p-3">
                                <p className="text-tavus-pink text-xs mb-1 font-bold">SYSTEM</p>
                                <p>Scanning... Found 391 items.</p>
                            </div>
                        </div>
                    </div>

                    {/* Window 2: Item Preview (Dark Theme Contrast) */}
                    <div className="absolute bottom-20 -left-10 w-80 bg-[#1a1a1a] border-2 border-white shadow-neo p-0 transform -rotate-3 hover:rotate-0 transition-transform duration-500 z-20">
                        <div className="bg-black px-3 py-2 border-b-2 border-white flex justify-between items-center">
                            <span className="text-xs font-mono text-white uppercase tracking-widest">Item_Preview.exe</span>
                            <div className="w-3 h-3 bg-tavus-pink border border-white" />
                        </div>
                        <div className="p-4">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 bg-black border border-white flex items-center justify-center text-tavus-pink text-2xl">
                                    ⚡
                                </div>
                                <div>
                                    <h3 className="font-serif text-2xl text-white">Fatebringer</h3>
                                    <p className="text-xs font-mono text-gray-400">LEGENDARY // HAND_CANNON</p>
                                </div>
                            </div>
                            <div className="h-4 bg-black border border-white/20 overflow-hidden relative">
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                                <div className="h-full w-3/4 bg-tavus-pink" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="relative z-10 max-w-6xl w-full mx-auto py-24 border-t border-white/10">
                <h2 className="font-serif text-4xl text-white mb-12 flex items-center gap-4">
                    <span className="text-tavus-pink">01.</span> System Capabilities
                </h2>
                <FeaturesViewer />
            </div>

            {/* Changelog Section */}
            <div className="relative z-10 max-w-4xl w-full mx-auto py-24 border-t border-white/10">
                <h2 className="font-serif text-4xl text-white mb-12 flex items-center gap-4">
                    <span className="text-tavus-pink">02.</span> Patch Notes
                </h2>
                <ChangelogViewer />
            </div>
        </div>
    );
}
