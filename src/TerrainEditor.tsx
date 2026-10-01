import React,{useEffect,useMemo,useState}from'react';
import {LiveEditor} from './LiveEditor';
import {applyEdits,editable,normalizeEdits,normalizeExtras,renderExtras} from './liveModel';
import type {LiveEdits,ExtraElement} from './liveModel';
import {useHistory} from './useHistory';
import jsPDF from'jspdf';
import'./terrain.css';

type EditorMode='card'|'terrain';
type AreaPreset='rounded'|'double'|'square'|'bevel'|'octagon'|'tech';
type SlotPreset=AreaPreset|'cut';

type AreaStyle={
  enabled:boolean;
  fillEnabled:boolean;
  borderEnabled:boolean;
  detailEnabled:boolean;
  preset:AreaPreset;
  fillColor:string;
  borderColor:string;
  accentColor:string;
  borderWidth:number;
  radius:number;
  inset:number;
  detailInset:number;
  fillOpacity:number;
  borderOpacity:number;
  detailOpacity:number;
};

type SlotStyle={
  fillEnabled:boolean;
  borderEnabled:boolean;
  detailEnabled:boolean;
  preset:SlotPreset;
  fillColor:string;
  borderColor:string;
  accentColor:string;
  borderWidth:number;
  radius:number;
  detailInset:number;
  fillOpacity:number;
  borderOpacity:number;
  detailOpacity:number;
};

type SlotOverride={enabled:boolean;custom:boolean;style:SlotStyle};
type FourSlotGroup={enabled:boolean;scale:number;gap:number;offsetX:number;offsetY:number;style:SlotStyle;slots:[SlotOverride,SlotOverride,SlotOverride,SlotOverride]};
type CenterSlotGroup={enabled:boolean;scale:number;gap12:number;gap23:number;offsetX:number;offsetY:number;style:SlotStyle;slots:[SlotOverride,SlotOverride,SlotOverride]};

type TerrainLayout={
  edgeInsetX:number;
  edgeInsetY:number;
  contentPaddingX:number;
  contentPaddingTop:number;
  contentPaddingBottom:number;
  topGapX:number;
  rowGap:number;
  topLeftHeight:number;
  topRightHeight:number;
  lowerHeight:number;
};

type TerrainState={
  liveEdits?:LiveEdits;extras?:ExtraElement[];
  id:string;
  name:string;
  printWidthMm:number;
  printHeightMm:number;
  backgroundColor:string;
  textColor:string;
  sheenEnabled:boolean;
  layout:TerrainLayout;
  outer:AreaStyle;
  inner:AreaStyle;
  guide:AreaStyle;
  topLeftPanel:AreaStyle;
  topRightPanel:AreaStyle;
  lowerPanel:AreaStyle;
  topLeftGroup:FourSlotGroup;
  topRightGroup:FourSlotGroup;
  centerGroup:CenterSlotGroup;
  utilityStyle:SlotStyle;
  deckEnabled:boolean;
  graveEnabled:boolean;
  extraEnabled:boolean;
  deckLabel:string;
  graveLabel:string;
  extraLabel:string;
  labelFont:string;
  labelSize:number;
  labelWeight:number;
  letterSpacing:number;
  uppercase:boolean;
};

const TERRAIN_LABELS:Record<string,string>={background:'Superficie di fondo',outer:'Cornice esterna',inner:'Campo interno',guide:'Linea guida',topLeftPanel:'Area superiore sinistra',topRightPanel:'Area superiore destra',lowerPanel:'Area inferiore',deck:'Mazzo',grave:'Cimitero',extra:'Extra',...Object.fromEntries(['topLeftGroup','topRightGroup','centerGroup'].flatMap(k=>Array.from({length:k==='centerGroup'?3:4},(_,i)=>[`${k}-${i}`,`${k==='topLeftGroup'?'Sinistra':k==='topRightGroup'?'Destra':'Centro'} · spazio ${i+1}`])))};
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
const AREA_PRESETS:{id:AreaPreset;label:string}[]=[
  {id:'rounded',label:'Tradizionale · Arrotondato'},
  {id:'double',label:'Tradizionale · Doppia linea'},
  {id:'square',label:'Geometrico · Squadrato'},
  {id:'bevel',label:'Geometrico · Angoli tagliati'},
  {id:'octagon',label:'Geometrico · Ottagonale'},
  {id:'tech',label:'Astratto · Tech / notch'}
];
const SLOT_PRESETS:{id:SlotPreset;label:string}[]=[
  ...AREA_PRESETS,
  {id:'cut',label:'Dinamico · Taglio'}
];

const BASE_SLOT_STYLE:SlotStyle={
  fillEnabled:true,borderEnabled:true,detailEnabled:true,preset:'rounded',
  fillColor:'#17120f',borderColor:'#6b4d3f',accentColor:'#b37a58',
  borderWidth:2.1,radius:12,detailInset:7,fillOpacity:.82,borderOpacity:.92,detailOpacity:.68
};
const makeOverride=():SlotOverride=>({enabled:true,custom:false,style:{...BASE_SLOT_STYLE}});
const makeFourSlots=():[SlotOverride,SlotOverride,SlotOverride,SlotOverride]=>[makeOverride(),makeOverride(),makeOverride(),makeOverride()];
const makeThreeSlots=():[SlotOverride,SlotOverride,SlotOverride]=>[makeOverride(),makeOverride(),makeOverride()];

const DEFAULT_TERRAIN:TerrainState={
  id:'KRT-FIELD-001',name:'Terreno Kritoma',printWidthMm:610,printHeightMm:350,
  backgroundColor:'#18110e',textColor:'#b88b6a',sheenEnabled:true,
  layout:{edgeInsetX:26,edgeInsetY:13,contentPaddingX:22,contentPaddingTop:31,contentPaddingBottom:69,topGapX:56,rowGap:36,topLeftHeight:260,topRightHeight:260,lowerHeight:370},
  outer:{enabled:true,fillEnabled:true,borderEnabled:true,detailEnabled:true,preset:'rounded',fillColor:'#18110e',borderColor:'#6b4d3f',accentColor:'#b37a58',borderWidth:3.2,radius:30,inset:8,detailInset:24,fillOpacity:1,borderOpacity:.95,detailOpacity:.72},
  inner:{enabled:true,fillEnabled:true,borderEnabled:true,detailEnabled:true,preset:'rounded',fillColor:'#191511',borderColor:'#6b4d3f',accentColor:'#b37a58',borderWidth:2.3,radius:24,inset:34,detailInset:20,fillOpacity:1,borderOpacity:.70,detailOpacity:.46},
  guide:{enabled:true,fillEnabled:false,borderEnabled:true,detailEnabled:false,preset:'rounded',fillColor:'#191511',borderColor:'#b37a58',accentColor:'#b37a58',borderWidth:1.15,radius:19,inset:22,detailInset:12,fillOpacity:.16,borderOpacity:.42,detailOpacity:.25},
  topLeftPanel:{enabled:true,fillEnabled:true,borderEnabled:true,detailEnabled:true,preset:'rounded',fillColor:'#17130f',borderColor:'#6b4d3f',accentColor:'#b37a58',borderWidth:2.2,radius:20,inset:0,detailInset:9,fillOpacity:.42,borderOpacity:.72,detailOpacity:.39},
  topRightPanel:{enabled:true,fillEnabled:true,borderEnabled:true,detailEnabled:true,preset:'rounded',fillColor:'#17130f',borderColor:'#6b4d3f',accentColor:'#b37a58',borderWidth:2.2,radius:20,inset:0,detailInset:9,fillOpacity:.42,borderOpacity:.72,detailOpacity:.39},
  lowerPanel:{enabled:true,fillEnabled:true,borderEnabled:true,detailEnabled:true,preset:'rounded',fillColor:'#17130f',borderColor:'#6b4d3f',accentColor:'#b37a58',borderWidth:2.2,radius:20,inset:0,detailInset:9,fillOpacity:.42,borderOpacity:.72,detailOpacity:.39},
  topLeftGroup:{enabled:true,scale:1,gap:1,offsetX:0,offsetY:0,style:{...BASE_SLOT_STYLE},slots:makeFourSlots()},
  topRightGroup:{enabled:true,scale:1,gap:1,offsetX:0,offsetY:0,style:{...BASE_SLOT_STYLE},slots:makeFourSlots()},
  centerGroup:{enabled:true,scale:1,gap12:1,gap23:1,offsetX:0,offsetY:0,style:{...BASE_SLOT_STYLE},slots:makeThreeSlots()},
  utilityStyle:{...BASE_SLOT_STYLE},deckEnabled:true,graveEnabled:true,extraEnabled:true,
  deckLabel:'MAZZO',graveLabel:'CIMITERO',extraLabel:'EXTRA',
  labelFont:'Arial',labelSize:14,labelWeight:700,letterSpacing:1.8,uppercase:true
};

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const esc=(s:any)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}as any)[c]);
const fontStack=(f:string)=>FONT_STACKS[f]||FONT_STACKS.Arial;
const labelText=(s:string,uppercase:boolean)=>uppercase?s.toUpperCase():s;
const deepClone=<T,>(x:T):T=>JSON.parse(JSON.stringify(x));

const pathRounded=(x:number,y:number,w:number,h:number,r:number)=>{
  const q=clamp(r,0,Math.min(w,h)/2);
  return`M ${x+q} ${y} H ${x+w-q} Q ${x+w} ${y} ${x+w} ${y+q} V ${y+h-q} Q ${x+w} ${y+h} ${x+w-q} ${y+h} H ${x+q} Q ${x} ${y+h} ${x} ${y+h-q} V ${y+q} Q ${x} ${y} ${x+q} ${y} Z`;
};
const shapePath=(preset:AreaPreset|SlotPreset,x:number,y:number,w:number,h:number,r:number)=>{
  if(preset==='square')return`M ${x} ${y} H ${x+w} V ${y+h} H ${x} Z`;
  if(preset==='bevel'||preset==='octagon'||preset==='cut'){
    const c=preset==='octagon'?Math.min(34,Math.min(w,h)*.14):preset==='cut'?Math.min(22,Math.min(w,h)*.11):Math.min(18,Math.min(w,h)*.09);
    if(preset==='cut')return`M ${x+c} ${y} H ${x+w} V ${y+h-c} L ${x+w-c} ${y+h} H ${x} V ${y+c} Z`;
    return`M ${x+c} ${y} H ${x+w-c} L ${x+w} ${y+c} V ${y+h-c} L ${x+w-c} ${y+h} H ${x+c} L ${x} ${y+h-c} V ${y+c} Z`;
  }
  if(preset==='tech'){
    const c=Math.min(30,Math.min(w,h)*.12),n=Math.min(18,Math.min(w,h)*.07);
    return`M ${x+c} ${y} H ${x+w*.42} L ${x+w*.46} ${y+n} H ${x+w*.54} L ${x+w*.58} ${y} H ${x+w-c} L ${x+w} ${y+c} V ${y+h-c} L ${x+w-c} ${y+h} H ${x+w*.62} L ${x+w*.58} ${y+h-n} H ${x+w*.42} L ${x+w*.38} ${y+h} H ${x+c} L ${x} ${y+h-c} V ${y+c} Z`;
  }
  return pathRounded(x,y,w,h,r);
};
function strokePath(d:string,color:string,width:number,opacity=1){return`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" opacity="${opacity}"/>`}
function fillPath(d:string,color:string,opacity=1){return`<path d="${d}" fill="${color}" fill-opacity="${opacity}"/>`}

function normalizeArea(raw:any,fallback:AreaStyle):AreaStyle{
  const a={...fallback,...(raw||{})};
  return{
    ...a,
    enabled:a.enabled!==false,fillEnabled:a.fillEnabled!==false,borderEnabled:a.borderEnabled!==false,detailEnabled:a.detailEnabled!==false,
    borderWidth:clamp(Number(a.borderWidth)||fallback.borderWidth,.25,14),radius:clamp(Number(a.radius)??fallback.radius,0,100),
    inset:clamp(Number(a.inset)??fallback.inset,0,80),detailInset:clamp(Number(a.detailInset)??fallback.detailInset,2,60),
    fillOpacity:clamp(Number(a.fillOpacity)??fallback.fillOpacity,0,1),borderOpacity:clamp(Number(a.borderOpacity)??fallback.borderOpacity,0,1),detailOpacity:clamp(Number(a.detailOpacity)??fallback.detailOpacity,0,1)
  };
}
function normalizeSlotStyle(raw:any,fallback:SlotStyle=BASE_SLOT_STYLE):SlotStyle{
  const s={...fallback,...(raw||{})};
  return{
    ...s,
    fillEnabled:s.fillEnabled!==false,borderEnabled:s.borderEnabled!==false,detailEnabled:s.detailEnabled!==false,
    borderWidth:clamp(Number(s.borderWidth)||fallback.borderWidth,.25,10),radius:clamp(Number(s.radius)??fallback.radius,0,48),detailInset:clamp(Number(s.detailInset)??fallback.detailInset,2,30),
    fillOpacity:clamp(Number(s.fillOpacity)??fallback.fillOpacity,0,1),borderOpacity:clamp(Number(s.borderOpacity)??fallback.borderOpacity,0,1),detailOpacity:clamp(Number(s.detailOpacity)??fallback.detailOpacity,0,1)
  };
}
function normalizeOverride(raw:any,fallbackStyle:SlotStyle):SlotOverride{return{enabled:raw?.enabled!==false,custom:raw?.custom===true,style:normalizeSlotStyle(raw?.style,fallbackStyle)}}
function normalizeFourGroup(raw:any,fallback:FourSlotGroup):FourSlotGroup{
  const style=normalizeSlotStyle(raw?.style,fallback.style),slots=Array.from({length:4},(_,i)=>normalizeOverride(raw?.slots?.[i],style)) as [SlotOverride,SlotOverride,SlotOverride,SlotOverride];
  return{enabled:raw?.enabled!==false,scale:clamp(Number(raw?.scale) || fallback.scale,.72,1.22),gap:clamp(Number(raw?.gap) || fallback.gap,.5,2),offsetX:clamp(Number(raw?.offsetX) || 0,-120,120),offsetY:clamp(Number(raw?.offsetY) || 0,-90,90),style,slots};
}
function normalizeCenterGroup(raw:any,fallback:CenterSlotGroup):CenterSlotGroup{
  const style=normalizeSlotStyle(raw?.style,fallback.style),slots=Array.from({length:3},(_,i)=>normalizeOverride(raw?.slots?.[i],style)) as [SlotOverride,SlotOverride,SlotOverride];
  return{enabled:raw?.enabled!==false,scale:clamp(Number(raw?.scale) || fallback.scale,.72,1.22),gap12:clamp(Number(raw?.gap12) || fallback.gap12,.4,2.4),gap23:clamp(Number(raw?.gap23) || fallback.gap23,.4,2.4),offsetX:clamp(Number(raw?.offsetX) || 0,-180,180),offsetY:clamp(Number(raw?.offsetY) || 0,-100,100),style,slots};
}
function normalizeLayout(raw:any):TerrainLayout{
  const l={...DEFAULT_TERRAIN.layout,...(raw||{})};
  return{
    edgeInsetX:clamp(Number(l.edgeInsetX)??26,0,140),edgeInsetY:clamp(Number(l.edgeInsetY)??13,0,120),
    contentPaddingX:clamp(Number(l.contentPaddingX)??22,0,180),contentPaddingTop:clamp(Number(l.contentPaddingTop)??31,0,180),contentPaddingBottom:clamp(Number(l.contentPaddingBottom)??69,0,220),
    topGapX:clamp(Number(l.topGapX)??56,0,220),rowGap:clamp(Number(l.rowGap)??36,0,220),
    topLeftHeight:clamp(Number(l.topLeftHeight)??260,80,700),topRightHeight:clamp(Number(l.topRightHeight)??260,80,700),lowerHeight:clamp(Number(l.lowerHeight)??370,100,760)
  };
}
function normalizeTerrain(input:any):TerrainState{
  const legacy=input||{};
  const legacySlot:SlotStyle={...BASE_SLOT_STYLE,preset:legacy.slotPreset||BASE_SLOT_STYLE.preset,fillColor:legacy.slotColor||BASE_SLOT_STYLE.fillColor,borderColor:legacy.borderColor||BASE_SLOT_STYLE.borderColor,accentColor:legacy.accentColor||BASE_SLOT_STYLE.accentColor,borderWidth:legacy.slotWidth??BASE_SLOT_STYLE.borderWidth,radius:legacy.slotRadius??BASE_SLOT_STYLE.radius,detailInset:legacy.slotInset??BASE_SLOT_STYLE.detailInset,detailOpacity:legacy.slotDetail??BASE_SLOT_STYLE.detailOpacity,fillOpacity:legacy.slotFillOpacity??BASE_SLOT_STYLE.fillOpacity};
  const legacyPanel=(fallback:AreaStyle):AreaStyle=>({...fallback,preset:legacy.panelPreset||fallback.preset,fillColor:legacy.panelColor||fallback.fillColor,borderColor:legacy.borderColor||fallback.borderColor,accentColor:legacy.accentColor||fallback.accentColor,borderWidth:legacy.panelWidth??fallback.borderWidth,radius:legacy.panelRadius??fallback.radius,borderOpacity:legacy.panelOpacity??fallback.borderOpacity});
  const topFallback:FourSlotGroup={...DEFAULT_TERRAIN.topLeftGroup,scale:legacy.slotScale??1,gap:legacy.slotGap??1,style:legacySlot,slots:makeFourSlots()};
  const centerFallback:CenterSlotGroup={...DEFAULT_TERRAIN.centerGroup,scale:legacy.slotScale??1,gap12:legacy.slotGap??1,gap23:legacy.slotGap??1,style:legacySlot,slots:makeThreeSlots()};
  return{liveEdits:normalizeEdits(legacy.liveEdits),extras:normalizeExtras(legacy.extras),
    id:String(legacy.id||DEFAULT_TERRAIN.id),name:String(legacy.name||DEFAULT_TERRAIN.name),
    printWidthMm:clamp(Number(legacy.printWidthMm)||610,200,1200),printHeightMm:clamp(Number(legacy.printHeightMm)||350,150,800),
    backgroundColor:legacy.backgroundColor||legacy.outerColor||DEFAULT_TERRAIN.backgroundColor,textColor:legacy.textColor||DEFAULT_TERRAIN.textColor,sheenEnabled:legacy.sheenEnabled!==false,
    layout:normalizeLayout(legacy.layout),
    outer:normalizeArea(legacy.outer,{...DEFAULT_TERRAIN.outer,fillColor:legacy.outerColor||DEFAULT_TERRAIN.outer.fillColor,borderColor:legacy.borderColor||DEFAULT_TERRAIN.outer.borderColor,accentColor:legacy.accentColor||DEFAULT_TERRAIN.outer.accentColor,borderWidth:legacy.perimeterWidth??DEFAULT_TERRAIN.outer.borderWidth,radius:legacy.perimeterRadius??DEFAULT_TERRAIN.outer.radius,detailOpacity:legacy.perimeterDetail??DEFAULT_TERRAIN.outer.detailOpacity}),
    inner:normalizeArea(legacy.inner,{...DEFAULT_TERRAIN.inner,fillColor:legacy.fieldColor||DEFAULT_TERRAIN.inner.fillColor,borderColor:legacy.borderColor||DEFAULT_TERRAIN.inner.borderColor,accentColor:legacy.accentColor||DEFAULT_TERRAIN.inner.accentColor}),
    guide:normalizeArea(legacy.guide,{...DEFAULT_TERRAIN.guide,borderColor:legacy.accentColor||DEFAULT_TERRAIN.guide.borderColor,accentColor:legacy.accentColor||DEFAULT_TERRAIN.guide.accentColor}),
    topLeftPanel:normalizeArea(legacy.topLeftPanel,legacyPanel(DEFAULT_TERRAIN.topLeftPanel)),
    topRightPanel:normalizeArea(legacy.topRightPanel,legacyPanel(DEFAULT_TERRAIN.topRightPanel)),
    lowerPanel:normalizeArea(legacy.lowerPanel,legacyPanel(DEFAULT_TERRAIN.lowerPanel)),
    topLeftGroup:normalizeFourGroup(legacy.topLeftGroup,topFallback),
    topRightGroup:normalizeFourGroup(legacy.topRightGroup,{...topFallback,slots:makeFourSlots()}),
    centerGroup:normalizeCenterGroup(legacy.centerGroup,centerFallback),
    utilityStyle:normalizeSlotStyle(legacy.utilityStyle,legacySlot),
    deckEnabled:legacy.deckEnabled!==false,graveEnabled:legacy.graveEnabled!==false,extraEnabled:legacy.extraEnabled!==false,
    deckLabel:String(legacy.deckLabel??DEFAULT_TERRAIN.deckLabel),graveLabel:String(legacy.graveLabel??DEFAULT_TERRAIN.graveLabel),extraLabel:String(legacy.extraLabel??DEFAULT_TERRAIN.extraLabel),
    labelFont:String(legacy.labelFont||DEFAULT_TERRAIN.labelFont),labelSize:clamp(Number(legacy.labelSize)||14,8,32),labelWeight:clamp(Number(legacy.labelWeight)||700,300,900),letterSpacing:clamp(Number(legacy.letterSpacing)??1.8,0,8),uppercase:legacy.uppercase!==false
  };
}

function renderArea(style:AreaStyle,x:number,y:number,w:number,h:number,id:string){
  if(!style.enabled||w<=0||h<=0)return'';
  const d=shapePath(style.preset,x,y,w,h,style.radius),detailInset=Math.min(style.detailInset,w*.18,h*.18),di=shapePath(style.preset,x+detailInset,y+detailInset,w-detailInset*2,h-detailInset*2,Math.max(0,style.radius-detailInset*.45));
  const doubleInset=Math.max(4,style.borderWidth*2.2),doublePath=shapePath(style.preset,x+doubleInset,y+doubleInset,w-doubleInset*2,h-doubleInset*2,Math.max(0,style.radius-doubleInset*.35));
  return editable(id,TERRAIN_LABELS[id]||id,`<g>${style.fillEnabled?fillPath(d,style.fillColor,style.fillOpacity):''}${style.borderEnabled?`${strokePath(d,'#090807',style.borderWidth+3,style.borderOpacity*.72)}${strokePath(d,style.borderColor,style.borderWidth,style.borderOpacity)}${style.preset==='double'?strokePath(doublePath,style.borderColor,Math.max(.55,style.borderWidth*.48),style.borderOpacity*.65):''}`:''}${style.detailEnabled?strokePath(di,style.accentColor,Math.max(.55,style.borderWidth*.46),style.detailOpacity):''}</g>`);
}
function renderSlot(x:number,y:number,w:number,h:number,style:SlotStyle,state:TerrainState,label='',id='slot'){
  const d=shapePath(style.preset,x,y,w,h,style.radius),inset=Math.min(style.detailInset,w*.18,h*.18),di=shapePath(style.preset,x+inset,y+inset,w-inset*2,h-inset*2,Math.max(0,style.radius-inset*.4));
  const doubleInset=Math.max(4,style.borderWidth*2),doublePath=shapePath(style.preset,x+doubleInset,y+doubleInset,w-doubleInset*2,h-doubleInset*2,Math.max(0,style.radius-doubleInset*.35));
  const text=label?`<text x="${x+12}" y="${y+18}" fill="${state.textColor}" font-family="${esc(fontStack(state.labelFont))}" font-size="${state.labelSize}" font-weight="${state.labelWeight}" letter-spacing="${state.letterSpacing}">${esc(labelText(label,state.uppercase))}</text>`:'';
  return editable(id,TERRAIN_LABELS[id]||id,`<g>${style.fillEnabled?fillPath(d,style.fillColor,style.fillOpacity):''}${style.borderEnabled?`${strokePath(d,'#0a0908',style.borderWidth+3,style.borderOpacity*.76)}${strokePath(d,style.borderColor,style.borderWidth,style.borderOpacity)}${style.preset==='double'?strokePath(doublePath,style.borderColor,Math.max(.5,style.borderWidth*.5),style.borderOpacity*.62):''}`:''}${style.detailEnabled?strokePath(di,style.accentColor,Math.max(.5,style.borderWidth*.46),style.detailOpacity):''}${text}</g>`);
}
function effectiveSlot(base:SlotStyle,override:SlotOverride){return override.custom?override.style:base}

function terrainSvg(state:TerrainState){
  const W=1600,H=920,L=state.layout;
  type Rect={x:number;y:number;w:number;h:number};
  const insetRect=(r:Rect,n:number):Rect=>{const q=clamp(n,0,Math.max(0,Math.min(r.w,r.h)/2-2));return{x:r.x+q,y:r.y+q,w:Math.max(4,r.w-q*2),h:Math.max(4,r.h-q*2)}};
  const panelRect=(style:AreaStyle,box:Rect|null):Rect|null=>box?insetRect(box,style.inset):null;

  // Onion layout: only enabled layers consume geometric space. When one disappears,
  // every enabled descendant starts from the previous real parent and expands outward.
  const base:Rect={x:L.edgeInsetX,y:L.edgeInsetY,w:Math.max(20,W-L.edgeInsetX*2),h:Math.max(20,H-L.edgeInsetY*2)};
  const onion:{style:AreaStyle;rect:Rect}[]=[];
  let cursor=base;
  ([state.outer,state.inner,state.guide] as AreaStyle[]).forEach(style=>{
    if(!style.enabled)return;
    cursor=insetRect(cursor,style.inset);
    onion.push({style,rect:cursor});
  });
  const deepest=onion.length?onion[onion.length-1].rect:base;
  const shell=onion.length?onion[0]:null;
  const padX=Math.min(L.contentPaddingX,deepest.w*.28),padTop=Math.min(L.contentPaddingTop,deepest.h*.28),padBottom=Math.min(L.contentPaddingBottom,deepest.h*.32);
  const content:Rect={x:deepest.x+padX,y:deepest.y+padTop,w:Math.max(40,deepest.w-padX*2),h:Math.max(40,deepest.h-padTop-padBottom)};

  // Macro sections use a flow layout. Desired heights act as proportions; the rows
  // always consume the full available content height. Disabled rows consume 0 px.
  const leftOn=state.topLeftPanel.enabled,rightOn=state.topRightPanel.enabled,topOn=leftOn||rightOn,lowerOn=state.lowerPanel.enabled;
  const rowGap=topOn&&lowerOn?Math.min(L.rowGap,content.h*.35):0;
  const usableH=Math.max(30,content.h-rowGap);
  const desiredTop=Math.max(leftOn?L.topLeftHeight:0,rightOn?L.topRightHeight:0,80),desiredLower=Math.max(100,L.lowerHeight);
  let topRowH=0,lowerH=0;
  if(topOn&&lowerOn){const total=desiredTop+desiredLower;topRowH=usableH*(desiredTop/total);lowerH=usableH-topRowH}
  else if(topOn)topRowH=content.h;
  else if(lowerOn)lowerH=content.h;

  const colGap=leftOn&&rightOn?Math.min(L.topGapX,content.w*.35):0;
  const colW=leftOn&&rightOn?(content.w-colGap)/2:content.w;
  const leftH=leftOn?(rightOn?topRowH*Math.min(1,L.topLeftHeight/desiredTop):topRowH):0;
  const rightH=rightOn?(leftOn?topRowH*Math.min(1,L.topRightHeight/desiredTop):topRowH):0;
  const leftBox:Rect|null=leftOn?{x:content.x,y:content.y,w:colW,h:leftH}:null;
  const rightBox:Rect|null=rightOn?{x:leftOn?content.x+colW+colGap:content.x,y:content.y,w:colW,h:rightH}:null;
  const lowerBox:Rect|null=lowerOn?{x:content.x,y:content.y+(topOn?topRowH+rowGap:0),w:content.w,h:lowerH}:null;
  const leftPanel=panelRect(state.topLeftPanel,leftBox),rightPanel=panelRect(state.topRightPanel,rightBox),lowerPanel=panelRect(state.lowerPanel,lowerBox);

  const renderFour=(group:FourSlotGroup,box:Rect|null,key:string)=>{
    if(!box||!group.enabled)return'';
    const active=group.slots.map((slot,index)=>({slot,index})).filter(x=>x.slot.enabled);
    if(!active.length)return'';
    const ref=Math.max(.2,Math.min(box.w/660,box.h/260)),count=active.length,padX=Math.max(8,26*ref),padY=Math.max(7,30*ref),wantedGap=14*ref*group.gap;
    const targetW=140*ref*group.scale,maxByW=(box.w-padX*2-wantedGap*Math.max(0,count-1))/count,maxByH=(box.h-padY*2)*(140/200);
    const sw=Math.max(10,Math.min(targetW,maxByW,maxByH)),sh=sw*(200/140),freeGap=count>1?Math.max(0,(box.w-padX*2-sw*count)/(count-1)):0,gap=Math.min(wantedGap,freeGap),total=sw*count+gap*Math.max(0,count-1);
    const start=box.x+(box.w-total)/2+group.offsetX,sy=box.y+(box.h-sh)/2+group.offsetY;
    return active.map((entry,pos)=>renderSlot(start+pos*(sw+gap),sy,sw,sh,effectiveSlot(group.style,entry.slot),state,'',`${key}-${entry.index}`)).join('');
  };

  const utilityAndCenter=(()=>{
    if(!lowerPanel)return'';
    const ref=Math.max(.2,Math.min(lowerPanel.w/1376,lowerPanel.h/370)),uw=140*ref,uh=200*ref,margin=Math.max(8,20*ref),utilityGap=Math.max(8,26*ref),uy=lowerPanel.y+(lowerPanel.h-uh)/2;
    let out='',leftCursor=lowerPanel.x+margin;
    if(state.deckEnabled){out+=renderSlot(leftCursor,uy,uw,uh,state.utilityStyle,state,state.deckLabel,'deck');leftCursor+=uw+utilityGap}
    if(state.graveEnabled){out+=renderSlot(leftCursor,uy,uw,uh,state.utilityStyle,state,state.graveLabel,'grave');leftCursor+=uw+utilityGap}
    const extraX=lowerPanel.x+lowerPanel.w-margin-uw;
    const rightLimit=state.extraEnabled?extraX-Math.max(10,20*ref):lowerPanel.x+lowerPanel.w-margin;
    if(state.extraEnabled)out+=renderSlot(extraX,uy,uw,uh,state.utilityStyle,state,state.extraLabel,'extra');

    const group=state.centerGroup;
    if(!group.enabled)return out;
    const active=group.slots.map((slot,index)=>({slot,index})).filter(x=>x.slot.enabled);
    if(!active.length)return out;
    const centerX=Math.min(rightLimit,leftCursor+Math.max(0,(rightLimit-leftCursor)*.02)),centerW=Math.max(40,rightLimit-centerX),padX=Math.max(4,8*ref),padY=Math.max(6,18*ref);
    const desiredGaps=active.slice(0,-1).map((entry,i)=>{const next=active[i+1].index;const a=entry.index;const factor=a===0&&next===1?group.gap12:a===1&&next===2?group.gap23:(group.gap12+group.gap23)/2;return 30*ref*factor});
    const wantedGapTotal=desiredGaps.reduce((a,b)=>a+b,0),count=active.length,targetW=140*ref*group.scale,maxByW=(centerW-padX*2-wantedGapTotal)/count,maxByH=(lowerPanel.h-padY*2)*(140/200);
    const sw=Math.max(10,Math.min(targetW,maxByW,maxByH)),sh=sw*(200/140),freeForGaps=Math.max(0,centerW-padX*2-sw*count),gapScale=wantedGapTotal>0?Math.min(1,freeForGaps/wantedGapTotal):0,gaps=desiredGaps.map(g=>g*gapScale),total=sw*count+gaps.reduce((a,b)=>a+b,0);
    let x=centerX+(centerW-total)/2+group.offsetX;const sy=lowerPanel.y+(lowerPanel.h-sh)/2+group.offsetY;
    active.forEach((entry,pos)=>{out+=renderSlot(x,sy,sw,sh,effectiveSlot(group.style,entry.slot),state,'',`centerGroup-${entry.index}`);x+=sw+(gaps[pos]||0)});
    return out;
  })();

  const onionMarkup=onion.map(({style,rect})=>renderArea(style,rect.x,rect.y,rect.w,rect.h,style===state.outer?'outer':style===state.inner?'inner':'guide')).join('');
  const panels=`${leftPanel?renderArea(state.topLeftPanel,leftPanel.x,leftPanel.y,leftPanel.w,leftPanel.h,'topLeftPanel'):''}${rightPanel?renderArea(state.topRightPanel,rightPanel.x,rightPanel.y,rightPanel.w,rightPanel.h,'topRightPanel'):''}${lowerPanel?renderArea(state.lowerPanel,lowerPanel.x,lowerPanel.y,lowerPanel.w,lowerPanel.h,'lowerPanel'):''}`;
  const groups=`${leftPanel?renderFour(state.topLeftGroup,leftPanel,'topLeftGroup'):''}${rightPanel?renderFour(state.topRightGroup,rightPanel,'topRightGroup'):''}${utilityAndCenter}`;
  const sheenRect=shell?.rect||base,sheenStyle=shell?.style;
  const sheenPath=shapePath(sheenStyle?.preset||'rounded',sheenRect.x,sheenRect.y,sheenRect.w,sheenRect.h,sheenStyle?.radius||28);
  return applyEdits(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><filter id="terrainShadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#000" flood-opacity=".42"/></filter><linearGradient id="terrainSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".035"/><stop offset=".45" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".10"/></linearGradient></defs>${editable('background','Superficie di fondo',`<rect width="${W}" height="${H}" fill="${state.backgroundColor}"/>`)}<g filter="url(#terrainShadow)">${onionMarkup}${panels}${groups}${state.sheenEnabled?`<path d="${sheenPath}" fill="url(#terrainSheen)" pointer-events="none"/>`:''}</g>${renderExtras(state.extras)}</svg>`,state.liveEdits);
}

function download(name:string,blob:Blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
function RangeField({label,value,min,max,step=1,onChange,suffix=''}:{label:string;value:number;min:number;max:number;step?:number;onChange:(v:number)=>void;suffix?:string}){return <label className="rangeField"><span><span>{label}</span><b>{Number.isInteger(step)?Math.round(value):value.toFixed(step<.1?2:1)}{suffix}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
function OpacityField({label,value,onChange}:{label:string;value:number;onChange:(v:number)=>void}){return <RangeField label={label} value={value*100} min={0} max={100} onChange={v=>onChange(v/100)} suffix="%"/>}
function ColorField({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="colorRow"><span>{label}</span><input type="color" value={value} onChange={e=>onChange(e.target.value)}/></label>}
function ToggleField({label,help,checked,onChange}:{label:string;help?:string;checked:boolean;onChange:(v:boolean)=>void}){return <label className="toggleRow"><span><b>{label}</b>{help&&<small>{help}</small>}</span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/></label>}

function AreaEditor({title,value,onChange}:{title:string;value:AreaStyle;onChange:(next:AreaStyle)=>void}){
  const set=<K extends keyof AreaStyle>(key:K,v:AreaStyle[K])=>onChange({...value,[key]:v});
  return <div className="terrainSubEditor"><div className="terrainSubHeader"><b>{title}</b><span>{value.enabled?'attiva':'disattivata'}</span></div><ToggleField label="Mostra area" help="Se la disattivi, la sezione viene rimossa dal layout e le sezioni interne si espandono automaticamente." checked={value.enabled} onChange={v=>set('enabled',v)}/>{value.enabled&&<><div className="terrainToggleGrid"><ToggleField label="Riempimento" checked={value.fillEnabled} onChange={v=>set('fillEnabled',v)}/><ToggleField label="Bordo principale" checked={value.borderEnabled} onChange={v=>set('borderEnabled',v)}/><ToggleField label="Linea interna" checked={value.detailEnabled} onChange={v=>set('detailEnabled',v)}/></div><label>Forma<select value={value.preset} onChange={e=>set('preset',e.target.value as AreaPreset)}>{AREA_PRESETS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label><div className="terrainColorGrid"><ColorField label="Interno" value={value.fillColor} onChange={v=>set('fillColor',v)}/><ColorField label="Bordo" value={value.borderColor} onChange={v=>set('borderColor',v)}/><ColorField label="Linea interna" value={value.accentColor} onChange={v=>set('accentColor',v)}/></div><RangeField label="Distanza dal bordo esterno" value={value.inset} min={0} max={60} onChange={v=>set('inset',v)}/><RangeField label="Angoli arrotondati" value={value.radius} min={0} max={100} onChange={v=>set('radius',v)}/><RangeField label="Spessore bordo" value={value.borderWidth} min={.25} max={14} step={.1} onChange={v=>set('borderWidth',v)}/><RangeField label="Distanza della linea interna" value={value.detailInset} min={2} max={60} onChange={v=>set('detailInset',v)}/><OpacityField label="Opacità riempimento" value={value.fillOpacity} onChange={v=>set('fillOpacity',v)}/><OpacityField label="Opacità bordo" value={value.borderOpacity} onChange={v=>set('borderOpacity',v)}/><OpacityField label="Opacità linea interna" value={value.detailOpacity} onChange={v=>set('detailOpacity',v)}/></>}</div>;
}
function SlotStyleEditor({title,value,onChange}:{title:string;value:SlotStyle;onChange:(next:SlotStyle)=>void}){
  const set=<K extends keyof SlotStyle>(key:K,v:SlotStyle[K])=>onChange({...value,[key]:v});
  return <div className="terrainSubEditor compact"><div className="terrainSubHeader"><b>{title}</b></div><div className="terrainToggleGrid"><ToggleField label="Riempimento" checked={value.fillEnabled} onChange={v=>set('fillEnabled',v)}/><ToggleField label="Bordo" checked={value.borderEnabled} onChange={v=>set('borderEnabled',v)}/><ToggleField label="Linea interna" checked={value.detailEnabled} onChange={v=>set('detailEnabled',v)}/></div><label>Forma slot<select value={value.preset} onChange={e=>set('preset',e.target.value as SlotPreset)}>{SLOT_PRESETS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label><div className="terrainColorGrid"><ColorField label="Interno" value={value.fillColor} onChange={v=>set('fillColor',v)}/><ColorField label="Bordo" value={value.borderColor} onChange={v=>set('borderColor',v)}/><ColorField label="Accento" value={value.accentColor} onChange={v=>set('accentColor',v)}/></div><RangeField label="Spessore bordo" value={value.borderWidth} min={.25} max={10} step={.1} onChange={v=>set('borderWidth',v)}/><RangeField label="Angoli arrotondati" value={value.radius} min={0} max={48} onChange={v=>set('radius',v)}/><RangeField label="Distanza della linea interna" value={value.detailInset} min={2} max={30} onChange={v=>set('detailInset',v)}/><OpacityField label="Opacità riempimento" value={value.fillOpacity} onChange={v=>set('fillOpacity',v)}/><OpacityField label="Opacità bordo" value={value.borderOpacity} onChange={v=>set('borderOpacity',v)}/><OpacityField label="Opacità dettaglio" value={value.detailOpacity} onChange={v=>set('detailOpacity',v)}/></div>;
}
function SlotOverrideEditor({title,value,base,onChange}:{title:string;value:SlotOverride;base:SlotStyle;onChange:(next:SlotOverride)=>void}){
  return <div className="terrainSlotOverride"><div className="terrainSubHeader"><b>{title}</b><span>{value.enabled?(value.custom?'personalizzato':'eredita gruppo'):'nascosto'}</span></div><div className="terrainToggleGrid"><ToggleField label="Mostra slot" checked={value.enabled} onChange={v=>onChange({...value,enabled:v})}/><ToggleField label="Personalizza" checked={value.custom} onChange={v=>onChange({...value,custom:v,style:v?value.style:{...base}})}/></div>{value.enabled&&value.custom&&<SlotStyleEditor title={`${title} · stile`} value={value.style} onChange={style=>onChange({...value,style})}/>}</div>;
}

export function EditorSwitcher({current,onCard,onTerrain}:{current:EditorMode;onCard:()=>void;onTerrain:()=>void}){const[open,setOpen]=useState(false);const choose=(mode:EditorMode)=>{setOpen(false);mode==='card'?onCard():onTerrain()};return <div className="editorSwitcher"><button className="brand brandButton" onClick={()=>setOpen(v=>!v)} aria-haspopup="menu" aria-expanded={open}><span className="brandMark">K</span><div><strong>Kritoma</strong><small>{current==='card'?'Editor carta':'Editor terreno'} · cambia ▾</small></div></button>{open&&<div className="editorSwitcherMenu" role="menu"><button className={current==='card'?'active':''} onClick={()=>choose('card')}><span>▣</span><div><b>Editor carta</b><small>Carte, rarità, foil e layout</small></div></button><button className={current==='terrain'?'active':''} onClick={()=>choose('terrain')}><span>▤</span><div><b>Editor terreno</b><small>Playmat, slot, bordi e colori</small></div></button></div>}</div>}

export default function TerrainEditor({onSwitchToCard}:{onSwitchToCard:()=>void}){
  const history=useHistory<TerrainState>(()=>{try{return normalizeTerrain(JSON.parse(localStorage.getItem('kritoma.terrain')||'null'))}catch{return deepClone(DEFAULT_TERRAIN)}}),state=history.value,setState=history.set,[settingsOpen,setSettingsOpen]=useState(false),[saveError,setSaveError]=useState('');
  useEffect(()=>{try{localStorage.setItem('kritoma.terrain',JSON.stringify(state));setSaveError('')}catch{setSaveError('Spazio del browser esaurito: esporta il progetto prima di chiudere.')}},[state]);
  const markup=useMemo(()=>terrainSvg(state),[state]);
  const update=<K extends keyof TerrainState>(key:K,value:TerrainState[K])=>setState(s=>normalizeTerrain({...s,[key]:value}));
  const updateArea=(key:'outer'|'inner'|'guide'|'topLeftPanel'|'topRightPanel'|'lowerPanel',value:AreaStyle)=>setState(s=>({...s,[key]:value}));
  const updateFourGroup=(key:'topLeftGroup'|'topRightGroup',value:FourSlotGroup)=>setState(s=>({...s,[key]:value}));
  const updateCenter=(value:CenterSlotGroup)=>setState(s=>({...s,centerGroup:value}));
  const updateLayout=(patch:Partial<TerrainLayout>)=>update('layout',{...state.layout,...patch});
  const save=()=>{try{localStorage.setItem('kritoma.terrain',JSON.stringify(state));setSaveError('')}catch{setSaveError('Salvataggio non riuscito: esporta il progetto prima di chiudere.')}};
  const exportSvg=()=>download(`${state.id}.svg`,new Blob([markup],{type:'image/svg+xml'}));
  const raster=(cb:(canvas:HTMLCanvasElement)=>void)=>{const u=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml'})),im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=4800;c.height=2760;c.getContext('2d')!.drawImage(im,0,0,c.width,c.height);cb(c);URL.revokeObjectURL(u)};im.src=u};
  const exportPng=()=>raster(c=>c.toBlob(b=>b&&download(`${state.id}.png`,b),'image/png'));
  const exportPdf=()=>raster(c=>{const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:[state.printWidthMm,state.printHeightMm]});pdf.addImage(c.toDataURL('image/png'),'PNG',0,0,state.printWidthMm,state.printHeightMm);pdf.save(`${state.id}-print.pdf`)});
  const reset=()=>setState(deepClone(DEFAULT_TERRAIN));
  const renderFourGroupEditor=(title:string,key:'topLeftGroup'|'topRightGroup')=>{const group=state[key];const set=(patch:Partial<FourSlotGroup>)=>updateFourGroup(key,{...group,...patch});return <><ToggleField label={`Mostra ${title.toLowerCase()}`} checked={group.enabled} onChange={enabled=>set({enabled})}/>{group.enabled&&<><SlotStyleEditor title="Stile base dei 4 slot" value={group.style} onChange={style=>set({style})}/><div className="terrainLayoutGrid"><RangeField label="Dimensione degli spazi" value={group.scale} min={.72} max={1.22} step={.01} onChange={scale=>set({scale})} suffix="×"/><RangeField label="Spaziatura" value={group.gap} min={.5} max={2} step={.01} onChange={gap=>set({gap})} suffix="×"/><RangeField label="Sposta a destra / sinistra" value={group.offsetX} min={-120} max={120} onChange={offsetX=>set({offsetX})}/><RangeField label="Sposta in alto / basso" value={group.offsetY} min={-90} max={90} onChange={offsetY=>set({offsetY})}/></div>{group.slots.map((slot,i)=><SlotOverrideEditor key={i} title={`Slot ${i+1}`} value={slot} base={group.style} onChange={next=>{const slots=[...group.slots] as FourSlotGroup['slots'];slots[i]=next;set({slots})}}/>)}</>}</>};
  return <div className="appShell terrainShell"><header className="topBar"><EditorSwitcher current="terrain" onCard={onSwitchToCard} onTerrain={()=>{}}/><button className="settingsButton" onClick={()=>setSettingsOpen(true)} aria-label="Apri impostazioni terreno"><span>☰</span><b>Avanzate</b></button></header>{saveError&&<p className="liveSaveError" role="alert">{saveError}</p>}<LiveEditor markup={markup} width={1600} height={920} edits={state.liveEdits} onChange={liveEdits=>update('liveEdits',liveEdits)} history={history} onAdd={kind=>{const id=`custom-${crypto.randomUUID()}`;update('extras',[...(state.extras||[]),{id,kind,text:'Nuovo testo',x:500,y:420,w:180,h:80}]);return id;}} onDelete={id=>{const liveEdits={...state.liveEdits};delete liveEdits[id];setState({...state,extras:state.extras?.filter(v=>v.id!==id),liveEdits});}} onAdvanced={()=>setSettingsOpen(true)}>{id=>{
    if(id.startsWith('custom-')){const item=state.extras?.find(v=>v.id===id);return item?.kind==='text'?<label>Testo libero<textarea aria-label="Testo libero" value={item.text} onChange={e=>update('extras',state.extras?.map(v=>v.id===id?{...v,text:e.target.value}:v))}/></label>:null;}
    if(id==='background')return <ColorField label="Colore superficie" value={state.backgroundColor} onChange={v=>update('backgroundColor',v)}/>;
    if(['deck','grave','extra'].includes(id)){const key=(id==='deck'?'deckLabel':id==='grave'?'graveLabel':'extraLabel') as 'deckLabel'|'graveLabel'|'extraLabel';return <label>Nome dello spazio<textarea aria-label="Nome dello spazio" value={state[key]} onChange={e=>update(key,e.target.value)}/></label>;}
    if(['outer','inner','guide','topLeftPanel','topRightPanel','lowerPanel'].includes(id)){const key=id as 'outer';return <details><summary>Forma e linee dell’area</summary><AreaEditor title="Forma e dettagli dell’area" value={state[key]} onChange={v=>updateArea(key,v)}/></details>;}
    const [groupKey,index]=id.split('-');if(['topLeftGroup','topRightGroup','centerGroup'].includes(groupKey)){const key=groupKey as 'topLeftGroup',group=state[key],i=Number(index),slot=group.slots[i];if(slot)return <details><summary>Forma e linee dello spazio</summary><SlotStyleEditor title="Aspetto di questo spazio" value={effectiveSlot(group.style,slot)} onChange={style=>{const slots=[...group.slots] as FourSlotGroup['slots'];slots[i]={...slot,custom:true,style};update(key,{...group,slots});}}/></details>;}
    return <small>Personalizza questo elemento con i controlli sotto.</small>;
  }}</LiveEditor><nav className="bottomDock"><button onClick={save}>Salva</button><button onClick={()=>setSettingsOpen(true)}>Impostazioni</button><button onClick={exportPng}>PNG</button><button onClick={exportPdf}>PDF</button></nav>{settingsOpen&&<div className="sheetBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSettingsOpen(false)}}><section className="settingsSheet" role="dialog" aria-modal="true" aria-label="Impostazioni terreno"><div className="sheetHandle"/><header className="sheetHeader"><div><strong>Impostazioni terreno</strong><small>Strati, macro aree e slot modificabili separatamente</small></div><button className="closeButton" onClick={()=>setSettingsOpen(false)}>Fatto</button></header><div className="settingsScroll">

    <details className="settingsGroup" open><summary><span><b>Terreno</b><small>Identità, formato e superficie di fondo</small></span><i>›</i></summary><div className="settingsBody"><label>Nome<input value={state.name} onChange={e=>update('name',e.target.value)}/></label><label>ID file<input value={state.id} onChange={e=>update('id',e.target.value)}/></label><div className="fieldGrid"><label>Larghezza stampa (mm)<input type="number" min="200" max="1200" value={state.printWidthMm} onChange={e=>update('printWidthMm',Number(e.target.value))}/></label><label>Altezza stampa (mm)<input type="number" min="150" max="800" value={state.printHeightMm} onChange={e=>update('printHeightMm',Number(e.target.value))}/></label></div><ColorField label="Colore superficie di fondo" value={state.backgroundColor} onChange={v=>update('backgroundColor',v)}/><ToggleField label="Riflesso sulla superficie" help="Leggera luce diagonale sul playmat." checked={state.sheenEnabled} onChange={v=>update('sheenEnabled',v)}/><button className="secondary wideButton" onClick={reset}>Ripristina terreno base</button></div></details>

    <details className="settingsGroup"><summary><span><b>Layout responsive</b><small>Altezze, spazi tra sezioni e reflow automatico</small></span><i>›</i></summary><div className="settingsBody"><small>Le altezze sono valori desiderati: il renderer le ridimensiona proporzionalmente per riempire sempre tutta l’area disponibile. Se una macro sezione viene disattivata, le sezioni rimaste occupano automaticamente lo spazio liberato.</small><div className="terrainLayoutGrid"><RangeField label="Margine esterno laterale" value={state.layout.edgeInsetX} min={0} max={140} onChange={edgeInsetX=>updateLayout({edgeInsetX})}/><RangeField label="Margine esterno verticale" value={state.layout.edgeInsetY} min={0} max={120} onChange={edgeInsetY=>updateLayout({edgeInsetY})}/><RangeField label="Spazio libero ai lati" value={state.layout.contentPaddingX} min={0} max={180} onChange={contentPaddingX=>updateLayout({contentPaddingX})}/><RangeField label="Spazio libero in alto" value={state.layout.contentPaddingTop} min={0} max={180} onChange={contentPaddingTop=>updateLayout({contentPaddingTop})}/><RangeField label="Spazio libero in basso" value={state.layout.contentPaddingBottom} min={0} max={220} onChange={contentPaddingBottom=>updateLayout({contentPaddingBottom})}/><RangeField label="Spazio tra pannelli superiori" value={state.layout.topGapX} min={0} max={220} onChange={topGapX=>updateLayout({topGapX})}/><RangeField label="Spazio superiore ↔ inferiore" value={state.layout.rowGap} min={0} max={220} onChange={rowGap=>updateLayout({rowGap})}/><RangeField label="Altezza sup. sinistro" value={state.layout.topLeftHeight} min={80} max={700} onChange={topLeftHeight=>updateLayout({topLeftHeight})}/><RangeField label="Altezza sup. destro" value={state.layout.topRightHeight} min={80} max={700} onChange={topRightHeight=>updateLayout({topRightHeight})}/><RangeField label="Altezza pannello inferiore" value={state.layout.lowerHeight} min={100} max={760} onChange={lowerHeight=>updateLayout({lowerHeight})}/></div></div></details>

    <details className="settingsGroup"><summary><span><b>Strati perimetro</b><small>Gestione a cipolla: esterno, interno e linea guida</small></span><i>›</i></summary><div className="settingsBody"><small>Ogni livello può essere nascosto interamente oppure mantenuto senza riempimento, bordo o linea interna. Forma e stile sono indipendenti per ciascuno strato.</small><AreaEditor title="1 · Perimetro esterno" value={state.outer} onChange={v=>updateArea('outer',v)}/><AreaEditor title="2 · Campo interno" value={state.inner} onChange={v=>updateArea('inner',v)}/><AreaEditor title="3 · Livello interno / guida" value={state.guide} onChange={v=>updateArea('guide',v)}/></div></details>

    <details className="settingsGroup"><summary><span><b>Macro aree</b><small>Pannelli superiori e pannello inferiore indipendenti</small></span><i>›</i></summary><div className="settingsBody"><small>Le tre macro aree hanno forma, riempimento, bordo e linea interna separati. Disattivare una macro area la rimuove dal flow insieme ai contenuti ospitati; gli altri pannelli vengono riallargati e rialzati automaticamente. Per nascondere solo la grafica del pannello mantenendo la sezione, disattiva riempimento/bordi invece di “Mostra area”.</small><AreaEditor title="Pannello superiore sinistro" value={state.topLeftPanel} onChange={v=>updateArea('topLeftPanel',v)}/><AreaEditor title="Pannello superiore destro" value={state.topRightPanel} onChange={v=>updateArea('topRightPanel',v)}/><AreaEditor title="Pannello inferiore" value={state.lowerPanel} onChange={v=>updateArea('lowerPanel',v)}/></div></details>

    <details className="settingsGroup"><summary><span><b>4 slot · gruppo sinistro</b><small>Stile di gruppo e override per ogni singolo slot</small></span><i>›</i></summary><div className="settingsBody">{renderFourGroupEditor('Gruppo superiore sinistro','topLeftGroup')}</div></details>

    <details className="settingsGroup"><summary><span><b>4 slot · gruppo destro</b><small>Stile di gruppo e override per ogni singolo slot</small></span><i>›</i></summary><div className="settingsBody">{renderFourGroupEditor('Gruppo superiore destro','topRightGroup')}</div></details>

    <details className="settingsGroup"><summary><span><b>3 slot centrali</b><small>Gruppo indipendente, margini separati e override singoli</small></span><i>›</i></summary><div className="settingsBody"><ToggleField label="Mostra gruppo centrale" checked={state.centerGroup.enabled} onChange={enabled=>updateCenter({...state.centerGroup,enabled})}/>{state.centerGroup.enabled&&<><SlotStyleEditor title="Stile base dei 3 slot" value={state.centerGroup.style} onChange={style=>updateCenter({...state.centerGroup,style})}/><div className="terrainLayoutGrid"><RangeField label="Dimensione degli spazi" value={state.centerGroup.scale} min={.72} max={1.22} step={.01} onChange={scale=>updateCenter({...state.centerGroup,scale})} suffix="×"/><RangeField label="Spazio slot 1 ↔ 2" value={state.centerGroup.gap12} min={.4} max={2.4} step={.01} onChange={gap12=>updateCenter({...state.centerGroup,gap12})} suffix="×"/><RangeField label="Spazio slot 2 ↔ 3" value={state.centerGroup.gap23} min={.4} max={2.4} step={.01} onChange={gap23=>updateCenter({...state.centerGroup,gap23})} suffix="×"/><RangeField label="Sposta a destra / sinistra gruppo" value={state.centerGroup.offsetX} min={-180} max={180} onChange={offsetX=>updateCenter({...state.centerGroup,offsetX})}/><RangeField label="Sposta in alto / basso gruppo" value={state.centerGroup.offsetY} min={-100} max={100} onChange={offsetY=>updateCenter({...state.centerGroup,offsetY})}/></div>{state.centerGroup.slots.map((slot,i)=><SlotOverrideEditor key={i} title={`Slot centrale ${i+1}`} value={slot} base={state.centerGroup.style} onChange={next=>{const slots=[...state.centerGroup.slots] as CenterSlotGroup['slots'];slots[i]=next;updateCenter({...state.centerGroup,slots})}}/>)}</>}</div></details>

    <details className="settingsGroup"><summary><span><b>Mazzo, Cimitero, Extra</b><small>Slot di servizio e relative etichette</small></span><i>›</i></summary><div className="settingsBody"><div className="terrainToggleGrid"><ToggleField label="Mazzo" checked={state.deckEnabled} onChange={v=>update('deckEnabled',v)}/><ToggleField label="Cimitero" checked={state.graveEnabled} onChange={v=>update('graveEnabled',v)}/><ToggleField label="Extra" checked={state.extraEnabled} onChange={v=>update('extraEnabled',v)}/></div><SlotStyleEditor title="Stile slot di servizio" value={state.utilityStyle} onChange={v=>update('utilityStyle',v)}/><label>Mazzo<input value={state.deckLabel} onChange={e=>update('deckLabel',e.target.value)}/></label><label>Cimitero<input value={state.graveLabel} onChange={e=>update('graveLabel',e.target.value)}/></label><label>Extra<input value={state.extraLabel} onChange={e=>update('extraLabel',e.target.value)}/></label></div></details>

    <details className="settingsGroup"><summary><span><b>Tipografia</b><small>Font delle etichette del terreno</small></span><i>›</i></summary><div className="settingsBody"><ColorField label="Colore testo" value={state.textColor} onChange={v=>update('textColor',v)}/><label>Font<select value={state.labelFont} onChange={e=>update('labelFont',e.target.value)}>{FONT_OPTIONS.map(f=><option key={f} value={f}>{f}</option>)}</select></label><RangeField label="Grandezza del testo" value={state.labelSize} min={8} max={32} onChange={v=>update('labelSize',v)} suffix=" pt"/><RangeField label="Spessore del testo" value={state.labelWeight} min={300} max={900} step={100} onChange={v=>update('labelWeight',v)}/><RangeField label="Spaziatura lettere" value={state.letterSpacing} min={0} max={8} step={.1} onChange={v=>update('letterSpacing',v)} suffix=" px"/><ToggleField label="Maiuscolo automatico" help="Uniforma le etichette del terreno." checked={state.uppercase} onChange={v=>update('uppercase',v)}/></div></details>

    <details className="settingsGroup"><summary><span><b>Esporta</b><small>SVG vettoriale, PNG e PDF stampa</small></span><i>›</i></summary><div className="settingsBody exportGrid"><button onClick={save}>Salva cache</button><button onClick={exportSvg}>SVG</button><button onClick={exportPng}>PNG HQ</button><button onClick={exportPdf}>PDF stampa</button></div></details>

  </div></section></div>}</div>;
}
