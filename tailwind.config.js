// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f14',
        surface: '#1a1a23',
        border: '#2d2d35',
        primary: '#4F46E5',
        muted: '#B0B0B0',
      },
    },
  },
  plugins: [],
}
