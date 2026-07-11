/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Deep forest green — the primary brand colour. Kept static (not
        // theme-dependent): it's used as a background behind white text in
        // buttons/badges, which reads fine in both light and dark mode.
        forest: {
          50:  '#f0f7f4',
          100: '#dcede4',
          200: '#bcd9cb',
          300: '#8fbfaa',
          400: '#5e9e84',
          500: '#3d8168',
          600: '#2d6652',
          700: '#265445',
          800: '#1B4332',  // ← main primary
          900: '#163728',
          950: '#0c2118',
        },
        // Warm amber gold — accent. Also static for the same reason as forest.
        gold: {
          50:  '#fdfbf0',
          100: '#faf3d0',
          200: '#f4e49e',
          300: '#eccf62',
          400: '#D4A017',  // ← main accent
          500: '#c08c0e',
          600: '#a0720c',
          700: '#7f570d',
          800: '#694612',
          900: '#593b13',
        },
        // Warm off-white canvas backgrounds — CSS-variable-driven so the
        // whole app's page/section backgrounds invert for dark mode. See
        // :root / .dark in assets/styles/index.css for the actual values.
        canvas: {
          50:  'rgb(var(--canvas-50) / <alpha-value>)',
          100: 'rgb(var(--canvas-100) / <alpha-value>)',
          200: 'rgb(var(--canvas-200) / <alpha-value>)',
          300: 'rgb(var(--canvas-300) / <alpha-value>)',
          400: 'rgb(var(--canvas-400) / <alpha-value>)',
        },
        // Text colour — CSS-variable-driven so body text, headings, and
        // muted/secondary text all invert together for dark mode.
        ink: {
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
        },
        // Elevated surfaces (cards, inputs, modals, the navbar) — white in
        // light mode, a dark charcoal in dark mode, distinct from the page
        // background so elevation is still visible.
        surface: 'rgb(var(--surface) / <alpha-value>)',
        // Accent text/link colour. Equals forest-800 in light mode (dark
        // green reads fine on a light page) but switches to a lighter green
        // in dark mode, since dark green text is unreadable on a dark page.
        accent: 'rgb(var(--accent) / <alpha-value>)',
      },
      fontFamily: {
        serif:   ['"DM Serif Display"', 'Georgia', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      fontSize: {
        'display-xl': ['4.5rem',  { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-lg': ['3.5rem',  { lineHeight: '1.08', letterSpacing: '-0.02em' }],
        'display-md': ['2.5rem',  { lineHeight: '1.12', letterSpacing: '-0.01em' }],
        'display-sm': ['1.75rem', { lineHeight: '1.2',  letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        sm:   '0.25rem',
        DEFAULT: '0.375rem',
        md:   '0.5rem',
        lg:   '0.75rem',
        xl:   '1rem',
        '2xl':'1.5rem',
        '3xl':'2rem',
      },
      boxShadow: {
        'xs':    '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'sm':    '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card':  '0 2px 8px 0 rgb(0 0 0 / 0.06), 0 1px 3px -1px rgb(0 0 0 / 0.04)',
        'hover': '0 8px 24px 0 rgb(0 0 0 / 0.10), 0 2px 8px -2px rgb(0 0 0 / 0.06)',
        'glow':  '0 0 0 3px rgb(27 67 50 / 0.15)',
      },
      backgroundImage: {
        'grid-canvas': "url(\"data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 .5H32M.5 0V32' stroke='%23E8E8E1' stroke-width='0.5'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out both',
        'fade-in': 'fadeIn 0.4s ease-out both',
      },
      keyframes: {
        fadeUp:  { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:  { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
      },
    },
  },
  plugins: [],
};
