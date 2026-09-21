import forms from '@tailwindcss/forms'
import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  plugins: [forms],
} satisfies Config
