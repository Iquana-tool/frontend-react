/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      container: {
        center: true,
        padding: {
          DEFAULT: '0.5rem',
          sm: '0.5rem',
          md: '0.5rem',
          lg: '0.5rem',
          xl: '0.5rem',
        },
      },
      maxWidth: {
        'app': '98%',
      },
      animation: {
        progress: 'progress 2s ease-in-out infinite',
      },
      keyframes: {
        progress: {
          '0%': { width: '0%' },
          '50%': { width: '75%' },
          '100%': { width: '0%' },
        },
      },
    },
  },
  plugins: [],
}