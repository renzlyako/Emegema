/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F1F7ED",
        dark: "#243E36",
        accent: "#7CA982",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Playfair Display", "serif"],
      },
    },
  },
  plugins: [],
};
