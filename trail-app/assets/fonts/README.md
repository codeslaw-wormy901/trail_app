# Bundled font glyphs

`Noto Sans Regular/` (256 `.pbf` range files, SIL Open Font License) is downloaded from Protomaps' open [`basemaps-assets`](https://github.com/protomaps/basemaps-assets) repo — the same source used for `src/assets/sprites/`.

Only "Regular" is bundled — not Italic or Medium — because the only labelled layer this app currently renders (`protomaps-themes-base`'s `"pois"` symbol layer, used for POI names) only ever references `Noto Sans Regular` as its `text-font`. General map text (place names, road names) would need the other variants too; that's out of scope for now — see `docs/DATA_ARCHITECTURE.md`.

## Why this can't be a plain `require()` like the other bundled assets

Every other bundled binary (pmtiles archives, the POI sprite) gets resolved through `expo-asset`'s `Asset.fromModule(require(...)).downloadAsync()` — Metro bundles the single named file, and at runtime it resolves to a real local `file://` path. That trick only works because MapLibre needs one specific file per lookup.

Glyphs don't work that way: MapLibre's native renderer builds a `{fontstack}/{range}.pbf` path *itself*, on demand, for whatever Unicode ranges the text on screen actually needs — there's no way to know ahead of time which of the 256 files a `require()` should resolve to. The only way to make a whole directory addressable by that kind of template is to put it somewhere MapLibre's native asset resolver can already reach: the app's own native asset bundle (`asset://` scheme, resolved via Android's `assets/` folder or iOS's bundled resources).

That's a real native-project change, and since `ios/` and `android/` are both gitignored (regenerated fresh by `expo prebuild`, not checked into version control), it has to happen through an Expo **config plugin** — see `plugins/with-font-glyphs.js` — rather than a one-time manual edit that would just get wiped out the next time someone runs `expo prebuild`.

## Reproducing this download

```bash
curl -s "https://api.github.com/repos/protomaps/basemaps-assets/contents/fonts/Noto%20Sans%20Regular" \
  | python3 -c "
import json, sys
for d in json.load(sys.stdin):
    print(d['name'], d['download_url'])
" > /tmp/font_file_list.txt

cd assets/fonts/"Noto Sans Regular"
while read -r name url; do curl -s -o "$name" "$url"; done < /tmp/font_file_list.txt
```
