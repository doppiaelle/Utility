import React,{useEffect,useMemo,useRef,useState}from'react';
import{createRoot}from'react-dom/client';
import jsPDF from'jspdf';
import'./styles.css';
import {LiveEditor} from './LiveEditor';
import {applyEdits,editable,normalizeEdits,normalizeExtras,renderExtras} from './liveModel';
import type {LiveEdits,ExtraElement} from './liveModel';
import {useHistory} from './useHistory';
import TerrainEditor,{EditorSwitcher}from'./TerrainEditor';

type CardType='fighter'|'location'|'action'|'extraFighter'|'objective'|'token';
type Detail={label:string;value:string;icon?:string;opacity?:number};
type Stat={kind:string;value:string;opacity?:number};
type LayerOpacity={frame:number;header:number;cost:number;meta:number;effect:number;stats:number;id:number;artwork:number};
type FramePreset='rounded'|'double'|'square'|'bevel'|'octagon'|'shield'|'arch'|'wave'|'tech'|'offset'|'broken'|'random';
type AccentPreset='corners'|'filigree'|'waves'|'slashes'|'circuit'|'runes'|'orbits'|'spines'|'ribbons'|'fragments'|'minimal'|'none'|'random';
type FrameStyle={
  size:number;radius:number;opacity:number;inset:number;framePreset:FramePreset;frameDetail:number;frameSeed:number;
  accentSize:number;accentOpacity:number;accentPreset:AccentPreset;accentDensity:number;accentMotion:number;accentSeed:number;
};
type TextRole='cost'|'title'|'meta'|'effect'|'stats';
type TextStyle={size:number;family:string};
type TypographyStyle=Record<TextRole,TextStyle>;
type RarityKey='common'|'rare'|'super'|'ultra'|'secret'|'ultimate'|'ghost'|'gold'|'starlight';
type Card={
  liveEdits?:LiveEdits;extras?:ExtraElement[];
  id:string;type:CardType;name:string;scope:string;scopeColor:string;cost?:string;rarity?:RarityKey;
  meta:Detail[];effects:Detail[];stats:Stat[];art?:string;
  artScale?:number;artX?:number;artY?:number;layers?:Partial<LayerOpacity>;frame?:Partial<FrameStyle>;
  typography?:Partial<Record<TextRole,Partial<TextStyle>>>;
};

const TYPES:Record<CardType,string>={fighter:'Combattente',location:'Luogo',action:'Azione',extraFighter:'ExtraCombattente',objective:'Obiettivo',token:'Token'};
const RARITIES:Record<RarityKey,string>={
  common:'Comune',
  rare:'Rare',
  super:'Super Rare',
  ultra:'Ultra Rare',
  secret:'Secret Rare',
  ultimate:'Ultimate Rare',
  ghost:'Ghost Rare',
  gold:'Gold Rare',
  starlight:'Starlight Rare'
};
type TiltState={rx:number;ry:number;glareX:number;glareY:number;active:boolean};
type PreviewFx={glare:number;holo:number;sparkle:number};
const RARITY_PREVIEW:Record<RarityKey,PreviewFx>={
  common:{glare:.08,holo:0,sparkle:0},rare:{glare:.22,holo:.07,sparkle:.08},super:{glare:.34,holo:.25,sparkle:.12},
  ultra:{glare:.42,holo:.32,sparkle:.16},secret:{glare:.50,holo:.46,sparkle:.23},ultimate:{glare:.30,holo:.18,sparkle:.11},
  ghost:{glare:.38,holo:.12,sparkle:.16},gold:{glare:.48,holo:.20,sparkle:.20},starlight:{glare:.62,holo:.58,sparkle:.34}
};
const NEUTRAL_TILT:TiltState={rx:0,ry:0,glareX:50,glareY:42,active:false};
const DEFAULT_LAYERS:LayerOpacity={frame:1,header:.96,cost:1,meta:.94,effect:.90,stats:.98,id:.98,artwork:1};
const DEFAULT_FRAME:FrameStyle={
  size:3.2,radius:26,opacity:.92,inset:10,framePreset:'rounded',frameDetail:.72,frameSeed:104729,
  accentSize:2.2,accentOpacity:.72,accentPreset:'corners',accentDensity:1,accentMotion:1,accentSeed:130363
};
const FRAME_PRESETS:{id:Exclude<FramePreset,'random'>;label:string}[]=[
  {id:'rounded',label:'Tradizionale · Arrotondata'},
  {id:'double',label:'Tradizionale · Doppia linea'},
  {id:'shield',label:'Tradizionale · Scudo'},
  {id:'arch',label:'Tradizionale · Arco'},
  {id:'square',label:'Geometrica · Squadrata'},
  {id:'bevel',label:'Geometrica · Angoli tagliati'},
  {id:'octagon',label:'Geometrica · Ottagonale'},
  {id:'tech',label:'Astratta · Tech / notch'},
  {id:'offset',label:'Astratta · Offset'},
  {id:'broken',label:'Astratta · Segmentata'},
  {id:'wave',label:'Organica · Ondulata'}
];
const ACCENT_PRESETS:{id:Exclude<AccentPreset,'random'>;label:string}[]=[
  {id:'corners',label:'Tradizionale · Angoli'},
  {id:'filigree',label:'Tradizionale · Filigrana'},
  {id:'ribbons',label:'Tradizionale · Nastri'},
  {id:'waves',label:'Organica · Onde'},
  {id:'orbits',label:'Organica · Orbite'},
  {id:'spines',label:'Organica · Spine'},
  {id:'slashes',label:'Dinamica · Slash'},
  {id:'fragments',label:'Dinamica · Frammenti'},
  {id:'circuit',label:'Astratta · Circuiti'},
  {id:'runes',label:'Astratta · Rune'},
  {id:'minimal',label:'Minimal · Linee'},
  {id:'none',label:'Nessun accento'}
];
const DEFAULT_TYPOGRAPHY:TypographyStyle={
  cost:{size:23,family:'Arial'},
  title:{size:24,family:'Arial'},
  meta:{size:15,family:'Arial'},
  effect:{size:16,family:'Arial'},
  stats:{size:20,family:'Arial'}
};
const FONT_OPTIONS=['Arial','Inter','Trebuchet MS','Verdana','Georgia','Impact','Courier New'];
const FONT_STACKS:Record<string,string>={
  Arial:'Arial, Helvetica, sans-serif',
  Inter:'Inter, Arial, sans-serif',
  'Trebuchet MS':'Trebuchet MS, Arial, sans-serif',
  Verdana:'Verdana, Arial, sans-serif',
  Georgia:'Georgia, Times New Roman, serif',
  Impact:'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif',
  'Courier New':'Courier New, Courier, monospace'
};
const DEFAULT:Card={
  id:'KRT-001',type:'fighter',name:'Nome Carta',scope:'Informatica',scopeColor:'#1d5c6b',cost:'',rarity:'common',
  meta:[{label:'',value:'Archetipo',opacity:1},{label:'',value:'Tipo',opacity:1}],
  effects:[{label:'EFFETTO',value:'Testo effetto della carta.',opacity:1}],
  stats:[{kind:'ATK',value:'',opacity:1},{kind:'RES',value:'',opacity:1},{kind:'PRF',value:'',opacity:1}],
  artScale:1,artX:0,artY:0,layers:DEFAULT_LAYERS,frame:DEFAULT_FRAME,typography:DEFAULT_TYPOGRAPHY
};
const scopeDefault:Record<string,string>={Informatica:'#1d5c6b',Economia:'#3f6b3a',Medicina:'#a8324a',Ingegneria:'#9a5b17',Sportivi:'#4a3a86',Media:'#a8296e'};

const esc=(s:any)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}as any)[c]);
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const clamp01=(v:number|undefined,fallback=1)=>clamp(Number.isFinite(v as number)?Number(v):fallback,0,1);
const bevel=(x:number,y:number,w:number,h:number,c=13)=>`M ${x+c} ${y} H ${x+w-c} L ${x+w} ${y+c} V ${y+h-c} L ${x+w-c} ${y+h} H ${x+c} L ${x} ${y+h-c} V ${y+c} Z`;
const fontStack=(family:string)=>FONT_STACKS[family]||FONT_STACKS.Arial;
const charUnits=(text:string)=>Array.from(String(text||'')).reduce((sum,ch)=>sum+(ch===' '?0.34:/[ilI1|.,'`]/.test(ch)?0.30:/[MW@#%&]/.test(ch)?0.92:/[A-Z0-9]/.test(ch)?0.64:0.56),0);
const fitFontSize=(text:string,preferred:number,min:number,maxWidth:number)=>clamp(Math.min(preferred,maxWidth/Math.max(.8,charUnits(text))),min,preferred);
const wrapByWidth=(text:string,maxWidth:number,fontSize:number,maxLines=9)=>{
  const words=String(text||'').trim().split(/\s+/).filter(Boolean),out:string[]=[];
  let line='';
  for(const word of words){
    const next=`${line} ${word}`.trim();
    if(line&&charUnits(next)*fontSize>maxWidth){out.push(line);line=word}else line=next;
    if(out.length>=maxLines)break;
  }
  if(line&&out.length<maxLines)out.push(line);
  return out;
};
const isRarity=(value:any):value is RarityKey=>typeof value==='string'&&value in RARITIES;
function normalizeTypography(input:any):TypographyStyle{return{
  cost:{...DEFAULT_TYPOGRAPHY.cost,...(input?.cost||{})},
  title:{...DEFAULT_TYPOGRAPHY.title,...(input?.title||{})},
  meta:{...DEFAULT_TYPOGRAPHY.meta,...(input?.meta||{})},
  effect:{...DEFAULT_TYPOGRAPHY.effect,...(input?.effect||{})},
  stats:{...DEFAULT_TYPOGRAPHY.stats,...(input?.stats||{})}
}}
const makeRng=(seed:number)=>{let s=(Math.floor(seed)||1)>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}};
const nextSeed=(previous:number|undefined)=>{let next=0,prev=(previous||0)>>>0;do next=(Math.floor(Math.random()*4294967295)+1)>>>0;while(next===prev);return next};
const linePath=(d:string,theme:string,width:number,opacity=1,dash='')=>`<path d="${d}" fill="none" stroke="${theme}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"${dash?` stroke-dasharray="${dash}"`:''}/>`;

const slotIcon=(i:number,x:number,y:number)=>i===0
  ?`<g transform="translate(${x} ${y})" fill="#f6f0e5"><path d="M0-13 4-5 12-8 7 0 13 5 5 5 2 13-2 6-10 10-7 2-14-2-6-5-7-13 0-8Z"/></g>`
  :i===1
    ?`<g transform="translate(${x} ${y}) skewX(-14)" fill="#f6f0e5"><rect x="-11" y="-10" width="22" height="5" rx="2"/><rect x="-8" y="-2" width="19" height="5" rx="2"/><rect x="-5" y="6" width="16" height="5" rx="2"/></g>`
    :`<g stroke="#f6f0e5" fill="none" stroke-width="2"><circle cx="${x}" cy="${y}" r="10"/><circle cx="${x}" cy="${y}" r="3.5"/></g>`;
const diamond=(theme:string,x:number,y:number)=>`<g transform="translate(${x} ${y})"><path d="M0-17 17 0 0 17-17 0Z" fill="#0c1822" stroke="${theme}" stroke-width="2"/><path d="M0-9 9 0 0 9-9 0Z" fill="#d9dde2"/><path d="M0-9 9 0 0 2Z" fill="#fbfdff"/><path d="M0 2 9 0 0 9Z" fill="#bfc7d0"/></g>`;
function statIcon(kind:string,x:number,y:number){
  const k=kind.toUpperCase(),start=`<g transform="translate(${x} ${y})" fill="none" stroke="#f8f5ef" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round">`,end='</g>';
  if(k==='ATK')return`${start}<path d="M-9 10 6-5M2-9l8-1-1 8M-11 7l4 4M-7 3l4 4"/>${end}`;
  if(k==='RES')return`${start}<path d="M0-12 10-8v8c0 8-4.5 13-10 16-5.5-3-10-8-10-16v-8Z"/><path d="m-4 1 3 3 6-7"/>${end}`;
  if(k==='PRF')return`${start}<circle r="9"/><circle r="3"/><path d="M0-14v4M0 10v4M-14 0h4M10 0h4"/>${end}`;
  if(k==='PV')return`${start}<path d="M0 11S-11 4-11-4c0-5 6-8 11-2 5-6 11-3 11 2 0 8-11 15-11 15Z"/>${end}`;
  return`${start}<path d="M0-11 3-3 11 0 3 3 0 11-3 3-11 0-3-3Z"/>${end}`;
}

const sparkle=(x:number,y:number,scale=1,opacity=.8,color='#ffffff')=>`<g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}"><path d="M0-10 2.5-2.5 10 0 2.5 2.5 0 10-2.5 2.5-10 0-2.5-2.5Z" fill="${color}"/><circle cx="0" cy="0" r="1.3" fill="#ffffff"/></g>`;
function rarityDefs(){return`
  <linearGradient id="rareSilver" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0"/><stop offset="35%" stop-color="#f7fbff" stop-opacity=".45"/><stop offset="70%" stop-color="#dbe8f6" stop-opacity=".2"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  <linearGradient id="holoAurora" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#62d7ff" stop-opacity="0"/><stop offset="18%" stop-color="#62d7ff" stop-opacity=".22"/><stop offset="38%" stop-color="#8d7cff" stop-opacity=".24"/><stop offset="56%" stop-color="#ff85c7" stop-opacity=".24"/><stop offset="74%" stop-color="#ffe176" stop-opacity=".22"/><stop offset="90%" stop-color="#78ffc9" stop-opacity=".18"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  <linearGradient id="goldFoil" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff5bf" stop-opacity=".06"/><stop offset="30%" stop-color="#f6cf62" stop-opacity=".28"/><stop offset="55%" stop-color="#fff6d0" stop-opacity=".18"/><stop offset="100%" stop-color="#c99212" stop-opacity=".08"/></linearGradient>
  <linearGradient id="bronzeFoil" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f8d39b" stop-opacity=".06"/><stop offset="30%" stop-color="#c98a42" stop-opacity=".22"/><stop offset="100%" stop-color="#6c4118" stop-opacity=".08"/></linearGradient>
  <linearGradient id="ghostMist" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f4fbff" stop-opacity=".30"/><stop offset="45%" stop-color="#ddf3ff" stop-opacity=".16"/><stop offset="100%" stop-color="#fefeff" stop-opacity=".26"/></linearGradient>
  <linearGradient id="softSheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#ffffff" stop-opacity="0"/><stop offset="35%" stop-color="#ffffff" stop-opacity=".24"/><stop offset="58%" stop-color="#c1f6ff" stop-opacity=".18"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  <linearGradient id="prismaticStroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9de9ff"/><stop offset="28%" stop-color="#ffffff"/><stop offset="52%" stop-color="#ffc6ed"/><stop offset="76%" stop-color="#fff09b"/><stop offset="100%" stop-color="#8fe2ff"/></linearGradient>
  <pattern id="secretFoilPattern" patternUnits="userSpaceOnUse" width="28" height="28" patternTransform="rotate(-28)"><rect width="28" height="28" fill="#ffffff" fill-opacity=".012"/><path d="M4 -4V32 M14 -4V32 M24 -4V32" stroke="#8ad6ff" stroke-opacity=".34" stroke-width="1.8"/><path d="M9 -4V32 M19 -4V32" stroke="#ff8cc6" stroke-opacity=".30" stroke-width="1.1"/><path d="M0 -4V32" stroke="#fff6a8" stroke-opacity=".20" stroke-width=".8"/></pattern>
  <pattern id="ultimatePattern" patternUnits="userSpaceOnUse" width="96" height="96"><rect width="96" height="96" fill="#ffffff" fill-opacity="0"/><circle cx="48" cy="48" r="21" fill="none" stroke="#f2d1a4" stroke-opacity=".20" stroke-width="2"/><path d="M0 30 C 24 8, 72 8, 96 30 M0 66 C 24 44, 72 44, 96 66" fill="none" stroke="#f2d1a4" stroke-opacity=".18" stroke-width="2"/><path d="M18 0 C 6 18, 6 78, 18 96 M78 0 C 90 18, 90 78, 78 96" fill="none" stroke="#f2d1a4" stroke-opacity=".16" stroke-width="1.5"/></pattern>
  <pattern id="starlightPattern" patternUnits="userSpaceOnUse" width="72" height="72"><rect width="72" height="72" fill="#ffffff" fill-opacity="0"/><circle cx="12" cy="14" r="1.8" fill="#ffffff" fill-opacity=".55"/><circle cx="54" cy="20" r="1.5" fill="#9de9ff" fill-opacity=".5"/><circle cx="26" cy="54" r="1.2" fill="#ffeeb4" fill-opacity=".42"/><path d="M36 8 38 14 44 16 38 18 36 24 34 18 28 16 34 14Z" fill="#ffffff" fill-opacity=".52"/><path d="M58 42 59.5 46 64 47.5 59.5 49 58 53 56.5 49 52 47.5 56.5 46Z" fill="#ffd7ef" fill-opacity=".45"/><path d="M14 40 15.5 44 20 45.5 15.5 47 14 51 12.5 47 8 45.5 12.5 44Z" fill="#c6f7ff" fill-opacity=".45"/></pattern>
  <pattern id="goldDustPattern" patternUnits="userSpaceOnUse" width="52" height="52"><rect width="52" height="52" fill="#ffffff" fill-opacity="0"/><circle cx="9" cy="10" r="1.4" fill="#fff3ae" fill-opacity=".55"/><circle cx="38" cy="16" r="1.2" fill="#fff3ae" fill-opacity=".45"/><circle cx="19" cy="38" r="1.1" fill="#f6cf62" fill-opacity=".50"/><path d="M42 34 43.2 37.6 47 38.8 43.2 40 42 43.6 40.8 40 37 38.8 40.8 37.6Z" fill="#fff8d2" fill-opacity=".42"/></pattern>
  <filter id="art-rare" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.08"/><feComponentTransfer><feFuncR type="linear" slope="1.02"/><feFuncG type="linear" slope="1.02"/><feFuncB type="linear" slope="1.04"/></feComponentTransfer></filter>
  <filter id="art-super" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.18"/><feComponentTransfer><feFuncR type="linear" slope="1.04"/><feFuncG type="linear" slope="1.04"/><feFuncB type="linear" slope="1.08"/></feComponentTransfer></filter>
  <filter id="art-ultra" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.24"/><feComponentTransfer><feFuncR type="linear" slope="1.08"/><feFuncG type="linear" slope="1.06"/><feFuncB type="linear" slope="1.04"/></feComponentTransfer></filter>
  <filter id="art-secret" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.30"/><feComponentTransfer><feFuncR type="linear" slope="1.08"/><feFuncG type="linear" slope="1.06"/><feFuncB type="linear" slope="1.10"/></feComponentTransfer></filter>
  <filter id="art-ultimate" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.14"/><feComponentTransfer><feFuncR type="linear" slope="1.10"/><feFuncG type="linear" slope="1.02"/><feFuncB type="linear" slope=".95"/></feComponentTransfer></filter>
  <filter id="art-ghost" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values=".24"/><feComponentTransfer><feFuncR type="linear" slope="1.16" intercept=".05"/><feFuncG type="linear" slope="1.18" intercept=".06"/><feFuncB type="linear" slope="1.22" intercept=".08"/></feComponentTransfer></filter>
  <filter id="art-gold" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.12"/><feComponentTransfer><feFuncR type="linear" slope="1.18"/><feFuncG type="linear" slope="1.10"/><feFuncB type="linear" slope=".92"/></feComponentTransfer></filter>
  <filter id="art-starlight" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.34"/><feComponentTransfer><feFuncR type="linear" slope="1.10"/><feFuncG type="linear" slope="1.08"/><feFuncB type="linear" slope="1.12"/></feComponentTransfer></filter>`;}
function renderRarityArtOverlay(rarity:RarityKey){switch(rarity){case'rare':return`<g clip-path="url(#cardClip)"><rect x="20" y="20" width="590" height="840" fill="url(#rareSilver)" opacity=".08"/><rect x="20" y="20" width="590" height="840" fill="url(#softSheen)" opacity=".06"/></g>`;case'super':return`<g clip-path="url(#cardClip)"><rect x="20" y="20" width="590" height="840" fill="url(#holoAurora)" opacity=".15"/><rect x="20" y="20" width="590" height="840" fill="url(#softSheen)" opacity=".11"/></g>`;case'ultra':return`<g clip-path="url(#cardClip)"><rect x="20" y="20" width="590" height="840" fill="url(#goldFoil)" opacity=".12"/><rect x="20" y="20" width="590" height="840" fill="url(#holoAurora)" opacity=".14"/></g>`;case'secret':return`<g clip-path="url(#cardClip)"><rect x="20" y="20" width="590" height="840" fill="url(#holoAurora)" opacity=".12"/><rect x="20" y="20" width="590" height="840" fill="url(#secretFoilPattern)" opacity=".28"/></g>`;case'ultimate':return`<g clip-path="url(#cardClip)"><rect x="20" y="20" width="590" height="840" fill="url(#bronzeFoil)" opacity=".18"/><rect x="20" y="20" width="590" height="840" fill="url(#ultimatePattern)" opacity=".24"/></g>`;case'ghost':return`<g clip-path="url(#cardClip)"><rect x="20" y="20" width="590" height="840" fill="url(#ghostMist)" opacity=".30"/><rect x="20" y="20" width="590" height="840" fill="url(#softSheen)" opacity=".12"/></g>`;case'gold':return`<g clip-path="url(#cardClip)"><rect x="20" y="20" width="590" height="840" fill="url(#goldFoil)" opacity=".20"/><rect x="20" y="20" width="590" height="840" fill="url(#goldDustPattern)" opacity=".24"/></g>`;case'starlight':return`<g clip-path="url(#cardClip)"><rect x="20" y="20" width="590" height="840" fill="url(#holoAurora)" opacity=".18"/><rect x="20" y="20" width="590" height="840" fill="url(#starlightPattern)" opacity=".34"/></g>`;default:return'';}}
function renderRaritySurface(rarity:RarityKey){switch(rarity){case'rare':return`<g clip-path="url(#cardClip)" pointer-events="none"><rect x="27" y="27" width="576" height="826" rx="24" fill="none" stroke="#dde7f3" stroke-opacity=".46" stroke-width="1.8"/>${sparkle(92,112,.75,.70)}${sparkle(534,146,.58,.55)}${sparkle(474,642,.68,.50,'#dfeeff')}</g>`;case'super':return`<g clip-path="url(#cardClip)" pointer-events="none"><rect x="26" y="26" width="578" height="828" rx="24" fill="none" stroke="url(#prismaticStroke)" stroke-opacity=".28" stroke-width="1.8"/>${sparkle(98,110,.82,.78)}${sparkle(530,144,.72,.64,'#dff6ff')}${sparkle(120,704,.64,.48,'#ffd8ef')}</g>`;case'ultra':return`<g clip-path="url(#cardClip)" pointer-events="none"><rect x="25" y="25" width="580" height="830" rx="25" fill="none" stroke="#f6d577" stroke-opacity=".64" stroke-width="2.1"/><rect x="31" y="31" width="568" height="818" rx="21" fill="none" stroke="#fff5c2" stroke-opacity=".28" stroke-width="1"/>${sparkle(92,110,.90,.86,'#fff4ba')}${sparkle(534,146,.76,.70,'#fff8d5')}${sparkle(483,638,.74,.58,'#ffe3ac')}</g>`;case'secret':return`<g clip-path="url(#cardClip)" pointer-events="none"><rect x="26" y="26" width="578" height="828" rx="24" fill="url(#secretFoilPattern)" opacity=".16"/><rect x="26" y="26" width="578" height="828" rx="24" fill="none" stroke="url(#prismaticStroke)" stroke-opacity=".32" stroke-width="1.7"/>${sparkle(92,112,.82,.82)}${sparkle(534,144,.74,.68,'#dff7ff')}${sparkle(302,740,.68,.50,'#ffd5ea')}</g>`;case'ultimate':return`<g clip-path="url(#cardClip)" pointer-events="none"><rect x="24" y="24" width="582" height="832" rx="26" fill="url(#ultimatePattern)" opacity=".18"/><rect x="26" y="26" width="578" height="828" rx="24" fill="none" stroke="#d0a067" stroke-opacity=".48" stroke-width="1.9"/>${sparkle(112,128,.64,.44,'#f3d2a8')}</g>`;case'ghost':return`<g clip-path="url(#cardClip)" pointer-events="none"><rect x="20" y="20" width="590" height="840" fill="#eefaff" fill-opacity=".07"/><rect x="26" y="26" width="578" height="828" rx="24" fill="none" stroke="#f8fdff" stroke-opacity=".52" stroke-width="1.8"/>${sparkle(94,114,.84,.74)}${sparkle(530,144,.70,.62,'#edfaff')}${sparkle(470,770,.64,.44,'#f3ffff')}</g>`;case'gold':return`<g clip-path="url(#cardClip)" pointer-events="none"><rect x="24" y="24" width="582" height="832" rx="25" fill="url(#goldDustPattern)" opacity=".26"/><rect x="25" y="25" width="580" height="830" rx="25" fill="none" stroke="#e9bd47" stroke-opacity=".66" stroke-width="2.2"/><rect x="31" y="31" width="568" height="818" rx="21" fill="none" stroke="#fff2ba" stroke-opacity=".30" stroke-width="1"/>${sparkle(90,112,.90,.84,'#fff1a8')}${sparkle(536,146,.76,.72,'#fff7d3')}</g>`;case'starlight':return`<g clip-path="url(#cardClip)" pointer-events="none"><rect x="20" y="20" width="590" height="840" fill="url(#starlightPattern)" opacity=".38"/><rect x="26" y="26" width="578" height="828" rx="24" fill="none" stroke="url(#prismaticStroke)" stroke-opacity=".42" stroke-width="1.8"/>${sparkle(94,110,.98,.88)}${sparkle(536,144,.80,.74,'#dff6ff')}${sparkle(132,698,.72,.58,'#ffdff2')}${sparkle(486,636,.70,.54,'#fff3b6')}</g>`;default:return'';}}

function normalizeDetail(x:Detail):Detail{return{...x,opacity:clamp01(x.opacity,1)}}
function normalizeStat(x:Stat):Stat{return{...x,opacity:clamp01(x.opacity,1)}}
function normalizeCard(c:Card):Card{const legacy:any=c||{};return{
  ...DEFAULT,...legacy,liveEdits:normalizeEdits(legacy.liveEdits),extras:normalizeExtras(legacy.extras),rarity:isRarity(legacy.rarity)?legacy.rarity:'common',
  meta:(legacy.meta??DEFAULT.meta).map(normalizeDetail),effects:(legacy.effects??DEFAULT.effects).map(normalizeDetail),stats:(legacy.stats??DEFAULT.stats).map(normalizeStat),
  artScale:Number.isFinite(legacy.artScale)?legacy.artScale:1,artX:Number.isFinite(legacy.artX)?legacy.artX:0,artY:Number.isFinite(legacy.artY)?legacy.artY:0,
  layers:{...DEFAULT_LAYERS,...(legacy.layers||{})},frame:{...DEFAULT_FRAME,...(legacy.frame||{})},typography:normalizeTypography(legacy.typography)
}}
function preset(type:CardType):Card{const c=normalizeCard({...DEFAULT,type,name:'Nome Carta',meta:DEFAULT.meta.map(x=>({...x})),effects:DEFAULT.effects.map(x=>({...x})),stats:DEFAULT.stats.map(x=>({...x}))});if(type==='location')c.stats=[{kind:'RES',value:'',opacity:1}];if(type==='action'){c.meta=[{label:'',value:'Tipo',opacity:1},{label:'',value:'Velocità',opacity:1}];c.stats=[];c.effects=[{label:'EFFETTO',value:'Descrivi chiaramente l’azione.',opacity:1}]}if(type==='extraFighter')c.meta=[{label:'',value:'Requisito',opacity:1},{label:'',value:'Archetipo',opacity:1}];if(type==='objective'){delete c.cost;c.meta=[];c.stats=[{kind:'PV',value:'',opacity:1}];c.effects=[{label:'CONDIZIONE',value:'Descrivi la condizione obiettivo.',opacity:1}]}if(type==='token'){delete c.cost;c.meta=[{label:'',value:'Token',opacity:1}]}return c}
function useLocalStore(){const[cards,setCards]=useState<Card[]>(()=>{try{return(JSON.parse(localStorage.getItem('kritoma.cards')||'[]')as Card[]).map(normalizeCard)}catch{return[]}});const save=(next:Card[])=>{setCards(next);localStorage.setItem('kritoma.cards',JSON.stringify(next))};return{cards,save}}

function randomFramePath(x:number,y:number,w:number,h:number,r:number,seed:number){
  const rnd=makeRng(seed),cut1=10+rnd()*22,cut2=12+rnd()*26,bow=(rnd()-.5)*18,side=(rnd()-.5)*12,topNotch=18+rnd()*42,bottomNotch=18+rnd()*42;
  return`M ${x+r+cut1} ${y} H ${x+w-r-topNotch} Q ${x+w-r/2} ${y+bow} ${x+w} ${y+r+cut2} V ${y+h*.38+side} Q ${x+w-8-rnd()*8} ${y+h*.50} ${x+w} ${y+h*.62-side} V ${y+h-r-cut1} Q ${x+w-rnd()*18} ${y+h} ${x+w-r-bottomNotch} ${y+h} H ${x+r+bottomNotch} Q ${x+rnd()*18} ${y+h} ${x} ${y+h-r-cut2} V ${y+h*.62+side} Q ${x+8+rnd()*8} ${y+h*.50} ${x} ${y+h*.38-side} V ${y+r+cut1} Q ${x+r/2} ${y-bow} ${x+r+cut1} ${y} Z`;
}
function frameBaseSvg(theme:string,style:FrameStyle,layerOpacity:number){
  const o=clamp01(style.opacity,1)*layerOpacity,sw=clamp(style.size,1,10),r=clamp(style.radius,8,46),inset=clamp(style.inset,4,28),detail=clamp01(style.frameDetail,.7);
  const x=20+inset/2,y=20+inset/2,w=590-inset,h=840-inset,shadow='#07121a';
  const strokePair=(shape:string,extra='')=>`<g opacity="${o}">${shape.replaceAll('__COLOR__',shadow).replaceAll('__WIDTH__',String(sw+3)).replaceAll('__EXTRA__','')}${shape.replaceAll('__COLOR__',theme).replaceAll('__WIDTH__',String(sw)).replaceAll('__EXTRA__',extra)}</g>`;
  const pathShape=(d:string)=>`<path d="${d}" fill="none" stroke="__COLOR__" stroke-width="__WIDTH__" stroke-linejoin="round" stroke-linecap="round" __EXTRA__/>`;
  const rectShape=(rx:number)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="__COLOR__" stroke-width="__WIDTH__" stroke-linejoin="round" __EXTRA__/>`;
  let main='';
  if(style.framePreset==='square')main=strokePair(rectShape(4));
  else if(style.framePreset==='rounded')main=strokePair(rectShape(r));
  else if(style.framePreset==='double'){
    main=strokePair(rectShape(r));
    const gap=sw+7;main+=`<rect x="${x+gap}" y="${y+gap}" width="${w-gap*2}" height="${h-gap*2}" rx="${Math.max(4,r-gap*.45)}" fill="none" stroke="${theme}" stroke-width="${Math.max(.8,sw*.45)}" opacity="${o*detail*.72}"/>`;
  }else if(style.framePreset==='bevel')main=strokePair(pathShape(bevel(x,y,w,h,clamp(r*.75,10,34))));
  else if(style.framePreset==='octagon')main=strokePair(pathShape(bevel(x,y,w,h,clamp(28+r*.25,28,42))));
  else if(style.framePreset==='shield'){
    const d=`M ${x+r} ${y} H ${x+w-r} Q ${x+w} ${y} ${x+w} ${y+r} V ${y+h*.68} Q ${x+w} ${y+h*.82} ${x+w*.64} ${y+h} H ${x+w*.36} Q ${x} ${y+h*.82} ${x} ${y+h*.68} V ${y+r} Q ${x} ${y} ${x+r} ${y} Z`;
    main=strokePair(pathShape(d));
  }else if(style.framePreset==='arch'){
    const d=`M ${x+r} ${y+16} Q ${x+w*.22} ${y-8} ${x+w*.5} ${y} Q ${x+w*.78} ${y-8} ${x+w-r} ${y+16} Q ${x+w} ${y+18} ${x+w} ${y+r+22} V ${y+h-r} Q ${x+w} ${y+h} ${x+w-r} ${y+h} H ${x+r} Q ${x} ${y+h} ${x} ${y+h-r} V ${y+r+22} Q ${x} ${y+18} ${x+r} ${y+16} Z`;
    main=strokePair(pathShape(d));
  }else if(style.framePreset==='wave'){
    const amp=8+detail*10,d=`M ${x+r} ${y} C ${x+w*.25} ${y-amp} ${x+w*.35} ${y+amp} ${x+w*.5} ${y} S ${x+w*.78} ${y-amp} ${x+w-r} ${y} Q ${x+w} ${y} ${x+w} ${y+r} C ${x+w+amp*.35} ${y+h*.28} ${x+w-amp*.35} ${y+h*.42} ${x+w} ${y+h*.55} S ${x+w+amp*.35} ${y+h*.82} ${x+w-r} ${y+h} C ${x+w*.72} ${y+h+amp} ${x+w*.60} ${y+h-amp} ${x+w*.5} ${y+h} S ${x+w*.24} ${y+h+amp} ${x+r} ${y+h} Q ${x} ${y+h} ${x} ${y+h-r} C ${x-amp*.35} ${y+h*.78} ${x+amp*.35} ${y+h*.58} ${x} ${y+h*.45} S ${x-amp*.35} ${y+h*.18} ${x} ${y+r} Q ${x} ${y} ${x+r} ${y} Z`;
    main=strokePair(pathShape(d));
  }else if(style.framePreset==='tech'){
    const c=18+detail*12,n=32+detail*24,d=`M ${x+c} ${y} H ${x+w*.38} l ${n*.25} ${n*.18} H ${x+w-c} L ${x+w} ${y+c} V ${y+h*.32} l ${-n*.18} ${n*.25} v ${n*.55} l ${n*.18} ${n*.25} V ${y+h-c} L ${x+w-c} ${y+h} H ${x+w*.62} l ${-n*.25} ${-n*.18} H ${x+c} L ${x} ${y+h-c} V ${y+h*.68} l ${n*.18} ${-n*.25} v ${-n*.55} l ${-n*.18} ${-n*.25} V ${y+c} Z`;
    main=strokePair(pathShape(d));
  }else if(style.framePreset==='offset'){
    main=strokePair(rectShape(r));
    const dx=7+detail*6,dy=5+detail*5;main+=`<rect x="${x+dx}" y="${y-dy}" width="${w-dx*1.3}" height="${h+dy*.6}" rx="${r}" fill="none" stroke="${theme}" stroke-width="${Math.max(.8,sw*.55)}" opacity="${o*.48}"/>`;
  }else if(style.framePreset==='broken'){
    const dash=`${48+detail*36} ${14+detail*18}`;main=strokePair(rectShape(r),`stroke-dasharray="${dash}"`);
  }else{
    const d=randomFramePath(x,y,w,h,r,style.frameSeed);main=strokePair(pathShape(d));
    const rnd=makeRng(style.frameSeed^0x9e3779b9),gap=5+rnd()*9;main+=`<path d="${randomFramePath(x+gap,y+gap,w-gap*2,h-gap*2,Math.max(7,r-gap*.4),style.frameSeed^0x85ebca6b)}" fill="none" stroke="${theme}" stroke-width="${Math.max(.7,sw*(.28+rnd()*.35))}" opacity="${o*(.25+detail*.38)}"/>`;
  }
  return main;
}
function randomAccentSvg(theme:string,style:FrameStyle,x:number,y:number,w:number,h:number){
  const rnd=makeRng(style.accentSeed),a=clamp(style.accentSize,.5,7),ao=clamp01(style.accentOpacity,.7),motion=clamp(style.accentMotion,.2,1.8),count=Math.round(clamp(style.accentDensity,.5,1.8)*(7+rnd()*5));
  let out='';
  for(let i=0;i<count;i++){
    const side=i%4,t=.10+rnd()*.80,len=(26+rnd()*72)*motion,bend=(rnd()-.5)*38*motion,offset=7+rnd()*12;
    let sx=0,sy=0,ex=0,ey=0,cx=0,cy=0;
    if(side===0){sx=x+w*t;sy=y+offset;ex=clamp(sx+(rnd()-.5)*len,x+12,x+w-12);ey=y+offset+len*.25;cx=(sx+ex)/2+bend;cy=y+offset-len*.18}
    if(side===1){sx=x+w-offset;sy=y+h*t;ex=x+w-offset-len*.25;ey=clamp(sy+(rnd()-.5)*len,y+12,y+h-12);cx=x+w-offset+len*.18;cy=(sy+ey)/2+bend}
    if(side===2){sx=x+w*(1-t);sy=y+h-offset;ex=clamp(sx+(rnd()-.5)*len,x+12,x+w-12);ey=y+h-offset-len*.25;cx=(sx+ex)/2+bend;cy=y+h-offset+len*.18}
    if(side===3){sx=x+offset;sy=y+h*(1-t);ex=x+offset+len*.25;ey=clamp(sy+(rnd()-.5)*len,y+12,y+h-12);cx=x+offset-len*.18;cy=(sy+ey)/2+bend}
    out+=linePath(`M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,theme,Math.max(.6,a*(.42+rnd()*.72)),ao*(.42+rnd()*.52));
    if(rnd()>.62)out+=`<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="${(1.1+rnd()*2.2).toFixed(1)}" fill="${theme}" opacity="${(ao*(.35+rnd()*.45)).toFixed(2)}"/>`;
  }
  return out;
}
function frameAccentSvg(theme:string,style:FrameStyle,layerOpacity:number){
  const a=clamp(style.accentSize,.5,7),ao=clamp01(style.accentOpacity,.7)*layerOpacity,density=clamp(style.accentDensity,.5,1.8),motion=clamp(style.accentMotion,.2,1.8),inset=clamp(style.inset,4,28);
  const x=20+inset/2,y=20+inset/2,w=590-inset,h=840-inset,p=12+motion*8,arm=clamp((72+style.radius*1.5)*density,68,180);
  if(style.accentPreset==='none')return'';
  if(style.accentPreset==='random')return`<g opacity="${ao}">${randomAccentSvg(theme,{...style,accentOpacity:1},x,y,w,h)}</g>`;
  let out='';
  if(style.accentPreset==='corners'){
    out+=linePath(`M ${x+p} ${y+arm} V ${y+style.radius+8} Q ${x+p} ${y+p} ${x+style.radius+8} ${y+p} H ${x+arm}`,theme,a,ao);
    out+=linePath(`M ${x+w-p} ${y+arm} V ${y+style.radius+8} Q ${x+w-p} ${y+p} ${x+w-style.radius-8} ${y+p} H ${x+w-arm}`,theme,a,ao);
    out+=linePath(`M ${x+p} ${y+h-arm} V ${y+h-style.radius-8} Q ${x+p} ${y+h-p} ${x+style.radius+8} ${y+h-p} H ${x+arm}`,theme,a,ao);
    out+=linePath(`M ${x+w-p} ${y+h-arm} V ${y+h-style.radius-8} Q ${x+w-p} ${y+h-p} ${x+w-style.radius-8} ${y+h-p} H ${x+w-arm}`,theme,a,ao);
  }else if(style.accentPreset==='filigree'){
    const q=34*motion;
    out+=linePath(`M ${x+18} ${y+125} C ${x+18} ${y+66-q} ${x+72+q} ${y+28} ${x+150} ${y+28} C ${x+108} ${y+34} ${x+88} ${y+72} ${x+116} ${y+96} C ${x+138} ${y+114} ${x+164} ${y+86} ${x+146} ${y+65}`,theme,a*.72,ao);
    out+=linePath(`M ${x+w-18} ${y+125} C ${x+w-18} ${y+66-q} ${x+w-72-q} ${y+28} ${x+w-150} ${y+28} C ${x+w-108} ${y+34} ${x+w-88} ${y+72} ${x+w-116} ${y+96} C ${x+w-138} ${y+114} ${x+w-164} ${y+86} ${x+w-146} ${y+65}`,theme,a*.72,ao);
    out+=linePath(`M ${x+20} ${y+h-100} C ${x+72} ${y+h-36} ${x+136} ${y+h-72} ${x+180} ${y+h-28}`,theme,a*.62,ao*.82);
    out+=linePath(`M ${x+w-20} ${y+h-100} C ${x+w-72} ${y+h-36} ${x+w-136} ${y+h-72} ${x+w-180} ${y+h-28}`,theme,a*.62,ao*.82);
  }else if(style.accentPreset==='waves'){
    const amp=12*motion,segments=Math.max(2,Math.round(3*density));
    for(let i=0;i<segments;i++){const yy=y+190+i*95/density;out+=linePath(`M ${x+7} ${yy} C ${x+7+amp} ${yy-28} ${x+7+amp} ${yy+28} ${x+7} ${yy+56}`,theme,a*.52,ao*(.9-i*.08));out+=linePath(`M ${x+w-7} ${yy} C ${x+w-7-amp} ${yy-28} ${x+w-7-amp} ${yy+28} ${x+w-7} ${yy+56}`,theme,a*.52,ao*(.9-i*.08));}
  }else if(style.accentPreset==='slashes'){
    const count=Math.round(4*density),len=24+24*motion;
    for(let i=0;i<count;i++){const yy=y+170+i*(h-340)/Math.max(1,count-1);out+=linePath(`M ${x+5} ${yy+len} L ${x+5+len} ${yy}`,theme,a*.68,ao);out+=linePath(`M ${x+w-5} ${yy+len} L ${x+w-5-len} ${yy}`,theme,a*.68,ao);}
  }else if(style.accentPreset==='circuit'){
    const count=Math.round(3*density);
    for(let i=0;i<count;i++){const yy=y+190+i*150/density,dx=26+18*motion;out+=linePath(`M ${x+6} ${yy} H ${x+dx} v ${18+8*motion} h ${22+10*motion}`,theme,a*.48,ao);out+=`<circle cx="${x+dx+22+10*motion}" cy="${yy+18+8*motion}" r="2.6" fill="${theme}" opacity="${ao}"/>`;out+=linePath(`M ${x+w-6} ${yy} H ${x+w-dx} v ${18+8*motion} h ${-22-10*motion}`,theme,a*.48,ao);}
  }else if(style.accentPreset==='runes'){
    const count=Math.round(4*density),gap=(h-300)/Math.max(1,count-1);
    for(let i=0;i<count;i++){const yy=y+150+i*gap,s=8+5*motion;out+=linePath(`M ${x+8} ${yy-s} l ${s} ${s} -${s} ${s} M ${x+8+s} ${yy-s} v ${s*2}`,theme,a*.55,ao);out+=linePath(`M ${x+w-8} ${yy-s} l -${s} ${s} ${s} ${s} M ${x+w-8-s} ${yy-s} v ${s*2}`,theme,a*.55,ao);}
  }else if(style.accentPreset==='orbits'){
    const rx=42+20*motion,ry=14+8*motion;out+=`<g fill="none" stroke="${theme}" stroke-width="${a*.48}" opacity="${ao}"><ellipse cx="${x+95}" cy="${y+45}" rx="${rx}" ry="${ry}" transform="rotate(-12 ${x+95} ${y+45})"/><ellipse cx="${x+w-95}" cy="${y+h-45}" rx="${rx}" ry="${ry}" transform="rotate(-12 ${x+w-95} ${y+h-45})"/><circle cx="${x+95+rx*.65}" cy="${y+38}" r="3" fill="${theme}"/><circle cx="${x+w-95-rx*.65}" cy="${y+h-38}" r="3" fill="${theme}"/></g>`;
  }else if(style.accentPreset==='spines'){
    const count=Math.round(7*density),step=22/motion;for(let i=0;i<count;i++){const xx=x+80+i*step;out+=linePath(`M ${xx} ${y+7} l ${6*motion} ${14+8*motion}`,theme,a*.42,ao);const xb=x+w-80-i*step;out+=linePath(`M ${xb} ${y+h-7} l ${-6*motion} ${-14-8*motion}`,theme,a*.42,ao);}
  }else if(style.accentPreset==='ribbons'){
    out+=linePath(`M ${x+15} ${y+115} C ${x+80} ${y+80-motion*14} ${x+132} ${y+118+motion*12} ${x+182} ${y+62} S ${x+278} ${y+22} ${x+330} ${y+52}`,theme,a*.65,ao);
    out+=linePath(`M ${x+w-15} ${y+h-115} C ${x+w-80} ${y+h-80+motion*14} ${x+w-132} ${y+h-118-motion*12} ${x+w-182} ${y+h-62} S ${x+w-278} ${y+h-22} ${x+w-330} ${y+h-52}`,theme,a*.65,ao);
  }else if(style.accentPreset==='fragments'){
    const count=Math.round(7*density);for(let i=0;i<count;i++){const t=(i+.5)/count,yy=y+120+t*(h-240),len=8+22*motion*(i%3+1)/3;out+=linePath(`M ${x+8} ${yy} l ${len} ${-len*.35}`,theme,a*(.3+.15*(i%3)),ao*(.55+.08*(i%3)));out+=linePath(`M ${x+w-8} ${yy+14} l ${-len} ${len*.35}`,theme,a*(.3+.15*((i+1)%3)),ao*(.55+.08*((i+1)%3)));}
  }else{
    out+=linePath(`M ${x+10} ${y+195} V ${y+310}`,theme,a*.48,ao);out+=linePath(`M ${x+w-10} ${y+195} V ${y+310}`,theme,a*.48,ao);out+=linePath(`M ${x+10} ${y+h-310} V ${y+h-195}`,theme,a*.48,ao);out+=linePath(`M ${x+w-10} ${y+h-310} V ${y+h-195}`,theme,a*.48,ao);
  }
  return out;
}
function frameSvg(theme:string,style:FrameStyle,layerOpacity:number){return`${frameBaseSvg(theme,style,layerOpacity)}${frameAccentSvg(theme,style,layerOpacity)}`}

function renderSlots(meta:Detail[],layerOpacity:number,theme:string,y:number,x0:number,totalWidth:number,style:TextStyle){
  if(!meta.length||layerOpacity<=0)return'';
  const g=12,sw=(totalWidth-g*(meta.length-1))/meta.length,family=esc(fontStack(style.family));
  return meta.map((m,i)=>{const x=x0+i*(sw+g),o=layerOpacity*clamp01(m.opacity,1),text=String(m.value||m.label||''),fontSize=fitFontSize(text,clamp(style.size,9,24),9,Math.max(24,sw-76));return editable(`meta-${i}`,`Informazione ${i+1}`,`<g opacity="${o}"><rect x="${x}" y="${y}" width="${sw}" height="48" rx="24" fill="#07141e" fill-opacity=".80" stroke="#eee6da" stroke-width="1.35"/><path d="M ${x+26} ${y+5} H ${x+sw-26}" stroke="${theme}" stroke-width="1.7" stroke-linecap="round" opacity=".82"/>${editable(`meta-icon-${i}`,`Simbolo informazione ${i+1}`,slotIcon(i,x+28,y+24))}<text x="${x+52}" y="${y+24}" dominant-baseline="middle" fill="#f4efe5" font-size="${fontSize.toFixed(2)}" font-family="${family}" font-weight="700">${esc(text)}</text></g>`) }).join('');
}
function renderEffects(effects:Detail[],y:number,x:number,w:number,h:number,style:TextStyle){
  if(!effects.length)return'';
  const family=esc(fontStack(style.family)),maxWidth=w-34,availableHeight=h-34;
  let size=clamp(style.size,9,26),laid:{text:string;opacity:number;first:boolean;index:number}[]=[];
  for(let pass=0;pass<4;pass++){
    laid=[];
    effects.forEach((e,idx)=>{
      const text=`${e.label?`${e.label}: `:''}${e.value}`.trim(),lines=wrapByWidth(text,maxWidth,size,9),opacity=clamp01(e.opacity,1);
      lines.forEach((line,j)=>laid.push({text:line,opacity,first:j===0,index:idx}));
      if(idx<effects.length-1)laid.push({text:'',opacity:0,first:false,index:idx});
    });
    const rowHeight=size*1.34,totalHeight=Math.max(1,laid.length)*rowHeight;
    if(totalHeight<=availableHeight||size<=9.1)break;
    size=clamp(size*(availableHeight/totalHeight)*.96,9,size-.5);
  }
  const lineHeight=size*1.34,start=y+20;
  return effects.map((_,idx)=>editable(`effect-${idx}`,`Testo effetto ${idx+1}`,laid.map((line,row)=>line.index===idx&&line.text?`<text x="${x+18}" y="${start+row*lineHeight}" dominant-baseline="hanging" fill="#1e3343" font-size="${size.toFixed(2)}" font-family="${family}" font-weight="${line.first?700:500}" opacity="${line.opacity}">${esc(line.text)}</text>`:'').join(''))).join('');
}
function renderStats(stats:Stat[],id:string,statsOpacity:number,idOpacity:number,theme:string,x0:number,total:number,style:TextStyle){
  const y=786,h=50,g=10,idW=132,idX=x0+total-idW,usable=idX-x0-(stats.length?g:0),sw=stats.length?(usable-g*(stats.length-1))/stats.length:0,family=esc(fontStack(style.family));
  const statNodes=stats.map((s,i)=>{const x=x0+i*(sw+g),fill=({ATK:'#9c1d2e',RES:'#02618f',PRF:'#b47a13',PV:'#5f4a84'}as any)[s.kind.toUpperCase()]||'#2d4456',o=statsOpacity*clamp01(s.opacity,1),divider=x+42,valueX=divider+(x+sw-divider)/2,value=String(s.value||''),fontSize=fitFontSize(value,clamp(style.size,10,28),10,Math.max(20,sw-50));return editable(`stat-${i}`,`Valore ${i+1}`,`<g opacity="${o}"><path d="${bevel(x,y,sw,h)}" fill="${fill}" fill-opacity=".94" stroke="#eee5d8" stroke-width="1.8"/><path d="${bevel(x+3,y+3,sw-6,h-6,10)}" fill="none" stroke="#142836" stroke-width="1.2"/><line x1="${divider}" y1="${y+7}" x2="${divider}" y2="${y+h-7}" stroke="#142836" stroke-width="1.1"/>${editable(`stat-icon-${i}`,`Simbolo valore ${i+1}`,statIcon(s.kind,x+21,y+25))}<text x="${valueX}" y="${y+25}" dominant-baseline="middle" text-anchor="middle" fill="#f5f0e8" font-size="${fontSize.toFixed(2)}" font-family="${family}" font-weight="700">${esc(value)}</text></g>`) }).join('');
  const idSize=fitFontSize(id,13,9,idW-58),idNode=editable('id','Codice carta',`<g opacity="${idOpacity}"><path d="${bevel(idX,y,idW,h)}" fill="#0b1822" fill-opacity=".90" stroke="#eee5d8" stroke-width="1.8"/><path d="M ${idX+13} ${y+25} L ${idX+23} ${y+15} H ${idX+35} L ${idX+45} ${y+25} L ${idX+35} ${y+35} H ${idX+23} Z" fill="#9a9da6" opacity=".70"/><text x="${idX+29}" y="${y+25}" dominant-baseline="middle" text-anchor="middle" fill="#eee7dc" font-size="12" font-family="${family}" font-weight="700">ID</text><text x="${idX+53}" y="${y+25}" dominant-baseline="middle" fill="#eee7dc" font-size="${idSize.toFixed(2)}" font-family="${family}" font-weight="700">${esc(id)}</text></g>`);
  return{statNodes,idNode};
}

function svg(card:Card){
  const theme=card.scopeColor||'#1d5c6b',layers={...DEFAULT_LAYERS,...card.layers},frame={...DEFAULT_FRAME,...card.frame},typography=normalizeTypography(card.typography),rarity=isRarity(card.rarity)?card.rarity:'common';
  const scale=clamp(card.artScale??1,.4,3.5),ox=card.artX??0,oy=card.artY??0,baseX=20,baseY=20,baseW=590,baseH=840,iw=baseW*scale,ih=baseH*scale,ix=baseX-(iw-baseW)/2+ox,iy=baseY-(ih-baseH)/2+oy;
  const artFilter=rarity!=='common'?` filter="url(#art-${rarity})"`:'';
  const art=card.art?`<image href="${esc(card.art)}" x="${ix}" y="${iy}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid slice" clip-path="url(#cardClip)" opacity="${clamp01(layers.artwork,1)}"${artFilter}/>`:`<rect x="20" y="20" width="590" height="840" rx="28" fill="#18232b" opacity=".9"/>`;
  const costVisible=card.type!=='token'&&card.type!=='objective',frameO=clamp01(layers.frame,1),headerO=clamp01(layers.header,1),costO=clamp01(layers.cost,1),metaO=clamp01(layers.meta,1),effectO=clamp01(layers.effect,1),statsO=clamp01(layers.stats,1),idO=clamp01(layers.id,1);
  const contentX=clamp(52+frame.inset*.55+frame.size*.45,58,74),contentW=630-contentX*2,headerH=72,headerY=clamp(43+frame.inset*.30+frame.size*.25,47,58),headerCy=headerY+headerH/2,costR=38,costCx=contentX+25;
  const headerX=costVisible?costCx+49:contentX,headerRight=630-contentX,headerW=headerRight-headerX,diamondX=headerRight-28,titleX=headerX+28,titleMax=Math.max(80,diamondX-titleX-29);
  const titleSize=fitFontSize(card.name,clamp(typography.title.size,11,38),11,titleMax),costSize=fitFontSize(card.cost||'',clamp(typography.cost.size,10,34),10,costR*1.38);
  const titleFamily=esc(fontStack(typography.title.family)),costFamily=esc(fontStack(typography.cost.family));
  const hasMeta=card.meta.length>0,hasEffects=card.effects.length>0,metaY=hasEffects?566:714,effectY=hasMeta?624:566,effectH=hasMeta?145:204;
  const{statNodes,idNode}=renderStats(card.stats,card.id,statsO,idO,theme,contentX,contentW,typography.stats);
  return applyEdits(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 630 880" width="630" height="880"><defs>
    <clipPath id="cardClip"><rect x="20" y="20" width="590" height="840" rx="28"/></clipPath>
    <linearGradient id="paperGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f4ede2"/><stop offset="100%" stop-color="#e6ddcf"/></linearGradient>
    <filter id="paperNoise" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="5" result="n"/><feColorMatrix in="n" type="saturate" values="0" result="m"/><feComponentTransfer in="m" result="f"><feFuncA type="table" tableValues="0 .08"/></feComponentTransfer><feBlend in="SourceGraphic" in2="f" mode="multiply"/></filter>
    ${rarityDefs()}
  </defs>
  <rect width="630" height="880" fill="#fff"/>${editable('artwork','Illustrazione',art)}
  ${editable('rarity-art','Finitura illustrazione',renderRarityArtOverlay(rarity))}
  ${editable('frame','Cornice',frameBaseSvg(theme,frame,frameO))}${editable('accents','Decorazioni',frameAccentSvg(theme,frame,frameO))}
  <g data-live-id="header" data-live-label="Titolo e riquadro" opacity="${headerO}"><rect x="${headerX}" y="${headerY}" width="${headerW}" height="${headerH}" rx="24" fill="url(#paperGrad)" fill-opacity=".92" filter="url(#paperNoise)" stroke="#efe6d8" stroke-width="1.4"/><rect x="${headerX+5}" y="${headerY+5}" width="${headerW-10}" height="${headerH-10}" rx="20" fill="none" stroke="${theme}" stroke-width="1.8" opacity=".9"/><g data-live-id="title" data-live-label="Testo del titolo"><text x="${titleX}" y="${headerCy}" dominant-baseline="middle" fill="#213749" font-size="${titleSize.toFixed(2)}" font-family="${titleFamily}" font-weight="700">${esc(card.name)}</text></g>${editable('diamond','Simbolo del titolo',diamond(theme,diamondX,headerCy))}</g>
  ${costVisible?`<g data-live-id="cost" data-live-label="Costo" opacity="${costO}"><circle cx="${costCx}" cy="${headerCy}" r="${costR}" fill="#0b1720" stroke="${theme}" stroke-width="2.4"/><circle cx="${costCx}" cy="${headerCy}" r="31.5" fill="url(#paperGrad)" filter="url(#paperNoise)" stroke="#eee6da" stroke-width="1.5"/><circle cx="${costCx}" cy="${headerCy}" r="28" fill="none" stroke="#173040" stroke-width="1.5"/><g data-live-id="cost-value" data-live-label="Testo del costo"><text x="${costCx}" y="${headerCy}" dominant-baseline="middle" text-anchor="middle" fill="#173040" font-size="${costSize.toFixed(2)}" font-family="${costFamily}" font-weight="700">${esc(card.cost||'')}</text></g></g>`:''}
  ${renderSlots(card.meta,metaO,theme,metaY,contentX,contentW,typography.meta)}
  ${hasEffects?`<g data-live-id="effects" data-live-label="Riquadro effetti" opacity="${effectO}"><rect x="${contentX}" y="${effectY}" width="${contentW}" height="${effectH}" rx="18" fill="url(#paperGrad)" fill-opacity=".78" filter="url(#paperNoise)" stroke="#eee6da" stroke-width="1.2"/><rect x="${contentX+5}" y="${effectY+5}" width="${contentW-10}" height="${effectH-10}" rx="14" fill="none" stroke="#173040" stroke-width="1.4" opacity=".92"/>${renderEffects(card.effects,effectY,contentX,contentW,effectH,typography.effect)}</g>`:''}
  ${statNodes}${idNode}
  ${editable('rarity-surface','Riflessi e finitura',renderRaritySurface(rarity))}${renderExtras(card.extras)}
  </svg>`,card.liveEdits);
}

function RangeField({label,value,min,max,step=1,onChange,suffix=''}:{label:string;value:number;min:number;max:number;step?:number;onChange:(v:number)=>void;suffix?:string}){return <label className="rangeField"><span><span>{label}</span><b>{Number.isInteger(step)?Math.round(value):value.toFixed(step<.1?2:1)}{suffix}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
function OpacityField({label,value,onChange}:{label:string;value:number|undefined;onChange:(v:number)=>void}){const v=clamp01(value,1);return <RangeField label={label} value={v*100} min={0} max={100} onChange={n=>onChange(n/100)} suffix="%"/>}
function TypographyControls({label,value,onChange,min,max}:{label:string;value:TextStyle;onChange:(patch:Partial<TextStyle>)=>void;min:number;max:number}){return <><label>{label} — font<select value={value.family} onChange={e=>onChange({family:e.target.value})}>{FONT_OPTIONS.map(font=><option key={font} value={font}>{font}</option>)}</select></label><RangeField label={`${label} — dimensione`} value={value.size} min={min} max={max} step={1} onChange={size=>onChange({size})} suffix=" pt"/></>}

function App(){
  const store=useLocalStore(),history=useHistory<Card>(()=>{try{return normalizeCard(JSON.parse(localStorage.getItem('kritoma.cardDraft')||'null')||store.cards[0]||DEFAULT)}catch{return normalizeCard(store.cards[0]||DEFAULT)}}),card=history.value,setCard=history.set,[settingsOpen,setSettingsOpen]=useState(false);
  const [liveMode,setLiveMode]=useState(true);
  useEffect(()=>{localStorage.setItem('kritoma.cardDraft',JSON.stringify(card))},[card]);
  const[editorMode,setEditorMode]=useState<'card'|'terrain'>('card');
  const [foilPreview,setFoilPreview]=useState(()=>localStorage.getItem('kritoma.foilPreview')!=='false');
  const [reduceMotion,setReduceMotion]=useState(()=>{const saved=localStorage.getItem('kritoma.reduceMotion');return saved!==null?saved==='true':window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false});
  const [tilt,setTilt]=useState<TiltState>(NEUTRAL_TILT),previewRef=useRef<HTMLDivElement>(null),draggingRef=useRef(false),inputRef=useRef<HTMLInputElement>(null),markup=useMemo(()=>svg(card),[card]);
  useEffect(()=>{localStorage.setItem('kritoma.foilPreview',String(foilPreview));if(!foilPreview)setTilt(NEUTRAL_TILT)},[foilPreview]);
  useEffect(()=>{localStorage.setItem('kritoma.reduceMotion',String(reduceMotion))},[reduceMotion]);
  const update=(p:Partial<Card>)=>setCard(normalizeCard({...card,...p}));
  const updateLayer=(key:keyof LayerOpacity,value:number)=>update({layers:{...card.layers,[key]:value}});
  const updateFrame=(key:keyof FrameStyle,value:FrameStyle[keyof FrameStyle])=>update({frame:{...card.frame,[key]:value}});
  const updateTypography=(role:TextRole,patch:Partial<TextStyle>)=>update({typography:{...card.typography,[role]:{...normalizeTypography(card.typography)[role],...patch}}});
  const randomizeFrame=()=>update({frame:{...card.frame,framePreset:'random',frameSeed:nextSeed(frame.frameSeed)}});
  const randomizeAccents=()=>update({frame:{...card.frame,accentPreset:'random',accentSeed:nextSeed(frame.accentSeed)}});
  const save=()=>store.save([...store.cards.filter(c=>c.id!==card.id),card]);
  const resetArt=()=>update({artScale:1,artX:0,artY:0});
  const download=(name:string,blob:Blob)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)};
  const exportSvg=()=>download(`${card.id}.svg`,new Blob([markup],{type:'image/svg+xml'}));
  const raster=(cb:(canvas:HTMLCanvasElement)=>void)=>{const u=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml'})),im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=1890;c.height=2640;c.getContext('2d')!.drawImage(im,0,0,c.width,c.height);cb(c);URL.revokeObjectURL(u)};im.src=u};
  const exportPng=()=>raster(c=>c.toBlob(b=>b&&download(`${card.id}.png`,b),'image/png'));
  const exportPdf=()=>raster(c=>{const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:[63,88]});pdf.addImage(c.toDataURL('image/png'),'PNG',0,0,63,88);pdf.save(`${card.id}-print.pdf`)});
  const frame={...DEFAULT_FRAME,...card.frame},typography=normalizeTypography(card.typography),rarity=isRarity(card.rarity)?card.rarity:'common',previewFx=RARITY_PREVIEW[rarity];
  const resetTilt=()=>{draggingRef.current=false;setTilt(NEUTRAL_TILT)};
  const updateTilt=(e:React.PointerEvent<HTMLDivElement>,force=false)=>{
    if(!foilPreview||(!force&&e.pointerType!=='mouse'&&!draggingRef.current))return;
    const el=previewRef.current;if(!el)return;const rect=el.getBoundingClientRect();
    const px=clamp((e.clientX-rect.left)/Math.max(1,rect.width),0,1),py=clamp((e.clientY-rect.top)/Math.max(1,rect.height),0,1);
    const maxX=reduceMotion?2.5:8,maxY=reduceMotion?3:10;
    setTilt({rx:(.5-py)*maxX*2,ry:(px-.5)*maxY*2,glareX:px*100,glareY:py*100,active:true});
  };
  const handlePointerDown=(e:React.PointerEvent<HTMLDivElement>)=>{if(!foilPreview)return;if(e.pointerType!=='mouse'){draggingRef.current=true;try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}}updateTilt(e,true)};
  const handlePointerMove=(e:React.PointerEvent<HTMLDivElement>)=>updateTilt(e);
  const handlePointerUp=(e:React.PointerEvent<HTMLDivElement>)=>{if(e.pointerType!=='mouse'){try{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}catch{}resetTilt()}};
  const handlePointerLeave=(e:React.PointerEvent<HTMLDivElement>)=>{if(e.pointerType==='mouse'&&!draggingRef.current)resetTilt()};
  const previewStyle={
    '--tilt-rx':`${tilt.rx.toFixed(2)}deg`,'--tilt-ry':`${tilt.ry.toFixed(2)}deg`,'--glare-x':`${tilt.glareX.toFixed(1)}%`,'--glare-y':`${tilt.glareY.toFixed(1)}%`,
    '--glare-opacity':String(foilPreview?previewFx.glare:0),'--holo-opacity':String(foilPreview?previewFx.holo:0),'--sparkle-opacity':String(foilPreview?previewFx.sparkle:0)
  } as React.CSSProperties;

  if(editorMode==='terrain')return <TerrainEditor onSwitchToCard={()=>setEditorMode('card')}/>;

  return <div className="appShell">
    <header className="topBar"><EditorSwitcher current="card" onCard={()=>{}} onTerrain={()=>setEditorMode('terrain')}/><button className="settingsButton" onClick={()=>setSettingsOpen(true)} aria-label="Apri impostazioni"><span>☰</span><b>Avanzate</b></button></header>
    {liveMode?<LiveEditor markup={markup} width={630} height={880} edits={card.liveEdits} onChange={liveEdits=>update({liveEdits})} history={history} onAdd={kind=>{const id=`custom-${crypto.randomUUID()}`;update({extras:[...(card.extras||[]),{id,kind,text:'Nuovo testo',x:150,y:350,w:180,h:80}]});return id;}} onDelete={id=>{const liveEdits={...card.liveEdits};delete liveEdits[id];update({extras:card.extras?.filter(v=>v.id!==id),liveEdits});}} onAdvanced={()=>setSettingsOpen(true)}>{id=>{
      const field=(label:string,value:string,change:(v:string)=>void)=><label>{label}<textarea value={value} onChange={e=>change(e.target.value)}/></label>;
      if(id.startsWith('custom-')){const item=card.extras?.find(v=>v.id===id);return item?.kind==='text'?field('Testo libero',item.text,text=>update({extras:card.extras?.map(v=>v.id===id?{...v,text}:v)})):null;}
      if(id==='header'||id==='title')return field('Nome della carta',card.name,name=>update({name}));
      if(id==='cost'||id==='cost-value')return field('Costo',card.cost||'',cost=>update({cost}));
      if(id==='id')return field('Codice della carta',card.id,id=>update({id}));
      if(/^meta-\d+$/.test(id)){const i=Number(id.split('-')[1]);return field('Informazione',card.meta[i]?.value||'',value=>update({meta:card.meta.map((m,j)=>j===i?{...m,value}:m)}));}
      if(id.startsWith('effect-')){const i=Number(id.split('-')[1]),item=card.effects[i];return item&&<>{field('Etichetta',item.label,label=>update({effects:card.effects.map((m,j)=>j===i?{...m,label}:m)}))}{field('Testo effetto',item.value,value=>update({effects:card.effects.map((m,j)=>j===i?{...m,value}:m)}))}</>;}
      if(/^stat-\d+$/.test(id)){const i=Number(id.split('-')[1]),item=card.stats[i];return item&&<>{field('Tipo di valore (ATK, RES, PRF, PV)',item.kind,kind=>update({stats:card.stats.map((m,j)=>j===i?{...m,kind}:m)}))}{field('Valore',item.value,value=>update({stats:card.stats.map((m,j)=>j===i?{...m,value}:m)}))}</>;}
      if(id==='artwork')return <label>Carica illustrazione<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f){const r=new FileReader();r.onload=()=>update({art:String(r.result)});r.readAsDataURL(f);}}}/></label>;
      if(id==='frame')return <label>Forma della cornice<select value={frame.framePreset} onChange={e=>updateFrame('framePreset',e.target.value as FramePreset)}>{FRAME_PRESETS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>;
      if(id==='accents')return <label>Decorazione<select value={frame.accentPreset} onChange={e=>updateFrame('accentPreset',e.target.value as AccentPreset)}>{ACCENT_PRESETS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>;
      if(id.startsWith('rarity-'))return <label>Finitura della carta<select value={rarity} onChange={e=>update({rarity:e.target.value as RarityKey})}>{Object.entries(RARITIES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>;
      return <small>Modifica l’aspetto con i controlli sotto. Aggiungi o rimuovi testi nelle impostazioni avanzate.</small>;
    }}</LiveEditor>:<main className="workspace"><div className="previewWrap"><div ref={previewRef} className={`interactiveCard rarity-${rarity}${tilt.active?' isActive':''}${foilPreview?'':' isDisabled'}`} style={previewStyle} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={resetTilt} onPointerLeave={handlePointerLeave} aria-label="Anteprima carta interattiva: muovi il mouse o trascina con il dito per simulare i riflessi"><div className="preview" dangerouslySetInnerHTML={{__html:markup}}/>{foilPreview&&<div className="foilPreviewLayers" aria-hidden="true"><div className="foilHolo"/><div className="foilSparkle"/><div className="foilGlare"/></div>}</div></div></main>}
    <nav className="bottomDock"><button onClick={save}>Salva</button><button onClick={()=>{setLiveMode(v=>!v);resetTilt();}}>{liveMode?'Anteprima':'Live edit'}</button><button onClick={exportPng}>PNG</button><button onClick={exportPdf}>PDF</button></nav>

    {settingsOpen&&<div className="sheetBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSettingsOpen(false)}}><section className="settingsSheet" role="dialog" aria-modal="true" aria-label="Impostazioni carta">
      <div className="sheetHandle"/>
      <header className="sheetHeader"><div><strong>Impostazioni carta</strong><small>Le modifiche aggiornano la preview in tempo reale</small></div><button className="closeButton" onClick={()=>setSettingsOpen(false)}>Fatto</button></header>
      <div className="settingsScroll">
        <details className="settingsGroup" open><summary><span><b>Carta</b><small>Tipo, nome, ambito, rarità e identificazione</small></span><i>›</i></summary><div className="settingsBody">
          <label>Tipologia<select value={card.type} onChange={e=>setCard(preset(e.target.value as CardType))}>{Object.entries(TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          <label>Nome<input value={card.name} onChange={e=>update({name:e.target.value})}/></label>
          <div className="fieldGrid"><label>ID<input value={card.id} onChange={e=>update({id:e.target.value})}/></label><label>Ambito<select value={card.scope} onChange={e=>update({scope:e.target.value,scopeColor:scopeDefault[e.target.value]||card.scopeColor})}>{Object.keys(scopeDefault).map(x=><option key={x}>{x}</option>)}</select></label></div>
          <label className="colorRow"><span>Colore tema</span><input type="color" value={card.scopeColor} onChange={e=>update({scopeColor:e.target.value})}/></label>
          {card.type!=='token'&&card.type!=='objective'&&<label>Costo / materiali<input value={card.cost||''} onChange={e=>update({cost:e.target.value})}/></label>}
          <label>Rarità<select value={card.rarity||'common'} onChange={e=>update({rarity:e.target.value as RarityKey})}>{Object.entries(RARITIES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          <small>La rarità applica color grading, foil e dettagli olografici all’intera carta, inclusa l’illustrazione.</small>
          <div className="previewMotionControls"><label className="toggleRow"><span><b>Preview foil dinamica</b><small>Mouse in hover su desktop; trascina la carta con il dito su mobile.</small></span><input type="checkbox" checked={foilPreview} onChange={e=>setFoilPreview(e.target.checked)}/></label><label className="toggleRow"><span><b>Riduci movimento</b><small>Limita l’inclinazione mantenendo i giochi di luce.</small></span><input type="checkbox" checked={reduceMotion} onChange={e=>setReduceMotion(e.target.checked)}/></label></div>
        </div></details>

        <details className="settingsGroup"><summary><span><b>Illustrazione</b><small>Full bleed, posizione e trasparenza</small></span><i>›</i></summary><div className="settingsBody">
          <input ref={inputRef} hidden type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>update({art:String(r.result)});r.readAsDataURL(f)}}/>
          <button className="wideButton" onClick={()=>inputRef.current?.click()}>Carica / sostituisci illustrazione</button>
          <RangeField label="Zoom" value={card.artScale??1} min={.4} max={3.5} step={.01} onChange={v=>update({artScale:v})} suffix="×"/>
          <RangeField label="Posizione X" value={card.artX??0} min={-280} max={280} onChange={v=>update({artX:v})}/>
          <RangeField label="Posizione Y" value={card.artY??0} min={-360} max={360} onChange={v=>update({artY:v})}/>
          <OpacityField label="Opacità illustrazione" value={card.layers?.artwork} onChange={v=>updateLayer('artwork',v)}/>
          <button className="secondary wideButton" onClick={resetArt}>Reset posizione e zoom</button>
        </div></details>

        <details className="settingsGroup"><summary><span><b>Cornice</b><small>Preset, forme generative e accenti indipendenti</small></span><i>›</i></summary><div className="settingsBody">
          <label>Tipo cornice<select value={frame.framePreset} onChange={e=>updateFrame('framePreset',e.target.value as FramePreset)}>{frame.framePreset==='random'&&<option value="random">Generata casualmente</option>}{FRAME_PRESETS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
          <button className="wideButton" onClick={randomizeFrame}>🎲 Randomize cornice</button>
          <small>Ogni randomizzazione genera una geometria procedurale nuova, non inclusa nei preset.</small>
          <RangeField label="Spessore bordo" value={frame.size} min={1} max={10} step={.1} onChange={v=>updateFrame('size',v)}/>
          <RangeField label="Angoli arrotondati" value={frame.radius} min={8} max={46} onChange={v=>updateFrame('radius',v)}/>
          <RangeField label="Inset" value={frame.inset} min={4} max={28} onChange={v=>updateFrame('inset',v)}/>
          <OpacityField label="Opacità bordo" value={frame.opacity} onChange={v=>updateFrame('opacity',v)}/>
          <OpacityField label="Dettaglio / seconda linea" value={frame.frameDetail} onChange={v=>updateFrame('frameDetail',v)}/>
          <label>Tipo accenti<select value={frame.accentPreset} onChange={e=>updateFrame('accentPreset',e.target.value as AccentPreset)}>{frame.accentPreset==='random'&&<option value="random">Generati casualmente</option>}{ACCENT_PRESETS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
          <button className="wideButton" onClick={randomizeAccents}>🎲 Randomize accenti</button>
          <small>Il random degli accenti è indipendente dalla cornice e crea curve/linee con seed sempre nuovo.</small>
          <RangeField label="Spessore accenti" value={frame.accentSize} min={.5} max={7} step={.1} onChange={v=>updateFrame('accentSize',v)}/>
          <OpacityField label="Opacità accenti" value={frame.accentOpacity} onChange={v=>updateFrame('accentOpacity',v)}/>
          <RangeField label="Densità accenti" value={frame.accentDensity} min={.5} max={1.8} step={.05} onChange={v=>updateFrame('accentDensity',v)} suffix="×"/>
          <RangeField label="Movimento / curva" value={frame.accentMotion} min={.2} max={1.8} step={.05} onChange={v=>updateFrame('accentMotion',v)} suffix="×"/>
          <OpacityField label="Opacità layer cornice" value={card.layers?.frame} onChange={v=>updateLayer('frame',v)}/>
        </div></details>

        <details className="settingsGroup"><summary><span><b>Testata</b><small>Nome, costo, font e medaglione</small></span><i>›</i></summary><div className="settingsBody">
          <TypographyControls label="Titolo" value={typography.title} onChange={patch=>updateTypography('title',patch)} min={11} max={38}/>
          <TypographyControls label="Costo" value={typography.cost} onChange={patch=>updateTypography('cost',patch)} min={10} max={34}/>
          <OpacityField label="Opacità nome" value={card.layers?.header} onChange={v=>updateLayer('header',v)}/><OpacityField label="Opacità costo / livello" value={card.layers?.cost} onChange={v=>updateLayer('cost',v)}/>
        </div></details>

        <details className="settingsGroup"><summary><span><b>Slot</b><small>Archetipo, tipo, font e campi opzionali</small></span><i>›</i></summary><div className="settingsBody">
          <TypographyControls label="Archetipi / slot" value={typography.meta} onChange={patch=>updateTypography('meta',patch)} min={9} max={24}/>
          <OpacityField label="Opacità globale slot" value={card.layers?.meta} onChange={v=>updateLayer('meta',v)}/>
          {card.meta.map((m,i)=><div className="itemEditor" key={i}><div className="itemHeader"><b>Slot {i+1}</b><button onClick={()=>update({meta:card.meta.filter((_,j)=>j!==i)})}>Rimuovi</button></div><input value={m.value} onChange={e=>{const n=[...card.meta];n[i]={...m,value:e.target.value};update({meta:n})}}/><OpacityField label="Opacità" value={m.opacity} onChange={v=>{const n=[...card.meta];n[i]={...m,opacity:v};update({meta:n})}}/></div>)}
          <button className="wideButton" onClick={()=>update({meta:[...card.meta,{label:'',value:'Campo',opacity:1}]})}>+ Aggiungi slot</button>
        </div></details>

        <details className="settingsGroup"><summary><span><b>Effetti</b><small>Box, font e sottocampi testuali</small></span><i>›</i></summary><div className="settingsBody">
          <TypographyControls label="Effetti" value={typography.effect} onChange={patch=>updateTypography('effect',patch)} min={9} max={26}/>
          <OpacityField label="Opacità box effetto" value={card.layers?.effect} onChange={v=>updateLayer('effect',v)}/>
          {card.effects.map((m,i)=><div className="itemEditor" key={i}><div className="itemHeader"><b>Effetto {i+1}</b><button onClick={()=>update({effects:card.effects.filter((_,j)=>j!==i)})}>Rimuovi</button></div><input placeholder="Etichetta" value={m.label} onChange={e=>{const n=[...card.effects];n[i]={...m,label:e.target.value};update({effects:n})}}/><textarea placeholder="Testo" value={m.value} onChange={e=>{const n=[...card.effects];n[i]={...m,value:e.target.value};update({effects:n})}}/><OpacityField label="Opacità testo" value={m.opacity} onChange={v=>{const n=[...card.effects];n[i]={...m,opacity:v};update({effects:n})}}/></div>)}
          <button className="wideButton" onClick={()=>update({effects:[...card.effects,{label:'',value:'Dettaglio',opacity:1}]})}>+ Aggiungi effetto</button>
        </div></details>

        <details className="settingsGroup"><summary><span><b>Statistiche</b><small>ATK, RES, PRF, font e varianti</small></span><i>›</i></summary><div className="settingsBody">
          <TypographyControls label="Statistiche" value={typography.stats} onChange={patch=>updateTypography('stats',patch)} min={10} max={28}/>
          <OpacityField label="Opacità statistiche" value={card.layers?.stats} onChange={v=>updateLayer('stats',v)}/><OpacityField label="Opacità ID" value={card.layers?.id} onChange={v=>updateLayer('id',v)}/>
          {card.stats.map((s,i)=><div className="itemEditor" key={i}><div className="itemHeader"><b>{s.kind||`Stat ${i+1}`}</b><button onClick={()=>update({stats:card.stats.filter((_,j)=>j!==i)})}>Rimuovi</button></div><div className="fieldGrid"><input value={s.kind} onChange={e=>{const n=[...card.stats];n[i]={...s,kind:e.target.value};update({stats:n})}}/><input placeholder="Valore" value={s.value} onChange={e=>{const n=[...card.stats];n[i]={...s,value:e.target.value};update({stats:n})}}/></div><OpacityField label="Opacità" value={s.opacity} onChange={v=>{const n=[...card.stats];n[i]={...s,opacity:v};update({stats:n})}}/></div>)}
          <button className="wideButton" onClick={()=>update({stats:[...card.stats,{kind:'STAT',value:'',opacity:1}]})}>+ Aggiungi statistica</button>
        </div></details>

        <details className="settingsGroup"><summary><span><b>Esporta</b><small>Salvataggio e file finali</small></span><i>›</i></summary><div className="settingsBody exportGrid"><button onClick={save}>Salva cache</button><button onClick={exportSvg}>SVG</button><button onClick={exportPng}>PNG 300dpi</button><button onClick={exportPdf}>PDF stampa</button></div></details>
      </div>
    </section></div>}
  </div>
}

createRoot(document.getElementById('root')!).render(<App/>);
