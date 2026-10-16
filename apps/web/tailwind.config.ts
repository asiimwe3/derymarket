import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        market: { 50: '#F0FAF4', 100: '#DCF2E4', 500: '#0B6B3A', 600: '#095C31', 700: '#074A27' },
        gold: { 400: '#F5B301', 500: '#E8A200' }
      },
      fontFamily: { sans: ['system-ui', 'Segoe UI', 'sans-serif'] }
    }
  },
  plugins: []
};
export default config;
