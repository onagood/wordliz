# Third-party content

Everything Wordliz ships that someone else made, and the terms it comes under.
Each data file also carries its own notice in its header, since those are what
actually reach a player's browser.

---

## Fonts — `fonts/`

**Rubik** — © 2015 The Rubik Project Authors, <https://github.com/googlefonts/rubik>
**IBM Plex Mono** — © 2017 IBM Corp., with Reserved Font Name "Plex"

Both under the SIL Open Font License 1.1. Full licence texts ship alongside the
fonts as `Rubik-OFL.txt` and `IBMPlexMono-OFL.txt`, and are embedded in
`dist/artifact.html`, which inlines the font files themselves.

---

## English dictionary — `words_en.js`

**ENABLE word list** — public domain, <https://github.com/dolph/dictionary>

**OpenSubtitles frequency list** — © 2016 Hermit Dave,
<https://github.com/hermitdave/FrequencyWords>, MIT (text below)

Used as a filter: ENABLE narrowed to words that also rank in the top 40 000 by
frequency. Rebuild with `node dict_en.js <dir>`.

## English definitions — `gloss_en.js`

**WordNet 3.1** — © Princeton University, <https://wordnet.princeton.edu/>

Used under the [WordNet licence](https://wordnet.princeton.edu/license-and-commercial-use),
which permits commercial use provided the copyright notice and licence terms
accompany the work. Rebuild with `node glossary.js <wordnet-dict-dir>`.

---

## Russian dictionary — `words_ru.js`

**Russian word forms** — © 2020 Danakt Frost,
<https://github.com/danakt/russian-words>, MIT

**OpenSubtitles frequency list** — © 2016 Hermit Dave,
<https://github.com/hermitdave/FrequencyWords>, MIT

**Russian noun lemmas** — © 2018–present Sergienko Anton,
<https://github.com/Harrix/Russian-Nouns>, MIT

Rebuild with `node dict_ru.js <dir>`.

## Russian definitions — `gloss_ru.js`

**Russian Wiktionary** — © Wiktionary contributors, <https://ru.wiktionary.org/>,
extracted by [kaikki.org](https://kaikki.org/ruwiktionary/) (Wiktextract).

Text is dual-licensed CC BY-SA 4.0 and GFDL. `glossary_ru.js` trims each entry
to a single sense, which makes `gloss_ru.js` an adapted version, so **that file
is licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)**.
ShareAlike attaches to that file; the rest of the game merely bundles it.

---

## MIT licence text

Applies to the three MIT-licensed sources named above, each under its own
copyright line.

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
