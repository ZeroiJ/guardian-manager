/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                serif: ['"Playfair Display"', 'serif'],
                sans: ['"Space Grotesk"', 'sans-serif'],
            },
            colors: {
                void: '#a359ff',
                solar: '#ff6b00',
                arc: '#00d4ff',
                primary: '#ffffff',
                surface: '#111111',
                border: '#333333',
                'tavus-pink': '#ff90e8',
                'acid-green': '#00ff00',
            },
            boxShadow: {
                'neo': '4px 4px 0px rgba(0, 0, 0, 0.5)',
                'neo-hover': '2px 2px 0px rgba(0, 0, 0, 0.5)',
            }
        },
    },
    plugins: [],
}
