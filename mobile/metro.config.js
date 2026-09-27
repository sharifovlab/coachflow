// Lets the app import shared data (exercise catalog, body geometry) from ../shared.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../shared')];
config.resolver.extraNodeModules = { '@shared': path.resolve(__dirname, '../shared') };
module.exports = config;
