/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Dark mode is the default (night driving) — we use a class strategy so we
  // can respect the OS preference but allow an explicit override.
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Deep navy / trucker blue
        navy: {
          DEFAULT: '#0F172A',
          light: '#1E293B',
          lighter: '#334155',
          dark: '#0B1120',
        },
        // High-visibility orange accent
        hi: {
          DEFAULT: '#F97316',
          light: '#FB923C',
          dark: '#EA580C',
        },
        // Success emerald for cheap prices
        cheap: '#10B981',
        expensive: '#EF4444',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      // Big touch targets for driving gloves / big hands
      touchTarget: {
        // consumed via arbitrary values
      },
    },
  },
  plugins: [],
};
