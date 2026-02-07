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
                // === DIM-Inspired Color System ===
                // Backgrounds
                'dim-bg': '#0f1115',           // Deep void (main background)
                'dim-surface': '#161920',       // Cards/panels
                'dim-surface-alt': '#1a1d24',   // Elevated surfaces

                // Text
                'dim-text': '#e8e8e8',          // Primary text (soft white)
                'dim-text-muted': '#6b7280',    // Secondary text
                'dim-text-faint': '#4b5563',    // Tertiary/placeholder

                // Accents
                'dim-header': '#9ca3af',        // Section headers (gray, not yellow!)
                'dim-border': '#2a2d35',        // Subtle borders
                'dim-border-light': '#444',     // Visible borders

                // Elements
                'void': '#a855f7',              // Void purple (vibrant)
                'solar': '#f0631e',             // Solar orange
                'arc': '#79bbe8',               // Arc blue
                'stasis': '#4d88ff',            // Stasis blue
                'strand': '#35e366',            // Strand green
                'prismatic': '#e3619b',         // Prismatic pink

                // Rarity Colors
                'rarity-common': '#dcdcdc',
                'rarity-uncommon': '#366e42',
                'rarity-rare': '#5076a3',
                'rarity-legendary': '#513065',
                'rarity-exotic': '#c3a019',

                // Status
                'masterwork': '#eade8b',
                'power-gold': '#f5dc56',
                'xp-green': '#5ea16a',

                // Legacy (keeping for compatibility)
                primary: '#e8e8e8',
                surface: '#161920',
                border: '#2a2d35',
            },
            // Design System Sizing
            spacing: {
                'item': '64px',    // Standard item tile
                'item-gap': '8px', // Gap between items
            },
            boxShadow: {
                'neo': '4px 4px 0px rgba(0, 0, 0, 0.5)',
                'neo-hover': '2px 2px 0px rgba(0, 0, 0, 0.5)',
            }
        },
    },
    plugins: [],
}

