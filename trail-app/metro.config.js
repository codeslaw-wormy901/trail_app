const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// PMTiles archives (bundled offline map data, see src/data/README.md) aren't
// recognized as an asset type by default — without this, Metro would try to
// parse the binary file as source code.
config.resolver.assetExts.push('pmtiles');

module.exports = config;
