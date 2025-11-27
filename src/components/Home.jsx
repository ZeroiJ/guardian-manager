import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
        <div className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 overflow-hidden">

            {/* Background Noise/Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505] pointer-events-none" />

            {/* Main Content Container */}
            <div className="relative z-10 max-w-5xl w-full grid grid-cols-1 md:grid-cols-12 gap-12 items-center">

                {/* Left: Typography & Hero Text */}
                <div className="col-span-1 md:col-span-7 space-y-8">
                    <h1 className="font-serif text-6xl md:text-8xl leading-[0.9] text-primary tracking-tight">
                        You've <br />
                        <span className="italic text-gray-400">never</span> met <br />
                        AI like this
                    </h1>

                    <div className="h-24"> {/* Spacer for typing text */}
                        <p className="font-sans text-2xl md:text-3xl text-void font-medium">
                            {text}<span className="animate-pulse">_</span>
                        </p>
                    </div>

                    <p className="font-sans text-lg text-gray-400 max-w-md leading-relaxed">
                        The Guardian Nexus isn't just a manager. It's a conversational interface for your Destiny 2 journey.
                        See, track, and optimize.
                    </p>

                    {/* Neo-Brutalist Button */}
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="group relative inline-flex items-center justify-center px-8 py-4 bg-solar text-black font-sans font-bold uppercase tracking-wider text-sm border border-solar hover:bg-transparent hover:text-solar transition-all duration-200 shadow-neo hover:shadow-neo-hover hover:translate-x-[2px] hover:translate-y-[2px]"
                    >
                        Initialize System
                    </button>
                </div>

                {/* Right: Floating "Windows" */}
                <div className="col-span-1 md:col-span-5 relative h-[500px] hidden md:block">
                    {/* Window 1: Chat Interface */}
                    <div className="absolute top-0 right-0 w-80 bg-surface/80 backdrop-blur-md border border-white/20 shadow-neo p-4 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                            <span className="text-xs font-mono text-gray-500 uppercase">Input.log</span>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            </div>
                        </div>
                        <div className="font-mono text-sm text-gray-300 space-y-2">
                            <p className="text-void">&gt; show_vault_status()</p>
                            <p className="text-gray-500">Scanning...</p>
                            <p>Found 391 items.</p>
                        </div>
                    </div>

                    {/* Window 2: Item Preview */}
                    <div className="absolute bottom-10 left-0 w-72 bg-surface/90 backdrop-blur-xl border border-white/20 shadow-neo p-1 transform -rotate-3 hover:rotate-0 transition-transform duration-500 z-20">
                        <div className="bg-[#0a0a0a] p-4 border border-white/5">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-void/20 rounded-sm border border-void/50 flex items-center justify-center text-void">
                                    ⚡
                                </div>
                                <div>
                                    <h3 className="font-serif text-xl text-white">Fatebringer</h3>
                                    <p className="text-xs font-sans text-gray-500">Legendary Hand Cannon</p>
                                </div>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full w-3/4 bg-void" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
