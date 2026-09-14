const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const config = getDefaultConfig(__dirname)

// AWS exposes a React Native runtime configuration only through its ES module entrypoint.
config.resolver.resolverMainFields = ['react-native', 'browser', 'module', 'main']
// The workspace also installs the released component package for desktop demos.
// Keep native SVG imports on the iOS package copy so Expo Go registers each view once.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  'react-native-svg': path.resolve(__dirname, 'node_modules/react-native-svg'),
}

module.exports = config
