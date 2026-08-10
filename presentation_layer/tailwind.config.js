/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'md-background': 'var(--md-background)',
        'md-on-surface': 'var(--md-on-surface)',
        'md-primary': 'var(--md-primary)',
        'md-on-primary': 'var(--md-on-primary)',
        'md-secondary-container': 'var(--md-secondary-container)',
        'md-on-secondary-container': 'var(--md-on-secondary-container)',
        'md-tertiary': 'var(--md-tertiary)',
        'md-surface-container': 'var(--md-surface-container)',
        'md-surface-container-low': 'var(--md-surface-container-low)',
        'md-outline': 'var(--md-outline)',
        'md-on-surface-variant': 'var(--md-on-surface-variant)',
        // Soft Notification Colors
        'md-error': 'var(--md-error)',
        'md-on-error': 'var(--md-on-error)',
        'md-warning': 'var(--md-warning)',
        'md-on-warning': 'var(--md-on-warning)',
        'md-success': 'var(--md-success)',
        'md-on-success': 'var(--md-on-success)',
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
