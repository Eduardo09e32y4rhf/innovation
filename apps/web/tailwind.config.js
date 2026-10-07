/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: { relative: true, files: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'] },
  theme: {
    screens: { xs: '400px', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', desktop: '1440px', '2xl': '1536px', '3xl': '1920px', '4xl': '2560px', '5xl': '3200px' },
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        'bg-elev': 'rgb(var(--bg-elevated) / <alpha-value>)',
        'bg-sub': 'rgb(var(--bg-subtle) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        'fg-mut': 'rgb(var(--fg-muted) / <alpha-value>)',
        'fg-sub': 'rgb(var(--fg-subtle) / <alpha-value>)',
        border: 'rgb(var(--border-rgb) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        brand: { DEFAULT: 'rgb(var(--brand-600) / <alpha-value>)', ...Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => [n, `rgb(var(--brand-${n}) / <alpha-value>)`])) },
        accent: { 400: 'rgb(var(--accent-400) / <alpha-value>)', 500: 'rgb(var(--accent-500) / <alpha-value>)', 600: 'rgb(var(--accent-600) / <alpha-value>)' },
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      borderRadius: { v2: 'var(--r-lg)', 'v2-sm': 'var(--r-sm)', 'v2-md': 'var(--r-md)', 'v2-lg': 'var(--r-lg)', 'v2-xl': 'var(--r-xl)', 'v2-2xl': 'var(--r-2xl)', 'v2-3xl': 'var(--r-3xl)' },
      boxShadow: { 'v2-xs': 'var(--shadow-xs)', 'v2-sm': 'var(--shadow-sm)', 'v2-md': 'var(--shadow-md)', 'v2-lg': 'var(--shadow-lg)', 'v2-xl': 'var(--shadow-xl)' },
      maxWidth: { content: '1440px', 'content-wide': '1920px' },
    },
  },
  plugins: [],
};
