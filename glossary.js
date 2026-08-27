// Builds gloss_en.js — one short meaning per dictionary word, from WordNet 3.1.
//   node glossary.js <path-to-wordnet-dict-dir>
// The dict dir is the extracted wn3.1.dict.tar.gz from
// https://wordnetcode.princeton.edu/wn3.1.dict.tar.gz (not kept in the repo).
// gloss_en.js IS kept in the repo, so this only needs re-running when
// words_en.js changes. Inflected forms get the gloss of their base word
// (exception lists + Morphy-style suffix rules). Function words — pronouns,
// prepositions and the like — are not in WordNet and stay undefined on purpose.
const fs=require('fs');
const path=require('path');

const ROOT=__dirname;
const WN=process.argv[2];
if(!WN||!fs.existsSync(path.join(WN,'index.sense'))){
  console.error('usage: node glossary.js <path-to-wordnet-dict-dir>');
  process.exit(1);
}
const read=f=>fs.readFileSync(path.join(WN,f),'utf8');

// --- the game's word list: union of every size's validation dictionary ---
const src=fs.readFileSync(path.join(ROOT,'words_en.js'),'utf8');
const BLOBS=new Function('window',src+';return window.WORDLIZ_WORDS;')({});
const WORDS=new Set();
for(const k of ['4','5','6']){
  const L=+k;
  for(const key of ['d','s'])
    for(let i=0;i+L<=BLOBS[k][key].length;i+=L) WORDS.add(BLOBS[k][key].slice(i,i+L));
}

// --- senses: lemma -> [{ss,off,num,cnt}] from index.sense ---
// sense_key synset_offset sense_number tag_cnt; ss_type is the digit after '%'
const senses=new Map();
for(const line of read('index.sense').split('\n')){
  if(!line) continue;
  const [key,off,num,cnt]=line.split(' ');
  const pc=key.indexOf('%');
  const lemma=key.slice(0,pc);
  if(lemma.includes('_')) continue;                 // multiword entries can't occur on the board
  const ss=+key[pc+1];
  let a=senses.get(lemma); if(!a) senses.set(lemma,a=[]);
  a.push({ss,off,num:+num,cnt:+cnt});
}

// --- glosses: "pos:offset" -> gloss text from the data files ---
const POS_FILE={1:'data.noun',2:'data.verb',3:'data.adj',4:'data.adv',5:'data.adj'};
const POS_NAME={1:'noun',2:'verb',3:'adjective',4:'adverb',5:'adjective'};
/* Also note whether the synset names a proper noun. WordNet capitalises those —
   the "gore" synsets are Gore (the vice president) and gore (blood), and picking
   by sense number alone handed the player the politician. Same trap the Russian
   glossary had with «Банда» the sea beating «банда» the gang. */
const gloss=new Map();
for(const f of ['data.noun','data.verb','data.adj','data.adv']){
  for(const line of read(f).split('\n')){
    if(!/^\d{8} /.test(line)) continue;
    const bar=line.indexOf('|'); if(bar<0) continue;
    const head=line.slice(0,bar).trim().split(/\s+/);   // offset lexno type w_cnt word …
    gloss.set(f+':'+line.slice(0,8),
      {text:line.slice(bar+1).trim(), proper:/^[A-Z]/.test(head[4]||'')});
  }
}
const isProper=s=>{const g=gloss.get(POS_FILE[s.ss]+':'+s.off);return g&&g.proper?1:0;};

// --- irregular inflections: noun.exc / verb.exc / adj.exc ---
const exc=new Map();      // inflected -> [{base,filter}]
for(const [f,filter] of [['noun.exc',[1]],['verb.exc',[2]],['adj.exc',[3,5]]]){
  for(const line of read(f).split('\n')){
    const p=line.trim().split(' ');
    if(p.length<2||p[0].includes('_')) continue;
    let a=exc.get(p[0]); if(!a) exc.set(p[0],a=[]);
    for(const base of p.slice(1)) a.push({base,filter});
  }
}

// --- Morphy-style suffix detachment, each rule tied to the POS it implies ---
const RULES=[
  [[1],'ses','s'],[[1],'xes','x'],[[1],'zes','z'],[[1],'ches','ch'],[[1],'shes','sh'],
  [[1],'ies','y'],[[1],'s',''],
  [[2],'ies','y'],[[2],'es','e'],[[2],'es',''],[[2],'ed','e'],[[2],'ed',''],
  [[2],'ing','e'],[[2],'ing',''],[[2],'s',''],
  [[3,5],'er',''],[[3,5],'est',''],[[3,5],'er','e'],[[3,5],'est','e'],
];
function candidates(w){
  const out=[{base:w,filter:null}];                 // exact match, any part of speech
  for(const e of exc.get(w)||[]) out.push(e);
  for(const [filter,suf,rep] of RULES)
    if(w.endsWith(suf)&&w.length-suf.length+rep.length>=2)
      out.push({base:w.slice(0,w.length-suf.length)+rep,filter});
  return out;
}

// pick the part of speech with the most corpus tags (nudged toward noun/verb,
// which is what a board word usually reads as), then WordNet's first sense of it
const GROUP={1:1,2:2,3:3,5:3,4:4}, BIAS={1:3,2:2,3:1,4:0};
function bestSense(lemma,filter){
  let list=senses.get(lemma);
  if(!list) return null;
  if(filter) list=list.filter(s=>filter.includes(s.ss));
  if(!list.length) return null;
  const score={}, hasCommon={};
  for(const s of list){
    const gr=GROUP[s.ss];
    if(!isProper(s)) hasCommon[gr]=true;
    score[gr]=(score[gr]||BIAS[gr])+s.cnt;
  }
  /* «handy» is a noun only as W. C. Handy, so the nudge toward nouns was picking
     a part of speech with nothing but a proper noun in it. Sink any such group
     below the rest — but leave it selectable for words that really are just names. */
  for(const gr of Object.keys(score)) if(!hasCommon[gr]) score[gr]-=100;
  const g=+Object.keys(score).sort((a,b)=>score[b]-score[a]||a-b)[0];
  /* common senses first, WordNet's own order within them; a proper noun is only
     used when the word has nothing else, as with a place that shares no spelling */
  return list.filter(s=>GROUP[s.ss]===g)
    .sort((a,b)=>isProper(a)-isProper(b)||a.num-b.num)[0];
}

function clean(g){
  let s=g.split(/;\s*"/)[0].replace(/\s+/g,' ').trim();   // drop usage examples
  if(!s) return null;
  if(s.length>150) s=s.slice(0,147).replace(/\s+\S*$/,'')+'…';
  return s;
}

const out={}, missed=[];
for(const w of [...WORDS].sort()){
  let hit=null;
  for(const c of candidates(w)){
    const s=bestSense(c.base,c.filter);
    if(s){hit=s;break;}
  }
  if(!hit){missed.push(w);continue;}
  const g=gloss.get(POS_FILE[hit.ss]+':'+hit.off);
  const cg=g&&clean(g.text);
  if(cg) out[w]=POS_NAME[hit.ss]+': '+cg; else missed.push(w);
}

// gloss_en.js is what ships, not this builder, so the notice travels with the data
const CREDIT=
  '// Definitions from WordNet 3.1, © Princeton University. Shortened to one sense\n'+
  '// per word by glossary.js. Used under the WordNet licence:\n'+
  '//   https://wordnet.princeton.edu/  ·  https://wordnet.princeton.edu/license-and-commercial-use\n';
const js=CREDIT+'window.WORDLIZ_GLOSS='+JSON.stringify(out)+';\n';
fs.writeFileSync(path.join(ROOT,'gloss_en.js'),js);
const kb=Math.round(Buffer.byteLength(js)/1024);
console.log(`gloss_en.js: ${Object.keys(out).length}/${WORDS.size} words (${kb} KB), ${missed.length} without a gloss`);
console.log('sample misses: '+missed.slice(0,40).join(' '));
