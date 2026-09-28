from pathlib import Path
p=Path('src/main.tsx')
text=p.read_text()
def one(old,new,label):
    global text
    if old not in text:
        raise SystemExit(f'Missing target: {label}')
    text=text.replace(old,new,1)
one("import'./styles.css';","import'./styles.css';\nimport TerrainEditor,{EditorSwitcher}from'./TerrainEditor';",'terrain import')
one("  const store=useLocalStore(),[card,setCard]=useState<Card>(()=>normalizeCard(store.cards[0]||DEFAULT)),[settingsOpen,setSettingsOpen]=useState(false);","  const store=useLocalStore(),[card,setCard]=useState<Card>(()=>normalizeCard(store.cards[0]||DEFAULT)),[settingsOpen,setSettingsOpen]=useState(false);\n  const[editorMode,setEditorMode]=useState<'card'|'terrain'>('card');",'editor mode state')
one("\n  return <div className=\"appShell\">","\n  if(editorMode==='terrain')return <TerrainEditor onSwitchToCard={()=>setEditorMode('card')}/>;\n\n  return <div className=\"appShell\">",'terrain mode render')
one("    <header className=\"topBar\"><div className=\"brand\"><span className=\"brandMark\">K</span><div><strong>Kritoma</strong><small>Card Editor</small></div></div><button className=\"settingsButton\" onClick={()=>setSettingsOpen(true)} aria-label=\"Apri impostazioni\"><span>☰</span><b>Modifica</b></button></header>","    <header className=\"topBar\"><EditorSwitcher current=\"card\" onCard={()=>{}} onTerrain={()=>setEditorMode('terrain')}/><button className=\"settingsButton\" onClick={()=>setSettingsOpen(true)} aria-label=\"Apri impostazioni\"><span>☰</span><b>Modifica</b></button></header>",'card editor switcher')
p.write_text(text)
