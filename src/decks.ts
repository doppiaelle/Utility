/** Decks ("Mini Deck" files of the game) and their roles. No DOM, so it can be tested. */
export type DeckCard={id:string;copies:number};
export type Deck={id:string;name:string;description:string;scope:string;role:string;status:string;cards:DeckCard[];extra:string[];goals:string[]};
export type Role={id:string;name:string;color:string;description:string};
export const DECK_KEY='kritoma.decks',ROLES_KEY='kritoma.roles',DECK_LIMIT=200,CARDS_PER_DECK=200;
export const DECK_STATUSES=['bozza','in prova','pronto'];

const ID=/^[\w.\-]{1,80}$/,COLOR=/^#[0-9a-f]{6}$/i;
const str=(v:unknown,max=200)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):'';
const ids=(v:unknown)=>Array.isArray(v)?[...new Set(v.filter((x):x is string=>typeof x==='string'&&ID.test(x)))].slice(0,CARDS_PER_DECK):[];
const copies=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?Math.max(1,Math.min(99,Math.round(v))):1;
const slug=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'mazzo';

/** Validates decks coming from storage, a backup or an import. */
export function normalizeDecks(raw:unknown):Deck[]{
  if(!Array.isArray(raw))return[];
  const seen=new Set<string>(),out:Deck[]=[];
  for(const v of raw){
    if(!v||typeof v!=='object')continue;const d=v as Record<string,unknown>,id=str(d.id,80),name=str(d.name,80);
    if(!ID.test(id)||!name||seen.has(id))continue;seen.add(id);
    const cardSeen=new Set<string>(),cards:DeckCard[]=[];
    for(const c of Array.isArray(d.cards)?d.cards:[]){if(!c||typeof c!=='object')continue;const cc=c as Record<string,unknown>,cid=str(cc.id,80);if(ID.test(cid)&&!cardSeen.has(cid)&&cards.length<CARDS_PER_DECK){cardSeen.add(cid);cards.push({id:cid,copies:copies(cc.copies)});}}
    out.push({id,name,description:str(d.description,600),scope:str(d.scope,60),role:str(d.role,40),status:str(d.status,30)||'bozza',cards,extra:ids(d.extra),goals:ids(d.goals)});
    if(out.length>=DECK_LIMIT)break;
  }
  return out;
}
export function normalizeRoles(raw:unknown):Record<string,Role>{
  const out:Record<string,Role>={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
  for(const [key,v] of Object.entries(raw as Record<string,unknown>).slice(0,60)){
    if(!ID.test(key)||!v||typeof v!=='object')continue;const r=v as Record<string,unknown>,name=str(r.name,60);
    if(name)out[key]={id:key,name,color:typeof r.color==='string'&&COLOR.test(r.color)?r.color:'#5d7e99',description:str(r.description,400)};
  }
  return out;
}

export type FileKind='card'|'deck'|'roles'|'other';
export function classifyFile(raw:unknown):FileKind{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return'other';const r=raw as Record<string,unknown>;
  if(typeof r.categoria==='string')return'card';
  if(Array.isArray(r.carte)&&typeof r.nome==='string')return'deck';
  if(Array.isArray(r.ruoli))return'roles';
  return'other';
}
export function mapTcgDeck(raw:unknown):{ok:true;deck:Deck}|{ok:false;error:string}{
  if(classifyFile(raw)!=='deck')return{ok:false,error:'Il file non contiene un mazzo.'};
  const r=raw as Record<string,unknown>,name=str(r.nome,80);if(!name)return{ok:false,error:'Manca il nome del mazzo.'};
  const idText=str(r.id,80),id=ID.test(idText)?idText:slug(name);
  const [deck]=normalizeDecks([{id,name,description:r.descrizione,scope:r.disciplina,role:r.ruolo,status:r.stato,cards:(r.carte as unknown[]).map(c=>c&&typeof c==='object'?{id:(c as Record<string,unknown>).id,copies:(c as Record<string,unknown>).copie}:null),extra:r.extra,goals:r.obiettivi}]);
  return deck?{ok:true,deck}:{ok:false,error:'Il mazzo non è valido.'};
}
export function mapTcgRoles(raw:unknown):Record<string,Role>{
  if(classifyFile(raw)!=='roles')return{};
  return normalizeRoles(Object.fromEntries((raw as {ruoli:unknown[]}).ruoli.filter(x=>x&&typeof x==='object').map(x=>{const r=x as Record<string,unknown>;return[String(r.id??''),{name:r.nome,color:r.colore,description:r.descrizione}];})));
}

export function deckSummary(deck:Deck,known:Set<string>){
  const all=[...deck.cards.map(c=>c.id),...deck.extra,...deck.goals];
  return{distinct:deck.cards.length,copies:deck.cards.reduce((n,c)=>n+c.copies,0),extra:deck.extra.length,goals:deck.goals.length,missing:all.filter(id=>!known.has(id))};
}
export function uniqueDeckId(base:string,taken:Iterable<string>){const used=new Set(taken);let id=base,n=2;while(used.has(id))id=`${base}-${n++}`;return id;}
export const setCopies=(deck:Deck,id:string,n:number):Deck=>({...deck,cards:deck.cards.map(c=>c.id===id?{...c,copies:copies(n)}:c)});
export const removeCard=(deck:Deck,id:string):Deck=>({...deck,cards:deck.cards.filter(c=>c.id!==id),extra:deck.extra.filter(x=>x!==id),goals:deck.goals.filter(x=>x!==id)});
export function addCard(deck:Deck,id:string,group:'cards'|'extra'|'goals'='cards',n=1):Deck{
  if(!ID.test(id)||[...deck.cards.map(c=>c.id),...deck.extra,...deck.goals].includes(id)||deck.cards.length+deck.extra.length+deck.goals.length>=CARDS_PER_DECK)return deck;
  return group==='cards'?{...deck,cards:[...deck.cards,{id,copies:copies(n)}]}:{...deck,[group]:[...deck[group],id]};
}
export function duplicateDeck(deck:Deck,decks:Deck[]):Deck{return{...deck,id:uniqueDeckId(`${deck.id}-copia`,decks.map(d=>d.id)),name:`${deck.name} (copia)`.slice(0,80),status:'bozza'};}
export function newDeck(decks:Deck[],cards:DeckCard[]=[]):Deck{return{id:uniqueDeckId('nuovo-mazzo',decks.map(d=>d.id)),name:'Nuovo mazzo',description:'',scope:'',role:'',status:'bozza',cards,extra:[],goals:[]};}
