/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: '#08080e',
          card: '#111118',
        },
        accent: {
          blue: '#3b82f6',
          green: '#22c55e',
          orange: '#f97316',
          purple: '#a78bfa',
          cyan: '#06b6d4',
          amber: '#F59E0B',
          red: '#F87171',
          teal: '#2DD4BF',
        },
      },
    },
  },
  plugins: [],
};
