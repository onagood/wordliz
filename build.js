// Builds Wordliz for every platform from a single source.
//   node build.js
// Output:
//   dist/web/                   — GitHub Pages / any static host (index.html + words_en.js)
//   dist/wordliz-itch.zip       — itch.io upload (index.html at archive root)
//   dist/crazygames/            — CrazyGames upload (its portal takes the folder)
//   dist/wordliz-poki.zip       — Poki upload (its portal takes an archive)
// The folder targets hold identical files and differ by two stamped things: HOME_URL,
// the storefront the game offers when it is sharing from inside somebody's iframe, and
// the portal SDK, which only that portal's own build may carry.
// Devvit still needs its own adapter before it can be a target here.
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
// One row per target, and `portal` is the whole classification: somebody else's storefront,
// or ours. It lives in a single table on purpose — two tables can fall out of step, and a
// target present in one but missing from the other is exactly the slip that ships a rival's
// address into a portal that rejects such links.
const TARGETS={
  web:  {home:'',   portal:null},
  itch: {home:ITCH, portal:null},
  // confirmed 2026-08-31 against the rel=canonical their own game-files page carries
  crazygames:{home:'https://www.crazygames.com/game/wordliz', portal:'crazygames'},
  // Poki hands out the slug at release; until then there is no Poki address to share, and
  // the test link must not travel (T&C 3.3), so this build shares wherever it is served.
  poki: {home:'',   portal:'poki'},
};
// The SDK each portal's own build carries, and nobody else's. Each snippet parks the
// SDK's init promise on window.__portalReady, so Portal can order its calls after init.
const SDK={
  // v3 wants loadingStart as soon as loading is under way; init is the earliest the SDK
  // can hear it, and Portal's loadingFinished answers with loadingStop when the game is up.
  // init itself reaches for document.body, so from <head> it must wait for the DOM first.
  crazygames:'<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n'+
       '<script>window.__portalReady=(window.CrazyGames&&window.CrazyGames.SDK)?new Promise(function(r){'+
       'var go=function(){r(CrazyGames.SDK.init().then(function(){CrazyGames.SDK.game.loadingStart();}));};'+
       'document.body?go():document.addEventListener("DOMContentLoaded",go);'+
       '}):null;window.__portalReady&&window.__portalReady.catch(function(){});</script>',
  poki:'<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>\n'+
       '<script>window.__portalReady=window.PokiSDK?PokiSDK.init():null;'+
       'window.__portalReady&&window.__portalReady.catch(function(){});</script>',
};
// Where each portal's SDK must come from. Written out again, apart from the snippet above,
// because a check that reads the same line it is checking is not a check — this is the copy
// that would still disagree if the snippet above were pasted from the wrong portal's docs.
const SDK_HOST={ crazygames:'sdk.crazygames.com', poki:'game-cdn.poki.com' };

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
// A portal build never reads ITCH_URL — shareUrl() short-circuits on HOME_URL, and Poki's
// build has neither. Blank it there anyway: a rival portal's address sitting in a file a
// reviewer can read is a question nobody needs asked, and portals reject such links.
const stamp=(h,name)=>{
  const t=TARGETS[name];
  h=h.replace(/const VERSION='[^']*'/,`const VERSION='${STAMP}'`)
     .replace(/const HOME_URL='[^']*'/,`const HOME_URL='${t.home}'`);
  if(t.portal) h=h.replace(/const ITCH_URL='[^']*'/,`const ITCH_URL=''`);
  // the SDK goes in <head>, ahead of the game, so its init is in flight before Portal
  // asks anything of it
  if(t.portal&&SDK[t.portal]) h=h.replace('</head>',SDK[t.portal]+'\n</head>');
  return h;
};

function target(name){
  // an unclassified target cannot be built: that is what keeps the table exhaustive
  if(!TARGETS[name]) throw new Error(`build: target '${name}' has no row in TARGETS`);
  const dir=path.join(DIST,name);
  fs.mkdirSync(path.join(dir,'fonts'),{recursive:true});
  for(const f of ASSETS) fs.copyFileSync(path.join(ROOT,f),path.join(dir,f));
  // fonts ride along verbatim: the client loads them by relative path
  for(const f of FONTS) fs.copyFileSync(path.join(FONT_DIR,f),path.join(dir,'fonts',f));
  fs.writeFileSync(path.join(dir,'index.html'),stamp(read('index.html'),name));
  return dir;
}
// itch and Poki both want a flat archive with index.html at the root
const zip=(dir,name)=>{
  const out=path.join(DIST,name);
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${dir.replace(/\\/g,'/')}/*' -DestinationPath '${out.replace(/\\/g,'/')}' -Force"`);
  return out;
};

const WEB=target('web');
const ITCH_ZIP=zip(target('itch'),'wordliz-itch.zip');
// CrazyGames' portal takes the folder itself, so this one stops at the directory
const CG=target('crazygames');
// Poki's takes an archive
const POKI_ZIP=zip(target('poki'),'wordliz-poki.zip');

/* --- guard: check what landed on disk against what the stamping promised.
   These rules used to live in whoever was paying attention: one target added without its
   PORTALS entry and a rival's address ships to a portal that rejects links to rivals, or
   two portals' SDKs end up in one file. A failed build is a cheaper way to find that out
   than a rejected submission.
   Only index.html is scanned — it is the file the stamping rewrites and the one a reviewer
   reads. The dictionaries carry attribution URLs their licences require, and those are
   nobody's storefront. */
const host=u=>{try{return new URL(u).host;}catch(e){return null;}};
// The hosts that are ours. This is the guard's own idea of who we are, and it is what lets
// it disagree with the table: a target whose home is somebody else's address is a portal
// whatever the row claims, and a target sitting on our own address is not.
const OUR_HOSTS=new Set(['onagood.itch.io','onagood.github.io']);

function verify(name,dir){
  const t=TARGETS[name];
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  const fail=why=>{throw new Error(`build: dist/${name}/index.html ${why}`);};
  // classification and destination have to agree before anything else is worth checking
  const homeHost=host(t.home);
  if(homeHost&&!OUR_HOSTS.has(homeHost)&&!t.portal)
    fail(`points at ${homeHost}, which is not ours, but is not marked as a portal`);
  if(homeHost&&OUR_HOSTS.has(homeHost)&&t.portal)
    fail(`is marked as the portal '${t.portal}' but points at our own ${homeHost}`);
  const urls=[...new Set(html.match(/https?:\/\/[^"'\s)<]+/g)||[])];
  // hosts this build is allowed to name: its own destination, its own portal's SDK, and —
  // only when the build is not standing in somebody else's shop — our own storefront
  const ok=new Set([host(t.home),t.portal?SDK_HOST[t.portal]:null].filter(Boolean));
  if(!t.portal) ok.add(host(ITCH));
  const bad=urls.filter(u=>!ok.has(host(u)));
  if(bad.length) fail('names a host that is not its own: '+bad.join(', '));

  if(!t.portal) return;
  if(!/const ITCH_URL=''/.test(html)) fail('is a portal build but kept ITCH_URL');
  const wanted=SDK_HOST[t.portal];
  const scripts=(html.match(/<script src="(https?:\/\/[^"]+)"/g)||[])
    .map(s=>host(s.slice(14)));
  if(wanted && scripts.filter(h=>h===wanted).length!==1)
    fail(`should load its SDK from ${wanted} exactly once, found ${scripts.length} remote script(s)`);
  if(!wanted && scripts.length) fail('expects no SDK yet but loads '+scripts.join(', '));
}
for(const name of Object.keys(TARGETS)) verify(name,path.join(DIST,name));

const size=f=>Math.round(fs.statSync(f).size/1024)+' KB';
console.log('web:        dist/web/ ('+size(path.join(WEB,'index.html'))+' + '+size(path.join(WEB,DICT))+' + '+size(path.join(WEB,GLOSS))+')');
console.log('itch:       dist/wordliz-itch.zip ('+size(ITCH_ZIP)+')');
console.log('crazygames: dist/crazygames/ ('+size(path.join(CG,'index.html'))+' + assets)');
console.log('poki:       dist/wordliz-poki.zip ('+size(POKI_ZIP)+')');
