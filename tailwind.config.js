/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#211c84',
        secondary: '#4D55CC',
        accent: '#7a73d1',
        light: '#b5a8d5',
      },
    },
  },
  plugins: [],
}

