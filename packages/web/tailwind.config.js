/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9ecff",
          200: "#bcdcff",
          300: "#8ec4ff",
          400: "#59a3ff",
          500: "#3080ff",
          600: "#1c5ff5",
          700: "#1749e0",
          800: "#193cb5",
          900: "#1a388f",
        },
      },
    },
  },
  plugins: [],
};
