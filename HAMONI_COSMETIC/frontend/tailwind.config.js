/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // BẮT BUỘC để dùng Dark Mode bằng nút Toggle
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#E11D48', // Màu nhấn hồng đỏ (Rose)
      }
    },
  },
  plugins: [],
}