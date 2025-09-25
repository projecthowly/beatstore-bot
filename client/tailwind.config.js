/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--tg-bg-color, #0f1115)",
        text: "var(--tg-text-color, #e5e7eb)",
        primary: "var(--tg-button-color, #2563eb)",
        primaryText: "var(--tg-button-text-color, #ffffff)"
      },
      borderRadius: {
        xl2: "1rem"
      }
    }
  },
  plugins: []
}
