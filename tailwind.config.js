/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        game: {
          blue: '#2563EB',
          red: '#EF4444',
          gold: '#F59E0B',
          board: '#F1F5F9',
        },
        pastel: {
          canvas: '#F8FAFC',
          card: '#FFFFFF',
          mint: '#DCFCE7',
          'mint-border': '#86EFAC',
          'mint-dark': '#166534',
          sky: '#E0F2FE',
          'sky-border': '#BAE6FD',
          'sky-dark': '#0369A1',
          peach: '#FFEDD5',
          'peach-border': '#FED7AA',
          'peach-dark': '#9A3412',
          lemon: '#FEF9C3',
          'lemon-border': '#FDE047',
          'lemon-dark': '#854D0E',
          lilac: '#F3E8FF',
          'lilac-border': '#E9D5FF',
          'lilac-dark': '#6B21A8',
        }
      },
      boxShadow: {
        'tactile': '0 3px 0 #CBD5E1',
        'tactile-lg': '0 4px 0 #CBD5E1',
        'tactile-emerald': '0 4px 0 #059669',
        'tactile-sky': '0 4px 0 #0284C7',
        'tactile-amber': '0 4px 0 #D97706',
        'tactile-purple': '0 4px 0 #7E22CE',
        'subtle': '0 1px 3px rgba(0,0,0,0.05), 0 10px 25px -5px rgba(0,0,0,0.04)',
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
