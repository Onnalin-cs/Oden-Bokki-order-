/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brick: {
          DEFAULT: "#C85A32",
          dark: "#A8481F",
        },
        cream: "#FDFBF7",
        charcoal: "#2C2C2C",
        amber: {
          DEFAULT: "#E67E22",
          light: "#F3A65C",
        },
      },
      fontFamily: {
        sans: ["'Noto Sans Thai'", "'Sarabun'", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px -10px rgba(44, 44, 44, 0.15)",
        warm: "0 8px 24px -8px rgba(200, 90, 50, 0.35)",
      },
    },
  },
  plugins: [],
};
