import React,{useMemo,useRef,useState}from'react';
import{createRoot}from'react-dom/client';
import jsPDF from'jspdf';
import'./styles.css';

type CardType='fighter'|'location'|'action'|'extraFighter'|'objective'|'token';
type Detail={label:string;value:string;icon?:string;opacity?:number};
type Stat={kind:string;value:string;opacity?:number};
type LayerOpacity={frame:number;header:number;cost:number;meta:number;effect:number;stats:number;id:number;artwork:number};
type FrameStyle={size:number;radius:number;opacity:number;accentSize:number;accentOpacity:number;inset:number};
type TextRole='cost'|'title'|'meta'|'effect'|'stats';
type TextStyle={size:number;family:string};
type TypographyStyle=Record<TextRole,TextStyle>;
type Card={
  id:string;type:CardType;name:string;scope:string;scopeColor:string;cost?:string;rarity?:string;
  meta:Detail[];effects:Detail[];stats:Stat[];art?:string;
  artScale?:number;artX?:number;artY?:number;layers?:Partial<LayerOpacity>;frame?:Partial<FrameStyle>;
  typography?:Partial<Record<TextRole,Partial<TextStyle>>>;
};

const TYPES:Record<CardType,string>={fighter:'Combattente',location:'Luogo',action:'Azione',extraFighter:'ExtraCombattente',objective:'Obiettivo',token:'Token'};
const DEFAULT_LAYERS:LayerOpacity={frame:1,header:.96,cost:1,meta:.94,effect:.90,stats:.98,id:.98,artwork:1};
const DEFAULT_FRAME:FrameStyle={size:3.2,radius:26,opacity:.92,accentSize:2.2,accentOpacity:.72,inset:10};
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
  id:'KRT-001',type:'fighter',name:'Nome Carta',scope:'Informatica',scopeColor:'#1d5c6b',cost:'',rarity:'',
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
function normalizeTypography(input:any):TypographyStyle{return{
  cost:{...DEFAULT_TYPOGRAPHY.cost,...(input?.cost||{})},
  title:{...DEFAULT_TYPOGRAPHY.title,...(input?.title||{})},
  meta:{...DEFAULT_TYPOGRAPHY.meta,...(input?.meta||{})},
  effect:{...DEFAULT_TYPOGRAPHY.effect,...(input?.effect||{})},
  stats:{...DEFAULT_TYPOGRAPHY.stats,...(input?.stats||{})}
}}

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

function normalizeDetail(x:Detail):Detail{return{...x,opacity:clamp01(x.opacity,1)}}
function normalizeStat(x:Stat):Stat{return{...x,opacity:clamp01(x.opacity,1)}}
function normalizeCard(c:Card):Card{const legacy:any=c||{};return{
  ...DEFAULT,...legacy,
  meta:(legacy.meta??DEFAULT.meta).map(normalizeDetail),effects:(legacy.effects??DEFAULT.effects).map(normalizeDetail),stats:(legacy.stats??DEFAULT.stats).map(normalizeStat),
  artScale:Number.isFinite(legacy.artScale)?legacy.artScale:1,artX:Number.isFinite(legacy.artX)?legacy.artX:0,artY:Number.isFinite(legacy.artY)?legacy.artY:0,
  layers:{...DEFAULT_LAYERS,...(legacy.layers||{})},frame:{...DEFAULT_FRAME,...(legacy.frame||{})},typography:normalizeTypography(legacy.typography)
}}
function preset(type:CardType):Card{const c=normalizeCard({...DEFAULT,type,name:'Nome Carta',meta:DEFAULT.meta.map(x=>({...x})),effects:DEFAULT.effects.map(x=>({...x})),stats:DEFAULT.stats.map(x=>({...x}))});if(type==='location')c.stats=[{kind:'RES',value:'',opacity:1}];if(type==='action'){c.meta=[{label:'',value:'Tipo',opacity:1},{label:'',value:'Velocità',opacity:1}];c.stats=[];c.effects=[{label:'EFFETTO',value:'Descrivi chiaramente l’azione.',opacity:1}]}if(type==='extraFighter')c.meta=[{label:'',value:'Requisito',opacity:1},{label:'',value:'Archetipo',opacity:1}];if(type==='objective'){delete c.cost;c.meta=[];c.stats=[{kind:'PV',value:'',opacity:1}];c.effects=[{label:'CONDIZIONE',value:'Descrivi la condizione obiettivo.',opacity:1}]}if(type==='token'){delete c.cost;c.meta=[{label:'',value:'Token',opacity:1}]}return c}
function useLocalStore(){const[cards,setCards]=useState<Card[]>(()=>{try{return(JSON.parse(localStorage.getItem('kritoma.cards')||'[]')as Card[]).map(normalizeCard)}catch{return[]}});const save=(next:Card[])=>{setCards(next);localStorage.setItem('kritoma.cards',JSON.stringify(next))};return{cards,save}}

function frameSvg(theme:string,style:FrameStyle,layerOpacity:number){
  const o=clamp01(style.opacity,1)*layerOpacity,sw=clamp(style.size,1,10),r=clamp(style.radius,8,46),inset=clamp(style.inset,4,28),a=clamp(style.accentSize,.5,7),ao=clamp01(style.accentOpacity,.7);
  const x=20+inset/2,y=20+inset/2,w=590-inset,h=840-inset;
  const arm=clamp(72+r*1.5,84,142);
  return`<g opacity="${o}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="#07121a" stroke-width="${sw+3}" stroke-linejoin="round"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${theme}" stroke-width="${sw}" stroke-linejoin="round"/>
    <g fill="none" stroke="${theme}" stroke-width="${a}" stroke-linecap="round" opacity="${ao}">
      <path d="M ${x+15} ${y+arm} V ${y+r+8} Q ${x+15} ${y+15} ${x+r+8} ${y+15} H ${x+arm}"/>
      <path d="M ${x+w-15} ${y+arm} V ${y+r+8} Q ${x+w-15} ${y+15} ${x+w-r-8} ${y+15} H ${x+w-arm}"/>
      <path d="M ${x+15} ${y+h-arm} V ${y+h-r-8} Q ${x+15} ${y+h-15} ${x+r+8} ${y+h-15} H ${x+arm}"/>
      <path d="M ${x+w-15} ${y+h-arm} V ${y+h-r-8} Q ${x+w-15} ${y+h-15} ${x+w-r-8} ${y+h-15} H ${x+w-arm}"/>
    </g>
    <g fill="none" stroke="${theme}" stroke-width="${Math.max(.7,a*.55)}" stroke-linecap="round" opacity="${ao*.62}">
      <path d="M ${x+9} ${y+245} V ${y+360}"/><path d="M ${x+w-9} ${y+245} V ${y+360}"/>
      <path d="M ${x+9} ${y+480} V ${y+592}"/><path d="M ${x+w-9} ${y+480} V ${y+592}"/>
    </g>
  </g>`;
}
function renderSlots(meta:Detail[],layerOpacity:number,theme:string,y:number,x0:number,totalWidth:number,style:TextStyle){
  if(!meta.length||layerOpacity<=0)return'';
  const g=12,sw=(totalWidth-g*(meta.length-1))/meta.length,family=esc(fontStack(style.family));
  return meta.map((m,i)=>{const x=x0+i*(sw+g),o=layerOpacity*clamp01(m.opacity,1),text=String(m.value||m.label||''),fontSize=fitFontSize(text,clamp(style.size,9,24),9,Math.max(24,sw-76));return`<g opacity="${o}"><rect x="${x}" y="${y}" width="${sw}" height="48" rx="24" fill="#07141e" fill-opacity=".80" stroke="#eee6da" stroke-width="1.35"/><path d="M ${x+26} ${y+5} H ${x+sw-26}" stroke="${theme}" stroke-width="1.7" stroke-linecap="round" opacity=".82"/>${slotIcon(i,x+28,y+24)}<text x="${x+52}" y="${y+24}" dominant-baseline="middle" fill="#f4efe5" font-size="${fontSize.toFixed(2)}" font-family="${family}" font-weight="700">${esc(text)}</text></g>`}).join('');
}
function renderEffects(effects:Detail[],y:number,x:number,w:number,h:number,style:TextStyle){
  if(!effects.length)return'';
  const family=esc(fontStack(style.family)),maxWidth=w-34,availableHeight=h-34;
  let size=clamp(style.size,9,26),laid:{text:string;opacity:number;first:boolean}[]=[];
  for(let pass=0;pass<4;pass++){
    laid=[];
    effects.forEach((e,idx)=>{
      const text=`${e.label?`${e.label}: `:''}${e.value}`.trim(),lines=wrapByWidth(text,maxWidth,size,9),opacity=clamp01(e.opacity,1);
      lines.forEach((line,j)=>laid.push({text:line,opacity,first:j===0}));
      if(idx<effects.length-1)laid.push({text:'',opacity:0,first:false});
    });
    const rowHeight=size*1.34,totalHeight=Math.max(1,laid.length)*rowHeight;
    if(totalHeight<=availableHeight||size<=9.1)break;
    size=clamp(size*(availableHeight/totalHeight)*.96,9,size-.5);
  }
  const lineHeight=size*1.34,start=y+20;
  return laid.map((line,row)=>line.text?`<text x="${x+18}" y="${start+row*lineHeight}" dominant-baseline="hanging" fill="#1e3343" font-size="${size.toFixed(2)}" font-family="${family}" font-weight="${line.first?700:500}" opacity="${line.opacity}">${esc(line.text)}</text>`:'').join('');
}
function renderStats(stats:Stat[],id:string,statsOpacity:number,idOpacity:number,theme:string,x0:number,total:number,style:TextStyle){
  const y=786,h=50,g=10,idW=132,idX=x0+total-idW,usable=idX-x0-(stats.length?g:0),sw=stats.length?(usable-g*(stats.length-1))/stats.length:0,family=esc(fontStack(style.family));
  const statNodes=stats.map((s,i)=>{const x=x0+i*(sw+g),fill=({ATK:'#9c1d2e',RES:'#02618f',PRF:'#b47a13',PV:'#5f4a84'}as any)[s.kind.toUpperCase()]||'#2d4456',o=statsOpacity*clamp01(s.opacity,1),divider=x+42,valueX=divider+(x+sw-divider)/2,value=String(s.value||''),fontSize=fitFontSize(value,clamp(style.size,10,28),10,Math.max(20,sw-50));return`<g opacity="${o}"><path d="${bevel(x,y,sw,h)}" fill="${fill}" fill-opacity=".94" stroke="#eee5d8" stroke-width="1.8"/><path d="${bevel(x+3,y+3,sw-6,h-6,10)}" fill="none" stroke="#142836" stroke-width="1.2"/><line x1="${divider}" y1="${y+7}" x2="${divider}" y2="${y+h-7}" stroke="#142836" stroke-width="1.1"/>${statIcon(s.kind,x+21,y+25)}<text x="${valueX}" y="${y+25}" dominant-baseline="middle" text-anchor="middle" fill="#f5f0e8" font-size="${fontSize.toFixed(2)}" font-family="${family}" font-weight="700">${esc(value)}</text></g>`}).join('');
  const idSize=fitFontSize(id,13,9,idW-58),idNode=`<g opacity="${idOpacity}"><path d="${bevel(idX,y,idW,h)}" fill="#0b1822" fill-opacity=".90" stroke="#eee5d8" stroke-width="1.8"/><path d="M ${idX+13} ${y+25} L ${idX+23} ${y+15} H ${idX+35} L ${idX+45} ${y+25} L ${idX+35} ${y+35} H ${idX+23} Z" fill="#9a9da6" opacity=".70"/><text x="${idX+29}" y="${y+25}" dominant-baseline="middle" text-anchor="middle" fill="#eee7dc" font-size="12" font-family="${family}" font-weight="700">ID</text><text x="${idX+53}" y="${y+25}" dominant-baseline="middle" fill="#eee7dc" font-size="${idSize.toFixed(2)}" font-family="${family}" font-weight="700">${esc(id)}</text></g>`;
  return{statNodes,idNode};
}

function svg(card:Card){
  const theme=card.scopeColor||'#1d5c6b',layers={...DEFAULT_LAYERS,...card.layers},frame={...DEFAULT_FRAME,...card.frame},typography=normalizeTypography(card.typography);
  const scale=clamp(card.artScale??1,.4,3.5),ox=card.artX??0,oy=card.artY??0,baseX=20,baseY=20,baseW=590,baseH=840,iw=baseW*scale,ih=baseH*scale,ix=baseX-(iw-baseW)/2+ox,iy=baseY-(ih-baseH)/2+oy;
  const art=card.art?`<image href="${card.art}" x="${ix}" y="${iy}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid slice" clip-path="url(#cardClip)" opacity="${clamp01(layers.artwork,1)}"/>`:`<rect x="20" y="20" width="590" height="840" rx="28" fill="#18232b" opacity=".9"/>`;
  const costVisible=card.type!=='token'&&card.type!=='objective',frameO=clamp01(layers.frame,1),headerO=clamp01(layers.header,1),costO=clamp01(layers.cost,1),metaO=clamp01(layers.meta,1),effectO=clamp01(layers.effect,1),statsO=clamp01(layers.stats,1),idO=clamp01(layers.id,1);
  const contentX=clamp(52+frame.inset*.55+frame.size*.45,58,74),contentW=630-contentX*2,headerH=72,headerY=clamp(43+frame.inset*.30+frame.size*.25,47,58),headerCy=headerY+headerH/2,costR=38,costCx=contentX+25;
  const headerX=costVisible?costCx+49:contentX,headerRight=630-contentX,headerW=headerRight-headerX,diamondX=headerRight-28,titleX=headerX+28,titleMax=Math.max(80,diamondX-titleX-29);
  const titleSize=fitFontSize(card.name,clamp(typography.title.size,11,38),11,titleMax),costSize=fitFontSize(card.cost||'',clamp(typography.cost.size,10,34),10,costR*1.38);
  const titleFamily=esc(fontStack(typography.title.family)),costFamily=esc(fontStack(typography.cost.family));
  const hasMeta=card.meta.length>0,hasEffects=card.effects.length>0,metaY=hasEffects?566:714,effectY=hasMeta?624:566,effectH=hasMeta?145:204;
  const{statNodes,idNode}=renderStats(card.stats,card.id,statsO,idO,theme,contentX,contentW,typography.stats);
  return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 630 880" width="630" height="880"><defs>
    <clipPath id="cardClip"><rect x="20" y="20" width="590" height="840" rx="28"/></clipPath>
    <linearGradient id="paperGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f4ede2"/><stop offset="100%" stop-color="#e6ddcf"/></linearGradient>
    <filter id="paperNoise" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="5" result="n"/><feColorMatrix in="n" type="saturate" values="0" result="m"/><feComponentTransfer in="m" result="f"><feFuncA type="table" tableValues="0 .08"/></feComponentTransfer><feBlend in="SourceGraphic" in2="f" mode="multiply"/></filter>
  </defs>
  <rect width="630" height="880" fill="#fff"/>${art}
  ${frameSvg(theme,frame,frameO)}
  <g opacity="${headerO}"><rect x="${headerX}" y="${headerY}" width="${headerW}" height="${headerH}" rx="24" fill="url(#paperGrad)" fill-opacity=".92" filter="url(#paperNoise)" stroke="#efe6d8" stroke-width="1.4"/><rect x="${headerX+5}" y="${headerY+5}" width="${headerW-10}" height="${headerH-10}" rx="20" fill="none" stroke="${theme}" stroke-width="1.8" opacity=".9"/><text x="${titleX}" y="${headerCy}" dominant-baseline="middle" fill="#213749" font-size="${titleSize.toFixed(2)}" font-family="${titleFamily}" font-weight="700">${esc(card.name)}</text>${diamond(theme,diamondX,headerCy)}</g>
  ${costVisible?`<g opacity="${costO}"><circle cx="${costCx}" cy="${headerCy}" r="${costR}" fill="#0b1720" stroke="${theme}" stroke-width="2.4"/><circle cx="${costCx}" cy="${headerCy}" r="31.5" fill="url(#paperGrad)" filter="url(#paperNoise)" stroke="#eee6da" stroke-width="1.5"/><circle cx="${costCx}" cy="${headerCy}" r="28" fill="none" stroke="#173040" stroke-width="1.5"/><text x="${costCx}" y="${headerCy}" dominant-baseline="middle" text-anchor="middle" fill="#173040" font-size="${costSize.toFixed(2)}" font-family="${costFamily}" font-weight="700">${esc(card.cost||'')}</text></g>`:''}
  ${renderSlots(card.meta,metaO,theme,metaY,contentX,contentW,typography.meta)}
  ${hasEffects?`<g opacity="${effectO}"><rect x="${contentX}" y="${effectY}" width="${contentW}" height="${effectH}" rx="18" fill="url(#paperGrad)" fill-opacity=".78" filter="url(#paperNoise)" stroke="#eee6da" stroke-width="1.2"/><rect x="${contentX+5}" y="${effectY+5}" width="${contentW-10}" height="${effectH-10}" rx="14" fill="none" stroke="#173040" stroke-width="1.4" opacity=".92"/>${renderEffects(card.effects,effectY,contentX,contentW,effectH,typography.effect)}</g>`:''}
  ${statNodes}${idNode}
  </svg>`;
}

function RangeField({label,value,min,max,step=1,onChange,suffix=''}:{label:string;value:number;min:number;max:number;step?:number;onChange:(v:number)=>void;suffix?:string}){return <label className="rangeField"><span><span>{label}</span><b>{Number.isInteger(step)?Math.round(value):value.toFixed(step<.1?2:1)}{suffix}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
function OpacityField({label,value,onChange}:{label:string;value:number|undefined;onChange:(v:number)=>void}){const v=clamp01(value,1);return <RangeField label={label} value={v*100} min={0} max={100} onChange={n=>onChange(n/100)} suffix="%"/>}
function TypographyControls({label,value,onChange,min,max}:{label:string;value:TextStyle;onChange:(patch:Partial<TextStyle>)=>void;min:number;max:number}){return <><label>{label} — font<select value={value.family} onChange={e=>onChange({family:e.target.value})}>{FONT_OPTIONS.map(font=><option key={font} value={font}>{font}</option>)}</select></label><RangeField label={`${label} — dimensione`} value={value.size} min={min} max={max} step={1} onChange={size=>onChange({size})} suffix=" pt"/></>}

function App(){
  const store=useLocalStore(),[card,setCard]=useState<Card>(()=>normalizeCard(store.cards[0]||DEFAULT)),[settingsOpen,setSettingsOpen]=useState(false),inputRef=useRef<HTMLInputElement>(null),markup=useMemo(()=>svg(card),[card]);
  const update=(p:Partial<Card>)=>setCard(normalizeCard({...card,...p}));
  const updateLayer=(key:keyof LayerOpacity,value:number)=>update({layers:{...card.layers,[key]:value}});
  const updateFrame=(key:keyof FrameStyle,value:number)=>update({frame:{...card.frame,[key]:value}});
  const updateTypography=(role:TextRole,patch:Partial<TextStyle>)=>update({typography:{...card.typography,[role]:{...normalizeTypography(card.typography)[role],...patch}}});
  const save=()=>store.save([...store.cards.filter(c=>c.id!==card.id),card]);
  const resetArt=()=>update({artScale:1,artX:0,artY:0});
  const download=(name:string,blob:Blob)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)};
  const exportSvg=()=>download(`${card.id}.svg`,new Blob([markup],{type:'image/svg+xml'}));
  const raster=(cb:(canvas:HTMLCanvasElement)=>void)=>{const u=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml'})),im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=1890;c.height=2640;c.getContext('2d')!.drawImage(im,0,0,c.width,c.height);cb(c);URL.revokeObjectURL(u)};im.src=u};
  const exportPng=()=>raster(c=>c.toBlob(b=>b&&download(`${card.id}.png`,b),'image/png'));
  const exportPdf=()=>raster(c=>{const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:[63,88]});pdf.addImage(c.toDataURL('image/png'),'PNG',0,0,63,88);pdf.save(`${card.id}-print.pdf`)});
  const frame={...DEFAULT_FRAME,...card.frame},typography=normalizeTypography(card.typography);

  return <div className="appShell">
    <header className="topBar"><div className="brand"><span className="brandMark">K</span><div><strong>Kritoma</strong><small>Card Editor</small></div></div><button className="settingsButton" onClick={()=>setSettingsOpen(true)} aria-label="Apri impostazioni"><span>☰</span><b>Modifica</b></button></header>
    <main className="workspace"><div className="previewWrap"><div className="preview" dangerouslySetInnerHTML={{__html:markup}}/></div></main>
    <nav className="bottomDock"><button onClick={save}>Salva</button><button onClick={()=>setSettingsOpen(true)}>Impostazioni</button><button onClick={exportPng}>PNG</button><button onClick={exportPdf}>PDF</button></nav>

    {settingsOpen&&<div className="sheetBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSettingsOpen(false)}}><section className="settingsSheet" role="dialog" aria-modal="true" aria-label="Impostazioni carta">
      <div className="sheetHandle"/>
      <header className="sheetHeader"><div><strong>Impostazioni carta</strong><small>Le modifiche aggiornano la preview in tempo reale</small></div><button className="closeButton" onClick={()=>setSettingsOpen(false)}>Fatto</button></header>
      <div className="settingsScroll">
        <details className="settingsGroup" open><summary><span><b>Carta</b><small>Tipo, nome, ambito e identificazione</small></span><i>›</i></summary><div className="settingsBody">
          <label>Tipologia<select value={card.type} onChange={e=>setCard(preset(e.target.value as CardType))}>{Object.entries(TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          <label>Nome<input value={card.name} onChange={e=>update({name:e.target.value})}/></label>
          <div className="fieldGrid"><label>ID<input value={card.id} onChange={e=>update({id:e.target.value})}/></label><label>Ambito<select value={card.scope} onChange={e=>update({scope:e.target.value,scopeColor:scopeDefault[e.target.value]||card.scopeColor})}>{Object.keys(scopeDefault).map(x=><option key={x}>{x}</option>)}</select></label></div>
          <label className="colorRow"><span>Colore tema</span><input type="color" value={card.scopeColor} onChange={e=>update({scopeColor:e.target.value})}/></label>
          {card.type!=='token'&&card.type!=='objective'&&<label>Costo / materiali<input value={card.cost||''} onChange={e=>update({cost:e.target.value})}/></label>}
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

        <details className="settingsGroup"><summary><span><b>Cornice</b><small>Spessore, radius e accenti tema</small></span><i>›</i></summary><div className="settingsBody">
          <RangeField label="Spessore bordo" value={frame.size} min={1} max={10} step={.1} onChange={v=>updateFrame('size',v)}/>
          <RangeField label="Radius" value={frame.radius} min={8} max={46} onChange={v=>updateFrame('radius',v)}/>
          <RangeField label="Inset" value={frame.inset} min={4} max={28} onChange={v=>updateFrame('inset',v)}/>
          <OpacityField label="Opacità bordo" value={frame.opacity} onChange={v=>updateFrame('opacity',v)}/>
          <RangeField label="Spessore accenti" value={frame.accentSize} min={.5} max={7} step={.1} onChange={v=>updateFrame('accentSize',v)}/>
          <OpacityField label="Opacità accenti" value={frame.accentOpacity} onChange={v=>updateFrame('accentOpacity',v)}/>
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
