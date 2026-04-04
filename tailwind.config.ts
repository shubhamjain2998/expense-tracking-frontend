import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'

// "Quiet Architect" design system palette
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
        primary: '#004251',
        'primary-container': '#005b6f',
        'primary-fixed': '#b4ebff',
        'primary-fixed-dim': '#8dd0e7',
        'on-primary': '#ffffff',
        'on-primary-fixed': '#001f27',
        'on-primary-fixed-variant': '#004e5f',
        'on-primary-container': '#8ed1e8',
        secondary: '#536167',
        'secondary-container': '#d6e5ec',
        'secondary-fixed': '#d6e5ec',
        'secondary-fixed-dim': '#bac9d0',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#58676d',
        'on-secondary-fixed': '#101d23',
        'on-secondary-fixed-variant': '#3b494f',
        tertiary: '#5b3200',
        'tertiary-container': '#774815',
        'tertiary-fixed': '#ffdcc0',
        'tertiary-fixed-dim': '#fbb97c',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#fbba7c',
        'on-tertiary-fixed': '#2d1600',
        'on-tertiary-fixed-variant': '#683c09',
        background: '#f7f9ff',
        'on-background': '#181c20',
        surface: '#f7f9ff',
        'surface-dim': '#d7dae0',
        'surface-bright': '#f7f9ff',
        'surface-variant': '#dfe3e8',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f1f4fa',
        'surface-container': '#ebeef4',
        'surface-container-high': '#e5e8ee',
        'surface-container-highest': '#dfe3e8',
        'on-surface': '#181c20',
        'on-surface-variant': '#3f484c',
        outline: '#70787c',
        'outline-variant': '#bfc8cc',
        'inverse-surface': '#2d3135',
        'inverse-on-surface': '#eef1f7',
        'inverse-primary': '#8dd0e7',
        'surface-tint': '#19677b',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        sm: '0.25rem',
        lg: '0.25rem',
        xl: '0.5rem',
        '2xl': '0.75rem',
        full: '9999px',
      },
      fontFamily: {
        headline: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [forms],
} satisfies Config
