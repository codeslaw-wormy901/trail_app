const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Bundled MapLibre font glyphs (Noto Sans Regular, SIL OFL licensed, from
// Protomaps' open basemaps-assets repo — see assets/fonts/README.md) need
// to live in the native project's own asset bundle, addressed by MapLibre's
// glyphs URL template at render time. Metro's require() only resolves one
// static file at a time, so it can't hand this whole directory to JS the
// way pmtiles/sprite files are — this has to be a real Expo config plugin
// that runs at `expo prebuild` time, since ios/ and android/ are gitignored
// and regenerated from scratch, not checked into version control.
const FONT_SOURCE_DIR = path.join(__dirname, '..', 'assets', 'fonts');

function copyRecursiveSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function withFontGlyphsAndroid(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const destDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets',
        'fonts',
      );
      copyRecursiveSync(FONT_SOURCE_DIR, destDir);
      return config;
    },
  ]);
}

function withFontGlyphsIOS(config) {
  return withXcodeProject(config, (config) => {
    const iosRoot = config.modRequest.platformProjectRoot;
    copyRecursiveSync(FONT_SOURCE_DIR, path.join(iosRoot, 'fonts'));

    const project = config.modResults;
    // addResourceFile unconditionally looks up a group literally named
    // "Resources" (a leftover assumption from older Xcode project layouts)
    // and crashes on its `.path` if that group doesn't exist — current
    // Expo-generated projects name the top-level group after the app
    // instead, so there's no "Resources" group here at all. Creating an
    // empty one (never added to the visible project tree, just present in
    // the objects list) satisfies that lookup without changing anything
    // visible in Xcode.
    if (!project.pbxGroupByName('Resources')) {
      project.addPbxGroup([], 'Resources');
    }

    // Guard against duplicate entries: prebuild can run more than once
    // against the same native project, and addResourceFile isn't itself
    // idempotent for folder references.
    if (!project.hasFile('fonts')) {
      const target = project.getFirstTarget().uuid;
      // lastKnownFileType: 'folder' makes this a folder reference (matches
      // Xcode's own "Create folder references" option) rather than a
      // group — folder references copy their contents into the bundle
      // preserving the directory structure, which the {fontstack}/{range}
      // glyphs URL template depends on. Target belongs in `opt.target`, not
      // the third positional `group` argument — passing it as `group`
      // instead sent it down addResourceFile's PBXVariantGroup branch,
      // which crashes in this project (no PBXVariantGroup section exists).
      project.addResourceFile('fonts', { lastKnownFileType: 'folder', target }, undefined);
    }
    return config;
  });
}

module.exports = function withFontGlyphs(config) {
  config = withFontGlyphsAndroid(config);
  config = withFontGlyphsIOS(config);
  return config;
};
