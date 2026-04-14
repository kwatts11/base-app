const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Copy custom service worker and PWA assets to build output
  if (env.mode === 'production') {
    config.plugins.push(
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'public/sw.js'),
            to: 'sw.js',
          },
          {
            from: path.resolve(__dirname, 'public/manifest.json'),
            to: 'manifest.json',
          },
        ],
      })
    );
  }

  return config;
};
