import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'

// Warm earthy palette
// Surface hierarchy (light → elevated):
//   background → surface → surface-container-low → surface-container
//   → surface-container-high → surface-container-highest
// surface-container-lowest (#ffffff) is reserved for the most prominent interactive cards
// No 1px solid borders — use background color shifts to define boundaries

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#C08552',
        'primary-container': '#8C5A3C',
        'primary-fixed': '#FFE0C2',
        'primary-fixed-dim': '#D4A07A',
        'on-primary': '#ffffff',
        'on-primary-fixed': '#2C1A17',
        'on-primary-fixed-variant': '#7A4530',
        'on-primary-container': '#FFE8D0',
        secondary: '#8C5A3C',
        'secondary-container': '#F0D8C0',
        'secondary-fixed': '#F0D8C0',
        'secondary-fixed-dim': '#D4B090',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#5A3020',
        'on-secondary-fixed': '#2C1A17',
        'on-secondary-fixed-variant': '#6B4030',
        tertiary: '#4B2E2B',
        'tertiary-container': '#7A4535',
        'tertiary-fixed': '#FFD8C0',
        'tertiary-fixed-dim': '#E8B090',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#FFD0B0',
        'on-tertiary-fixed': '#2C1A17',
        'on-tertiary-fixed-variant': '#7A4535',
        background: '#FFF8F0',
        'on-background': '#2C1A17',
        surface: '#FFF8F0',
        'surface-dim': '#D9C4A8',
        'surface-bright': '#FFF8F0',
        'surface-variant': '#E5D5BE',
        'surface-container-lowest': '#FFFFFF',
        'surface-container-low': '#FAF1E6',
        'surface-container': '#F4E8D8',
        'surface-container-high': '#EDE0CC',
        'surface-container-highest': '#E5D5BE',
        'on-surface': '#2C1A17',
        'on-surface-variant': '#6B4A3A',
        outline: '#9C7060',
        'outline-variant': '#D4B99A',
        'inverse-surface': '#3A2220',
        'inverse-on-surface': '#FAF1E6',
        'inverse-primary': '#D4A07A',
        'surface-tint': '#C08552',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '6px',
        lg: '10px',
        xl: '10px',
        '2xl': '10px',
        full: '9999px',
      },
      fontFamily: {
        headline: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        body: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        label: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [forms],
} satisfies Config
