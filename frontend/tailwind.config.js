/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // make sure Vite scans all your files
  ],
  theme: {
    extend: {
      keyframes: {
        spinIn: {
          "0%": { transform: "rotate(0deg) translateX(150px)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "rotate(360deg) translateX(0px)", opacity: "0" },
        },
        spinOut: {
          "0%": { transform: "rotate(0deg) translateX(-150px)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "rotate(-360deg) translateX(0px)", opacity: "0" },
        },
      },
      animation: {
        spinIn: "spinIn 3s ease-in-out infinite",
        spinOut: "spinOut 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
