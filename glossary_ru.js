// Builds gloss_ru.js — one short meaning per Russian dictionary word, from the
// Russian Wiktionary as parsed by kaikki.org (CC BY-SA, like the wiki itself).
//   node glossary_ru.js <dir with ruwiki.jsonl.gz>
// Source file (~190 MB, not kept in the repo):
//   https://kaikki.org/ruwiktionary/Русский/kaikki.org-dictionary-Русский.jsonl.gz
// gloss_ru.js IS kept in the repo, so this only needs re-running when
// words_ru.js changes. The wiki has no pages for most inflected forms, so a
// Morphy-style suffix pass maps «акта»→«акт», «азии»→«азия» to the base word's
// meaning — same idea as the English glossary.js.
const fs=require('fs');
const path=require('path');
const zlib=require('zlib');
const readline=require('readline');

const ROOT=__dirname;
const DIR=process.argv[2]||'.';

// --- the game's word list: union of every size's validation dictionary + seeds ---
const src=fs.readFileSync(path.join(ROOT,'words_ru.js'),'utf8');
const BLOBS=new Function('window',src+';return window.WORDLIZ_WORDS;')({});
const WORDS=new Set();
for(const k of ['4','5','6']){
  const L=+k;
  for(const key of ['d','s'])
    for(let i=0;i+L<=BLOBS[k][key].length;i+=L) WORDS.add(BLOBS[k][key].slice(i,i+L));
}

const norm=w=>w.toLowerCase().replace(/ё/g,'е');
const isLemmaWord=w=>/^[а-я]{2,18}$/.test(w);
const POS_RANK={noun:0,verb:1,adj:2,adv:3};                  // prefer what a board word reads as
const POS_NAME={noun:'сущ.',verb:'глаг.',adj:'прил.',adv:'нареч.',
  intj:'межд.',pron:'мест.',num:'числ.',prep:'предл.',conj:'союз',particle:'част.'};
const isFormOf=g=>/^форма\s/i.test(g);

/* Proper nouns are tagged `noun` like everything else and the wiki lists «Волк»
   (a surname) beside «волк» (the animal); lowercasing merges them, so on a plain
   part-of-speech tie the entry that happened to come first in the dump won — which
   is how «волк» ended up glossed as a given name and «кожа» as a river. Demote a
   sense that reads like a proper noun so a common one outranks it, but keep it as
   a last resort for words that only ever are one, like «берлин».
   Note \b is ASCII-only in JS and never fires after a Cyrillic letter, so the end
   of a Russian word is spelled out as "not another Cyrillic letter". */
const stripLabels=g=>g.replace(/^(?:[а-яё]+\.\s*,?\s*)+/i,'');
const PROPER_NAME=/^(?:[а-яё]+\s+){0,3}(?:имя|фамилия|отчество|прозвище)(?![а-яё])/i;
const PROPER_PLACE=/^(?:город|посёлок|поселок|село|деревня|станица|хутор|столица|страна|государство|республика|река|речка|озеро|остров|полуостров|гора|хребет|вулкан|залив|пролив|штат|провинция|округ|район|уезд|волость|губерния|графство|коммуна|муниципалитет|префектура|департамент|кантон|созвездие|астероид|кратер|марка|бренд|компания|фирма|корпорация)(?![а-яё])/i;
const isProper=g=>{const s=stripLabels(g);return PROPER_NAME.test(s)||PROPER_PLACE.test(s);};
const PROPER_PENALTY=5;

function clean(g){
  let s=g.replace(/\s+/g,' ').trim();
  if(!s) return null;
  if(s.length>150) s=s.slice(0,147).replace(/\s+\S*$/,'')+'…';
  return s;
}

// phase 1: stream the whole wiki, keep the best gloss for EVERY lemma
const lemma=new Map();     // word -> {rank, text}
const rl=readline.createInterface({
  input:fs.createReadStream(path.join(DIR,'ruwiki.jsonl.gz')).pipe(zlib.createGunzip())
});
rl.on('line',line=>{
  const m=/"word":\s*"([^"]+)"/.exec(line);
  if(!m) return;
  const w=norm(m[1]);
  if(!isLemmaWord(w)) return;
  let e; try{e=JSON.parse(line);}catch(err){return;}
  /* The wiki already separates «банда» the gang from «Банда» the sea, and «земля»
     the soil from «Земля» the planet — by capitalising the headword. Lowercasing
     merges the two, so carry the distinction over as a rank penalty instead: a
     capitalised headword is a proper noun in Russian. This catches far more than
     reading the definition text does, which stays as a second signal for entries
     that are lowercase but still define a name. */
  const capitalised=/^[А-ЯЁ]/.test(m[1]);
  const base=(POS_RANK[e.pos]!==undefined?POS_RANK[e.pos]:9)+(capitalised?PROPER_PENALTY:0);
  const cur=lemma.get(w);
  if(cur&&cur.rank<base) return;          // even this entry's best can't win
  const label=POS_NAME[e.pos];
  /* pick the best sense inside this entry too — an entry often lists the place
     or the name first and the everyday meaning second */
  for(const s of e.senses||[]){
    for(const g of s.glosses||[]){
      if(isFormOf(g)) continue;
      const cg=clean(g);
      if(!cg) continue;
      const rank=base+(isProper(cg)?PROPER_PENALTY:0);
      const now=lemma.get(w);
      if(now&&now.rank<=rank) continue;
      lemma.set(w,{rank,text:(label?label+' ':'')+cg});
      if(rank===base&&!capitalised) return;  // a clean lowercase common sense: done
    }
  }
});

// phase 2: resolve each game word — direct hit, else strip an ending and try lemma shapes
const ENDINGS=['иями','ыми','ими','ями','ами','иях','иям','ого','его','ому','ему',
  'ях','ям','ах','ам','ов','ев','ей','ой','ою','ею','ем','ём','ом','ью','ья','ье',
  'ых','их','ую','юю','ое','ее','ая','яя','им','ым',
  'ии','ьи','ы','и','е','у','ю','а','я','о','ь','й',
  ''                                    // zero ending: gen.pl «акул», «аптек»
].sort((a,b)=>b.length-a.length);
const SHAPES=['','а','я','о','е','ь','й','ы','и','ия','ие','ка','ок','ец',
  'ть','ти','ться','ый','ий','ой','ая','яя'];
function resolve(w){
  const hit=lemma.get(w);
  if(hit) return hit.text;
  /* fleeting vowel in gen.pl: бабок→бабка, бедер→бедро, баек→байка */
  let fm;
  const fleet=[];
  if((fm=/^(.+)о([кцн])$/.exec(w))) fleet.push(fm[1]+fm[2]+'а',fm[1]+fm[2]+'о');
  if((fm=/^(.+)е([кцнр])$/.exec(w))) fleet.push(fm[1]+fm[2]+'а',fm[1]+fm[2]+'о',fm[1]+'й'+fm[2]+'а',fm[1]+'ь'+fm[2]+'а');
  for(const c of fleet){const h=lemma.get(c); if(h) return h.text;}
  for(const end of ENDINGS){
    if(!w.endsWith(end)||w.length-end.length<2) continue;
    const stem=w.slice(0,w.length-end.length);
    for(const sh of SHAPES){
      if(end===''&&sh==='') continue;   // that's just the word itself, already tried
      const c=lemma.get(stem+sh);
      if(c) return c.text;
    }
  }
  return null;
}

rl.on('close',()=>{
  const out={}; const missed=[];
  for(const w of [...WORDS].sort()){
    const t=resolve(w);
    if(t) out[w]=t; else missed.push(w);
  }
  // CC BY-SA is an attribution licence, so the credit has to ride in the shipped
  // file itself — this builder is not distributed with the game, gloss_ru.js is.
  // The definitions are trimmed and one sense per word is picked, which makes
  // this an adapted version: it stays under the same licence as the wiki.
  const CREDIT=
    '// Definitions from the Russian Wiktionary (ru.wiktionary.org), extracted by\n'+
    '// kaikki.org (Wiktextract). Shortened to one sense per word by glossary_ru.js.\n'+
    '// Text © Wiktionary contributors, reused under CC BY-SA 4.0:\n'+
    '//   https://ru.wiktionary.org/  ·  https://kaikki.org/ruwiktionary/\n'+
    '//   https://creativecommons.org/licenses/by-sa/4.0/\n'+
    '// This file is a derivative of that text and is licensed CC BY-SA 4.0 too.\n';
  const js=CREDIT+'window.WORDLIZ_GLOSS='+JSON.stringify(out)+';\n';
  fs.writeFileSync(path.join(ROOT,'gloss_ru.js'),js);
  const kb=Math.round(Buffer.byteLength(js)/1024);
  console.log(`gloss_ru.js: ${Object.keys(out).length}/${WORDS.size} words (${kb} KB), ${missed.length} without a gloss; lemmas known: ${lemma.size}`);
  console.log('sample misses: '+missed.slice(0,30).join(' '));
});
