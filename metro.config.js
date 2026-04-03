// metro.config.js — EAS / expo export için expo/metro-config gerekli (Serializer formatı)
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = config.resolver;

config.resolver.assetExts = Array.from(new Set([...assetExts, 'webp']));
config.resolver.sourceExts = sourceExts.filter((ext) => ext !== 'webp');

module.exports = config;
