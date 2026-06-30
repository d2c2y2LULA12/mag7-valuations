/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paradise: {
          DEFAULT: '#4FD1E8',
          dim: '#2BA8BE',
          glow: 'rgba(79, 209, 232, 0.3)',
        },
        card: {
          bg: '#0d0d1a',
          border: '#1e1e3a',
        },
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg) scale(1.05)' },
          '15%': { transform: 'rotate(-3deg) scale(1.05)' },
          '30%': { transform: 'rotate(3deg) scale(1.07)' },
          '45%': { transform: 'rotate(-2deg) scale(1.06)' },
          '60%': { transform: 'rotate(2deg) scale(1.06)' },
          '75%': { transform: 'rotate(-1deg) scale(1.05)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        wiggle: 'wiggle 0.5s ease-in-out',
        shimmer: 'shimmer 3s linear infinite',
        fadeIn: 'fadeIn 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
};
