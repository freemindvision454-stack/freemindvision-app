// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('./assets/icon.png');
const expoConfig = require('./assets/icon.png');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);
