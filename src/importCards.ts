/** Converts the card files of the game repository (one JSON per card) into editor cards. No DOM, so it can be tested. */
export type ImportedDetail={label:string;value:string;opacity:number};
export type ImportedStat={kind:string;value:string;opacity:number};
export type ImportedCard={
  id:string;type:'fighter'|'location'|'action'|'extraFighter'|'objective'|'token';name:string;scope:string;scopeColor:string;cost:string;
  rarity:string;meta:ImportedDetail[];effects:ImportedDetail[];stats:ImportedStat[];copies:number;lore:string;artPrompt:string;
};
export type ImportResult={ok:true;card:ImportedCard;warnings:string[]}|{ok:false;error:string};

const TYPES:Record<string,ImportedCard['type']>={combattente:'fighter',luogo:'location',azione:'action',extracombattente:'extraFighter',obiettivo:'objective',token:'token'};
const RARITIES:Record<string,string>={comune:'common',common:'common',rara:'rare',rare:'rare','super rara':'super','super rare':'super','ultra rara':'ultra','ultra rare':'ultra','secret rara':'secret','secret rare':'secret','ultimate rara':'ultimate','ultimate rare':'ultimate','ghost rara':'ghost','ghost rare':'ghost','gold rara':'gold','gold rare':'gold','starlight rara':'starlight','starlight rare':'starlight'};
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
  if(!rarity){rarity=rarityName==='leggendaria'?'ultra':'common';if(rarityName)warnings.push(`Rarità «${text(r.rarita,40)}» importata come ${rarity==='ultra'?'Ultra Rare':'Comune'}.`);}
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
  return{ok:true,warnings,card:{id,type,name,scope,scopeColor:disciplineColor(scope),cost:hidesCost?'':num(r.costo),rarity,meta,effects,stats,copies,lore,artPrompt:text(r.art_prompt,600)}};
}
