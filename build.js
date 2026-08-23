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

const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const clean=d=>{fs.rmSync(d,{recursive:true,force:true});fs.mkdirSync(d,{recursive:true});};

clean(DIST);

// --- dist/web: files as-is ---
const WEB=path.join(DIST,'web');
fs.mkdirSync(WEB,{recursive:true});
for(const f of ['index.html',DICT]) fs.copyFileSync(path.join(ROOT,f),path.join(WEB,f));

// --- dist/wordliz-itch.zip: same files, index.html at archive root ---
const zipPath=path.join(DIST,'wordliz-itch.zip');
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${WEB.replace(/\\/g,'/')}/*' -DestinationPath '${zipPath.replace(/\\/g,'/')}' -Force"`);

// --- dist/artifact.html: single file with the dictionary inlined ---
let html=read('index.html');
const words=read(DICT).trim();
html=html.replace(/^<!doctype html>\s*/i,'');
html=html.replace(/<html lang="en">\s*/,'');
html=html.replace(/<\/?head>\s*/g,'');
html=html.replace(/<\/?body>\s*/g,'');
html=html.replace(/<\/html>\s*$/,'');
html=html.replace(`<script src="${DICT}"></script>`,'<script>'+words+'</'+'script>');
fs.writeFileSync(path.join(DIST,'artifact.html'),html);

const size=f=>Math.round(fs.statSync(f).size/1024)+' KB';
console.log('web:      dist/web/ ('+size(path.join(WEB,'index.html'))+' + '+size(path.join(WEB,DICT))+')');
console.log('itch:     dist/wordliz-itch.zip ('+size(zipPath)+')');
console.log('artifact: dist/artifact.html ('+size(path.join(DIST,'artifact.html'))+')');
