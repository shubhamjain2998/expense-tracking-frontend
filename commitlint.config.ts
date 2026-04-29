export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'dashboard',
        'upload',
        'review',
        'budget',
        'transactions',
        'settings',
        'api',
        'types',
        'components',
        'hooks',
        'layout',
        'config',
        'deps',
        'docs',
      ],
    ],
  },
}
