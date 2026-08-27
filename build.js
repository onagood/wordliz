// Builds Wordliz for every platform from a single source.
//   node build.js
// Output:
//   dist/web/             — GitHub Pages / any static host (index.html + words_en.js)
//   dist/wordliz-itch.zip — itch.io upload (index.html at archive root)
//   dist/artifact.html    — self-contained file (dictionary inlined)
// SDK platforms (CrazyGames, Poki, Devvit) will get their own targets here
// once the Platform adapter lands.
const fs=require('fs');
const path=require('path');
const {execSync}=require('child_process');

const ROOT=__dirname;
const DIST=path.join(ROOT,'dist');
const DICT='words_en.js';
const GLOSS='gloss_en.js';

const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const clean=d=>{fs.rmSync(d,{recursive:true,force:true});fs.mkdirSync(d,{recursive:true});};

clean(DIST);

// --- dist/web: files as-is (PWA files ride along; itch ignores them harmlessly).
//     Every words_*.js / gloss_*.js is picked up automatically — adding a language
//     needs no build changes. ---
const LANG_FILES=fs.readdirSync(ROOT).filter(f=>/^(words|gloss)_[a-z]+\.js$/.test(f));
const WEB=path.join(DIST,'web');
fs.mkdirSync(WEB,{recursive:true});
for(const f of ['index.html','manifest.webmanifest','sw.js','icon-192.png','icon-512.png',...LANG_FILES])
  fs.copyFileSync(path.join(ROOT,f),path.join(WEB,f));
// fonts ride along verbatim: the client loads them by relative path
const FONT_DIR=path.join(ROOT,'fonts');
const FONTS=fs.readdirSync(FONT_DIR);
fs.mkdirSync(path.join(WEB,'fonts'),{recursive:true});
for(const f of FONTS) fs.copyFileSync(path.join(FONT_DIR,f),path.join(WEB,'fonts',f));

// --- dist/wordliz-itch.zip: same files, index.html at archive root ---
const zipPath=path.join(DIST,'wordliz-itch.zip');
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${WEB.replace(/\\/g,'/')}/*' -DestinationPath '${zipPath.replace(/\\/g,'/')}' -Force"`);

// --- dist/artifact.html: single file with the dictionary and glossary inlined ---
let html=read('index.html');
html=html.replace(/^<!doctype html>\s*/i,'');
html=html.replace(/<html lang="en">\s*/,'');
html=html.replace(/<\/?head>\s*/g,'');
html=html.replace(/<\/?body>\s*/g,'');
html=html.replace(/<\/html>\s*$/,'');
for(const f of [DICT,GLOSS])
  html=html.replace(`<script src="${f}"></script>`,'<script>'+read(f).trim()+'</'+'script>');
// one file means one file: the woff2s become data: URIs too
for(const f of FONTS.filter(x=>x.endsWith('.woff2'))){
  const b64=fs.readFileSync(path.join(FONT_DIR,f)).toString('base64');
  html=html.split(`url(fonts/${f})`).join(`url(data:font/woff2;base64,${b64})`);
}
// The OFL requires every copy carrying the font to carry the licence with it.
// This target has no fonts/ folder to hold one, so it rides in an HTML comment.
// Hyphen pairs in the licence text would close that comment early, hence the split.
const LICENCES=FONTS.filter(f=>/OFL\.txt$/i.test(f))
  .map(f=>`\n===== ${f} =====\n`+read(path.join('fonts',f)).replace(/--/g,'- -'))
  .join('\n');
html=html.replace('<style>',
  '<!--\nEmbedded fonts are licensed under the SIL Open Font License 1.1.\n'+
  LICENCES+'\n-->\n<style>');
fs.writeFileSync(path.join(DIST,'artifact.html'),html);

const size=f=>Math.round(fs.statSync(f).size/1024)+' KB';
console.log('web:      dist/web/ ('+size(path.join(WEB,'index.html'))+' + '+size(path.join(WEB,DICT))+' + '+size(path.join(WEB,GLOSS))+')');
console.log('itch:     dist/wordliz-itch.zip ('+size(zipPath)+')');
console.log('artifact: dist/artifact.html ('+size(path.join(DIST,'artifact.html'))+')');
