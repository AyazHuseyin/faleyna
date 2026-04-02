// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const config = {
  resolver: {
    // WEBP mutlaka asset olsun
    assetExts: Array.from(new Set([...assetExts, 'webp'])),
    // Yanlışlıkla sourceExts'e düşmüşse çıkar
    sourceExts: sourceExts.filter((ext) => ext !== 'webp'),
  },
};

module.exports = mergeConfig(defaultConfig, config);
