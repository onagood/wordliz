// Builds Wordliz for every platform from a single source.
//   node build.js
// Output:
//   dist/web/                   — GitHub Pages / any static host (index.html + words_en.js)
//   dist/wordliz-itch.zip       — itch.io upload (index.html at archive root)
//   dist/crazygames/            — CrazyGames upload (its portal takes the folder)
//   dist/artifact.html          — self-contained file (dictionary inlined)
// The folder targets hold identical files and differ in one stamped constant: HOME_URL,
// the storefront the game offers when it is sharing from inside somebody's iframe.
// Poki and Devvit need the SDK adapter before they can be targets here.
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

// Each target's storefront. The game cannot tell which portal is framing it, and handing
// players on one portal a link to a rival is a review failure, not just a wrong URL — so
// the build decides rather than the client. '' means the target is served from an address
// worth sharing: use location instead.
const ITCH='https://onagood.itch.io/wordliz';
const HOME={
  web:'',
  itch:ITCH,
  // TODO: confirm once the game is live — CrazyGames assigns the slug on submission.
  crazygames:'https://www.crazygames.com/game/wordliz',
  // an artifact is a framed copy whose own URL is not a game address
  artifact:ITCH,
};

// --- folder targets: files as-is (the PWA files ride along; portals ignore them
//     harmlessly). Every words_*.js / gloss_*.js is picked up automatically — adding
//     a language needs no build changes. ---
const LANG_FILES=fs.readdirSync(ROOT).filter(f=>/^(words|gloss)_[a-z]+\.js$/.test(f));
const ASSETS=['manifest.webmanifest','sw.js','icon.svg','icon-192.png','icon-512.png',...LANG_FILES];
const FONT_DIR=path.join(ROOT,'fonts');
const FONTS=fs.readdirSync(FONT_DIR);

// index.html is the one file that is not copied verbatim: the build date is stamped
// into it, so the version shown on the stats screen can never be stale, and HOME_URL
// with it. The source keeps 'dev' and an empty home — running from the repo should say so.
const STAMP=new Date().toISOString().slice(0,10);
const stamp=(h,home)=>h
  .replace(/const VERSION='[^']*'/,`const VERSION='${STAMP}'`)
  .replace(/const HOME_URL='[^']*'/,`const HOME_URL='${home}'`);

function target(name,home){
  const dir=path.join(DIST,name);
  fs.mkdirSync(path.join(dir,'fonts'),{recursive:true});
  for(const f of ASSETS) fs.copyFileSync(path.join(ROOT,f),path.join(dir,f));
  // fonts ride along verbatim: the client loads them by relative path
  for(const f of FONTS) fs.copyFileSync(path.join(FONT_DIR,f),path.join(dir,'fonts',f));
  fs.writeFileSync(path.join(dir,'index.html'),stamp(read('index.html'),home));
  return dir;
}
// both portals want a flat archive with index.html at the root
const zip=(dir,name)=>{
  const out=path.join(DIST,name);
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${dir.replace(/\\/g,'/')}/*' -DestinationPath '${out.replace(/\\/g,'/')}' -Force"`);
  return out;
};

const WEB=target('web',HOME.web);
const ITCH_ZIP=zip(target('itch',HOME.itch),'wordliz-itch.zip');
// CrazyGames' portal takes the folder itself, so this one stops at the directory
const CG=target('crazygames',HOME.crazygames);

// --- dist/artifact.html: single file with the dictionary and glossary inlined ---
let html=stamp(read('index.html'),HOME.artifact);
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
console.log('web:        dist/web/ ('+size(path.join(WEB,'index.html'))+' + '+size(path.join(WEB,DICT))+' + '+size(path.join(WEB,GLOSS))+')');
console.log('itch:       dist/wordliz-itch.zip ('+size(ITCH_ZIP)+')');
console.log('crazygames: dist/crazygames/ ('+size(path.join(CG,'index.html'))+' + assets)');
console.log('artifact:   dist/artifact.html ('+size(path.join(DIST,'artifact.html'))+')');
