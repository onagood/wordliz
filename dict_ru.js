// Builds words_ru.js — the Russian dictionary for Wordliz.
// Mirrors the English recipe (see words_en.js): validation = big-list ∧ frequency-top,
// seeds = the frequent core, meant to be hand-curated afterwards.
//
// Inputs (download separately into a dir, pass it as argv[2]):
//   russian_cp1251.txt — https://raw.githubusercontent.com/danakt/russian-words/master/russian.txt
//                        (~1.5M inflected forms, one per line, Windows-1251)
//   ru_50k.txt         — https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ru/ru_50k.txt
//                        (OpenSubtitles 2018, "word count" per line, most frequent first)
//   russian_nouns.txt  — https://raw.githubusercontent.com/Harrix/Russian-Nouns/main/dist/russian_nouns.txt
//                        (noun lemmas, UTF-8) — seeds are frequent NOUNS only, so hidden
//                        words are «стол», not «чтобы» or «знаешь»
// Usage:
//   node dict_ru.js <dir> [rankD] [rankS]
//     rankD — frequency cutoff for the validation dict (default 40000, like English)
//     rankS — frequency cutoff for the seed pool     (default 20000)
const fs=require('fs');
const path=require('path');

const DIR=process.argv[2]||'.';
const RANK_D=+process.argv[3]||40000;
const RANK_S=+process.argv[4]||20000;

// ---- cp1251 → unicode (letters only; everything else passes through as-is) ----
function decode1251(buf){
  let out='';
  for(const b of buf){
    if(b===0xA8) out+='Ё';
    else if(b===0xB8) out+='ё';
    else if(b>=0xC0) out+=String.fromCharCode(0x410+(b-0xC0));
    else out+=String.fromCharCode(b);
  }
  return out;
}

// ---- normalize: lowercase, ё→е; keep only pure-letter words of 4–6 chars ----
const norm=w=>w.toLowerCase().replace(/ё/g,'е');
const isWord=w=>/^[абвгдежзийклмнопрстуфхцчшщъыьэюя]{4,6}$/.test(w);

// ---- profanity: aggressive for seeds (false positives are fine there),
//      narrow for validation (only unambiguous obscenity) ----
const ROOT_SEED=['хуй','хуя','хуе','хуё','пизд','бля','ёб','еба','ебе','еби','ебл','ебн','ебо','ебу','ебы','ебя',
  'пидор','пидар','пидр','мудак','мудил','мудо','залуп','дроч','манд','гандон','гондон','хер','сук','шлюх',
  'мраз','говн','жоп','срак','сран','ссак','ссан','дерьм','елд','курв','падл','сволоч','трах','бздо','перд'];
const ROOT_DICT=['хуй','хуя','хуе','хуё','пизд','блядь','бляди','бляде','блядю','ебал','ебан','ебат','ебен','ебет',
  'ебис','ебло','ебля','ебну','ебут','ебыв','пидор','пидар','залуп','гандон','гондон','мандав','дрочи','мудак','мудил'];
const hits=(w,roots)=>roots.some(r=>w.includes(r));

// ---- hand stoplist for seeds: homographs and junk the noun list lets through
//      (это кураторский список — сюда добавлять всё, что не хочется видеть скрытым словом) ----
const STOP_SEED=new Set([
  'есть','этот','один','твоя','ваша','ваше','весь','одно','сама','твое','свое','рада','своя','наше',
  'спас','росс','мсье','хрен','пола',
  'через','никто','перед','плохо','вчера','стать','парня','новое','погиб','браво','аминь','ничто',
  'знать','супер',
  'хорошо','прости','завтра','против','ребята','другой','другое','другая','первое','многое','постой',
  'далеко','всякий','закрой','второе','подряд','справа','подать','отстой'
]);

// ---- load big form list ----
const big=new Set();
for(const line of decode1251(fs.readFileSync(path.join(DIR,'russian_cp1251.txt'))).split('\n')){
  const w=norm(line.trim());
  if(isWord(w)) big.add(w);
}

// ---- load noun lemmas (the only words allowed as seeds) ----
const nouns=new Set();
for(const line of fs.readFileSync(path.join(DIR,'russian_nouns.txt'),'utf8').split('\n')){
  const w=norm(line.trim());
  if(isWord(w)) nouns.add(w);
}

// ---- load frequency ranks ----
const rank=new Map();
let r=0;
for(const line of fs.readFileSync(path.join(DIR,'ru_50k.txt'),'utf8').split('\n')){
  const w=norm(line.split(' ')[0]||'');
  r++;
  if(isWord(w)&&!rank.has(w)) rank.set(w,r);
}

// ---- build ----
const d={4:new Set(),5:new Set(),6:new Set()};
const s={4:new Set(),5:new Set(),6:new Set()};
for(const [w,rk] of rank){
  if(!big.has(w)) continue;
  const L=w.length;
  if(rk<=RANK_D&&!hits(w,ROOT_DICT)) d[L].add(w);
  if(rk<=RANK_S&&nouns.has(w)&&!STOP_SEED.has(w)&&!hits(w,ROOT_SEED)) s[L].add(w);
}
for(const L of [4,5,6]) for(const w of s[L]) d[L].add(w);   // seeds ⊆ d, always

const pack=set=>[...set].sort().join('');
const out={};
for(const L of [4,5,6]){
  const D=pack(d[L]), S=pack(s[L]);
  if(D.length%L||S.length%L) throw new Error('pack misaligned at '+L);
  out[L]={d:D,s:S};
  console.log(`${L}: d=${d[L].size} s=${s[L].size}`);
  console.log(`   seed sample: ${[...s[L]].slice(0,12).join(', ')}`);
}
fs.writeFileSync(path.join(__dirname,'words_ru.js'),
  '// Russian dictionary for Wordliz — built by dict_ru.js (see header for sources).\n'+
  '// d = validation (red words), s = seeds the hidden words are drawn from.\n'+
  'window.WORDLIZ_WORDS='+JSON.stringify(out)+';\n');
console.log('written: words_ru.js ('+Math.round(fs.statSync(path.join(__dirname,'words_ru.js')).size/1024)+' KB)');
