// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier/flat');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = defineConfig([
  expoConfig,
  eslintConfigPrettier,
  {
    ignores: ['dist/*', 'coverage/*', 'android/*', 'ios/*', '.expo/*', 'node_modules/*'],
  },
  {
    // In flat config a plugin must be in scope of the object that references
    // its rules. eslint-config-expo registers @typescript-eslint only for its
    // own config object, so our overrides re-declare it here.
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      // The whole point of the repo: no explicit `any`.
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', 'jest.setup.ts'],
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
]);
