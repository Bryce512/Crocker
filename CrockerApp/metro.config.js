// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add these configurations to fix module resolution
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, "cjs"],
  // Force Metro to resolve these extensions in this specific order
  resolverMainFields: ["react-native", "browser", "main"],
};

module.exports = config;
