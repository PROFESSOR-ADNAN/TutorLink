/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Deep forest green — the primary brand colour
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
        // Warm amber gold — accent
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
        // Warm off-white canvas backgrounds
        canvas: {
          50:  '#FEFEFE',
          100: '#FAFAF7',  // ← page background
          200: '#F4F4EF',
          300: '#EAEAE3',
          400: '#D8D8CF',
        },
        // Dark ink for text
        ink: {
          900: '#141410',
          800: '#1E1E19',
          700: '#2D2D26',
          600: '#4A4A42',
          500: '#6B6B61',
          400: '#8C8C82',
          300: '#ADADА3',
        },
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
