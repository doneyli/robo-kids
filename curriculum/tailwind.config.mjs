/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        explorer: { 50: '#fef9ee', 100: '#fdefd3', 200: '#fbd99b', 300: '#f9bd5e', 400: '#f79f2c', 500: '#f58310', 600: '#e96507', 700: '#c24c09', 800: '#9b3c10', 900: '#7d3310' },
        builder:  { 50: '#eef6ff', 100: '#d9eaff', 200: '#bbdaff', 300: '#8dc3ff', 400: '#58a2ff', 500: '#2f7cff', 600: '#1a5df5', 700: '#1448e1', 800: '#173bb5', 900: '#19378f' },
      },
      fontFamily: { display: ['"Nunito"', 'system-ui', 'sans-serif'] },
    },
  },
};
