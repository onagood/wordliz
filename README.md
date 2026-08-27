# Wordliz

A sliding word puzzle: every letter of the hidden words is already on the board —
slide whole rows and columns until the words line up.

**Play: https://onagood.github.io/wordliz/**

Single source — `index.html` + `words_en.js` + `gloss_en.js`. No dependencies,
no bundler; the whole engine lives in one file.

## Build

```
node build.js
```

| Output | Destination |
|---|---|
| `dist/web/` | GitHub Pages / any static host |
| `dist/wordliz-itch.zip` | itch.io (index.html at archive root) |
| `dist/artifact.html` | self-contained single file, dictionary and glossary inlined |

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

Russian (`words_ru.js`, rebuilt with `node dict_ru.js <dir>`) is drawn from three
MIT-licensed lists: word forms from [danakt/russian-words](https://github.com/danakt/russian-words),
frequency ranks from [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords)
(OpenSubtitles 2018), and noun lemmas from [Harrix/Russian-Nouns](https://github.com/Harrix/Russian-Nouns)
so the hidden words are things, not conjunctions.

`gloss_ru.js` — rebuilt with `node glossary_ru.js <dir>`. Definitions come from
the [Russian Wiktionary](https://ru.wiktionary.org/) via [kaikki.org](https://kaikki.org/ruwiktionary/),
© Wiktionary contributors, reused under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The builder
trims each entry to one sense, so the file is an adapted version and carries the
same licence — the notice is in the file's own header, since that is what ships.
ShareAlike covers that file, not the game around it.

`gloss_en.js` — one short meaning per dictionary word, shown for banked and
“red” words. Rebuilt with `node glossary.js <wordnet-dict-dir>` whenever
`words_en.js` changes (see the header of `glossary.js`). Derived from
[WordNet 3.1](https://wordnet.princeton.edu/) © Princeton University, used
under the [WordNet license](https://wordnet.princeton.edu/license-and-commercial-use).
Function words (pronouns, prepositions) intentionally have no entry.

**Warning:** the `s` list is part of the board generator. Any change to it
changes every board code and daily deal.
