/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        rajdhani: ["Rajdhani", "system-ui", "sans-serif"],
      },
      colors: {
        // === VOID MONOCHROME PALETTE ===
        // "Sin City" aesthetic: Only loot has color

        // Backgrounds (Pure Black)
        "void-bg": "#000000", // Pure black
        "void-surface": "#0a0a0a", // Subtle card separation
        "void-elevated": "#111111", // Elevated surfaces

        // Borders (Dark Gray)
        "void-border": "#262626", // Primary borders
        "void-border-light": "#333333", // Visible borders

        // Text (Monochrome only)
        "void-text": "#ffffff", // Stark white
        "void-text-secondary": "#888888", // Neutral gray
        "void-text-muted": "#555555", // Faint text
        "void-header": "#ededed", // Off-white headers

        // === LOOT COLORS (The only color in the UI) ===
        // Element Icons
        solar: "#f97316", // Solar orange
        arc: "#3b82f6", // Arc blue
        void: "#a855f7", // Void purple
        stasis: "#60a5fa", // Stasis blue
        strand: "#22c55e", // Strand green
        prismatic: "#ec4899", // Prismatic pink

        // Rarity Borders (Only items get these colors)
        "rarity-common": "#888888",
        "rarity-uncommon": "#22c55e",
        "rarity-rare": "#3b82f6",
        "rarity-legendary": "#a855f7",
        "rarity-exotic": "#eab308",

        // Special
        masterwork: "#fbbf24",
        "power-text": "#ffffff",

        // Legacy aliases for compatibility
        "dim-bg": "#000000",
        "dim-surface": "#0a0a0a",
        "dim-text": "#ffffff",
        "dim-text-muted": "#888888",
        "dim-header": "#ededed",
        "dim-border": "#262626",
        "dim-border-light": "#333333",
      },
      spacing: {
        item: "64px",
        "item-gap": "8px",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideOutRight: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
        blockSlide: {
          "0%": {
            transform: "translateX(-20%)",
            letterSpacing: "0.15em",
          },
          "100%": {
            transform: "translateX(20%)",
            letterSpacing: "0.35em",
          },
        },
        glitchOpacity: {
          "0%, 100%": { opacity: "1" },
          "7%": { opacity: "0.75" },
          "10%": { opacity: "1" },
          "27%": { opacity: "0.9" },
          "30%": { opacity: "1" },
          "55%": { opacity: "1" },
          "57%": { opacity: "0.6" },
          "60%": { opacity: "1" },
          "86%": { opacity: "0.85" },
          "89%": { opacity: "1" },
        },
        scanDrift: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 100%" },
        },
      },
      animation: {
        slideUp: "slideUp 0.25s ease-out",
        slideInRight: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        slideOutRight: "slideOutRight 0.25s ease-in",
        blockSlide: "blockSlide 2s ease-in-out infinite alternate",
        glitchOpacity: "glitchOpacity 3s steps(1, end) infinite",
        scanDrift: "scanDrift 8s linear infinite",
      },
    },
  },
  plugins: [],
};
