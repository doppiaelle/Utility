from pathlib import Path
import re

path=Path('src/TerrainEditor.tsx')
s=path.read_text()

# 1) Add responsive layout model.
needle="type TerrainState={\n"
assert needle in s
layout_type="""type TerrainLayout={
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

"""
s=s.replace(needle,layout_type+needle,1)

needle="  sheenEnabled:boolean;\n"
assert needle in s
s=s.replace(needle,needle+"  layout:TerrainLayout;\n",1)

# 2) Add defaults that reproduce the previous geometry when every section is enabled.
needle="  backgroundColor:'#18110e',textColor:'#b88b6a',sheenEnabled:true,\n"
assert needle in s
s=s.replace(needle,needle+"  layout:{edgeInsetX:26,edgeInsetY:13,contentPaddingX:22,contentPaddingTop:31,contentPaddingBottom:69,topGapX:56,rowGap:36,topLeftHeight:260,topRightHeight:260,lowerHeight:370},\n",1)

# 3) Normalize layout for old saved playmats.
needle="function normalizeTerrain(input:any):TerrainState{\n"
assert needle in s
normalize_layout="""function normalizeLayout(raw:any):TerrainLayout{
  const l={...DEFAULT_TERRAIN.layout,...(raw||{})};
  return{
    edgeInsetX:clamp(Number(l.edgeInsetX)??26,0,140),edgeInsetY:clamp(Number(l.edgeInsetY)??13,0,120),
    contentPaddingX:clamp(Number(l.contentPaddingX)??22,0,180),contentPaddingTop:clamp(Number(l.contentPaddingTop)??31,0,180),contentPaddingBottom:clamp(Number(l.contentPaddingBottom)??69,0,220),
    topGapX:clamp(Number(l.topGapX)??56,0,220),rowGap:clamp(Number(l.rowGap)??36,0,220),
    topLeftHeight:clamp(Number(l.topLeftHeight)??260,80,700),topRightHeight:clamp(Number(l.topRightHeight)??260,80,700),lowerHeight:clamp(Number(l.lowerHeight)??370,100,760)
  };
}
"""
s=s.replace(needle,normalize_layout+needle,1)

needle="    backgroundColor:legacy.backgroundColor||legacy.outerColor||DEFAULT_TERRAIN.backgroundColor,textColor:legacy.textColor||DEFAULT_TERRAIN.textColor,sheenEnabled:legacy.sheenEnabled!==false,\n"
assert needle in s
s=s.replace(needle,needle+"    layout:normalizeLayout(legacy.layout),\n",1)

# 4) Structural reflow renderer. Disabled areas are removed from geometry, not just hidden.
pattern=r"function terrainSvg\(state:TerrainState\)\{.*?\n\}\n\nfunction download"
m=re.search(pattern,s,re.S)
assert m, 'terrainSvg block not found'
terrain_fn=r'''function terrainSvg(state:TerrainState){
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

  const renderFour=(group:FourSlotGroup,box:Rect|null)=>{
    if(!box||!group.enabled)return'';
    const active=group.slots.map((slot,index)=>({slot,index})).filter(x=>x.slot.enabled);
    if(!active.length)return'';
    const ref=Math.max(.2,Math.min(box.w/660,box.h/260)),count=active.length,padX=Math.max(8,26*ref),padY=Math.max(7,30*ref),wantedGap=14*ref*group.gap;
    const targetW=140*ref*group.scale,maxByW=(box.w-padX*2-wantedGap*Math.max(0,count-1))/count,maxByH=(box.h-padY*2)*(140/200);
    const sw=Math.max(10,Math.min(targetW,maxByW,maxByH)),sh=sw*(200/140),freeGap=count>1?Math.max(0,(box.w-padX*2-sw*count)/(count-1)):0,gap=Math.min(wantedGap,freeGap),total=sw*count+gap*Math.max(0,count-1);
    const start=box.x+(box.w-total)/2+group.offsetX,sy=box.y+(box.h-sh)/2+group.offsetY;
    return active.map((entry,pos)=>renderSlot(start+pos*(sw+gap),sy,sw,sh,effectiveSlot(group.style,entry.slot),state)).join('');
  };

  const utilityAndCenter=(()=>{
    if(!lowerPanel)return'';
    const ref=Math.max(.2,Math.min(lowerPanel.w/1376,lowerPanel.h/370)),uw=140*ref,uh=200*ref,margin=Math.max(8,20*ref),utilityGap=Math.max(8,26*ref),uy=lowerPanel.y+(lowerPanel.h-uh)/2;
    let out='',leftCursor=lowerPanel.x+margin;
    if(state.deckEnabled){out+=renderSlot(leftCursor,uy,uw,uh,state.utilityStyle,state,state.deckLabel);leftCursor+=uw+utilityGap}
    if(state.graveEnabled){out+=renderSlot(leftCursor,uy,uw,uh,state.utilityStyle,state,state.graveLabel);leftCursor+=uw+utilityGap}
    const extraX=lowerPanel.x+lowerPanel.w-margin-uw;
    const rightLimit=state.extraEnabled?extraX-Math.max(10,20*ref):lowerPanel.x+lowerPanel.w-margin;
    if(state.extraEnabled)out+=renderSlot(extraX,uy,uw,uh,state.utilityStyle,state,state.extraLabel);

    const group=state.centerGroup;
    if(!group.enabled)return out;
    const active=group.slots.map((slot,index)=>({slot,index})).filter(x=>x.slot.enabled);
    if(!active.length)return out;
    const centerX=Math.min(rightLimit,leftCursor+Math.max(0,(rightLimit-leftCursor)*.02)),centerW=Math.max(40,rightLimit-centerX),padX=Math.max(4,8*ref),padY=Math.max(6,18*ref);
    const desiredGaps=active.slice(0,-1).map((entry,i)=>{const next=active[i+1].index;const a=entry.index;const factor=a===0&&next===1?group.gap12:a===1&&next===2?group.gap23:(group.gap12+group.gap23)/2;return 30*ref*factor});
    const wantedGapTotal=desiredGaps.reduce((a,b)=>a+b,0),count=active.length,targetW=140*ref*group.scale,maxByW=(centerW-padX*2-wantedGapTotal)/count,maxByH=(lowerPanel.h-padY*2)*(140/200);
    const sw=Math.max(10,Math.min(targetW,maxByW,maxByH)),sh=sw*(200/140),freeForGaps=Math.max(0,centerW-padX*2-sw*count),gapScale=wantedGapTotal>0?Math.min(1,freeForGaps/wantedGapTotal):0,gaps=desiredGaps.map(g=>g*gapScale),total=sw*count+gaps.reduce((a,b)=>a+b,0);
    let x=centerX+(centerW-total)/2+group.offsetX;const sy=lowerPanel.y+(lowerPanel.h-sh)/2+group.offsetY;
    active.forEach((entry,pos)=>{out+=renderSlot(x,sy,sw,sh,effectiveSlot(group.style,entry.slot),state);x+=sw+(gaps[pos]||0)});
    return out;
  })();

  const onionMarkup=onion.map(({style,rect})=>renderArea(style,rect.x,rect.y,rect.w,rect.h)).join('');
  const panels=`${leftPanel?renderArea(state.topLeftPanel,leftPanel.x,leftPanel.y,leftPanel.w,leftPanel.h):''}${rightPanel?renderArea(state.topRightPanel,rightPanel.x,rightPanel.y,rightPanel.w,rightPanel.h):''}${lowerPanel?renderArea(state.lowerPanel,lowerPanel.x,lowerPanel.y,lowerPanel.w,lowerPanel.h):''}`;
  const groups=`${leftPanel?renderFour(state.topLeftGroup,leftPanel):''}${rightPanel?renderFour(state.topRightGroup,rightPanel):''}${utilityAndCenter}`;
  const sheenRect=shell?.rect||base,sheenStyle=shell?.style;
  const sheenPath=shapePath(sheenStyle?.preset||'rounded',sheenRect.x,sheenRect.y,sheenRect.w,sheenRect.h,sheenStyle?.radius||28);
  return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><filter id="terrainShadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#000" flood-opacity=".42"/></filter><linearGradient id="terrainSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".035"/><stop offset=".45" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".10"/></linearGradient></defs><rect width="${W}" height="${H}" fill="${state.backgroundColor}"/><g filter="url(#terrainShadow)">${onionMarkup}${panels}${groups}${state.sheenEnabled?`<path d="${sheenPath}" fill="url(#terrainSheen)" pointer-events="none"/>`:''}</g></svg>`;
}

function download'''
s=s[:m.start()]+terrain_fn+s[m.end():]

# 5) Structural toggle help makes the new semantics explicit.
old='<ToggleField label="Mostra area" checked={value.enabled} onChange={v=>set(\'enabled\',v)}/>'
new='<ToggleField label="Mostra area" help="Se la disattivi, la sezione viene rimossa dal layout e le sezioni interne si espandono automaticamente." checked={value.enabled} onChange={v=>set(\'enabled\',v)}/>'
assert old in s
s=s.replace(old,new,1)

# 6) Add update helper for responsive layout controls.
needle="  const updateCenter=(value:CenterSlotGroup)=>setState(s=>({...s,centerGroup:value}));\n"
assert needle in s
s=s.replace(needle,needle+"  const updateLayout=(patch:Partial<TerrainLayout>)=>update('layout',{...state.layout,...patch});\n",1)

# 7) Insert dedicated layout controls before onion controls.
needle='    <details className="settingsGroup"><summary><span><b>Strati perimetro</b><small>Gestione a cipolla: esterno, interno e linea guida</small></span><i>›</i></summary>'
assert needle in s
layout_ui='''    <details className="settingsGroup"><summary><span><b>Layout responsive</b><small>Altezze, spazi tra sezioni e reflow automatico</small></span><i>›</i></summary><div className="settingsBody"><small>Le altezze sono valori desiderati: il renderer le ridimensiona proporzionalmente per riempire sempre tutta l’area disponibile. Se una macro sezione viene disattivata, le sezioni rimaste occupano automaticamente lo spazio liberato.</small><div className="terrainLayoutGrid"><RangeField label="Margine esterno X" value={state.layout.edgeInsetX} min={0} max={140} onChange={edgeInsetX=>updateLayout({edgeInsetX})}/><RangeField label="Margine esterno Y" value={state.layout.edgeInsetY} min={0} max={120} onChange={edgeInsetY=>updateLayout({edgeInsetY})}/><RangeField label="Padding contenuto laterale" value={state.layout.contentPaddingX} min={0} max={180} onChange={contentPaddingX=>updateLayout({contentPaddingX})}/><RangeField label="Padding contenuto alto" value={state.layout.contentPaddingTop} min={0} max={180} onChange={contentPaddingTop=>updateLayout({contentPaddingTop})}/><RangeField label="Padding contenuto basso" value={state.layout.contentPaddingBottom} min={0} max={220} onChange={contentPaddingBottom=>updateLayout({contentPaddingBottom})}/><RangeField label="Spazio tra pannelli superiori" value={state.layout.topGapX} min={0} max={220} onChange={topGapX=>updateLayout({topGapX})}/><RangeField label="Spazio superiore ↔ inferiore" value={state.layout.rowGap} min={0} max={220} onChange={rowGap=>updateLayout({rowGap})}/><RangeField label="Altezza sup. sinistro" value={state.layout.topLeftHeight} min={80} max={700} onChange={topLeftHeight=>updateLayout({topLeftHeight})}/><RangeField label="Altezza sup. destro" value={state.layout.topRightHeight} min={80} max={700} onChange={topRightHeight=>updateLayout({topRightHeight})}/><RangeField label="Altezza pannello inferiore" value={state.layout.lowerHeight} min={100} max={760} onChange={lowerHeight=>updateLayout({lowerHeight})}/></div></div></details>\n\n'''
s=s.replace(needle,layout_ui+needle,1)

# 8) Clarify macro-area structural behavior.
s=s.replace('Le tre macro aree hanno forma, riempimento, bordo e linea interna separati. Nascondere un pannello non nasconde automaticamente i suoi slot.','Le tre macro aree hanno forma, riempimento, bordo e linea interna separati. Disattivare una macro area la rimuove dal flow insieme ai contenuti ospitati; gli altri pannelli vengono riallargati e rialzati automaticamente. Per nascondere solo la grafica del pannello mantenendo la sezione, disattiva riempimento/bordi invece di “Mostra area”.')

path.write_text(s)
print('patched TerrainEditor.tsx',len(s))
