/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0a0a0b',
          800: '#131316',
          700: '#1a1a1d',
          600: '#242429',
          500: '#33333a',
          400: '#4a4a52',
          300: '#6b6b76',
          200: '#9a9aa6',
          100: '#c7c7d0',
        },
      },
    },
  },
  plugins: [],
};
