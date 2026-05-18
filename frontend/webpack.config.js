const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  config.resolve = config.resolve || {};
  config.resolve.alias = Object.assign({}, config.resolve.alias || {}, {
    'react-native/Libraries/Utilities/codegenNativeCommands': path.resolve(__dirname, 'shims/codegenNativeCommands.js'),
    'react-native-maps': path.resolve(__dirname, 'shims/react-native-maps.js'),
  });

  // Add fallback for native-only modules
  config.resolve.fallback = Object.assign({}, config.resolve.fallback || {}, {
    'react-native/Libraries/Utilities/codegenNativeCommands': path.resolve(__dirname, 'shims/codegenNativeCommands.js'),
  });

  return config;
};
