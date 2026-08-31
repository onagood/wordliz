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
| `dist/crazygames/` | CrazyGames (its portal takes the folder) |
| `dist/wordliz-poki.zip` | Poki (index.html at archive root, PokiSDK in `<head>`) |

## Shipping updates

- **GitHub Pages** — `git push` (Pages serves the repo root on `main`);
- **itch.io** — `butler push dist/wordliz-itch.zip <user>/wordliz:html`, or upload manually.
  Page settings: *This file will be played in the browser*, viewport 460×800 or fullscreen, *Mobile friendly* checked;
- **CrazyGames** — upload the `dist/crazygames/` folder in the developer portal; updates to a
  game in Basic Launch go live instantly. No SDK yet: Basic Launch does not ask for one, Full
  Launch will;
- **Poki** — upload `dist/wordliz-poki.zip` in Poki for Developers, then request a playtest.
  Only the build carries PokiSDK; the lifecycle calls live in `index.html` behind `Portal`,
  which no-ops wherever no portal SDK is present;
- **Devvit (Reddit)** — separate port: webview client + Redis saves, `devvit upload`.

## Licensing

The game bundles third-party fonts and dictionary data. Everything it ships,
with its terms and copyright lines, is listed in [THIRD-PARTY.md](THIRD-PARTY.md).
Note that `gloss_ru.js` is CC BY-SA 4.0, inherited from the Russian Wiktionary.

## Dictionaries

`words_en.js` holds two lists per board size (4/5/6), each packed into one string:
`s` (seeds) — curated common words the hidden targets are drawn from;
`d` (dict) — validation for “red” words. Rebuilt with `node dict_en.js <dir>`:
the public-domain [ENABLE list](https://github.com/dolph/dictionary) narrowed to
words that also rank in the top 40 000 of an
[OpenSubtitles frequency list](https://github.com/hermitdave/FrequencyWords) (MIT),
with an obscenity and slur blocklist applied. Below that rank the list starts
admitting acronyms and fragments nobody recognises as words. The builder reads
`s` back out of the existing file and passes it through untouched, so rebuilding
`d` never disturbs board codes.

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
