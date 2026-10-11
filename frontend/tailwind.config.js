/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          bg: "#0B1220",
          card: "#111B30",
          cardHover: "#16223D",
          border: "#1E2B44",
          borderActive: "#2A3C5E",
          text: "#E6EDF7",
          muted: "#9FB3CC",
        },
        quantum: {
          cyan: "#22D3EE",
          cyanDark: "#0891B2",
          magenta: "#E879F9",
          magentaDark: "#C026D3",
          amber: "#FBBF24",
          amberDark: "#D97706",
          emerald: "#34D399",
          rose: "#FB7185",
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'cyan-glow': '0 0 20px -3px rgba(34, 211, 238, 0.25)',
        'cyan-glow-lg': '0 0 35px -5px rgba(34, 211, 238, 0.4)',
        'magenta-glow': '0 0 20px -3px rgba(232, 121, 249, 0.25)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'spin-slow': 'spin 18s linear infinite',
        'spin-reverse-slow': 'spin-reverse 24s linear infinite',
        'pulse-glow': 'pulse-glow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'spin-reverse': {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6', filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.4))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 16px rgba(34, 211, 238, 0.8))' },
        }
      }
    },
  },
  plugins: [],
}
