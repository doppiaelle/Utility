/** Converts the card files of the game repository (one JSON per card) into editor cards. No DOM, so it can be tested. */
export type ImportedDetail={label:string;value:string;opacity:number};
export type ImportedStat={kind:string;value:string;opacity:number};
export type ImportedCard={
  id:string;type:'fighter'|'location'|'action'|'extraFighter'|'objective'|'token';name:string;scope:string;scopeColor:string;cost:string;
  rarity:string;meta:ImportedDetail[];effects:ImportedDetail[];stats:ImportedStat[];copies:number;lore:string;artPrompt:string;rules:Rules;
};
/** The structured rules of the game files, kept as plain data so nothing is lost. */
export type Rules=Record<string,unknown>;
const RULE_KEYS=['innesco','attivata','continuo','effetto_azione'];
const RULE_LABELS:Record<string,string>={innesco:'Innesco',attivata:'Abilità attivata',continuo:'Effetto continuo',effetto_azione:'Effetto dell’azione'};
function plain(v:unknown,depth:number):unknown{
  if(v===null||typeof v==='boolean')return v;
  if(typeof v==='number')return Number.isFinite(v)?v:null;
  if(typeof v==='string')return v.slice(0,200);
  if(depth<=0)return null;
  if(Array.isArray(v))return v.slice(0,20).map(x=>plain(x,depth-1));
  if(typeof v==='object'){const out:Record<string,unknown>={};for(const [k,x] of Object.entries(v as Record<string,unknown>).slice(0,20))if(/^[\w]{1,40}$/.test(k))out[k]=plain(x,depth-1);return out;}
  return null;
}
/** Only the four known rule groups survive, limited in depth and size. */
export function cleanRules(raw:unknown):Rules{
  const out:Rules={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
  for(const key of RULE_KEYS){const v=(raw as Record<string,unknown>)[key];if(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length)out[key]=plain(v,4);}
  return out;
}
const words=(k:string)=>k.replace(/_/g,' ');
function describe(v:unknown):string{
  if(v===null||v===undefined)return'—';if(typeof v==='boolean')return v?'sì':'no';if(typeof v!=='object')return String(v);
  if(Array.isArray(v))return v.map(describe).join(', ');
  return Object.entries(v as Record<string,unknown>).map(([k,x])=>`${words(k)}: ${typeof x==='object'&&x&&!Array.isArray(x)?`(${describe(x)})`:describe(x)}`).join(' · ');
}
/** Readable lines for the editor; the wording of the file is kept, only underscores and booleans are made readable. */
export function rulesText(rules:Rules|undefined):{label:string;text:string}[]{
  return RULE_KEYS.filter(k=>rules&&rules[k]).map(k=>({label:RULE_LABELS[k],text:describe(rules![k])}));
}

export type ImportResult={ok:true;card:ImportedCard;warnings:string[]}|{ok:false;error:string};

const TYPES:Record<string,ImportedCard['type']>={combattente:'fighter',luogo:'location',azione:'action',extracombattente:'extraFighter',obiettivo:'objective',token:'token'};
const RARITIES:Record<string,string>={leggendaria:'legendary',leggendario:'legendary',legendary:'legendary',comune:'common',common:'common',rara:'rare',rare:'rare','super rara':'super','super rare':'super','ultra rara':'ultra','ultra rare':'ultra','secret rara':'secret','secret rare':'secret','ultimate rara':'ultimate','ultimate rare':'ultimate','ghost rara':'ghost','ghost rare':'ghost','gold rara':'gold','gold rare':'gold','starlight rara':'starlight','starlight rare':'starlight'};
const DISCIPLINE_COLORS:Record<string,string>={informatica:'#1d5c6b',economia:'#2f7d4f',ingegneria:'#b5652d',medicina:'#b23a48',media:'#7a4fb5',sportivi:'#2b6fb5'};
const FALLBACK_COLORS=['#1d5c6b','#2f7d4f','#b5652d','#b23a48','#7a4fb5','#2b6fb5','#8a6a2f','#4a6a7a'];

const text=(v:unknown,max=400)=>typeof v==='string'?v.replace(/\s*\n\s*/g,' ').trim().slice(0,max):'';
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?String(Math.round(v)):'';
const detail=(value:string,label=''):ImportedDetail=>({label,value,opacity:1});
const list=(v:unknown)=>Array.isArray(v)?v.map(x=>text(x,60)).filter(Boolean):[];

/** The same discipline always gets the same colour, even one this module has never heard of. */
export function disciplineColor(name:string):string{
  const key=name.trim().toLowerCase();if(DISCIPLINE_COLORS[key])return DISCIPLINE_COLORS[key];
  let h=0;for(const ch of key)h=(h*31+ch.charCodeAt(0))>>>0;return FALLBACK_COLORS[h%FALLBACK_COLORS.length];
}

export function mapTcgCard(raw:unknown,o:{includeLore?:boolean}={}):ImportResult{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return{ok:false,error:'Il file non contiene una carta.'};
  const r=raw as Record<string,unknown>,warnings:string[]=[];
  const category=text(r.categoria,40),type=TYPES[category.toLowerCase()];
  if(!type)return{ok:false,error:category?`Categoria sconosciuta: «${category}».`:'Manca la categoria.'};
  const name=text(r.nome,80);if(!name)return{ok:false,error:'Manca il nome della carta.'};
  const id=(text(r.id,80)||name).replace(/[^\w.\-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'carta';
  const scope=text(r.disciplina,60)||'Generale';
  const rarityName=text(r.rarita,40).toLowerCase();let rarity=RARITIES[rarityName];
  if(!rarity){rarity='common';if(rarityName)warnings.push(`Rarità «${text(r.rarita,40)}» sconosciuta: importata come Comune.`);}
  const speed=text(r.velocita,40),personality=list(r.personalita).join(' · ');
  const stats:ImportedStat[]=[],meta:ImportedDetail[]=[],effects:ImportedDetail[]=[];
  const stat=(kind:string,v:unknown)=>{const value=num(v);if(value!=='')stats.push({kind,value,opacity:1});};
  if(type==='fighter'||type==='extraFighter'){stat('ATK',r.atk);stat('RES',r.res);stat('PRF',r.prf);}
  else if(type==='location')stat('RES',r.res);
  else if(type==='objective')stat('PV',r.pv);
  if(type==='fighter')meta.push(detail(personality||'Combattente'),detail(speed||'Combattente'));
  else if(type==='extraFighter'){const need=list(r.requisito_personalita).join(' / '),n=num(r.materiali);if(need)meta.push(detail(`Richiede ${n&&n!=='1'?n+'× ':''}${need}`));if(personality)meta.push(detail(personality));}
  else if(type==='location'){if(speed)meta.push(detail(speed));}
  else if(type==='action'){const kind=text(r.tipo,40),grave=num(r.costo_cimitero);if(kind)meta.push(detail(kind));if(speed)meta.push(detail(speed));if(grave&&grave!=='0')meta.push(detail(`Cimitero ${grave}`));}
  const words=list(r.parole_chiave);if(words.length)effects.push(detail(words.join(', '),'PAROLE CHIAVE'));
  const condition=text(r.condizione,400),effect=text(r.effetto,400);
  if(condition)effects.push(detail(condition,'CONDIZIONE'));
  if(effect)effects.push(detail(effect,'EFFETTO'));
  const lore=text(r.lore,600);if(o.includeLore&&lore)effects.push(detail(lore));
  const copies=typeof r.copie==='number'&&Number.isFinite(r.copie)?Math.max(1,Math.min(99,Math.round(r.copie))):1;
  const hidesCost=type==='objective'||type==='token';
  return{ok:true,warnings,card:{id,type,name,scope,scopeColor:disciplineColor(scope),cost:hidesCost?'':num(r.costo),rarity,meta,effects,stats,copies,lore,artPrompt:text(r.art_prompt,600),rules:cleanRules(r)}};
}
