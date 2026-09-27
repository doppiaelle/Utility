import React,{useMemo,useRef,useState}from'react';
import{createRoot}from'react-dom/client';
import jsPDF from'jspdf';
import'./styles.css';

type CardType='fighter'|'location'|'action'|'extraFighter'|'objective'|'token';
type Detail={label:string;value:string;icon?:string;opacity?:number};
type Stat={kind:string;value:string;opacity?:number};
type LayerOpacity={frame:number;header:number;cost:number;meta:number;effect:number;stats:number;id:number;artwork:number};
type FrameStyle={size:number;radius:number;opacity:number;accentSize:number;accentOpacity:number;inset:number};
type Card={
  id:string;type:CardType;name:string;scope:string;scopeColor:string;cost?:string;rarity?:string;
  meta:Detail[];effects:Detail[];stats:Stat[];art?:string;
  artScale?:number;artX?:number;artY?:number;layers?:Partial<LayerOpacity>;frame?:Partial<FrameStyle>;
};

const TYPES:Record<CardType,string>={fighter:'Combattente',location:'Luogo',action:'Azione',extraFighter:'ExtraCombattente',objective:'Obiettivo',token:'Token'};
const DEFAULT_LAYERS:LayerOpacity={frame:1,header:.96,cost:1,meta:.94,effect:.90,stats:.98,id:.98,artwork:1};
const DEFAULT_FRAME:FrameStyle={size:3.2,radius:26,opacity:.92,accentSize:2.2,accentOpacity:.72,inset:10};
const DEFAULT:Card={
  id:'KRT-001',type:'fighter',name:'Nome Carta',scope:'Informatica',scopeColor:'#1d5c6b',cost:'',rarity:'',
  meta:[{label:'',value:'Archetipo',opacity:1},{label:'',value:'Tipo',opacity:1}],
  effects:[{label:'EFFETTO',value:'Testo effetto della carta.',opacity:1}],
  stats:[{kind:'ATK',value:'',opacity:1},{kind:'RES',value:'',opacity:1},{kind:'PRF',value:'',opacity:1}],
  artScale:1,artX:0,artY:0,layers:DEFAULT_LAYERS,frame:DEFAULT_FRAME
};
const scopeDefault:Record<string,string>={Informatica:'#1d5c6b',Economia:'#3f6b3a',Medicina:'#a8324a',Ingegneria:'#9a5b17',Sportivi:'#4a3a86',Media:'#a8296e'};

const esc=(s:any)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}as any)[c]);
const wrap=(s:string,max=58)=>{const words=String(s||'').split(/\s+/),out:string[]=[];let line='';for(const word of words){const next=`${line} ${word}`.trim();if(next.length>max){if(line)out.push(line);line=word}else line=next}if(line)out.push(line);return out.slice(0,9)};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const clamp01=(v:number|undefined,fallback=1)=>clamp(Number.isFinite(v as number)?Number(v):fallback,0,1);
const bevel=(x:number,y:number,w:number,h:number,c=13)=>`M ${x+c} ${y} H ${x+w-c} L ${x+w} ${y+c} V ${y+h-c} L ${x+w-c} ${y+h} H ${x+c} L ${x} ${y+h-c} V ${y+c} Z`;

const slotIcon=(i:number,x:number,y:number)=>i===0
  ?`<g transform="translate(${x} ${y})" fill="#f6f0e5"><path d="M0-13 4-5 12-8 7 0 13 5 5 5 2 13-2 6-10 10-7 2-14-2-6-5-7-13 0-8Z"/></g>`
  :i===1
    ?`<g transform="translate(${x} ${y}) skewX(-14)" fill="#f6f0e5"><rect x="-11" y="-10" width="22" height="5" rx="2"/><rect x="-8" y="-2" width="19" height="5" rx="2"/><rect x="-5" y="6" width="16" height="5" rx="2"/></g>`
    :`<g stroke="#f6f0e5" fill="none" stroke-width="2"><circle cx="${x}" cy="${y}" r="10"/><circle cx="${x}" cy="${y}" r="3.5"/></g>`;
const diamond=(theme:string)=>`<g transform="translate(557 67)"><path d="M0-19 16-3 0 13-16-3Z" fill="#0c1822" stroke="${theme}" stroke-width="2"/><path d="M0-11 8-3 0 5-8-3Z" fill="#d9dde2"/><path d="M0-11 8-3 0-1Z" fill="#fbfdff"/><path d="M0-1 8-3 0 5Z" fill="#bfc7d0"/></g>`;
function icon(kind:string,x:number,y:number){const k=kind.toUpperCase();if(k==='ATK')return`<g transform="translate(${x} ${y})" fill="#f7f4ee"><path d="M-8 7 4-9l4 4L-4 11z"/><path d="M5-11 11-14 8-8z"/><path d="M-10 8-13 13-8 10z"/></g>`;if(k==='RES')return`<path d="M ${x} ${y-12} L ${x+10} ${y-8} V ${y+2} C ${x+10} ${y+11}, ${x+4} ${y+16}, ${x} ${y+19} C ${x-4} ${y+16}, ${x-10} ${y+11}, ${x-10} ${y+2} V ${y-8} Z" fill="#f7f4ee"/>`;if(k==='PRF')return`<g transform="translate(${x} ${y}) rotate(-24)" fill="#f7f4ee"><path d="M-9-3H6V3H-9Z"/><path d="M6-5 14 0 6 5Z"/><path d="M-13-6H-10V6H-13Z"/><path d="M-17-4H-14V4H-17Z"/></g>`;if(k==='PV')return`<path d="M ${x} ${y+10} C ${x-12} ${y+1}, ${x-11} ${y-10}, ${x} ${y-4} C ${x+11} ${y-10}, ${x+12} ${y+1}, ${x} ${y+10} Z" fill="#f7f4ee"/>`;return''}

function normalizeDetail(x:Detail):Detail{return{...x,opacity:clamp01(x.opacity,1)}}
function normalizeStat(x:Stat):Stat{return{...x,opacity:clamp01(x.opacity,1)}}
function normalizeCard(c:Card):Card{const legacy:any=c||{};return{
  ...DEFAULT,...legacy,
  meta:(legacy.meta??DEFAULT.meta).map(normalizeDetail),effects:(legacy.effects??DEFAULT.effects).map(normalizeDetail),stats:(legacy.stats??DEFAULT.stats).map(normalizeStat),
  artScale:Number.isFinite(legacy.artScale)?legacy.artScale:1,artX:Number.isFinite(legacy.artX)?legacy.artX:0,artY:Number.isFinite(legacy.artY)?legacy.artY:0,
  layers:{...DEFAULT_LAYERS,...(legacy.layers||{})},frame:{...DEFAULT_FRAME,...(legacy.frame||{})}
}}
function preset(type:CardType):Card{const c=normalizeCard({...DEFAULT,type,name:'Nome Carta',meta:DEFAULT.meta.map(x=>({...x})),effects:DEFAULT.effects.map(x=>({...x})),stats:DEFAULT.stats.map(x=>({...x}))});if(type==='location')c.stats=[{kind:'RES',value:'',opacity:1}];if(type==='action'){c.meta=[{label:'',value:'Tipo',opacity:1},{label:'',value:'Velocità',opacity:1}];c.stats=[];c.effects=[{label:'EFFETTO',value:'Descrivi chiaramente l’azione.',opacity:1}]}if(type==='extraFighter')c.meta=[{label:'',value:'Requisito',opacity:1},{label:'',value:'Archetipo',opacity:1}];if(type==='objective'){delete c.cost;c.meta=[];c.stats=[{kind:'PV',value:'',opacity:1}];c.effects=[{label:'CONDIZIONE',value:'Descrivi la condizione obiettivo.',opacity:1}]}if(type==='token'){delete c.cost;c.meta=[{label:'',value:'Token',opacity:1}]}return c}
function useLocalStore(){const[cards,setCards]=useState<Card[]>(()=>{try{return(JSON.parse(localStorage.getItem('kritoma.cards')||'[]')as Card[]).map(normalizeCard)}catch{return[]}});const save=(next:Card[])=>{setCards(next);localStorage.setItem('kritoma.cards',JSON.stringify(next))};return{cards,save}}

function frameSvg(theme:string,style:FrameStyle,layerOpacity:number){
  const o=clamp01(style.opacity,1)*layerOpacity,sw=clamp(style.size,1,10),r=clamp(style.radius,8,46),inset=clamp(style.inset,4,28),a=clamp(style.accentSize,.5,7),ao=clamp01(style.accentOpacity,.7);
  const x=20+inset/2,y=20+inset/2,w=590-inset,h=840-inset;
  const xi=x+sw+4,yi=y+sw+4,wi=w-(sw+4)*2,hi=h-(sw+4)*2;
  const arm=clamp(72+r*1.5,84,142);
  return`<g opacity="${o}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="#07121a" stroke-width="${sw+3}" stroke-linejoin="round"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${theme}" stroke-width="${sw}" stroke-linejoin="round"/>
    <rect x="${xi}" y="${yi}" width="${wi}" height="${hi}" rx="${Math.max(6,r-sw-4)}" fill="none" stroke="#f0e9de" stroke-width="1.2" opacity=".82"/>
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
function renderSlots(meta:Detail[],layerOpacity:number,theme:string,y:number){if(!meta.length||layerOpacity<=0)return'';const x0=52,w=526,g=12,sw=(w-g*(meta.length-1))/meta.length;return meta.map((m,i)=>{const x=x0+i*(sw+g),o=layerOpacity*clamp01(m.opacity,1);return`<g opacity="${o}"><rect x="${x}" y="${y}" width="${sw}" height="50" rx="25" fill="#07141e" fill-opacity=".80" stroke="#eee6da" stroke-width="1.35"/><path d="M ${x+26} ${y+5} H ${x+sw-26}" stroke="${theme}" stroke-width="1.7" stroke-linecap="round" opacity=".82"/>${slotIcon(i,x+29,y+25)}<text x="${x+52}" y="${y+31}" fill="#f4efe5" font-size="15" font-family="Arial,sans-serif" font-weight="700">${esc(m.value||m.label)}</text></g>`}).join('')}
function renderEffects(effects:Detail[],layerOpacity:number,y:number){let row=0;return effects.map((e,idx)=>{const prefix=e.label?e.label+': ':'';const lines=wrap(prefix+e.value,58),opacity=layerOpacity*clamp01(e.opacity,1);const block=lines.map((text,j)=>`<text x="76" y="${y+43+(row+j)*22}" fill="#1e3343" font-size="${idx===0&&j===0?17:14}" font-family="Arial,sans-serif" font-weight="${idx===0&&j===0?700:500}" opacity="${opacity}">${esc(text)}</text>`).join('');row+=lines.length+(idx<effects.length-1?1:0);return block}).join('')}
function renderStats(stats:Stat[],id:string,statsOpacity:number,idOpacity:number,theme:string){const y=794,h=54,x0=52,g=9,total=526,idW=138,idX=x0+total-idW;const usable=idX-x0-(stats.length?g:0),sw=stats.length?(usable-g*(stats.length-1))/stats.length:0;const statNodes=stats.map((s,i)=>{const x=x0+i*(sw+g),fill=({ATK:'#9c1d2e',RES:'#02618f',PRF:'#b47a13',PV:'#5f4a84'}as any)[s.kind.toUpperCase()]||'#2d4456',o=statsOpacity*clamp01(s.opacity,1),divider=x+46,valueX=divider+(x+sw-divider)/2;return`<g opacity="${o}"><path d="${bevel(x,y,sw,h)}" fill="${fill}" fill-opacity=".94" stroke="#eee5d8" stroke-width="1.8"/><path d="${bevel(x+3,y+3,sw-6,h-6,11)}" fill="none" stroke="#142836" stroke-width="1.3"/><line x1="${divider}" y1="${y+7}" x2="${divider}" y2="${y+h-7}" stroke="#142836" stroke-width="1.1"/>${icon(s.kind,x+23,y+26)}<text x="${valueX}" y="${y+34}" text-anchor="middle" fill="#f5f0e8" font-size="20" font-family="Arial,sans-serif" font-weight="700">${esc(s.value)}</text></g>`}).join('');const idNode=`<g opacity="${idOpacity}"><path d="${bevel(idX,y,idW,h)}" fill="#0b1822" fill-opacity=".90" stroke="#eee5d8" stroke-width="1.8"/><path d="${bevel(idX+3,y+3,idW-6,h-6,11)}" fill="none" stroke="${theme}" stroke-width="1.6" opacity=".86"/><path d="M ${idX+14} ${y+27} L ${idX+24} ${y+17} H ${idX+37} L ${idX+47} ${y+27} L ${idX+37} ${y+37} H ${idX+24} Z" fill="#9a9da6" opacity=".66"/><text x="${idX+30}" y="${y+33}" text-anchor="middle" fill="#eee7dc" font-size="14" font-family="Arial,sans-serif" font-weight="700">ID</text><text x="${idX+56}" y="${y+33}" fill="#eee7dc" font-size="14" font-family="Arial,sans-serif" font-weight="700">${esc(id)}</text></g>`;return{statNodes,idNode}}

function svg(card:Card){
  const theme=card.scopeColor||'#1d5c6b',layers={...DEFAULT_LAYERS,...card.layers},frame={...DEFAULT_FRAME,...card.frame};
  const scale=clamp(card.artScale??1,.4,3.5),ox=card.artX??0,oy=card.artY??0,baseX=20,baseY=20,baseW=590,baseH=840,iw=baseW*scale,ih=baseH*scale,ix=baseX-(iw-baseW)/2+ox,iy=baseY-(ih-baseH)/2+oy;
  const art=card.art?`<image href="${card.art}" x="${ix}" y="${iy}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid slice" clip-path="url(#cardClip)" opacity="${clamp01(layers.artwork,1)}"/>`:`<rect x="20" y="20" width="590" height="840" rx="28" fill="#18232b" opacity=".9"/>`;
  const costVisible=card.type!=='token'&&card.type!=='objective',frameO=clamp01(layers.frame,1),headerO=clamp01(layers.header,1),costO=clamp01(layers.cost,1),metaO=clamp01(layers.meta,1),effectO=clamp01(layers.effect,1),statsO=clamp01(layers.stats,1),idO=clamp01(layers.id,1);
  const hasMeta=card.meta.length>0,hasEffects=card.effects.length>0,metaY=hasEffects?566:710,effectY=hasMeta?625:566,effectH=hasMeta?150:208;
  const{statNodes,idNode}=renderStats(card.stats,card.id,statsO,idO,theme);
  return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 630 880" width="630" height="880"><defs>
    <clipPath id="cardClip"><rect x="20" y="20" width="590" height="840" rx="28"/></clipPath>
    <linearGradient id="paperGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f4ede2"/><stop offset="100%" stop-color="#e6ddcf"/></linearGradient>
    <filter id="paperNoise" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="5" result="n"/><feColorMatrix in="n" type="saturate" values="0" result="m"/><feComponentTransfer in="m" result="f"><feFuncA type="table" tableValues="0 .08"/></feComponentTransfer><feBlend in="SourceGraphic" in2="f" mode="multiply"/></filter>
  </defs>
  <rect width="630" height="880" fill="#fff"/>${art}
  ${frameSvg(theme,frame,frameO)}
  <g opacity="${headerO}"><rect x="121" y="37" width="466" height="78" rx="25" fill="url(#paperGrad)" fill-opacity=".92" filter="url(#paperNoise)" stroke="#efe6d8" stroke-width="1.4"/><rect x="126" y="42" width="456" height="68" rx="21" fill="none" stroke="${theme}" stroke-width="1.8" opacity=".9"/><text x="159" y="79" fill="#213749" font-size="24" font-family="Arial,sans-serif" font-weight="700">${esc(card.name)}</text>${diamond(theme)}</g>
  ${costVisible?`<g opacity="${costO}"><circle cx="82" cy="74" r="43" fill="#0b1720" stroke="${theme}" stroke-width="2.4"/><circle cx="82" cy="74" r="35" fill="url(#paperGrad)" filter="url(#paperNoise)" stroke="#eee6da" stroke-width="1.5"/><circle cx="82" cy="74" r="31.5" fill="none" stroke="#173040" stroke-width="1.5"/><text x="82" y="82" text-anchor="middle" fill="#173040" font-size="23" font-family="Arial,sans-serif" font-weight="700">${esc(card.cost||'')}</text></g>`:''}
  ${renderSlots(card.meta,metaO,theme,metaY)}
  ${hasEffects?`<g opacity="${effectO}"><rect x="52" y="${effectY}" width="526" height="${effectH}" rx="19" fill="url(#paperGrad)" fill-opacity=".78" filter="url(#paperNoise)" stroke="#eee6da" stroke-width="1.2"/><rect x="57" y="${effectY+5}" width="516" height="${effectH-10}" rx="15" fill="none" stroke="#173040" stroke-width="1.5" opacity=".92"/>${renderEffects(card.effects,effectO,effectY)}</g>`:''}
  ${statNodes}${idNode}
  </svg>`;
}

function RangeField({label,value,min,max,step=1,onChange,suffix=''}:{label:string;value:number;min:number;max:number;step?:number;onChange:(v:number)=>void;suffix?:string}){return <label className="rangeField"><span><span>{label}</span><b>{Number.isInteger(step)?Math.round(value):value.toFixed(step<.1?2:1)}{suffix}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
function OpacityField({label,value,onChange}:{label:string;value:number|undefined;onChange:(v:number)=>void}){const v=clamp01(value,1);return <RangeField label={label} value={v*100} min={0} max={100} onChange={n=>onChange(n/100)} suffix="%"/>}

function App(){
  const store=useLocalStore(),[card,setCard]=useState<Card>(()=>normalizeCard(store.cards[0]||DEFAULT)),[settingsOpen,setSettingsOpen]=useState(false),inputRef=useRef<HTMLInputElement>(null),markup=useMemo(()=>svg(card),[card]);
  const update=(p:Partial<Card>)=>setCard(normalizeCard({...card,...p}));
  const updateLayer=(key:keyof LayerOpacity,value:number)=>update({layers:{...card.layers,[key]:value}});
  const updateFrame=(key:keyof FrameStyle,value:number)=>update({frame:{...card.frame,[key]:value}});
  const save=()=>store.save([...store.cards.filter(c=>c.id!==card.id),card]);
  const resetArt=()=>update({artScale:1,artX:0,artY:0});
  const download=(name:string,blob:Blob)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)};
  const exportSvg=()=>download(`${card.id}.svg`,new Blob([markup],{type:'image/svg+xml'}));
  const raster=(cb:(canvas:HTMLCanvasElement)=>void)=>{const u=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml'})),im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=1890;c.height=2640;c.getContext('2d')!.drawImage(im,0,0,c.width,c.height);cb(c);URL.revokeObjectURL(u)};im.src=u};
  const exportPng=()=>raster(c=>c.toBlob(b=>b&&download(`${card.id}.png`,b),'image/png'));
  const exportPdf=()=>raster(c=>{const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:[63,88]});pdf.addImage(c.toDataURL('image/png'),'PNG',0,0,63,88);pdf.save(`${card.id}-print.pdf`)});
  const frame={...DEFAULT_FRAME,...card.frame};

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

        <details className="settingsGroup"><summary><span><b>Testata</b><small>Nome, costo e medaglione</small></span><i>›</i></summary><div className="settingsBody"><OpacityField label="Opacità nome" value={card.layers?.header} onChange={v=>updateLayer('header',v)}/><OpacityField label="Opacità costo / livello" value={card.layers?.cost} onChange={v=>updateLayer('cost',v)}/></div></details>

        <details className="settingsGroup"><summary><span><b>Slot</b><small>Archetipo, tipo e campi opzionali</small></span><i>›</i></summary><div className="settingsBody">
          <OpacityField label="Opacità globale slot" value={card.layers?.meta} onChange={v=>updateLayer('meta',v)}/>
          {card.meta.map((m,i)=><div className="itemEditor" key={i}><div className="itemHeader"><b>Slot {i+1}</b><button onClick={()=>update({meta:card.meta.filter((_,j)=>j!==i)})}>Rimuovi</button></div><input value={m.value} onChange={e=>{const n=[...card.meta];n[i]={...m,value:e.target.value};update({meta:n})}}/><OpacityField label="Opacità" value={m.opacity} onChange={v=>{const n=[...card.meta];n[i]={...m,opacity:v};update({meta:n})}}/></div>)}
          <button className="wideButton" onClick={()=>update({meta:[...card.meta,{label:'',value:'Campo',opacity:1}]})}>+ Aggiungi slot</button>
        </div></details>

        <details className="settingsGroup"><summary><span><b>Effetti</b><small>Box e sottocampi testuali</small></span><i>›</i></summary><div className="settingsBody">
          <OpacityField label="Opacità box effetto" value={card.layers?.effect} onChange={v=>updateLayer('effect',v)}/>
          {card.effects.map((m,i)=><div className="itemEditor" key={i}><div className="itemHeader"><b>Effetto {i+1}</b><button onClick={()=>update({effects:card.effects.filter((_,j)=>j!==i)})}>Rimuovi</button></div><input placeholder="Etichetta" value={m.label} onChange={e=>{const n=[...card.effects];n[i]={...m,label:e.target.value};update({effects:n})}}/><textarea placeholder="Testo" value={m.value} onChange={e=>{const n=[...card.effects];n[i]={...m,value:e.target.value};update({effects:n})}}/><OpacityField label="Opacità testo" value={m.opacity} onChange={v=>{const n=[...card.effects];n[i]={...m,opacity:v};update({effects:n})}}/></div>)}
          <button className="wideButton" onClick={()=>update({effects:[...card.effects,{label:'',value:'Dettaglio',opacity:1}]})}>+ Aggiungi effetto</button>
        </div></details>

        <details className="settingsGroup"><summary><span><b>Statistiche</b><small>ATK, RES, PRF e varianti</small></span><i>›</i></summary><div className="settingsBody">
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
