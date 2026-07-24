/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'md-background': '#FFFBFE',
        'md-on-surface': '#1C1B1F',
        'md-primary': '#6750A4',
        'md-on-primary': '#FFFFFF',
        'md-secondary-container': '#E8DEF8',
        'md-on-secondary-container': '#1D192B',
        'md-tertiary': '#7D5260',
        'md-surface-container': '#F3EDF7',
        'md-surface-container-low': '#E7E0EC',
        'md-outline': '#79747E',
        'md-on-surface-variant': '#49454F',
        // Soft Notification Colors
        'md-error': '#F9DEDC',
        'md-on-error': '#410E0B',
        'md-warning': '#FFEFD6',
        'md-on-warning': '#3C2900',
        'md-success': '#E4F4E5',
        'md-on-success': '#0D3A11',
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
      borderRadius: {
        'xs': '8px',
        'sm': '12px',
        'md': '16px',
        'lg': '24px',
        'xl': '28px',
        '2xl': '32px',
        '3xl': '48px',
      },
      transitionTimingFunction: {
        'md-emphasized': 'cubic-bezier(0.2, 0, 0, 1)',
        'md-bouncy': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        }
      }
    },
  },
  plugins: [],
}
