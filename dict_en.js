// Builds words_en.js — the English dictionary for Wordliz.
// The Russian side has had dict_ru.js from the start; the English list was
// filtered by hand once and had no builder, so the recipe lived only in a note.
// This is that recipe, written down and re-runnable.
//
// Inputs (download separately into a dir, pass it as argv[2]):
//   enable1.txt — https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt
//                 (public-domain ENABLE word list, one per line)
//   en_50k.txt  — https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt
//                 (OpenSubtitles 2018, "word count" per line, most frequent first)
// Usage:
//   node dict_en.js <dir> [rankD]
//     rankD — frequency cutoff for the validation dict (default 40000)
//
// d (validation, flags accidental "red" words) = ENABLE ∧ top-rankD by frequency.
// The 40000 cutoff is not arbitrary: below it the list starts admitting acronyms
// and fragments players do not recognise as words — "aclu" sits at 40285.
//
// s (seeds, the hidden words) is NOT generated. It is a hand-curated list that
// deliberately includes modern and technical words (byte, email, debug), and it
// feeds the board generator: changing it changes every board code and daily deal.
// It is read back out of the existing words_en.js and passed through untouched.
const fs=require('fs');
const path=require('path');

const ROOT=__dirname;
const DIR=process.argv[2]||'.';
const RANK_D=+process.argv[3]||40000;

const isWord=w=>/^[a-z]{4,6}$/.test(w);

// ---- obscenity and slurs: the game shows a definition for every "red" word it
//      flags, so anything here would be handed to the player with a straight face.
//      Substring matching is safe in English far more often than in Russian, but
//      ass- and cock- still build assist, assume, cocker — those are whole-word.
//      The list this replaces was word-by-word, so it caught `homos` but not
//      `homo`, `rapist` but not `rape`, `slut` but not `slutty`. Stems fix that.
const ROOT_DICT=['fuck','shit','cunt','twat','whore','slut','kike','chink','faggot',
  'fags','retard','dyke','jizz','jism','rapist','anus','pube','bollock','bugger',
  'tosser','felch','smegma','dildo','boner','bitch','prick','pussy','titty','incest',
  'orgasm','sodomy','douche','porno','merde','gook','dago','piss','nigger','nigga',
  // second pass: anatomy, drugs and slurs the first list never covered. The game
  // prints a definition for every red word it flags, so these would be put on
  // screen by the game itself, not merely tolerated in a list.
  'penis','vagina','semen','sperm','nipple','porn','molest','hooker','heroin',
  'opium','queer','kraut','gypsy','nazi','pedo','brothel'];
//      Stems that hide inside perfectly ordinary words have to be matched as whole
//      forms instead: spic→spice, wank→swanky, coon→tycoon, turd→sturdy,
//      horny→thorny, shag→shaggy, anal→analog, arse→coarse, crap→scrape,
//      frig→fright, rape→grape, dong→dongle, cock→cocker, nigg→niggle.
const WORD_DICT=new Set(['ass','asses','arse','arses','anal','crap','craps','crappy',
  'dick','dicks','dong','dongs','fart','farts','farted','frig','frigs','cock','cocks',
  'homo','homos','rape','raped','rapes','raper','rapers','tits','erotic','shat',
  'nance','nances','spic','spics','wank','wanks','wanker','coon','coons','shag','shags',
  'turd','turds','horny','boob','boobs','honky','honkey',
  // pimp→pimple, meth→method, orgy→porgy
  'pimp','pimps','meth','meths','orgy','orgies','jap','japs','paki','pakis','wog','wogs']);
const crude=w=>ROOT_DICT.some(r=>w.includes(r))||WORD_DICT.has(w);

// ---- load ENABLE ----
const enable=new Set();
for(const line of fs.readFileSync(path.join(DIR,'enable1.txt'),'utf8').split('\n')){
  const w=line.trim().toLowerCase();
  if(isWord(w)) enable.add(w);
}

// ---- load frequency ranks ----
const rank=new Map();
let r=0;
for(const line of fs.readFileSync(path.join(DIR,'en_50k.txt'),'utf8').split('\n')){
  const w=(line.split(' ')[0]||'').trim().toLowerCase();
  r++;
  if(r>RANK_D) break;
  if(isWord(w)&&!rank.has(w)) rank.set(w,r);
}

// ---- seeds come from the existing file, byte for byte ----
const src=fs.readFileSync(path.join(ROOT,'words_en.js'),'utf8');
const OLD=new Function('window',src+';return window.WORDLIZ_WORDS;')({});
const seedsOf=L=>{const o=[];const b=OLD[L].s;for(let i=0;i+L<=b.length;i+=L)o.push(b.slice(i,i+L));return o;};

// ---- build ----
const d={4:new Set(),5:new Set(),6:new Set()};
for(const [w] of rank) if(enable.has(w)&&!crude(w)) d[w.length].add(w);
for(const L of [4,5,6]) for(const w of seedsOf(L)) d[L].add(w);   // seeds ⊆ d, always

const pack=set=>[...set].sort().join('');
const out={};
for(const L of [4,5,6]){
  const S=OLD[L].s;                       // untouched
  const D=pack(d[L]);
  if(D.length%L||S.length%L) throw new Error('pack misaligned at '+L);
  out[L]={d:D,s:S};
  console.log(`${L}: d=${d[L].size} s=${S.length/L}`);
}
// ENABLE is public domain, but the frequency ranking that filters it is not, and
// words_en.js is what ships — so the credit rides in the data, not just the README.
const CREDIT=
  '// English dictionary for Wordliz — built by dict_en.js.\n'+
  '// d = validation (red words), s = hand-curated seeds the hidden words come from.\n'+
  '//\n'+
  '// d = the public-domain ENABLE list, narrowed to words that also rank in the\n'+
  '// top 40000 of an OpenSubtitles frequency list (MIT):\n'+
  '//   ENABLE      https://github.com/dolph/dictionary\n'+
  '//   frequency   https://github.com/hermitdave/FrequencyWords\n';
fs.writeFileSync(path.join(ROOT,'words_en.js'),
  CREDIT+'window.WORDLIZ_WORDS='+JSON.stringify(out)+';\n');
console.log('written: words_en.js ('+Math.round(fs.statSync(path.join(ROOT,'words_en.js')).size/1024)+' KB)');
