/** Per-element changes are additive: old designs keep their original appearance. */
export type ElementEdit = {x?:number;y?:number;sx?:number;sy?:number;rotation?:number;cx?:number;cy?:number;opacity?:number;hidden?:boolean;locked?:boolean;fill?:string;stroke?:string;strokeWidth?:number;radius?:number;textColor?:string;fontSize?:number;fontFamily?:string;fontWeight?:number;letterSpacing?:number;order?:number};
export type LiveEdits = Record<string,ElementEdit>;
const limits:Record<string,[number,number]>={x:[-3200,3200],y:[-3200,3200],sx:[.1,5],sy:[.1,5],rotation:[-180,180],cx:[-3200,3200],cy:[-3200,3200],opacity:[0,1],strokeWidth:[0,20],radius:[0,100],fontSize:[8,80],fontWeight:[300,900],letterSpacing:[-2,12],order:[-1000,1000]};
export function normalizeEdits(raw:unknown):LiveEdits{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return{};
  const result:LiveEdits={};
  for(const [id,value] of Object.entries(raw).slice(0,500)){
    if(!/^[a-zA-Z][\w-]{0,79}$/.test(id)||!value||typeof value!=='object')continue;
    const clean:Record<string,unknown>={};
    for(const [key,v] of Object.entries(value)){
      if(key in limits&&typeof v==='number'&&Number.isFinite(v)){const [min,max]=limits[key];clean[key]=Math.max(min,Math.min(max,v));}
      else if(['hidden','locked'].includes(key)&&typeof v==='boolean')clean[key]=v;
      else if(['fill','stroke','textColor'].includes(key)&&typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v))clean[key]=v;
      else if(key==='fontFamily'&&typeof v==='string'&&['Arial','Inter','Trebuchet MS','Verdana','Georgia','Impact','Courier New'].includes(v))clean[key]=v;
    }
    result[id]=clean as ElementEdit;
  }
  return result;
}
export const editable=(id:string,label:string,content:string)=>`<g data-live-id="${id}" data-live-label="${label}">${content}</g>`;
/** Apply edits to the same SVG used by the preview and all export formats. */
export function applyEdits(markup:string,raw:LiveEdits|undefined):string{
  const edits=normalizeEdits(raw);if(!Object.keys(edits).length)return markup;
  const doc=new DOMParser().parseFromString(markup,'image/svg+xml');
  doc.querySelectorAll('[data-live-id]').forEach(node=>{
    const e=edits[node.getAttribute('data-live-id')!];if(!e)return;
    const cx=e.cx??0,cy=e.cy??0;
    node.setAttribute('transform',`translate(${e.x??0} ${e.y??0}) rotate(${e.rotation??0} ${cx} ${cy}) translate(${cx} ${cy}) scale(${e.sx??1} ${e.sy??1}) translate(${-cx} ${-cy})`);
    if(e.opacity!==undefined)node.setAttribute('opacity',String(e.opacity));
    if(e.hidden)node.setAttribute('display','none');
    // Descendant editable blocks keep their independent styles.
    node.querySelectorAll('*').forEach(child=>{
      if(child.closest('[data-live-id]')!==node)return;
      const text=child.tagName==='text'||child.tagName==='tspan';
      if(text){for(const [key,attr] of Object.entries({textColor:'fill',fontSize:'font-size',fontFamily:'font-family',fontWeight:'font-weight',letterSpacing:'letter-spacing'})){const v=e[key as keyof ElementEdit];if(v!==undefined)child.setAttribute(attr,String(v));}}
      else {if(e.fill&&child.hasAttribute('fill')&&child.getAttribute('fill')!=='none')child.setAttribute('fill',e.fill);if(e.stroke&&child.hasAttribute('stroke'))child.setAttribute('stroke',e.stroke);if(e.strokeWidth!==undefined&&child.hasAttribute('stroke'))child.setAttribute('stroke-width',String(e.strokeWidth));if(e.radius!==undefined&&child.tagName==='rect'&&child.hasAttribute('rx'))child.setAttribute('rx',String(e.radius));}
    });
  });
  const parents=new Set(Array.from(doc.querySelectorAll('[data-live-id]')).map(n=>n.parentNode!));
  parents.forEach(parent=>{const nodes=Array.from(parent.childNodes).filter(n=>n.nodeType===1&&(n as Element).hasAttribute('data-live-id'));
    // Replace only editable positions, preserving fixed overlays and definitions.
    const sorted=[...nodes].sort((a,b)=>(edits[(a as Element).getAttribute('data-live-id')!]?.order??0)-(edits[(b as Element).getAttribute('data-live-id')!]?.order??0));
    const placeholders=nodes.map(n=>{const p=doc.createComment('layer');parent.replaceChild(p,n);return p});placeholders.forEach((p,i)=>parent.replaceChild(sorted[i],p));});
  return new XMLSerializer().serializeToString(doc.documentElement);
}

export const EXTRA_KINDS={text:'Testo',shape:'Rettangolo',ellipse:'Cerchio',line:'Linea',triangle:'Triangolo',diamond:'Rombo',hexagon:'Esagono',star:'Stella',ribbon:'Nastro',shield:'Stemma',divider:'Separatore',image:'Immagine',icon:'Icona'} as const;
export type ExtraKind=keyof typeof EXTRA_KINDS;
/** Line icons drawn in a 28-unit box centred on the origin. */
export const ICONS:Record<string,{label:string;body:string}>={
  sword:{label:'Spada',body:'<path d="M-9 10 6-5M2-9l8-1-1 8M-11 7l4 4M-7 3l4 4"/>'},
  shield:{label:'Scudo',body:'<path d="M0-12 10-8v8c0 8-4.5 13-10 16-5.5-3-10-8-10-16v-8Z"/><path d="m-4 1 3 3 6-7"/>'},
  target:{label:'Mirino',body:'<circle r="9"/><circle r="3"/><path d="M0-14v4M0 10v4M-14 0h4M10 0h4"/>'},
  heart:{label:'Cuore',body:'<path d="M0 11S-11 4-11-4c0-5 6-8 11-2 5-6 11-3 11 2 0 8-11 15-11 15Z"/>'},
  star:{label:'Scintilla',body:'<path d="M0-11 3-3 11 0 3 3 0 11-3 3-11 0-3-3Z"/>'},
  bolt:{label:'Fulmine',body:'<path d="M3-13-8 2h7l-2 11 10-15H3Z"/>'},
  crown:{label:'Corona',body:'<path d="M-11 9h22l2-15-7 6-6-10-6 10-7-6Z"/>'},
  drop:{label:'Goccia',body:'<path d="M0-12c5 7 8 10 8 14a8 8 0 0 1-16 0c0-4 3-7 8-14Z"/>'},
  arrow:{label:'Freccia',body:'<path d="M-11 0h21M3-7l7 7-7 7"/>'},
  gem:{label:'Gemma',body:'<path d="M0-12 12 0 0 12-12 0ZM-12 0h24M0-12-5 0 0 12 5 0Z"/>'},
  flame:{label:'Fiamma',body:'<path d="M0-13C4-7 9-3 9 3a9 9 0 0 1-18 0c0-3 2-5 3-7 1 2 2 3 4 3-1-4-1-7 2-12Z"/>'},
  leaf:{label:'Foglia',body:'<path d="M-10 10C-10-2 0-12 11-11 12 0 4 11-10 10ZM-10 10 4-4"/>'},
  moon:{label:'Luna',body:'<path d="M6-12A11 11 0 1 0 11 6 9 9 0 0 1 6-12Z"/>'},
  sun:{label:'Sole',body:'<circle r="5"/><path d="M0-13v4M0 9v4M-13 0h4M9 0h4M-9-9l3 3M6 6l3 3M-9 9l3-3M6-6l3-3"/>'},
  eye:{label:'Occhio',body:'<path d="M-13 0C-7-8 7-8 13 0 7 8-7 8-13 0Z"/><circle r="3.5"/>'},
  coin:{label:'Moneta',body:'<circle r="11"/><circle r="6"/><path d="M0-3v6"/>'},
  book:{label:'Libro',body:'<path d="M-12-9h9c2 0 3 1 3 3v15c0-2-1-3-3-3h-9ZM12-9H3C1-9 0-8 0-6v15c0-2 1-3 3-3h9Z"/>'},
  key:{label:'Chiave',body:'<circle cx="-6" cy="0" r="5"/><path d="M-1 0h13M8 0v5M12 0v4"/>'},
  mountain:{label:'Montagna',body:'<path d="M-13 10-4-6 1 2 5-3 13 10Z"/>'},
  cloud:{label:'Nuvola',body:'<path d="M-9 8a5 5 0 0 1 0-10 7 7 0 0 1 13-2 6 6 0 0 1 2 12Z"/>'},
  wave:{label:'Onda',body:'<path d="M-13-3q3.2-4 6.5 0t6.5 0 6.5 0 6.5 0M-13 5q3.2-4 6.5 0t6.5 0 6.5 0 6.5 0"/>'},
  cross:{label:'Croce',body:'<path d="M-3-12h6v9h9v6h-9v9h-6v-9h-9v-6h9Z"/>'},
  chip:{label:'Chip',body:'<rect x="-7" y="-7" width="14" height="14" rx="2"/><path d="M-3-12v5M3-12v5M-3 7v5M3 7v5M-12-3h5M-12 3h5M7-3h5M7 3h5"/>'},
  chart:{label:'Grafico',body:'<path d="M-11 11V1M-4 11V-4M3 11V-9M10 11V-1M-13 13h26"/>'}
};
/** A value the card or terrain already owns, offered to text elements so a layout can be drawn once. */
export type DataField={key:string;label:string;value:string};
export const fieldData=(fields:DataField[]):Record<string,string>=>Object.fromEntries(fields.map(f=>[f.key,f.value]));
export type ExtraElement={id:string;kind:ExtraKind;text:string;x:number;y:number;w:number;h:number;src?:string;icon?:string;bind?:string;nw?:number;nh?:number};
const isBind=(v:unknown):v is string=>typeof v==='string'&&/^[a-z][\w.]{0,40}$/i.test(v);
/** Embedded images only: exports stay self-contained and nothing is fetched. */
export const isImageSrc=(v:unknown):v is string=>typeof v==='string'&&v.length<=3_000_000&&/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(v);
export function normalizeExtras(raw:unknown):ExtraElement[]{
  if(!Array.isArray(raw))return[];
  return raw.slice(0,100).filter(v=>v&&/^custom-[\w-]+$/.test(v.id)&&Object.hasOwn(EXTRA_KINDS,v.kind)&&(v.kind!=='image'||isImageSrc(v.src))).map(v=>({id:v.id,kind:v.kind,text:String(v.text??'').slice(0,2000),x:Number.isFinite(v.x)?v.x:100,y:Number.isFinite(v.y)?v.y:100,w:Number.isFinite(v.w)?Math.max(10,Math.min(3200,v.w)):180,h:Number.isFinite(v.h)?Math.max(10,Math.min(3200,v.h)):80,...(v.kind==='image'?{src:v.src}:{}),...(v.kind==='icon'?{icon:Object.hasOwn(ICONS,v.icon)?v.icon:'star'}:{}),...(v.kind==='text'&&isBind(v.bind)?{bind:v.bind}:{}),...(v.kind==='image'&&Number.isFinite(v.nw)&&Number.isFinite(v.nh)&&v.nw>0&&v.nh>0?{nw:Math.min(20000,Math.round(v.nw)),nh:Math.min(20000,Math.round(v.nh))}:{})}));
}
const escapeText=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const n2=(n:number)=>Math.round(n*100)/100;
const SHAPE='fill="#1d5c6b" stroke="#eee6da" stroke-width="2"';
function extraBody(v:ExtraElement,data?:Record<string,string>):string{
  const {x,y,w,h}=v,poly=(points:[number,number][])=>`<path d="M${points.map(([px,py])=>`${n2(x+px*w)} ${n2(y+py*h)}`).join('L')}Z" ${SHAPE} stroke-linejoin="round"/>`;
  // Invisible hit area: thin strokes stay easy to pick with a finger.
  const hit=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" pointer-events="all"/>`;
  switch(v.kind){
    case'text':{const text=v.bind&&data&&Object.hasOwn(data,v.bind)?data[v.bind]:v.text;return`<text x="${x}" y="${y}" fill="#f4efe5" font-family="Arial" font-size="24">${text.split('\n').map((line,i)=>`<tspan x="${x}" dy="${i?1.3:0}em">${escapeText(line)}</tspan>`).join('')}</text>`;}
    case'ellipse':return`<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" ${SHAPE}/>`;
    case'line':return`${hit}<line x1="${x}" y1="${y+h/2}" x2="${x+w}" y2="${y+h/2}" stroke="#eee6da" stroke-width="4" stroke-linecap="round"/>`;
    case'triangle':return poly([[.5,0],[1,1],[0,1]]);
    case'diamond':return poly([[.5,0],[1,.5],[.5,1],[0,.5]]);
    case'hexagon':return poly([[.25,0],[.75,0],[1,.5],[.75,1],[.25,1],[0,.5]]);
    case'star':return poly(Array.from({length:10},(_,i)=>{const a=(i*36-90)*Math.PI/180,r=i%2?.2:.5;return[.5+r*Math.cos(a),.5+r*Math.sin(a)] as [number,number]}));
    case'ribbon':return poly([[0,.12],[1,.12],[.92,.5],[1,.88],[0,.88],[.08,.5]]);
    case'shield':return`<path d="M${x} ${y} H${n2(x+w)} V${n2(y+h*.55)} Q${n2(x+w)} ${n2(y+h*.85)} ${n2(x+w/2)} ${n2(y+h)} Q${x} ${n2(y+h*.85)} ${x} ${n2(y+h*.55)} Z" ${SHAPE} stroke-linejoin="round"/>`;
    case'divider':{const cx=x+w/2,cy=y+h/2,g=Math.min(16,w/4);return`${hit}<g stroke="#eee6da" stroke-width="3" stroke-linecap="round" fill="none"><line x1="${x}" y1="${cy}" x2="${n2(cx-g)}" y2="${cy}"/><line x1="${n2(cx+g)}" y1="${cy}" x2="${x+w}" y2="${cy}"/><path d="M${cx} ${n2(cy-g*.6)} L${n2(cx+g*.6)} ${cy} L${cx} ${n2(cy+g*.6)} L${n2(cx-g*.6)} ${cy} Z" fill="#1d5c6b"/></g>`;}
    case'image':return`<image href="${v.src}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
    case'icon':return`${hit}<g transform="translate(${x+w/2} ${y+h/2}) scale(${n2(Math.min(w,h)/28)})" fill="none" stroke="#f8f5ef" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round">${ICONS[v.icon??'star'].body}</g>`;
    default:return`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" ${SHAPE}/>`;
  }
}
export function renderExtras(raw:ExtraElement[]|undefined,data?:Record<string,string>){return normalizeExtras(raw).map((v,i)=>editable(v.id,`${v.kind==='text'?'Testo aggiunto':v.kind==='shape'?'Forma aggiunta':EXTRA_KINDS[v.kind]} ${i+1}`,extraBody(v,data))).join('');}

/** Array-backed card fields keep their edits when a preceding field is removed. */
export function removeIndexedEdits(raw:LiveEdits|undefined,prefix:'meta'|'effect'|'stat',index:number):LiveEdits{
  const result:LiveEdits={};
  for(const [id,edit] of Object.entries(normalizeEdits(raw))){const match=id.match(new RegExp(`^(${prefix}-(?:icon-)?)(\\d+)$`));if(!match){result[id]=edit;continue;}const n=Number(match[2]);if(n!==index)result[`${match[1]}${n>index?n-1:n}`]=edit;}
  return result;
}

/** A reusable layout: per-block edits plus free elements, never card or terrain content. */
export type LayoutTemplate={id:string;name:string;kind:'card'|'terrain'|'back';liveEdits:LiveEdits;extras:ExtraElement[]};
export const TEMPLATE_LIMIT=50;
export function normalizeTemplates(raw:unknown,kind?:'card'|'terrain'|'back'):LayoutTemplate[]{
  if(!Array.isArray(raw))return[];
  const seen=new Set<string>(),result:LayoutTemplate[]=[];
  for(const v of raw){
    if(!v||typeof v!=='object'||!/^tpl-[\w-]+$/.test(v.id)||seen.has(v.id)||(v.kind!=='card'&&v.kind!=='terrain'&&v.kind!=='back')||(kind&&v.kind!==kind))continue;
    const name=String(v.name??'').trim().slice(0,60);if(!name)continue;
    seen.add(v.id);result.push({id:v.id,name,kind:v.kind,liveEdits:normalizeEdits(v.liveEdits),extras:normalizeExtras(v.extras)});
    if(result.length>=TEMPLATE_LIMIT)break;
  }
  return result;
}
/** Blank canvas: every built-in block hidden (still listed, so it can be restored) and no free elements. */
export function blankEdits(ids:string[],raw:LiveEdits|undefined):LiveEdits{
  const edits=normalizeEdits(raw),result:LiveEdits={};
  for(const id of ids)if(!id.startsWith('custom-'))result[id]={...edits[id],hidden:true};
  return result;
}

/** Defence at the rendering boundary: saved drafts and imported backups end up inside SVG markup. */
export function safeSvg(markup:string):string{
  if(!/\son[a-z]+\s*=|<script|<foreignObject|javascript:/i.test(markup))return markup;
  const doc=new DOMParser().parseFromString(markup,'image/svg+xml');
  if(doc.querySelector('parsererror')||doc.documentElement.tagName!=='svg')return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>';
  doc.querySelectorAll('script,foreignObject').forEach(n=>n.remove());
  doc.querySelectorAll('*').forEach(n=>{for(const a of Array.from(n.attributes))if(/^on/i.test(a.name)||/^\s*javascript:/i.test(a.value))n.removeAttribute(a.name);});
  return new XMLSerializer().serializeToString(doc.documentElement);
}

/** One JSON file holding everything the editors keep in the browser. */
import {normalizeDecks,normalizeRoles} from './decks.ts';
export const BACKUP_KEYS=['kritoma.cards','kritoma.cardDraft','kritoma.terrain','kritoma.templates','kritoma.decks','kritoma.roles','kritoma.back'] as const;
export const BACKUP_MAX_CHARS=40_000_000;
export function buildBackup(read:(key:string)=>string|null,now=new Date()):string{
  const data:Record<string,unknown>={};
  for(const key of BACKUP_KEYS){const raw=read(key);if(raw===null)continue;try{data[key]=JSON.parse(raw);}catch{/* an unreadable entry is left out rather than breaking the whole backup */}}
  return JSON.stringify({format:'kritoma-backup',version:1,exportedAt:now.toISOString(),data});
}
export type BackupResult={ok:true;entries:Record<string,string>;summary:{cards:number;terrain:boolean;draft:boolean;templates:number;decks:number;back:boolean}}|{ok:false;error:string};
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function parseBackup(text:string):BackupResult{
  if(typeof text!=='string'||text.length>BACKUP_MAX_CHARS)return{ok:false,error:'File troppo grande o non valido.'};
  let file:unknown;try{file=JSON.parse(text);}catch{return{ok:false,error:'Il file non è un JSON leggibile.'};}
  if(!plain(file)||file.format!=='kritoma-backup'||file.version!==1||!plain(file.data))return{ok:false,error:'Non è un backup di questo editor (formato o versione sconosciuti).'};
  const entries:Record<string,string>={},summary={cards:0,terrain:false,draft:false,templates:0,decks:0,back:false},data=file.data;
  if('kritoma.cards' in data){const v=data['kritoma.cards'];if(!Array.isArray(v)||v.length>500||!v.every(plain))return{ok:false,error:'Le carte salvate nel backup non sono valide.'};entries['kritoma.cards']=JSON.stringify(v);summary.cards=v.length;}
  if('kritoma.cardDraft' in data&&data['kritoma.cardDraft']!==null){const v=data['kritoma.cardDraft'];if(!plain(v))return{ok:false,error:'La bozza della carta nel backup non è valida.'};entries['kritoma.cardDraft']=JSON.stringify(v);summary.draft=true;}
  if('kritoma.terrain' in data&&data['kritoma.terrain']!==null){const v=data['kritoma.terrain'];if(!plain(v))return{ok:false,error:'Il terreno nel backup non è valido.'};entries['kritoma.terrain']=JSON.stringify(v);summary.terrain=true;}
  if('kritoma.templates' in data){const v=normalizeTemplates(data['kritoma.templates']);entries['kritoma.templates']=JSON.stringify(v);summary.templates=v.length;}
  if('kritoma.decks' in data){const v=normalizeDecks(data['kritoma.decks']);entries['kritoma.decks']=JSON.stringify(v);summary.decks=v.length;}
  if('kritoma.back' in data&&data['kritoma.back']!==null){const v=data['kritoma.back'];if(!plain(v)||JSON.stringify(v).length>300000)return{ok:false,error:'Il retro nel backup non è valido.'};entries['kritoma.back']=JSON.stringify(v);summary.back=true;}
  if('kritoma.roles' in data)entries['kritoma.roles']=JSON.stringify(normalizeRoles(data['kritoma.roles']));
  return Object.keys(entries).length?{ok:true,entries,summary}:{ok:false,error:'Il backup non contiene dati da importare.'};
}

/** Switching layout keeps colours, text and visibility but drops hand-placed geometry. */
const GEOMETRY_KEYS=['x','y','sx','sy','rotation','cx','cy','order'];
export function clearGeometry(raw:LiveEdits|undefined):LiveEdits{
  const result:LiveEdits={};
  for(const [id,edit] of Object.entries(normalizeEdits(raw))){
    const rest=Object.fromEntries(Object.entries(edit).filter(([k])=>!GEOMETRY_KEYS.includes(k)));
    if(Object.keys(rest).length)result[id]=rest as ElementEdit;
  }
  return result;
}

/** What the style tab shows: layout thumbnails and theme swatches. */
export type StyleGallery={layoutTitle:string;active:string;layouts:{id:string;label:string;note:string;thumb:string}[];themes:{id:string;label:string;colors:string[]}[];onLayout:(id:string)=>void;onTheme:(id:string)=>void;onSurprise:(o:{keepLayout:boolean;keepTheme:boolean})=>void};

/** The saved cards of the open editor, with what the "Carte" tab needs to browse and manage them. */
export type CardLibrary={
  /** What the open card knows besides what is drawn: lore, art description and the game's rules. */
  current?:{name:string;lore:string;artPrompt:string;rules:{label:string;text:string}[]};
  items:{id:string;name:string;type:string;scope:string;copies:number;active:boolean}[];
  onOpen:(id:string)=>void;onNew:()=>void;onDuplicate:(id:string)=>void;onDelete:(id:string)=>void;
  onImport:(files:File[],o:{includeLore:boolean})=>Promise<string>;
};
