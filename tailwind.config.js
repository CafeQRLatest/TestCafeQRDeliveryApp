/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange:       '#F97316',
          'orange-dark':  '#EA580C',
          'orange-light': '#FED7AA',
          'orange-50':    '#fff7ed',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'fade-in':   'fadeIn 0.3s ease-out',
        'slide-up':  'slideUp 0.3s ease-out',
        'bounce-sm': 'bounceSm 0.4s ease-out',
      },
      keyframes: {
        fadeIn:   { '0%': { opacity: 0 },                                           '100%': { opacity: 1 } },
        slideUp:  { '0%': { transform: 'translateY(16px)', opacity: 0 },            '100%': { transform: 'translateY(0)', opacity: 1 } },
        bounceSm: { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.08)' } },
      },
    },
  },
  plugins: [],
};
