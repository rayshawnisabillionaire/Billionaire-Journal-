/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Brand palette
        bj: {
          50:  '#f8f8f6',
          100: '#f0f0ec',
          200: '#e2e2da',
          300: '#c8c8bc',
          400: '#a8a898',
          500: '#8a8a78',
          600: '#6e6e5c',
          700: '#565648',
          800: '#3c3c32',
          900: '#282820',
          950: '#161610',
        },
        surface: {
          DEFAULT: '#ffffff',
          2: '#fafaf8',
          3: '#f4f4f0',
          4: '#eeeeea',
        },
        ink: {
          DEFAULT: '#141412',
          2: '#3a3a36',
          3: '#6b6b64',
          4: '#9b9b92',
          5: '#c4c4bc',
        },
        profit:  { DEFAULT: '#16a34a', light: '#dcfce7', dark: '#14532d' },
        loss:    { DEFAULT: '#dc2626', light: '#fee2e2', dark: '#7f1d1d' },
        warning: { DEFAULT: '#d97706', light: '#fef3c7', dark: '#78350f' },
        accent:  { DEFAULT: '#1c1c1a', hover: '#2d2d2b' },
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        panel: '-4px 0 32px rgba(0,0,0,0.08)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.4,0,0.2,1)',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideInRight: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        slideUp: { from: { transform: 'translateY(12px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
      },
    },
  },
  plugins: [],
};
