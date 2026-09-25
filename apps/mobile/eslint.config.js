// Configuration ESLint de l'app mobile : https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Sortie de build, et types de routes generes par expo-router.
    ignores: ['dist/**', '.expo/**'],
  },
  {
    rules: {
      // L'app est ecrite en francais : les apostrophes des textes affiches sont
      // voulues et s'affichent correctement. Les signaler noierait les vraies
      // fautes sous le bruit. On ne garde donc que "&gt;" et "}", qui eux
      // trahissent une erreur de frappe en JSX.
      'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
    },
  },
]);
