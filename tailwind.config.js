/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        urano: {
          red: '#c41e3a',
          'red-dark': '#9e1830',
          'red-light': '#e63950',
          gray: '#6b7280',
          'gray-light': '#9ca3af',
          'gray-dark': '#374151',
        },
      },
    },
  },
  plugins: [],
}
