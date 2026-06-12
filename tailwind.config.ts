import { defineConfig } from 'tailwindcss'

export default defineConfig({
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Material Design 3 inspired tokens
        primary: {
          light: '#6750A4',
          dark: '#D0BCFF',
        },
        surface: {
          light: '#FEF7FF',
          dark: '#141218',
        },
        onSurface: {
          light: '#1D1B20',
          dark: '#E6E0E9',
        }
      }
    },
  },
  plugins: [],
  darkMode: 'class', // Enables dark mode toggling via class on HTML tag
})
