import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import { useEffect, useState } from 'react';

const lightSpriteJson = require('@/assets/sprites/light.json');
// Metro treats an `@2x` suffix as a pixel-density variant of the base name
// rather than an independently require()-able file, so the bundled source
// files are named without it — only the copies written to the destination
// directory below use the literal `@2x` name MapLibre's sprite loader expects.
const light2xSpriteJson = require('@/assets/sprites/light-2x.json');

let spriteUrlPromise: Promise<string> | null = null;

/**
 * MapLibre's native sprite loader fetches `<url>.png`, `<url>.json`, and the
 * @2x variants by appending those suffixes itself — unlike the single-file
 * pmtiles asset trick elsewhere in this app, it needs real files sharing one
 * directory and base name, not just one resolved require(). So the bundled
 * PNGs (real binary assets, resolved via expo-asset) get copied and the
 * bundled JSON (parsed by Metro like any other .json import) gets
 * re-serialized, into a cache directory with the exact names MapLibre expects.
 *
 * Sprite source: Protomaps' open basemaps-assets repo (SIL OFL + MIT
 * licensed) — see src/assets/sprites/ — icons only, no bundled font glyphs,
 * so POI labels/text don't render, only icons (peaks, water, restrooms, etc).
 */
async function prepareSpriteUrl(): Promise<string> {
  const dir = new Directory(Paths.cache, 'poi-sprite');
  dir.create({ idempotent: true });

  const png1x = Asset.fromModule(require('@/assets/sprites/light.png'));
  const png2x = Asset.fromModule(require('@/assets/sprites/light-2x.png'));
  await Promise.all([png1x.downloadAsync(), png2x.downloadAsync()]);

  await new File(png1x.localUri!).copy(new File(dir, 'light.png'), { overwrite: true });
  await new File(png2x.localUri!).copy(new File(dir, 'light@2x.png'), { overwrite: true });

  new File(dir, 'light.json').write(JSON.stringify(lightSpriteJson));
  new File(dir, 'light@2x.json').write(JSON.stringify(light2xSpriteJson));

  const prefix = dir.uri.endsWith('/') ? dir.uri : `${dir.uri}/`;
  return `${prefix}light`;
}

export function usePoiSpriteUrl() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!spriteUrlPromise) {
      spriteUrlPromise = prepareSpriteUrl();
    }
    spriteUrlPromise.then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return url;
}
