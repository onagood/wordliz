# Wordliz

A sliding word puzzle: every letter of the hidden words is already on the board —
slide whole rows and columns until the words line up.

**Play: https://onagood.github.io/wordliz/**

Single source — `index.html` + `words_en.js`. No dependencies, no bundler;
the whole engine lives in one file.

## Build

```
node build.js
```

| Output | Destination |
|---|---|
| `dist/web/` | GitHub Pages / any static host |
| `dist/wordliz-itch.zip` | itch.io (index.html at archive root) |
| `dist/artifact.html` | self-contained single file, dictionary inlined |

## Shipping updates

- **GitHub Pages** — `git push` (Pages serves the repo root on `main`);
- **itch.io** — `butler push dist/wordliz-itch.zip <user>/wordliz:html`, or upload manually.
  Page settings: *This file will be played in the browser*, viewport 460×800 or fullscreen, *Mobile friendly* checked;
- **CrazyGames / Poki** — zip upload in the developer portal (requires their SDK — will land in `build.js` as a separate target);
- **Devvit (Reddit)** — separate port: webview client + Redis saves, `devvit upload`.

## Dictionaries

`words_en.js` holds two lists per board size (4/5/6), each packed into one string:
`s` (seeds) — curated common words the hidden targets are drawn from;
`d` (dict) — validation for “red” words, based on the public-domain ENABLE list
with a profanity/slur blocklist applied.

More languages follow the same shape: `words_ru.js` etc.

**Warning:** the `s` list is part of the board generator. Any change to it
changes every board code and daily deal.

## License

© 2026 onagood. All rights reserved. The source is public for reading;
no license to copy, modify, or redistribute is granted.
