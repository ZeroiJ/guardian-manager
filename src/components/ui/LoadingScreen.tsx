/**
 * LoadingScreen — "GM" Blocky Loading Display
 *
 * Full-screen overlay with the "GM" logo rendered in a heavy, tactical style.
 * Features:
 *   - blockSlide animation: logo slides left-to-right then reverses
 *   - CSS scan-line mask: repeating gradient creates CRT/digital display effect
 *   - glitchOpacity: subtle digital flicker on the entire composition
 *   - Rajdhani bold at massive scale for the heavy, blocky feel
 *
 * Void theme: pure black bg, white text, zero color.
 */

interface LoadingScreenProps {
    /** Optional status text beneath the logo */
    status?: string;
    /** Optional secondary detail line */
    detail?: string;
}

export function LoadingScreen({
    status = 'INITIALIZING GUARDIAN NEXUS',
    detail = 'Connecting to Neural Net',
}: LoadingScreenProps) {
    return (
        <div className="fixed inset-0 z-[9998] bg-black flex flex-col items-center justify-center overflow-hidden select-none">
            {/* Ambient corner vignette */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
                }}
            />

            {/* Scan-line overlay across entire screen */}
            <div
                className="absolute inset-0 pointer-events-none animate-scanDrift opacity-[0.04]"
                style={{
                    backgroundImage:
                        'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)',
                    backgroundSize: '100% 4px',
                }}
            />

            {/* Main composition — glitch flicker on the whole group */}
            <div className="relative animate-glitchOpacity">
                {/* GM Logo — blockSlide animation */}
                <div className="animate-blockSlide">
                    <div className="relative">
                        {/* Primary text */}
                        <h1
                            className="text-[clamp(8rem,20vw,16rem)] font-rajdhani font-bold text-white leading-none tracking-[0.2em] uppercase"
                            style={{
                                /*
                                 * Scan-line mask: horizontal bars that carve
                                 * through the letterforms for that low-res
                                 * digital display / CRT feel.
                                 */
                                maskImage:
                                    'repeating-linear-gradient(180deg, white 0px, white 3px, transparent 3px, transparent 5px)',
                                WebkitMaskImage:
                                    'repeating-linear-gradient(180deg, white 0px, white 3px, transparent 3px, transparent 5px)',
                            }}
                        >
                            GM
                        </h1>

                        {/* Ghost / echo layer — slight offset for depth */}
                        <h1
                            className="absolute inset-0 text-[clamp(8rem,20vw,16rem)] font-rajdhani font-bold text-white/[0.06] leading-none tracking-[0.2em] uppercase blur-[1px]"
                            aria-hidden="true"
                            style={{
                                transform: 'translate(3px, 3px)',
                            }}
                        >
                            GM
                        </h1>
                    </div>
                </div>

                {/* Horizontal rule — tactical accent line */}
                <div className="flex items-center gap-3 mt-6 px-2">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                    <div className="w-1.5 h-1.5 bg-white/30 rotate-45" />
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                </div>

                {/* Status text */}
                <div className="mt-6 text-center space-y-2">
                    <p className="text-[11px] font-rajdhani font-bold uppercase tracking-[0.3em] text-white/60">
                        {status}
                    </p>
                    {detail && (
                        <p className="text-[10px] font-mono text-white/20 tracking-wider">
                            {detail}
                        </p>
                    )}
                </div>

                {/* Loading bar — thin tactical progress indicator */}
                <div className="mt-8 mx-auto w-48 h-[2px] bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-white/40 rounded-full"
                        style={{
                            animation: 'blockSlide 2s ease-in-out infinite alternate',
                            width: '40%',
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default LoadingScreen;
