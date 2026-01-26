import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0B3B2E',
          light: '#165a49',
          dark: '#062b21',
          accent: '#10b981',
        },
        background: '#f8fafc',
        surface: '#ffffff',
        border: '#e2e8f0',
        text: {
          primary: '#0f172a',
          secondary: '#64748b',
        },
        error: '#ef4444',
        warning: '#f59e0b',
        success: '#10b981',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
export default config;