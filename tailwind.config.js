/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
            },
            colors: {
                // === VOID MONOCHROME PALETTE ===
                // "Sin City" aesthetic: Only loot has color

                // Backgrounds (Pure Black)
                'void-bg': '#000000',           // Pure black
                'void-surface': '#0a0a0a',      // Subtle card separation
                'void-elevated': '#111111',     // Elevated surfaces

                // Borders (Dark Gray)
                'void-border': '#262626',       // Primary borders
                'void-border-light': '#333333', // Visible borders

                // Text (Monochrome only)
                'void-text': '#ffffff',         // Stark white
                'void-text-secondary': '#888888', // Neutral gray
                'void-text-muted': '#555555',   // Faint text
                'void-header': '#ededed',       // Off-white headers

                // === LOOT COLORS (The only color in the UI) ===
                // Element Icons
                'solar': '#f97316',             // Solar orange
                'arc': '#3b82f6',               // Arc blue
                'void': '#a855f7',              // Void purple
                'stasis': '#60a5fa',            // Stasis blue
                'strand': '#22c55e',            // Strand green
                'prismatic': '#ec4899',         // Prismatic pink

                // Rarity Borders (Only items get these colors)
                'rarity-common': '#888888',
                'rarity-uncommon': '#22c55e',
                'rarity-rare': '#3b82f6',
                'rarity-legendary': '#a855f7',
                'rarity-exotic': '#eab308',

                // Special
                'masterwork': '#fbbf24',
                'power-text': '#ffffff',

                // Legacy aliases for compatibility
                'dim-bg': '#000000',
                'dim-surface': '#0a0a0a',
                'dim-text': '#ffffff',
                'dim-text-muted': '#888888',
                'dim-header': '#ededed',
                'dim-border': '#262626',
                'dim-border-light': '#333333',
            },
            spacing: {
                'item': '64px',
                'item-gap': '8px',
            },
            keyframes: {
                slideUp: {
                    '0%': { transform: 'translateY(100%)' },
                    '100%': { transform: 'translateY(0)' },
                },
            },
            animation: {
                slideUp: 'slideUp 0.25s ease-out',
            },
        },
    },
    plugins: [],
}
