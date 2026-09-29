import React,{useMemo,useState}from'react';
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

type TerrainState={
  id:string;
  name:string;
  printWidthMm:number;
  printHeightMm:number;
  backgroundColor:string;
  textColor:string;
  sheenEnabled:boolean;
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
function normalizeTerrain(input:any):TerrainState{
  const legacy=input||{};
  const legacySlot:SlotStyle={...BASE_SLOT_STYLE,preset:legacy.slotPreset||BASE_SLOT_STYLE.preset,fillColor:legacy.slotColor||BASE_SLOT_STYLE.fillColor,borderColor:legacy.borderColor||BASE_SLOT_STYLE.borderColor,accentColor:legacy.accentColor||BASE_SLOT_STYLE.accentColor,borderWidth:legacy.slotWidth??BASE_SLOT_STYLE.borderWidth,radius:legacy.slotRadius??BASE_SLOT_STYLE.radius,detailInset:legacy.slotInset??BASE_SLOT_STYLE.detailInset,detailOpacity:legacy.slotDetail??BASE_SLOT_STYLE.detailOpacity,fillOpacity:legacy.slotFillOpacity??BASE_SLOT_STYLE.fillOpacity};
  const legacyPanel=(fallback:AreaStyle):AreaStyle=>({...fallback,preset:legacy.panelPreset||fallback.preset,fillColor:legacy.panelColor||fallback.fillColor,borderColor:legacy.borderColor||fallback.borderColor,accentColor:legacy.accentColor||fallback.accentColor,borderWidth:legacy.panelWidth??fallback.borderWidth,radius:legacy.panelRadius??fallback.radius,borderOpacity:legacy.panelOpacity??fallback.borderOpacity});
  const topFallback:FourSlotGroup={...DEFAULT_TERRAIN.topLeftGroup,scale:legacy.slotScale??1,gap:legacy.slotGap??1,style:legacySlot,slots:makeFourSlots()};
  const centerFallback:CenterSlotGroup={...DEFAULT_TERRAIN.centerGroup,scale:legacy.slotScale??1,gap12:legacy.slotGap??1,gap23:legacy.slotGap??1,style:legacySlot,slots:makeThreeSlots()};
  return{
    id:String(legacy.id||DEFAULT_TERRAIN.id),name:String(legacy.name||DEFAULT_TERRAIN.name),
    printWidthMm:clamp(Number(legacy.printWidthMm)||610,200,1200),printHeightMm:clamp(Number(legacy.printHeightMm)||350,150,800),
    backgroundColor:legacy.backgroundColor||legacy.outerColor||DEFAULT_TERRAIN.backgroundColor,textColor:legacy.textColor||DEFAULT_TERRAIN.textColor,sheenEnabled:legacy.sheenEnabled!==false,
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

function renderArea(style:AreaStyle,x:number,y:number,w:number,h:number){
  if(!style.enabled||w<=0||h<=0)return'';
  const d=shapePath(style.preset,x,y,w,h,style.radius),detailInset=Math.min(style.detailInset,w*.18,h*.18),di=shapePath(style.preset,x+detailInset,y+detailInset,w-detailInset*2,h-detailInset*2,Math.max(0,style.radius-detailInset*.45));
  const doubleInset=Math.max(4,style.borderWidth*2.2),doublePath=shapePath(style.preset,x+doubleInset,y+doubleInset,w-doubleInset*2,h-doubleInset*2,Math.max(0,style.radius-doubleInset*.35));
  return`<g>${style.fillEnabled?fillPath(d,style.fillColor,style.fillOpacity):''}${style.borderEnabled?`${strokePath(d,'#090807',style.borderWidth+3,style.borderOpacity*.72)}${strokePath(d,style.borderColor,style.borderWidth,style.borderOpacity)}${style.preset==='double'?strokePath(doublePath,style.borderColor,Math.max(.55,style.borderWidth*.48),style.borderOpacity*.65):''}`:''}${style.detailEnabled?strokePath(di,style.accentColor,Math.max(.55,style.borderWidth*.46),style.detailOpacity):''}</g>`;
}
function renderSlot(x:number,y:number,w:number,h:number,style:SlotStyle,state:TerrainState,label=''){
  const d=shapePath(style.preset,x,y,w,h,style.radius),inset=Math.min(style.detailInset,w*.18,h*.18),di=shapePath(style.preset,x+inset,y+inset,w-inset*2,h-inset*2,Math.max(0,style.radius-inset*.4));
  const doubleInset=Math.max(4,style.borderWidth*2),doublePath=shapePath(style.preset,x+doubleInset,y+doubleInset,w-doubleInset*2,h-doubleInset*2,Math.max(0,style.radius-doubleInset*.35));
  const text=label?`<text x="${x+12}" y="${y+18}" fill="${state.textColor}" font-family="${esc(fontStack(state.labelFont))}" font-size="${state.labelSize}" font-weight="${state.labelWeight}" letter-spacing="${state.letterSpacing}">${esc(labelText(label,state.uppercase))}</text>`:'';
  return`<g>${style.fillEnabled?fillPath(d,style.fillColor,style.fillOpacity):''}${style.borderEnabled?`${strokePath(d,'#0a0908',style.borderWidth+3,style.borderOpacity*.76)}${strokePath(d,style.borderColor,style.borderWidth,style.borderOpacity)}${style.preset==='double'?strokePath(doublePath,style.borderColor,Math.max(.5,style.borderWidth*.5),style.borderOpacity*.62):''}`:''}${style.detailEnabled?strokePath(di,style.accentColor,Math.max(.5,style.borderWidth*.46),style.detailOpacity):''}${text}</g>`;
}
function effectiveSlot(base:SlotStyle,override:SlotOverride){return override.custom?override.style:base}

function terrainSvg(state:TerrainState){
  const W=1600,H=920;
  const outerInset=26+state.outer.inset,x=outerInset,y=16+state.outer.inset*.65,w=W-outerInset*2,h=H-(32+state.outer.inset*1.3);
  const innerInset=state.inner.inset,ix=x+innerInset,iy=y+innerInset,iw=w-innerInset*2,ih=h-innerInset*2;
  const guideInset=state.guide.inset,gx=ix+guideInset,gy=iy+guideInset,gw=iw-guideInset*2,gh=ih-guideInset*2;
  const topY=108,topH=260,topW=660,leftX=112,rightX=828,lowerX=112,lowerY=404,lowerW=1376,lowerH=370;
  const renderPanel=(style:AreaStyle,px:number,py:number,pw:number,ph:number)=>{const inset=style.inset;return renderArea(style,px+inset,py+inset,pw-inset*2,ph-inset*2)};
  const renderFour=(group:FourSlotGroup,panelX:number)=>{
    if(!group.enabled)return'';
    const sw=140*group.scale,sh=200*group.scale,gap=14*group.gap,total=sw*4+gap*3,start=panelX+(topW-total)/2+group.offsetX,sy=topY+(topH-sh)/2+group.offsetY;
    return group.slots.map((slot,i)=>slot.enabled?renderSlot(start+i*(sw+gap),sy,sw,sh,effectiveSlot(group.style,slot),state):'').join('');
  };
  const utilityW=140,utilityH=200,utilityY=482;
  const deckX=lowerX+20,graveX=deckX+utilityW+26,extraX=lowerX+lowerW-20-utilityW;
  const center=(()=>{
    const group=state.centerGroup;if(!group.enabled)return'';
    const sw=140*group.scale,sh=200*group.scale,g12=30*group.gap12,g23=30*group.gap23,total=sw*3+g12+g23,start=lowerX+(lowerW-total)/2+group.offsetX,sy=482+(200-sh)/2+group.offsetY;
    const xs=[start,start+sw+g12,start+sw*2+g12+g23];
    return group.slots.map((slot,i)=>slot.enabled?renderSlot(xs[i],sy,sw,sh,effectiveSlot(group.style,slot),state):'').join('');
  })();
  return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><filter id="terrainShadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#000" flood-opacity=".42"/></filter><linearGradient id="terrainSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".035"/><stop offset=".45" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".10"/></linearGradient></defs><rect width="${W}" height="${H}" fill="${state.backgroundColor}"/><g filter="url(#terrainShadow)">${renderArea(state.outer,x,y,w,h)}${renderArea(state.inner,ix,iy,iw,ih)}${renderArea(state.guide,gx,gy,gw,gh)}${renderPanel(state.topLeftPanel,leftX,topY,topW,topH)}${renderPanel(state.topRightPanel,rightX,topY,topW,topH)}${renderFour(state.topLeftGroup,leftX)}${renderFour(state.topRightGroup,rightX)}${renderPanel(state.lowerPanel,lowerX,lowerY,lowerW,lowerH)}${state.deckEnabled?renderSlot(deckX,utilityY,utilityW,utilityH,state.utilityStyle,state,state.deckLabel):''}${state.graveEnabled?renderSlot(graveX,utilityY,utilityW,utilityH,state.utilityStyle,state,state.graveLabel):''}${center}${state.extraEnabled?renderSlot(extraX,utilityY,utilityW,utilityH,state.utilityStyle,state,state.extraLabel):''}${state.sheenEnabled?`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.max(0,state.outer.radius)}" fill="url(#terrainSheen)" pointer-events="none"/>`:''}</g></svg>`;
}

function download(name:string,blob:Blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
function RangeField({label,value,min,max,step=1,onChange,suffix=''}:{label:string;value:number;min:number;max:number;step?:number;onChange:(v:number)=>void;suffix?:string}){return <label className="rangeField"><span><span>{label}</span><b>{Number.isInteger(step)?Math.round(value):value.toFixed(step<.1?2:1)}{suffix}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
function OpacityField({label,value,onChange}:{label:string;value:number;onChange:(v:number)=>void}){return <RangeField label={label} value={value*100} min={0} max={100} onChange={v=>onChange(v/100)} suffix="%"/>}
function ColorField({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="colorRow"><span>{label}</span><input type="color" value={value} onChange={e=>onChange(e.target.value)}/></label>}
function ToggleField({label,help,checked,onChange}:{label:string;help?:string;checked:boolean;onChange:(v:boolean)=>void}){return <label className="toggleRow"><span><b>{label}</b>{help&&<small>{help}</small>}</span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/></label>}

function AreaEditor({title,value,onChange}:{title:string;value:AreaStyle;onChange:(next:AreaStyle)=>void}){
  const set=<K extends keyof AreaStyle>(key:K,v:AreaStyle[K])=>onChange({...value,[key]:v});
  return <div className="terrainSubEditor"><div className="terrainSubHeader"><b>{title}</b><span>{value.enabled?'attiva':'disattivata'}</span></div><ToggleField label="Mostra area" checked={value.enabled} onChange={v=>set('enabled',v)}/>{value.enabled&&<><div className="terrainToggleGrid"><ToggleField label="Riempimento" checked={value.fillEnabled} onChange={v=>set('fillEnabled',v)}/><ToggleField label="Bordo principale" checked={value.borderEnabled} onChange={v=>set('borderEnabled',v)}/><ToggleField label="Linea interna" checked={value.detailEnabled} onChange={v=>set('detailEnabled',v)}/></div><label>Forma<select value={value.preset} onChange={e=>set('preset',e.target.value as AreaPreset)}>{AREA_PRESETS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label><div className="terrainColorGrid"><ColorField label="Interno" value={value.fillColor} onChange={v=>set('fillColor',v)}/><ColorField label="Bordo" value={value.borderColor} onChange={v=>set('borderColor',v)}/><ColorField label="Linea interna" value={value.accentColor} onChange={v=>set('accentColor',v)}/></div><RangeField label="Inset area" value={value.inset} min={0} max={60} onChange={v=>set('inset',v)}/><RangeField label="Radius" value={value.radius} min={0} max={100} onChange={v=>set('radius',v)}/><RangeField label="Spessore bordo" value={value.borderWidth} min={.25} max={14} step={.1} onChange={v=>set('borderWidth',v)}/><RangeField label="Inset linea interna" value={value.detailInset} min={2} max={60} onChange={v=>set('detailInset',v)}/><OpacityField label="Opacità riempimento" value={value.fillOpacity} onChange={v=>set('fillOpacity',v)}/><OpacityField label="Opacità bordo" value={value.borderOpacity} onChange={v=>set('borderOpacity',v)}/><OpacityField label="Opacità linea interna" value={value.detailOpacity} onChange={v=>set('detailOpacity',v)}/></>}</div>;
}
function SlotStyleEditor({title,value,onChange}:{title:string;value:SlotStyle;onChange:(next:SlotStyle)=>void}){
  const set=<K extends keyof SlotStyle>(key:K,v:SlotStyle[K])=>onChange({...value,[key]:v});
  return <div className="terrainSubEditor compact"><div className="terrainSubHeader"><b>{title}</b></div><div className="terrainToggleGrid"><ToggleField label="Riempimento" checked={value.fillEnabled} onChange={v=>set('fillEnabled',v)}/><ToggleField label="Bordo" checked={value.borderEnabled} onChange={v=>set('borderEnabled',v)}/><ToggleField label="Linea interna" checked={value.detailEnabled} onChange={v=>set('detailEnabled',v)}/></div><label>Forma slot<select value={value.preset} onChange={e=>set('preset',e.target.value as SlotPreset)}>{SLOT_PRESETS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label><div className="terrainColorGrid"><ColorField label="Interno" value={value.fillColor} onChange={v=>set('fillColor',v)}/><ColorField label="Bordo" value={value.borderColor} onChange={v=>set('borderColor',v)}/><ColorField label="Accento" value={value.accentColor} onChange={v=>set('accentColor',v)}/></div><RangeField label="Spessore bordo" value={value.borderWidth} min={.25} max={10} step={.1} onChange={v=>set('borderWidth',v)}/><RangeField label="Radius" value={value.radius} min={0} max={48} onChange={v=>set('radius',v)}/><RangeField label="Inset linea interna" value={value.detailInset} min={2} max={30} onChange={v=>set('detailInset',v)}/><OpacityField label="Opacità riempimento" value={value.fillOpacity} onChange={v=>set('fillOpacity',v)}/><OpacityField label="Opacità bordo" value={value.borderOpacity} onChange={v=>set('borderOpacity',v)}/><OpacityField label="Opacità dettaglio" value={value.detailOpacity} onChange={v=>set('detailOpacity',v)}/></div>;
}
function SlotOverrideEditor({title,value,base,onChange}:{title:string;value:SlotOverride;base:SlotStyle;onChange:(next:SlotOverride)=>void}){
  return <div className="terrainSlotOverride"><div className="terrainSubHeader"><b>{title}</b><span>{value.enabled?(value.custom?'personalizzato':'eredita gruppo'):'nascosto'}</span></div><div className="terrainToggleGrid"><ToggleField label="Mostra slot" checked={value.enabled} onChange={v=>onChange({...value,enabled:v})}/><ToggleField label="Personalizza" checked={value.custom} onChange={v=>onChange({...value,custom:v,style:v?value.style:{...base}})}/></div>{value.enabled&&value.custom&&<SlotStyleEditor title={`${title} · stile`} value={value.style} onChange={style=>onChange({...value,style})}/>}</div>;
}

export function EditorSwitcher({current,onCard,onTerrain}:{current:EditorMode;onCard:()=>void;onTerrain:()=>void}){const[open,setOpen]=useState(false);const choose=(mode:EditorMode)=>{setOpen(false);mode==='card'?onCard():onTerrain()};return <div className="editorSwitcher"><button className="brand brandButton" onClick={()=>setOpen(v=>!v)} aria-haspopup="menu" aria-expanded={open}><span className="brandMark">K</span><div><strong>Kritoma</strong><small>{current==='card'?'Editor carta':'Editor terreno'} · cambia ▾</small></div></button>{open&&<div className="editorSwitcherMenu" role="menu"><button className={current==='card'?'active':''} onClick={()=>choose('card')}><span>▣</span><div><b>Editor carta</b><small>Carte, rarità, foil e layout</small></div></button><button className={current==='terrain'?'active':''} onClick={()=>choose('terrain')}><span>▤</span><div><b>Editor terreno</b><small>Playmat, slot, bordi e colori</small></div></button></div>}</div>}

export default function TerrainEditor({onSwitchToCard}:{onSwitchToCard:()=>void}){
  const[state,setState]=useState<TerrainState>(()=>{try{return normalizeTerrain(JSON.parse(localStorage.getItem('kritoma.terrain')||'null'))}catch{return deepClone(DEFAULT_TERRAIN)}}),[settingsOpen,setSettingsOpen]=useState(false);
  const markup=useMemo(()=>terrainSvg(state),[state]);
  const update=<K extends keyof TerrainState>(key:K,value:TerrainState[K])=>setState(s=>normalizeTerrain({...s,[key]:value}));
  const updateArea=(key:'outer'|'inner'|'guide'|'topLeftPanel'|'topRightPanel'|'lowerPanel',value:AreaStyle)=>setState(s=>({...s,[key]:value}));
  const updateFourGroup=(key:'topLeftGroup'|'topRightGroup',value:FourSlotGroup)=>setState(s=>({...s,[key]:value}));
  const updateCenter=(value:CenterSlotGroup)=>setState(s=>({...s,centerGroup:value}));
  const save=()=>localStorage.setItem('kritoma.terrain',JSON.stringify(state));
  const exportSvg=()=>download(`${state.id}.svg`,new Blob([markup],{type:'image/svg+xml'}));
  const raster=(cb:(canvas:HTMLCanvasElement)=>void)=>{const u=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml'})),im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=4800;c.height=2760;c.getContext('2d')!.drawImage(im,0,0,c.width,c.height);cb(c);URL.revokeObjectURL(u)};im.src=u};
  const exportPng=()=>raster(c=>c.toBlob(b=>b&&download(`${state.id}.png`,b),'image/png'));
  const exportPdf=()=>raster(c=>{const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:[state.printWidthMm,state.printHeightMm]});pdf.addImage(c.toDataURL('image/png'),'PNG',0,0,state.printWidthMm,state.printHeightMm);pdf.save(`${state.id}-print.pdf`)});
  const reset=()=>setState(deepClone(DEFAULT_TERRAIN));
  const renderFourGroupEditor=(title:string,key:'topLeftGroup'|'topRightGroup')=>{const group=state[key];const set=(patch:Partial<FourSlotGroup>)=>updateFourGroup(key,{...group,...patch});return <><ToggleField label={`Mostra ${title.toLowerCase()}`} checked={group.enabled} onChange={enabled=>set({enabled})}/>{group.enabled&&<><SlotStyleEditor title="Stile base dei 4 slot" value={group.style} onChange={style=>set({style})}/><div className="terrainLayoutGrid"><RangeField label="Scala gruppo" value={group.scale} min={.72} max={1.22} step={.01} onChange={scale=>set({scale})} suffix="×"/><RangeField label="Spaziatura" value={group.gap} min={.5} max={2} step={.01} onChange={gap=>set({gap})} suffix="×"/><RangeField label="Offset X" value={group.offsetX} min={-120} max={120} onChange={offsetX=>set({offsetX})}/><RangeField label="Offset Y" value={group.offsetY} min={-90} max={90} onChange={offsetY=>set({offsetY})}/></div>{group.slots.map((slot,i)=><SlotOverrideEditor key={i} title={`Slot ${i+1}`} value={slot} base={group.style} onChange={next=>{const slots=[...group.slots] as FourSlotGroup['slots'];slots[i]=next;set({slots})}}/>)}</>}</>};
  return <div className="appShell terrainShell"><header className="topBar"><EditorSwitcher current="terrain" onCard={onSwitchToCard} onTerrain={()=>{}}/><button className="settingsButton" onClick={()=>setSettingsOpen(true)} aria-label="Apri impostazioni terreno"><span>☰</span><b>Modifica</b></button></header><main className="terrainWorkspace"><div className="terrainPreviewWrap"><div className="terrainPreview" dangerouslySetInnerHTML={{__html:markup}}/></div></main><nav className="bottomDock"><button onClick={save}>Salva</button><button onClick={()=>setSettingsOpen(true)}>Impostazioni</button><button onClick={exportPng}>PNG</button><button onClick={exportPdf}>PDF</button></nav>{settingsOpen&&<div className="sheetBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSettingsOpen(false)}}><section className="settingsSheet" role="dialog" aria-modal="true" aria-label="Impostazioni terreno"><div className="sheetHandle"/><header className="sheetHeader"><div><strong>Impostazioni terreno</strong><small>Strati, macro aree e slot modificabili separatamente</small></div><button className="closeButton" onClick={()=>setSettingsOpen(false)}>Fatto</button></header><div className="settingsScroll">

    <details className="settingsGroup" open><summary><span><b>Terreno</b><small>Identità, formato e superficie di fondo</small></span><i>›</i></summary><div className="settingsBody"><label>Nome<input value={state.name} onChange={e=>update('name',e.target.value)}/></label><label>ID file<input value={state.id} onChange={e=>update('id',e.target.value)}/></label><div className="fieldGrid"><label>Larghezza stampa (mm)<input type="number" min="200" max="1200" value={state.printWidthMm} onChange={e=>update('printWidthMm',Number(e.target.value))}/></label><label>Altezza stampa (mm)<input type="number" min="150" max="800" value={state.printHeightMm} onChange={e=>update('printHeightMm',Number(e.target.value))}/></label></div><ColorField label="Colore superficie di fondo" value={state.backgroundColor} onChange={v=>update('backgroundColor',v)}/><ToggleField label="Sheen superficiale" help="Leggera luce diagonale sul playmat." checked={state.sheenEnabled} onChange={v=>update('sheenEnabled',v)}/><button className="secondary wideButton" onClick={reset}>Ripristina terreno base</button></div></details>

    <details className="settingsGroup"><summary><span><b>Strati perimetro</b><small>Gestione a cipolla: esterno, interno e linea guida</small></span><i>›</i></summary><div className="settingsBody"><small>Ogni livello può essere nascosto interamente oppure mantenuto senza riempimento, bordo o linea interna. Forma e stile sono indipendenti per ciascuno strato.</small><AreaEditor title="1 · Perimetro esterno" value={state.outer} onChange={v=>updateArea('outer',v)}/><AreaEditor title="2 · Campo interno" value={state.inner} onChange={v=>updateArea('inner',v)}/><AreaEditor title="3 · Livello interno / guida" value={state.guide} onChange={v=>updateArea('guide',v)}/></div></details>

    <details className="settingsGroup"><summary><span><b>Macro aree</b><small>Pannelli superiori e pannello inferiore indipendenti</small></span><i>›</i></summary><div className="settingsBody"><small>Le tre macro aree hanno forma, riempimento, bordo e linea interna separati. Nascondere un pannello non nasconde automaticamente i suoi slot.</small><AreaEditor title="Pannello superiore sinistro" value={state.topLeftPanel} onChange={v=>updateArea('topLeftPanel',v)}/><AreaEditor title="Pannello superiore destro" value={state.topRightPanel} onChange={v=>updateArea('topRightPanel',v)}/><AreaEditor title="Pannello inferiore" value={state.lowerPanel} onChange={v=>updateArea('lowerPanel',v)}/></div></details>

    <details className="settingsGroup"><summary><span><b>4 slot · gruppo sinistro</b><small>Stile di gruppo e override per ogni singolo slot</small></span><i>›</i></summary><div className="settingsBody">{renderFourGroupEditor('Gruppo superiore sinistro','topLeftGroup')}</div></details>

    <details className="settingsGroup"><summary><span><b>4 slot · gruppo destro</b><small>Stile di gruppo e override per ogni singolo slot</small></span><i>›</i></summary><div className="settingsBody">{renderFourGroupEditor('Gruppo superiore destro','topRightGroup')}</div></details>

    <details className="settingsGroup"><summary><span><b>3 slot centrali</b><small>Gruppo indipendente, margini separati e override singoli</small></span><i>›</i></summary><div className="settingsBody"><ToggleField label="Mostra gruppo centrale" checked={state.centerGroup.enabled} onChange={enabled=>updateCenter({...state.centerGroup,enabled})}/>{state.centerGroup.enabled&&<><SlotStyleEditor title="Stile base dei 3 slot" value={state.centerGroup.style} onChange={style=>updateCenter({...state.centerGroup,style})}/><div className="terrainLayoutGrid"><RangeField label="Scala gruppo" value={state.centerGroup.scale} min={.72} max={1.22} step={.01} onChange={scale=>updateCenter({...state.centerGroup,scale})} suffix="×"/><RangeField label="Spazio slot 1 ↔ 2" value={state.centerGroup.gap12} min={.4} max={2.4} step={.01} onChange={gap12=>updateCenter({...state.centerGroup,gap12})} suffix="×"/><RangeField label="Spazio slot 2 ↔ 3" value={state.centerGroup.gap23} min={.4} max={2.4} step={.01} onChange={gap23=>updateCenter({...state.centerGroup,gap23})} suffix="×"/><RangeField label="Offset X gruppo" value={state.centerGroup.offsetX} min={-180} max={180} onChange={offsetX=>updateCenter({...state.centerGroup,offsetX})}/><RangeField label="Offset Y gruppo" value={state.centerGroup.offsetY} min={-100} max={100} onChange={offsetY=>updateCenter({...state.centerGroup,offsetY})}/></div>{state.centerGroup.slots.map((slot,i)=><SlotOverrideEditor key={i} title={`Slot centrale ${i+1}`} value={slot} base={state.centerGroup.style} onChange={next=>{const slots=[...state.centerGroup.slots] as CenterSlotGroup['slots'];slots[i]=next;updateCenter({...state.centerGroup,slots})}}/>)}</>}</div></details>

    <details className="settingsGroup"><summary><span><b>Mazzo, Cimitero, Extra</b><small>Slot di servizio e relative etichette</small></span><i>›</i></summary><div className="settingsBody"><div className="terrainToggleGrid"><ToggleField label="Mazzo" checked={state.deckEnabled} onChange={v=>update('deckEnabled',v)}/><ToggleField label="Cimitero" checked={state.graveEnabled} onChange={v=>update('graveEnabled',v)}/><ToggleField label="Extra" checked={state.extraEnabled} onChange={v=>update('extraEnabled',v)}/></div><SlotStyleEditor title="Stile slot di servizio" value={state.utilityStyle} onChange={v=>update('utilityStyle',v)}/><label>Mazzo<input value={state.deckLabel} onChange={e=>update('deckLabel',e.target.value)}/></label><label>Cimitero<input value={state.graveLabel} onChange={e=>update('graveLabel',e.target.value)}/></label><label>Extra<input value={state.extraLabel} onChange={e=>update('extraLabel',e.target.value)}/></label></div></details>

    <details className="settingsGroup"><summary><span><b>Tipografia</b><small>Font delle etichette del terreno</small></span><i>›</i></summary><div className="settingsBody"><ColorField label="Colore testo" value={state.textColor} onChange={v=>update('textColor',v)}/><label>Font<select value={state.labelFont} onChange={e=>update('labelFont',e.target.value)}>{FONT_OPTIONS.map(f=><option key={f} value={f}>{f}</option>)}</select></label><RangeField label="Dimensione font" value={state.labelSize} min={8} max={32} onChange={v=>update('labelSize',v)} suffix=" pt"/><RangeField label="Peso font" value={state.labelWeight} min={300} max={900} step={100} onChange={v=>update('labelWeight',v)}/><RangeField label="Spaziatura lettere" value={state.letterSpacing} min={0} max={8} step={.1} onChange={v=>update('letterSpacing',v)} suffix=" px"/><ToggleField label="Maiuscolo automatico" help="Uniforma le etichette del terreno." checked={state.uppercase} onChange={v=>update('uppercase',v)}/></div></details>

    <details className="settingsGroup"><summary><span><b>Esporta</b><small>SVG vettoriale, PNG e PDF stampa</small></span><i>›</i></summary><div className="settingsBody exportGrid"><button onClick={save}>Salva cache</button><button onClick={exportSvg}>SVG</button><button onClick={exportPng}>PNG HQ</button><button onClick={exportPdf}>PDF stampa</button></div></details>

  </div></section></div>}</div>;
}
