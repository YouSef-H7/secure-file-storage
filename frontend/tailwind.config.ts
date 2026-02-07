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
          DEFAULT: '#0d4d2e',
          light: '#10854a',
          dark: '#0a3d25',
          accent: '#10b981',
          lighter: '#d4f1e3',
        },
        background: '#f8faf9',
        surface: '#ffffff',
        border: '#e5e7eb',
        text: {
          primary: '#1a1a1a',
          secondary: '#6b7280',
        },
        error: '#ef4444',
        warning: '#f59e0b',
        success: '#10b981',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 12px 24px rgba(13, 77, 46, 0.15)',
        'dropdown': '0 10px 15px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        'card': '1rem',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slideUp 0.35s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
