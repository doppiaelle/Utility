import React,{useEffect,useState} from 'react';
import {CARD_MM,PAGES,bestTilePlan,cardSheetPlan} from './print';
import type {PageName} from './print';

export type CardPrint={mode:'single'|'sheet';page:PageName;content:'current'|'saved'|'savedCopies';copies:number;marks:boolean};
export type TerrainPrint={mode:'full'|'tiles';page:PageName;overlap:number};
type Common={onClose:()=>void};
type Props=(Common&{kind:'card';savedCount:number;savedCopies:number;onPrint:(o:CardPrint)=>Promise<void>})|(Common&{kind:'terrain';widthMm:number;heightMm:number;onPrint:(o:TerrainPrint)=>Promise<void>});

const pageField=(page:PageName,set:(p:PageName)=>void)=><label>Dimensione della pagina<select aria-label="Dimensione della pagina" value={page} onChange={e=>set(e.target.value as PageName)}>{(Object.keys(PAGES) as PageName[]).map(p=><option key={p} value={p}>{p} ({PAGES[p].w}×{PAGES[p].h} mm)</option>)}</select></label>;

export function PrintDialog(props:Props){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [card,setCard]=useState<CardPrint>({mode:'sheet',page:'A4',content:'current',copies:9,marks:true});
  const [terrain,setTerrain]=useState<TerrainPrint>({mode:'tiles',page:'A4',overlap:10});
  useEffect(()=>{const key=(ev:KeyboardEvent)=>{if(ev.key==='Escape'&&!busy)props.onClose();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[busy]);
  const run=async()=>{setBusy(true);setError('');try{if(props.kind==='card')await props.onPrint(card);else await props.onPrint(terrain);props.onClose();}catch{setError('Non è stato possibile creare il PDF. Prova con meno carte o una pagina più piccola.');}finally{setBusy(false);}};
  let summary='',body:React.ReactNode;
  if(props.kind==='card'){
    const plan=cardSheetPlan(PAGES[card.page]),count=card.content==='saved'?props.savedCount:card.content==='savedCopies'?props.savedCopies:Math.max(1,card.copies),pages=Math.ceil(count/Math.max(1,plan.perPage));
    summary=card.mode==='single'?`Una pagina di ${CARD_MM.w}×${CARD_MM.h} mm, a misura reale.`:`${plan.perPage} carte per pagina (${plan.cols}×${plan.rows}) a misura reale: ${count} ${count===1?'carta':'carte'} su ${pages} ${pages===1?'pagina':'pagine'} ${card.page}. Stampa al 100%, senza adattare alla pagina.`;
    body=<>
      <label>Formato<select aria-label="Formato" value={card.mode} onChange={e=>setCard({...card,mode:e.target.value as CardPrint['mode']})}><option value="sheet">Foglio con più carte</option><option value="single">Una carta (63×88 mm)</option></select></label>
      {card.mode==='sheet'&&<>
        {pageField(card.page,page=>setCard({...card,page}))}
        <label>Quali carte<select aria-label="Quali carte" value={card.content} onChange={e=>setCard({...card,content:e.target.value as CardPrint['content']})}><option value="current">Questa carta, ripetuta</option><option value="saved" disabled={!props.savedCount}>Tutte le carte salvate, una copia ciascuna ({props.savedCount})</option><option value="savedCopies" disabled={!props.savedCount}>Tutte le carte salvate, con le copie previste ({props.savedCopies})</option></select></label>
        {card.content==='current'&&<label>Copie<input aria-label="Copie" type="number" min={1} max={200} value={card.copies} onChange={e=>setCard({...card,copies:Math.max(1,Math.min(200,Math.round(e.target.valueAsNumber)||1))})}/></label>}
        <label className="printCheck"><input type="checkbox" checked={card.marks} onChange={e=>setCard({...card,marks:e.target.checked})}/>Segni di taglio nei margini</label>
      </>}
    </>;
  }else{
    const plan=bestTilePlan({w:props.widthMm,h:props.heightMm},PAGES[terrain.page],{overlap:terrain.overlap});
    summary=terrain.mode==='full'?`Una pagina di ${props.widthMm}×${props.heightMm} mm, per la stampa professionale.`:`${plan.count} ${plan.count===1?'pagina':'pagine'} ${terrain.page} ${plan.landscape?'orizzontali':'verticali'} (${plan.cols}×${plan.rows}). Stampa al 100%, ritaglia i margini e incolla lungo le linee tratteggiate.`;
    body=<>
      <label>Formato<select aria-label="Formato" value={terrain.mode} onChange={e=>setTerrain({...terrain,mode:e.target.value as TerrainPrint['mode']})}><option value="tiles">A pagine da incollare</option><option value="full">Un unico foglio ({props.widthMm}×{props.heightMm} mm)</option></select></label>
      {terrain.mode==='tiles'&&<>{pageField(terrain.page,page=>setTerrain({...terrain,page}))}
        <label>Sovrapposizione per incollare (mm)<input aria-label="Sovrapposizione per incollare (mm)" type="number" min={0} max={40} value={terrain.overlap} onChange={e=>setTerrain({...terrain,overlap:Math.max(0,Math.min(40,Math.round(e.target.valueAsNumber)||0))})}/></label></>}
    </>;
  }
  return <div className="sheetBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)props.onClose();}}>
    <section className="settingsSheet printDialog" role="dialog" aria-modal="true" aria-label="Stampa" >
      <div className="sheetHandle"/>
      <header className="sheetHeader"><div><strong>Stampa in PDF</strong><small>{props.kind==='card'?'Carte pronte da tagliare':'Terreno a misura reale'}</small></div><button className="closeButton" onClick={props.onClose} disabled={busy}>Annulla</button></header>
      <div className="settingsScroll printBody">{body}<p className="printSummary" role="status">{summary}</p>{error&&<p className="printError" role="alert">{error}</p>}
        <button className="printGo" onClick={run} disabled={busy}>{busy?'Creo il PDF…':'Crea PDF'}</button></div>
    </section>
  </div>;
}
