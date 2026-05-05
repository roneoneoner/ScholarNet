/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'accent-primary': 'var(--accent-primary)',
        'bg-dark': 'var(--bg-dark)',
        'bg-card': 'var(--bg-card)',
        'text-primary': 'var(--text-primary)',
        'text-sec': 'var(--text-sec)',
      }
    },
  },
  plugins: [],
}
