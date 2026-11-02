/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        game: {
          blue: '#1E3A8A',
          red: '#DC2626',
          gold: '#F59E0B',
          board: '#0F172A',
        }
      },
      keyframes: {
        flipDown: {
          '0%': { transform: 'rotateX(0deg)', opacity: '1' },
          '100%': { transform: 'rotateX(-75deg) translateY(12px) scale(0.92)', opacity: '0.4' },
        },
        flipUp: {
          '0%': { transform: 'rotateX(-75deg) translateY(12px) scale(0.92)', opacity: '0.4' },
          '100%': { transform: 'rotateX(0deg)', opacity: '1' },
        }
      },
      animation: {
        flipDown: 'flipDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        flipUp: 'flipUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      }
    },
  },
  plugins: [],
}
