const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configure module aliases for web
config.resolver = {
  ...config.resolver,
  alias: {
    ...config.resolver?.alias,
    'react-native/Libraries/Utilities/codegenNativeCommands': path.resolve(__dirname, './shims/codegenNativeCommands.js'),
  },
  // Configure resolver to prefer web versions for web platform
  resolverMainFields: ['react-native', 'browser', 'main'],
};

module.exports = config;
