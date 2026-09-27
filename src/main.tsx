import React,{useMemo,useRef,useState}from'react';
import{createRoot}from'react-dom/client';
import jsPDF from'jspdf';
import'./styles.css';

type CardType='fighter'|'location'|'action'|'extraFighter'|'objective'|'token';
type Detail={label:string;value:string;icon?:string;opacity?:number};
type Stat={kind:string;value:string;opacity?:number};
type LayerOpacity={frame:number;header:number;cost:number;meta:number;effect:number;stats:number;id:number;artwork:number};
type Card={
  id:string;type:CardType;name:string;scope:string;scopeColor:string;cost?:string;rarity?:string;
  meta:Detail[];effects:Detail[];stats:Stat[];art?:string;
  artScale?:number;artX?:number;artY?:number;layers?:Partial<LayerOpacity>;
  artDepth?:string;
};

const TYPES:Record<CardType,string>={fighter:'Combattente',location:'Luogo',action:'Azione',extraFighter:'ExtraCombattente',objective:'Obiettivo',token:'Token'};
const DEFAULT_LAYERS:LayerOpacity={frame:1,header:.96,cost:1,meta:.94,effect:.92,stats:.98,id:.98,artwork:1};
const DEFAULT:Card={
  id:'KRT-001',type:'fighter',name:'Nome Carta',scope:'Informatica',scopeColor:'#122b3f',cost:'',rarity:'',
  meta:[{label:'',value:'Archetipo',opacity:1},{label:'',value:'Tipo',opacity:1}],
  effects:[{label:'EFFETTO',value:'Testo effetto della carta.',opacity:1}],
  stats:[{kind:'ATK',value:'',opacity:1},{kind:'RES',value:'',opacity:1},{kind:'PRF',value:'',opacity:1}],
  artScale:1,artX:0,artY:0,layers:DEFAULT_LAYERS
};
const scopeDefault:Record<string,string>={Informatica:'#1d5c6b',Economia:'#3f6b3a',Medicina:'#a8324a',Ingegneria:'#9a5b17',Sportivi:'#4a3a86',Media:'#a8296e'};
const esc=(s:any)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}as any)[c]);
const wrap=(s:string,max=56)=>{const words=String(s||'').split(/\s+/),out:string[]=[];let line='';for(const word of words){const next=`${line} ${word}`.trim();if(next.length>max){if(line)out.push(line);line=word}else line=next}if(line)out.push(line);return out.slice(0,8)};
const clamp01=(v:number|undefined,fallback=1)=>Math.max(0,Math.min(1,Number.isFinite(v as number)?Number(v):fallback));
const bevel=(x:number,y:number,w:number,h:number,c=14)=>`M ${x+c} ${y} H ${x+w-c} L ${x+w} ${y+c} V ${y+h-c} L ${x+w-c} ${y+h} H ${x+c} L ${x} ${y+h-c} V ${y+c} Z`;

const slotIcon=(i:number,x:number,y:number)=>i===0
  ?`<g transform="translate(${x} ${y})" fill="#f6f0e5"><path d="M0-14 4-5 13-8 7 0 14 5 5 5 2 14-2 6-11 11-7 2-15-2-6-5-7-14 0-8Z"/></g>`
  :i===1
    ?`<g transform="translate(${x} ${y}) skewX(-16)" fill="#f6f0e5"><rect x="-12" y="-11" width="24" height="6" rx="2"/><rect x="-9" y="-2" width="21" height="6" rx="2"/><rect x="-6" y="7" width="18" height="6" rx="2"/></g>`
    :`<g stroke="#f6f0e5" fill="none" stroke-width="2"><circle cx="${x}" cy="${y}" r="11"/><circle cx="${x}" cy="${y}" r="4"/></g>`;
const diamond=()=>`<g transform="translate(560 68)"><path d="M0-22 18-4 0 14-18-4Z" fill="#0f2333" stroke="#f1eadf" stroke-width="3"/><path d="M0-14 10-4 0 6-10-4Z" fill="#dadde2"/><path d="M0-14 10-4 0-1Z" fill="#f8fbff"/><path d="M0-1 10-4 0 6Z" fill="#c4ccd6"/><path d="M0-14-10-4 0-1Z" fill="#d8dee7"/></g>`;
function icon(kind:string,x:number,y:number){const k=kind.toUpperCase();if(k==='ATK')return`<g transform="translate(${x} ${y})" fill="#f7f4ee"><path d="M-8 7 4-9l4 4L-4 11z"/><path d="M5-11 11-14 8-8z"/><path d="M-10 8-13 13-8 10z"/></g>`;if(k==='RES')return`<path d="M ${x} ${y-12} L ${x+10} ${y-8} V ${y+2} C ${x+10} ${y+11}, ${x+4} ${y+16}, ${x} ${y+19} C ${x-4} ${y+16}, ${x-10} ${y+11}, ${x-10} ${y+2} V ${y-8} Z" fill="#f7f4ee"/>`;if(k==='PRF')return`<g transform="translate(${x} ${y}) rotate(-24)" fill="#f7f4ee"><path d="M-9-3H6V3H-9Z"/><path d="M6-5 14 0 6 5Z"/><path d="M-13-6H-10V6H-13Z"/><path d="M-17-4H-14V4H-17Z"/></g>`;if(k==='PV')return`<path d="M ${x} ${y+10} C ${x-12} ${y+1}, ${x-11} ${y-10}, ${x} ${y-4} C ${x+11} ${y-10}, ${x+12} ${y+1}, ${x} ${y+10} Z" fill="#f7f4ee"/>`;return''}

function normalizeDetail(x:Detail):Detail{return{...x,opacity:clamp01(x.opacity,1)}}
function normalizeStat(x:Stat):Stat{return{...x,opacity:clamp01(x.opacity,1)}}
function normalizeCard(c:Card):Card{
  const legacy:any=c||{};
  return{
    ...DEFAULT,...legacy,
    meta:(legacy.meta??DEFAULT.meta).map(normalizeDetail),
    effects:(legacy.effects??DEFAULT.effects).map(normalizeDetail),
    stats:(legacy.stats??DEFAULT.stats).map(normalizeStat),
    artScale:Number.isFinite(legacy.artScale)?legacy.artScale:1,
    artX:Number.isFinite(legacy.artX)?legacy.artX:0,
    artY:Number.isFinite(legacy.artY)?legacy.artY:0,
    layers:{...DEFAULT_LAYERS,...(legacy.layers||{}),artwork:clamp01(legacy.layers?.artwork,1)}
  };
}
function preset(type:CardType):Card{
  const c:Card=normalizeCard({...DEFAULT,type,name:'Nome Carta',meta:DEFAULT.meta.map(x=>({...x})),effects:DEFAULT.effects.map(x=>({...x})),stats:DEFAULT.stats.map(x=>({...x}))});
  if(type==='location')c.stats=[{kind:'RES',value:'',opacity:1}];
  if(type==='action'){c.meta=[{label:'',value:'Tipo',opacity:1},{label:'',value:'Velocità',opacity:1}];c.stats=[];c.effects=[{label:'EFFETTO',value:'Descrivi chiaramente l’azione.',opacity:1}]}
  if(type==='extraFighter')c.meta=[{label:'',value:'Requisito',opacity:1},{label:'',value:'Archetipo',opacity:1}];
  if(type==='objective'){delete c.cost;c.meta=[];c.stats=[{kind:'PV',value:'',opacity:1}];c.effects=[{label:'CONDIZIONE',value:'Descrivi la condizione obiettivo.',opacity:1}]}
  if(type==='token'){delete c.cost;c.meta=[{label:'',value:'Token',opacity:1}]}
  return c;
}
function useLocalStore(){const[cards,setCards]=useState<Card[]>(()=>{try{return(JSON.parse(localStorage.getItem('kritoma.cards')||'[]')as Card[]).map(normalizeCard)}catch{return[]}});const save=(next:Card[])=>{setCards(next);localStorage.setItem('kritoma.cards',JSON.stringify(next))};return{cards,save}}

function renderSlots(meta:Detail[],layerOpacity:number){if(!meta.length||layerOpacity<=0)return'';const y=532,w=552,x0=39,g=12,sw=(w-g*(meta.length-1))/meta.length;const slots=meta.map((m,i)=>{const x=x0+i*(sw+g),o=layerOpacity*clamp01(m.opacity,1);return`<g opacity="${o}"><rect x="${x}" y="${y}" width="${sw}" height="54" rx="27" fill="url(#navyGrad)" fill-opacity=".90" stroke="#e4d7c1" stroke-width="3"/><rect x="${x+8}" y="${y+7}" width="${sw-16}" height="40" rx="20" fill="none" stroke="#172b38" stroke-width="2"/>${slotIcon(i,x+30,y+27)}<text x="${x+53}" y="${y+34}" fill="#f4efe5" font-size="15" font-family="Arial,sans-serif" font-weight="700">${esc(m.value||m.label)}</text></g>`}).join('');const connector=meta.length>=2?`<g opacity="${layerOpacity}"><circle cx="315" cy="559" r="8" fill="#d4b272" stroke="#172b38" stroke-width="2"/><circle cx="315" cy="576" r="7" fill="#122b3f" stroke="#d8cab0" stroke-width="2"/></g>`:'';return slots+connector}
function renderEffects(effects:Detail[],layerOpacity:number){
  let row=0;
  return effects.map((e,idx)=>{
    const prefix=e.label?e.label+': ':'';
    const lines=wrap(prefix+e.value,56);
    const opacity=layerOpacity*clamp01(e.opacity,1);
    const block=lines.map((text,j)=>`<text x="72" y="${650+(row+j)*22}" fill="#213444" font-size="${idx===0&&j===0?17:14}" font-family="Arial,sans-serif" font-weight="${idx===0&&j===0?700:500}" opacity="${opacity}">${esc(text)}</text>`).join('');
    row+=lines.length+(idx<effects.length-1?1:0);
    return block;
  }).join('');
}

function renderStats(stats:Stat[],id:string,statsOpacity:number,idOpacity:number){
  const y=792,h=59,x0=40,g=10,total=550,idW=152,idX=x0+total-idW;
  const usable=idX-x0-(stats.length?g:0),sw=stats.length?(usable-g*(stats.length-1))/stats.length:0;
  const statNodes=stats.map((s,i)=>{const x=x0+i*(sw+g),fill=({ATK:'#9c1d2e',RES:'#025e90',PRF:'#b5790c',PV:'#5f4a84'}as any)[s.kind.toUpperCase()]||'#2d4456',o=statsOpacity*clamp01(s.opacity,1);return`<g opacity="${o}"><path d="${bevel(x,y,sw,h)}" fill="${fill}" fill-opacity=".94" stroke="#f0e7d8" stroke-width="3"/><path d="${bevel(x+4,y+4,sw-8,h-8,12)}" fill="none" stroke="#172b38" stroke-width="2"/><line x1="${x+52}" y1="${y+7}" x2="${x+52}" y2="${y+h-7}" stroke="#172b38" stroke-width="1.5"/>${icon(s.kind,x+26,y+29)}<text x="${x+Math.max(72,sw*.67)}" y="${y+36}" text-anchor="middle" fill="#f5f0e8" font-size="21" font-family="Arial,sans-serif" font-weight="700">${esc(s.value)}</text></g>`}).join('');
  const idNode=`<g opacity="${idOpacity}"><path d="${bevel(idX,y,idW,h)}" fill="url(#navyGrad)" fill-opacity=".94" stroke="#f0e7d8" stroke-width="3"/><path d="${bevel(idX+4,y+4,idW-8,h-8,12)}" fill="none" stroke="#172b38" stroke-width="2"/><path d="M ${idX+18} ${y+29} L ${idX+29} ${y+18} H ${idX+44} L ${idX+55} ${y+29} L ${idX+44} ${y+40} H ${idX+29} Z" fill="#9a9da6" opacity=".7"/><text x="${idX+36}" y="${y+35}" text-anchor="middle" fill="#ece4d6" font-size="16" font-family="Arial,sans-serif" font-weight="700">ID</text><text x="${idX+65}" y="${y+35}" fill="#ece4d6" font-size="16" font-family="Arial,sans-serif" font-weight="700">${esc(id)}</text></g>`;
  return{statNodes,idNode};
}

function svg(card:Card){
  const navy=card.scopeColor||'#122b3f',layers={...DEFAULT_LAYERS,...card.layers};
  const scale=Math.max(.4,Math.min(3.5,card.artScale??1)),ox=card.artX??0,oy=card.artY??0;
  const baseX=20,baseY=20,baseW=590,baseH=840,iw=baseW*scale,ih=baseH*scale,ix=baseX-(iw-baseW)/2+ox,iy=baseY-(ih-baseH)/2+oy;
  const art=card.art?`<image href="${card.art}" x="${ix}" y="${iy}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid slice" clip-path="url(#cardClip)" opacity="${clamp01(layers.artwork,1)}"/>`:`<rect x="20" y="20" width="590" height="840" rx="28" fill="url(#navyGrad)" opacity="${clamp01(layers.artwork,.5)}"/>`;
  const costVisible=card.type!=='token'&&card.type!=='objective';
  const frameO=clamp01(layers.frame,1),headerO=clamp01(layers.header,1),costO=clamp01(layers.cost,1),metaO=clamp01(layers.meta,1),effectO=clamp01(layers.effect,1),statsO=clamp01(layers.stats,1),idO=clamp01(layers.id,1);
  const{statNodes,idNode}=renderStats(card.stats,card.id,statsO,idO);
  return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 630 880" width="630" height="880"><defs>
    <linearGradient id="navyGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${navy}"/><stop offset="100%" stop-color="#081826"/></linearGradient>
    <linearGradient id="paperGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f4ede2"/><stop offset="100%" stop-color="#e5dac9"/></linearGradient>
    <filter id="paperNoise" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="8" result="noise"/><feColorMatrix in="noise" type="saturate" values="0" result="mono"/><feComponentTransfer in="mono" result="faded"><feFuncA type="table" tableValues="0 .12"/></feComponentTransfer><feBlend in="SourceGraphic" in2="faded" mode="multiply"/></filter>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.4" flood-color="#06101a" flood-opacity=".45"/></filter>
    <clipPath id="cardClip"><rect x="20" y="20" width="590" height="840" rx="28"/></clipPath>
  </defs>
  <rect width="630" height="880" fill="#fff"/>
  <rect x="20" y="20" width="590" height="840" rx="28" fill="url(#navyGrad)"/>
  ${art}

  <g opacity="${frameO}">
    <path d="M28 72C49 50 74 32 112 27C163 20 215 31 264 30H548C578 30 596 39 603 61" fill="none" stroke="#efe6d8" stroke-width="15" stroke-linecap="round"/>
    <path d="M30 74C52 52 78 38 114 33C164 27 214 37 264 36H547C575 36 591 43 599 62" fill="none" stroke="${navy}" stroke-width="6" stroke-linecap="round"/>
    <path d="M29 829C89 811 139 822 184 838C229 854 281 853 316 845C368 833 420 834 473 847C520 858 560 857 601 837" fill="none" stroke="#efe6d8" stroke-width="15" stroke-linecap="round"/>
    <path d="M34 829C92 816 139 827 184 842C229 857 279 856 317 849C369 839 420 840 472 852C519 862 557 861 596 840" fill="none" stroke="${navy}" stroke-width="6" stroke-linecap="round"/>
    <rect x="24" y="24" width="582" height="832" rx="24" fill="none" stroke="#eee7dc" stroke-width="3"/>
    <rect x="28" y="28" width="574" height="824" rx="22" fill="none" stroke="#173142" stroke-width="3"/>
  </g>

  <g opacity="${headerO}">
    <rect x="109" y="27" width="480" height="86" rx="28" fill="url(#paperGrad)" fill-opacity=".94" filter="url(#paperNoise)" stroke="#c9a464" stroke-width="2"/>
    <rect x="117" y="35" width="464" height="70" rx="22" fill="none" stroke="#1a3040" stroke-width="4"/>
    <text x="150" y="77" fill="#213749" font-size="24" font-family="Arial,sans-serif" font-weight="700">${esc(card.name)}</text>${diamond()}
  </g>
  <g opacity="${costO}">
    <circle cx="78" cy="69" r="47" fill="url(#navyGrad)" fill-opacity=".96" filter="url(#softShadow)" stroke="#d2b071" stroke-width="2"/>
    <circle cx="78" cy="69" r="38" fill="url(#paperGrad)" fill-opacity=".94" filter="url(#paperNoise)" stroke="#f4efe5" stroke-width="4"/>
    <circle cx="78" cy="69" r="37" fill="none" stroke="#1a3040" stroke-width="3"/>
    ${costVisible?`<text x="78" y="78" text-anchor="middle" fill="#132b3f" font-size="24" font-family="Arial,sans-serif" font-weight="700">${esc(card.cost||'')}</text>`:''}
  </g>

  ${renderSlots(card.meta,metaO)}

  <g opacity="${effectO}">
    <rect x="35" y="607" width="560" height="170" rx="22" fill="url(#paperGrad)" fill-opacity=".90" filter="url(#paperNoise)" stroke="#c9a464" stroke-width="2"/>
    <rect x="43" y="615" width="544" height="154" rx="18" fill="none" stroke="#1a3040" stroke-width="4"/>
  </g>
  ${renderEffects(card.effects,effectO)}
  ${statNodes}${idNode}
  <g opacity="${frameO}"><circle cx="315" cy="853" r="8" fill="${navy}" stroke="#e5d7bf" stroke-width="3"/></g>
  </svg>`;
}

function RangeField({label,value,min,max,step,onChange,suffix=''}:any){return <label className="rangeField"><span>{label}<b>{typeof value==='number'?`${Math.round(value*100)/100}${suffix}`:value}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
function OpacityField({label,value,onChange}:any){return <RangeField label={label} value={Math.round(clamp01(value,1)*100)} min={0} max={100} step={1} suffix="%" onChange={(v:number)=>onChange(v/100)}/>}

function App(){
  const store=useLocalStore();
  const[card,setCard]=useState<Card>(()=>normalizeCard(store.cards[0]||DEFAULT));
  const inputRef=useRef<HTMLInputElement>(null);
  const markup=useMemo(()=>svg(card),[card]);
  const update=(patch:Partial<Card>)=>setCard(normalizeCard({...card,...patch}));
  const updateLayers=(patch:Partial<LayerOpacity>)=>update({layers:{...DEFAULT_LAYERS,...card.layers,...patch}});
  const save=()=>store.save([...store.cards.filter(c=>c.id!==card.id),card]);
  const resetArt=()=>update({artScale:1,artX:0,artY:0});
  const download=(name:string,blob:Blob)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)};
  const exportSvg=()=>download(`${card.id}.svg`,new Blob([markup],{type:'image/svg+xml'}));
  const exportPng=()=>{const u=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml'})),im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=1890;c.height=2640;c.getContext('2d')!.drawImage(im,0,0,1890,2640);c.toBlob(b=>b&&download(`${card.id}.png`,b),'image/png');URL.revokeObjectURL(u)};im.src=u};
  const exportPdf=()=>{const u=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml'})),im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=1890;c.height=2640;c.getContext('2d')!.drawImage(im,0,0,1890,2640);const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:[63,88]});pdf.addImage(c.toDataURL('image/png'),'PNG',0,0,63,88);pdf.save(`${card.id}-print.pdf`);URL.revokeObjectURL(u)};im.src=u};
  const layers={...DEFAULT_LAYERS,...card.layers};

  return <div className="app"><aside><h1>Kritoma Card Editor</h1>
    <label>Tipologia<select value={card.type} onChange={e=>setCard(preset(e.target.value as CardType))}>{Object.entries(TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <label>Nome<input value={card.name} onChange={e=>update({name:e.target.value})}/></label>
    <label>ID<input value={card.id} onChange={e=>update({id:e.target.value})}/></label>
    <label>Ambito<select value={card.scope} onChange={e=>update({scope:e.target.value,scopeColor:scopeDefault[e.target.value]||card.scopeColor})}>{Object.keys(scopeDefault).map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Colore cornice<input type="color" value={card.scopeColor} onChange={e=>update({scopeColor:e.target.value})}/></label>
    {card.type!=='token'&&card.type!=='objective'&&<label>Costo / materiali<input value={card.cost||''} onChange={e=>update({cost:e.target.value})}/></label>}

    <section><div className="sectionHead"><b>Illustrazione full bleed</b></div>
      <input ref={inputRef} hidden type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>update({art:String(r.result)});r.readAsDataURL(f)}}/>
      <button onClick={()=>inputRef.current?.click()}>Carica illustrazione</button>
      <RangeField label="Zoom" value={card.artScale??1} min={.4} max={3.5} step={.01} suffix="×" onChange={(v:number)=>update({artScale:v})}/>
      <RangeField label="Posizione X" value={card.artX??0} min={-320} max={320} step={1} onChange={(v:number)=>update({artX:v})}/>
      <RangeField label="Posizione Y" value={card.artY??0} min={-420} max={420} step={1} onChange={(v:number)=>update({artY:v})}/>
      <OpacityField label="Trasparenza illustrazione" value={layers.artwork} onChange={(v:number)=>updateLayers({artwork:v})}/>
      <button className="secondary" onClick={resetArt}>Reset posizione/zoom</button>
    </section>

    <section><div className="sectionHead"><b>Trasparenza elementi</b></div>
      <OpacityField label="Cornice" value={layers.frame} onChange={(v:number)=>updateLayers({frame:v})}/>
      <OpacityField label="Testata / nome" value={layers.header} onChange={(v:number)=>updateLayers({header:v})}/>
      <OpacityField label="Costo / livello" value={layers.cost} onChange={(v:number)=>updateLayers({cost:v})}/>
      <OpacityField label="Slot" value={layers.meta} onChange={(v:number)=>updateLayers({meta:v})}/>
      <OpacityField label="Box effetto" value={layers.effect} onChange={(v:number)=>updateLayers({effect:v})}/>
      <OpacityField label="Statistiche" value={layers.stats} onChange={(v:number)=>updateLayers({stats:v})}/>
      <OpacityField label="ID" value={layers.id} onChange={(v:number)=>updateLayers({id:v})}/>
    </section>

    <section><div className="sectionHead"><b>Slot</b><button onClick={()=>update({meta:[...card.meta,{label:'',value:'Campo',opacity:1}]})}>+</button></div>
      {card.meta.map((m,i)=><div className="itemEditor" key={i}><div className="row"><input value={m.value} onChange={e=>{const next=[...card.meta];next[i]={...m,value:e.target.value};update({meta:next})}}/><button onClick={()=>update({meta:card.meta.filter((_,j)=>j!==i)})}>×</button></div><OpacityField label="Opacità slot" value={m.opacity??1} onChange={(v:number)=>{const next=[...card.meta];next[i]={...m,opacity:v};update({meta:next})}}/></div>)}
    </section>

    <section><div className="sectionHead"><b>Effetti</b><button onClick={()=>update({effects:[...card.effects,{label:'',value:'Dettaglio',opacity:1}]})}>+</button></div>
      {card.effects.map((m,i)=><div className="itemEditor" key={i}><div className="row two"><input value={m.label} onChange={e=>{const next=[...card.effects];next[i]={...m,label:e.target.value};update({effects:next})}}/><textarea value={m.value} onChange={e=>{const next=[...card.effects];next[i]={...m,value:e.target.value};update({effects:next})}}/></div><OpacityField label="Opacità testo" value={m.opacity??1} onChange={(v:number)=>{const next=[...card.effects];next[i]={...m,opacity:v};update({effects:next})}}/></div>)}
    </section>

    <section><div className="sectionHead"><b>Statistiche</b></div>
      {card.stats.map((s,i)=><div className="itemEditor" key={i}><div className="row two"><input value={s.kind} onChange={e=>{const next=[...card.stats];next[i]={...s,kind:e.target.value};update({stats:next})}}/><input value={s.value} onChange={e=>{const next=[...card.stats];next[i]={...s,value:e.target.value};update({stats:next})}}/></div><OpacityField label={`Opacità ${s.kind||'stat'}`} value={s.opacity??1} onChange={(v:number)=>{const next=[...card.stats];next[i]={...s,opacity:v};update({stats:next})}}/></div>)}
    </section>

    <div className="actions"><button onClick={save}>Salva cache</button><button onClick={exportSvg}>SVG</button><button onClick={exportPng}>PNG 300dpi</button><button onClick={exportPdf}>PDF stampa</button></div>
  </aside><main><div className="preview" dangerouslySetInnerHTML={{__html:markup}}/></main></div>;
}

createRoot(document.getElementById('root')!).render(<App/>);
