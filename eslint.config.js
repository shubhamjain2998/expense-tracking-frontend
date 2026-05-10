import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import importPlugin from 'eslint-plugin-import'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    settings: {
      react: { version: 'detect' },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      react,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'jsx-a11y/anchor-is-valid': 'error',
      // Promote to 'error' once modal/drag-drop a11y is fixed (task #28: focus management).
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          pathGroups: [{ pattern: '@/**', group: 'internal', position: 'before' }],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  // Enforce that useQuery/useMutation/useQueries are only called inside domain hooks.
  // Files under src/features/**/hooks/ and src/hooks/ are exempt — that's where hooks live.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/features/**', 'src/hooks/**'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'CallExpression[callee.name=/^(useQuery|useMutation|useQueries)$/]',
          message:
            'Wrap useQuery/useMutation/useQueries in a domain hook under src/features/*/hooks/ or src/hooks/.',
        },
      ],
    },
  },
  prettier
)
