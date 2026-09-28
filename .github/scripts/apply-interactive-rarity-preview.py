from pathlib import Path

main = Path('src/main.tsx')
text = main.read_text()

def replace_once(old: str, new: str, label: str):
    global text
    if old not in text:
        raise SystemExit(f'Missing replacement target: {label}')
    text = text.replace(old, new, 1)

replace_once(
    "import React,{useMemo,useRef,useState}from'react';",
    "import React,{useEffect,useMemo,useRef,useState}from'react';",
    'React import'
)

replace_once(
    "};\nconst DEFAULT_LAYERS:LayerOpacity={frame:1,header:.96,cost:1,meta:.94,effect:.90,stats:.98,id:.98,artwork:1};",
    "};\ntype TiltState={rx:number;ry:number;glareX:number;glareY:number;active:boolean};\ntype PreviewFx={glare:number;holo:number;sparkle:number};\nconst RARITY_PREVIEW:Record<RarityKey,PreviewFx>={\n  common:{glare:.08,holo:0,sparkle:0},rare:{glare:.22,holo:.07,sparkle:.08},super:{glare:.34,holo:.25,sparkle:.12},\n  ultra:{glare:.42,holo:.32,sparkle:.16},secret:{glare:.50,holo:.46,sparkle:.23},ultimate:{glare:.30,holo:.18,sparkle:.11},\n  ghost:{glare:.38,holo:.12,sparkle:.16},gold:{glare:.48,holo:.20,sparkle:.20},starlight:{glare:.62,holo:.58,sparkle:.34}\n};\nconst NEUTRAL_TILT:TiltState={rx:0,ry:0,glareX:50,glareY:42,active:false};\nconst DEFAULT_LAYERS:LayerOpacity={frame:1,header:.96,cost:1,meta:.94,effect:.90,stats:.98,id:.98,artwork:1};",
    'preview config'
)

replace_once(
    "  const store=useLocalStore(),[card,setCard]=useState<Card>(()=>normalizeCard(store.cards[0]||DEFAULT)),[settingsOpen,setSettingsOpen]=useState(false),inputRef=useRef<HTMLInputElement>(null),markup=useMemo(()=>svg(card),[card]);",
    "  const store=useLocalStore(),[card,setCard]=useState<Card>(()=>normalizeCard(store.cards[0]||DEFAULT)),[settingsOpen,setSettingsOpen]=useState(false);\n  const [foilPreview,setFoilPreview]=useState(()=>localStorage.getItem('kritoma.foilPreview')!=='false');\n  const [reduceMotion,setReduceMotion]=useState(()=>{const saved=localStorage.getItem('kritoma.reduceMotion');return saved!==null?saved==='true':window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false});\n  const [tilt,setTilt]=useState<TiltState>(NEUTRAL_TILT),previewRef=useRef<HTMLDivElement>(null),draggingRef=useRef(false),inputRef=useRef<HTMLInputElement>(null),markup=useMemo(()=>svg(card),[card]);\n  useEffect(()=>{localStorage.setItem('kritoma.foilPreview',String(foilPreview));if(!foilPreview)setTilt(NEUTRAL_TILT)},[foilPreview]);\n  useEffect(()=>{localStorage.setItem('kritoma.reduceMotion',String(reduceMotion))},[reduceMotion]);",
    'App state'
)

replace_once(
    "  const frame={...DEFAULT_FRAME,...card.frame},typography=normalizeTypography(card.typography);",
    "  const frame={...DEFAULT_FRAME,...card.frame},typography=normalizeTypography(card.typography),rarity=isRarity(card.rarity)?card.rarity:'common',previewFx=RARITY_PREVIEW[rarity];\n  const resetTilt=()=>{draggingRef.current=false;setTilt(NEUTRAL_TILT)};\n  const updateTilt=(e:React.PointerEvent<HTMLDivElement>,force=false)=>{\n    if(!foilPreview||(!force&&e.pointerType!=='mouse'&&!draggingRef.current))return;\n    const el=previewRef.current;if(!el)return;const rect=el.getBoundingClientRect();\n    const px=clamp((e.clientX-rect.left)/Math.max(1,rect.width),0,1),py=clamp((e.clientY-rect.top)/Math.max(1,rect.height),0,1);\n    const maxX=reduceMotion?2.5:8,maxY=reduceMotion?3:10;\n    setTilt({rx:(.5-py)*maxX*2,ry:(px-.5)*maxY*2,glareX:px*100,glareY:py*100,active:true});\n  };\n  const handlePointerDown=(e:React.PointerEvent<HTMLDivElement>)=>{if(!foilPreview)return;if(e.pointerType!=='mouse'){draggingRef.current=true;try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}}updateTilt(e,true)};\n  const handlePointerMove=(e:React.PointerEvent<HTMLDivElement>)=>updateTilt(e);\n  const handlePointerUp=(e:React.PointerEvent<HTMLDivElement>)=>{if(e.pointerType!=='mouse'){try{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}catch{}resetTilt()}};\n  const handlePointerLeave=(e:React.PointerEvent<HTMLDivElement>)=>{if(e.pointerType==='mouse'&&!draggingRef.current)resetTilt()};\n  const previewStyle={\n    '--tilt-rx':`${tilt.rx.toFixed(2)}deg`,'--tilt-ry':`${tilt.ry.toFixed(2)}deg`,'--glare-x':`${tilt.glareX.toFixed(1)}%`,'--glare-y':`${tilt.glareY.toFixed(1)}%`,\n    '--glare-opacity':String(foilPreview?previewFx.glare:0),'--holo-opacity':String(foilPreview?previewFx.holo:0),'--sparkle-opacity':String(foilPreview?previewFx.sparkle:0)\n  } as React.CSSProperties;",
    'interactive handlers'
)

replace_once(
    "    <main className=\"workspace\"><div className=\"previewWrap\"><div className=\"preview\" dangerouslySetInnerHTML={{__html:markup}}/></div></main>",
    "    <main className=\"workspace\"><div className=\"previewWrap\"><div ref={previewRef} className={`interactiveCard rarity-${rarity}${tilt.active?' isActive':''}${foilPreview?'':' isDisabled'}`} style={previewStyle} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={resetTilt} onPointerLeave={handlePointerLeave} aria-label=\"Anteprima carta interattiva: muovi il mouse o trascina con il dito per simulare i riflessi\"><div className=\"preview\" dangerouslySetInnerHTML={{__html:markup}}/>{foilPreview&&<div className=\"foilPreviewLayers\" aria-hidden=\"true\"><div className=\"foilHolo\"/><div className=\"foilSparkle\"/><div className=\"foilGlare\"/></div>}</div></div></main>",
    'preview markup'
)

replace_once(
    "          <label>Rarità<select value={card.rarity||'common'} onChange={e=>update({rarity:e.target.value as RarityKey})}>{Object.entries(RARITIES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>\n          <small>La rarità applica color grading, foil e dettagli olografici all’intera carta, inclusa l’illustrazione.</small>",
    "          <label>Rarità<select value={card.rarity||'common'} onChange={e=>update({rarity:e.target.value as RarityKey})}>{Object.entries(RARITIES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>\n          <small>La rarità applica color grading, foil e dettagli olografici all’intera carta, inclusa l’illustrazione.</small>\n          <div className=\"previewMotionControls\"><label className=\"toggleRow\"><span><b>Preview foil dinamica</b><small>Mouse in hover su desktop; trascina la carta con il dito su mobile.</small></span><input type=\"checkbox\" checked={foilPreview} onChange={e=>setFoilPreview(e.target.checked)}/></label><label className=\"toggleRow\"><span><b>Riduci movimento</b><small>Limita l’inclinazione mantenendo i giochi di luce.</small></span><input type=\"checkbox\" checked={reduceMotion} onChange={e=>setReduceMotion(e.target.checked)}/></label></div>",
    'preview controls'
)

main.write_text(text)

css = Path('src/styles.css')
style = css.read_text()
marker = '/* interactive-rarity-preview */'
if marker in style:
    raise SystemExit('Interactive preview CSS already present')
style += Path('.github/scripts/interactive-rarity-preview.css').read_text()
css.write_text(style)
