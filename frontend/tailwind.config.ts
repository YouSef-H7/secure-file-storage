import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#121212',
        border: '#1f1f1f',
        primary: '#3b82f6',
        secondary: '#64748b',
      },
    },
  },
  plugins: [],
};
export default config;