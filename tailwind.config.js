/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Google Sans', 'Lexend', 'Montserrat', 'sans-serif'], 
      },
      colors: {
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#a5a8ad',
          500: '#74777d',
          600: '#595c61',
          700: '#494c52',
          800: '#313336',
          900: '#222326',
        },
        primary: {
          50: '#1c1c1c',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#a5a8ad',
          500: '#74777d',
          600: '#595c61',
          700: '#494c52',
          800: '#313336',
          900: '#222326',
        }
      }
    },
  },
  plugins: [],
}
