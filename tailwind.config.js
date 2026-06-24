/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#172033',
        paper: '#f8fafc',
        brand: {
          50: '#eef8ff',
          100: '#d8efff',
          500: '#2678c7',
          600: '#1f62a3',
          700: '#1d4f82'
        },
        coral: {
          100: '#ffe3dc',
          500: '#d9563f',
          600: '#bd422e'
        },
        mint: {
          100: '#dff7ea',
          500: '#2d9d66'
        }
      },
      boxShadow: {
        soft: '0 14px 45px rgba(23, 32, 51, 0.08)'
      }
    },
  },
  plugins: [],
};
