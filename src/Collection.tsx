import React,{useMemo,useRef,useState} from 'react';
import {EditorSwitcher} from './TerrainEditor';
import {DECK_STATUSES,addCard,deckSummary,duplicateDeck,newDeck,removeCard,setCopies} from './decks';
import type {Deck,Role} from './decks';
import './collection.css';

export type CollectionCard={id:string;name:string;typeLabel:string;scope:string;scopeColor:string;rarity:string;rarityLabel:string;copies:number;thumb:string};
type Props={
  cards:CollectionCard[];decks:Deck[];roles:Record<string,Role>;
  draft:{id:string;name:string;thumb:string;saved:boolean;terrain:{name:string;thumb:string}|null;templates:number};
  onOpenCard:(id:string)=>void;onOpenDraft:()=>void;onOpenTerrain:()=>void;onSaveDraft:()=>void;
  onImport:(files:File[])=>Promise<string>;onDecks:(decks:Deck[])=>void;onPrintDeck:(deck:Deck)=>void;
  onCard:()=>void;onTerrain:()=>void;
};

export function Collection(p:Props){
  const [tab,setTab]=useState<'decks'|'cards'>('decks'),[selected,setSelected]=useState(p.decks[0]?.id??''),[q,setQ]=useState(''),[scope,setScope]=useState(''),[type,setType]=useState(''),[rarity,setRarity]=useState(''),[picked,setPicked]=useState<string[]>([]),[msg,setMsg]=useState(''),[add,setAdd]=useState('');
  const files=useRef<HTMLInputElement>(null),folder=useRef<HTMLInputElement|null>(null);
  const byId=useMemo(()=>new Map(p.cards.map(c=>[c.id,c])),[p.cards]),known=useMemo(()=>new Set(p.cards.map(c=>c.id)),[p.cards]);
  const deck=p.decks.find(d=>d.id===selected),summary=deck?deckSummary(deck,known):null;
  const usedIn=useMemo(()=>{const m=new Map<string,string[]>();for(const d of p.decks)for(const id of [...d.cards.map(c=>c.id),...d.extra,...d.goals])m.set(id,[...(m.get(id)??[]),d.name]);return m;},[p.decks]);
  const scopes=[...new Set(p.cards.map(c=>c.scope))].sort(),types=[...new Set(p.cards.map(c=>c.typeLabel))].sort(),rarities=[...new Set(p.cards.map(c=>c.rarityLabel))].sort();
  const shown=p.cards.filter(c=>(!scope||c.scope===scope)&&(!type||c.typeLabel===type)&&(!rarity||c.rarityLabel===rarity)&&(!q.trim()||`${c.name} ${c.id} ${c.scope}`.toLowerCase().includes(q.trim().toLowerCase())));
  const update=(next:Deck)=>p.onDecks(p.decks.map(d=>d.id===next.id?next:d));
  const run=async(list:FileList|null)=>{const found=Array.from(list??[]).filter(f=>/\.json$/i.test(f.name));if(!found.length){setMsg('Nessun file JSON trovato.');return;}setMsg('Importazione in corso…');setMsg(await p.onImport(found));};
  const roleOf=(d:Deck)=>p.roles[d.role];
  const row=(id:string,extra?:React.ReactNode,note?:string)=>{const c=byId.get(id);return <li key={id} className={c?'':'isMissing'}>{c?<img src={c.thumb} alt="" loading="lazy"/>:<span className="colNoThumb">?</span>}<span className="colRowName"><button className="colLink" disabled={!c} onClick={()=>c&&p.onOpenCard(id)}>{c?c.name:id}</button><small>{c?`${c.typeLabel} · ${c.scope}${note?' · '+note:''}`:'non importata: importa anche le carte'}</small></span>{extra}</li>;};
  return <div className="appShell collectionShell">
    <header className="topBar"><EditorSwitcher current="collection" onCard={p.onCard} onTerrain={p.onTerrain} onCollection={()=>{}}/></header>
    <main className="collection">
      <section className="colDrafts" aria-label="Bozze in corso"><h2>In corso</h2><div className="colDraftRow">
        <div className="colDraft"><img src={p.draft.thumb} alt=""/><div><b>{p.draft.name}</b><small>Carta in modifica · {p.draft.saved?'salvata nella raccolta':'non ancora salvata'}</small><span><button onClick={p.onOpenDraft}>Apri</button>{!p.draft.saved&&<button onClick={p.onSaveDraft}>Salva nella raccolta</button>}</span></div></div>
        <div className="colDraft">{p.draft.terrain?<img className="isWide" src={p.draft.terrain.thumb} alt=""/>:<span className="colNoThumb">▤</span>}<div><b>{p.draft.terrain?.name??'Nessun terreno'}</b><small>Terreno in modifica</small><span><button onClick={p.onOpenTerrain}>Apri</button></span></div></div>
        <div className="colDraft"><span className="colNoThumb">◫</span><div><b>{p.draft.templates} {p.draft.templates===1?'modello':'modelli'}</b><small>Layout salvati, per carta e terreno</small></div></div>
      </div></section>
      <section className="colImport"><button onClick={()=>files.current?.click()}>Importa file…</button><button onClick={()=>folder.current?.click()}>Importa cartella del gioco…</button>
        <input ref={files} type="file" accept=".json,application/json" multiple hidden onChange={ev=>{void run(ev.target.files);ev.target.value='';}}/>
        <input ref={el=>{folder.current=el;el?.setAttribute('webkitdirectory','');}} type="file" multiple hidden aria-label="Cartella del gioco" onChange={ev=>{void run(ev.target.files);ev.target.value='';}}/>
        <span>Carte, mazzi e ruoli del repository del gioco; i file non riconosciuti vengono ignorati.</span>{msg&&<p role="status">{msg}</p>}</section>
      <div className="colTabs" role="tablist" aria-label="Raccolta"><button role="tab" aria-selected={tab==='decks'} onClick={()=>setTab('decks')}>Mazzi ({p.decks.length})</button><button role="tab" aria-selected={tab==='cards'} onClick={()=>setTab('cards')}>Carte ({p.cards.length})</button></div>
      {tab==='decks'&&<section className="colDecks" aria-label="Mazzi">
        <div className="deckList"><button className="colPrimary" onClick={()=>{const d=newDeck(p.decks);p.onDecks([...p.decks,d]);setSelected(d.id);}}>+ Nuovo mazzo</button>
          {p.decks.length===0&&<p className="colEmpty">Nessun mazzo. Importa la cartella del gioco (i file in <i>starters</i>) o crea un mazzo dalle carte selezionate.</p>}
          <ul>{p.decks.map(d=>{const s=deckSummary(d,known),r=p.roles[d.role];return <li key={d.id}><button className="deckTile" aria-pressed={d.id===selected} onClick={()=>setSelected(d.id)}><b>{d.name}</b><span className="deckBadges"><i className="deckStatus">{d.status}</i>{d.role&&<i style={r?{borderColor:r.color,color:r.color}:undefined}>{r?.name??d.role}</i>}{d.scope&&<i>{d.scope}</i>}</span><small>{s.distinct} carte · {s.copies} copie{s.extra?` · ${s.extra} extra`:''}{s.goals?` · ${s.goals} obiettivi`:''}</small>{s.missing.length>0&&<small className="deckWarn">⚠ {s.missing.length} non importate</small>}</button></li>;})}</ul></div>
        {deck&&summary?<article className="deckDetail" aria-label={`Mazzo ${deck.name}`}>
          <div className="deckHead"><label>Nome del mazzo<input aria-label="Nome del mazzo" value={deck.name} maxLength={80} onChange={ev=>update({...deck,name:ev.target.value||' '})}/></label>
            <label>Stato<select aria-label="Stato del mazzo" value={deck.status} onChange={ev=>update({...deck,status:ev.target.value})}>{[...new Set([...DECK_STATUSES,deck.status])].map(s=><option key={s} value={s}>{s}</option>)}</select></label></div>
          <label>Descrizione<textarea aria-label="Descrizione del mazzo" value={deck.description} maxLength={600} onChange={ev=>update({...deck,description:ev.target.value})}/></label>
          {roleOf(deck)&&<p className="deckRole" style={{borderColor:roleOf(deck).color}}><b style={{color:roleOf(deck).color}}>{roleOf(deck).name}</b> — {roleOf(deck).description}</p>}
          <p className="deckTotals" role="status">{summary.distinct} carte diverse · {summary.copies} copie · {summary.extra} extra · {summary.goals} obiettivi{summary.missing.length?` · ⚠ non importate: ${summary.missing.join(', ')}`:''}</p>
          <div className="deckActions"><button onClick={()=>p.onPrintDeck(deck)} disabled={!deck.cards.concat(deck.extra.map(id=>({id,copies:1})),deck.goals.map(id=>({id,copies:1}))).some(c=>known.has(c.id))}>Stampa il mazzo</button><button onClick={()=>{const copy=duplicateDeck(deck,p.decks);p.onDecks([...p.decks,copy]);setSelected(copy.id);}}>Duplica</button><button onClick={()=>{if(window.confirm(`Eliminare il mazzo «${deck.name}»? Le carte restano nella raccolta.`)){const rest=p.decks.filter(d=>d.id!==deck.id);p.onDecks(rest);setSelected(rest[0]?.id??'');}}}>Elimina</button></div>
          <h3>Carte</h3><ul className="deckRows">{deck.cards.map(c=>row(c.id,<span className="colStepper"><button aria-label={`Una copia in meno di ${byId.get(c.id)?.name??c.id}`} onClick={()=>update(setCopies(deck,c.id,c.copies-1))} disabled={c.copies<=1}>−</button><output aria-label={`Copie di ${byId.get(c.id)?.name??c.id}`}>×{c.copies}</output><button aria-label={`Una copia in più di ${byId.get(c.id)?.name??c.id}`} onClick={()=>update(setCopies(deck,c.id,c.copies+1))}>+</button><button aria-label={`Togli ${byId.get(c.id)?.name??c.id} dal mazzo`} onClick={()=>update(removeCard(deck,c.id))}>×</button></span>))}{deck.cards.length===0&&<li className="colEmpty">Nessuna carta: aggiungine dalla lista qui sotto.</li>}</ul>
          {deck.extra.length>0&&<><h3>Extra</h3><ul className="deckRows">{deck.extra.map(id=>row(id,<button aria-label={`Togli ${byId.get(id)?.name??id} dal mazzo`} onClick={()=>update(removeCard(deck,id))}>×</button>))}</ul></>}
          {deck.goals.length>0&&<><h3>Obiettivi</h3><ul className="deckRows">{deck.goals.map(id=>row(id,<button aria-label={`Togli ${byId.get(id)?.name??id} dal mazzo`} onClick={()=>update(removeCard(deck,id))}>×</button>))}</ul></>}
          <div className="deckAdd"><label>Aggiungi una carta<select aria-label="Aggiungi una carta al mazzo" value={add} onChange={ev=>setAdd(ev.target.value)}><option value="">Scegli dalla raccolta…</option>{p.cards.filter(c=>![...deck.cards.map(x=>x.id),...deck.extra,...deck.goals].includes(c.id)).map(c=><option key={c.id} value={c.id}>{c.name} · {c.typeLabel}</option>)}</select></label><button disabled={!add} onClick={()=>{const c=byId.get(add);update(addCard(deck,add,c?.typeLabel==='ExtraCombattente'?'extra':c?.typeLabel==='Obiettivo'?'goals':'cards',c?.copies??1));setAdd('');}}>Aggiungi</button></div>
        </article>:<p className="colEmpty">Scegli un mazzo dall’elenco per vederne le carte.</p>}
      </section>}
      {tab==='cards'&&<section className="colCards" aria-label="Carte">
        <div className="colFilters"><input aria-label="Cerca nella raccolta" placeholder="Cerca per nome, codice o disciplina" value={q} onChange={ev=>setQ(ev.target.value)}/>
          <select aria-label="Disciplina" value={scope} onChange={ev=>setScope(ev.target.value)}><option value="">Tutte le discipline</option>{scopes.map(s=><option key={s}>{s}</option>)}</select>
          <select aria-label="Tipologia" value={type} onChange={ev=>setType(ev.target.value)}><option value="">Tutti i tipi</option>{types.map(s=><option key={s}>{s}</option>)}</select>
          <select aria-label="Rarità" value={rarity} onChange={ev=>setRarity(ev.target.value)}><option value="">Tutte le rarità</option>{rarities.map(s=><option key={s}>{s}</option>)}</select></div>
        <p className="colCount" role="status">{shown.length} di {p.cards.length} carte{picked.length?` · ${picked.length} selezionate`:''}</p>
        {picked.length>0&&<div className="colPickBar"><button className="colPrimary" onClick={()=>{const d=newDeck(p.decks,picked.map(id=>({id,copies:byId.get(id)?.copies??1})));p.onDecks([...p.decks,d]);setSelected(d.id);setPicked([]);setTab('decks');}}>Crea un mazzo con le {picked.length} selezionate</button><button onClick={()=>setPicked([])}>Deseleziona</button></div>}
        {p.cards.length===0&&<p className="colEmpty">La raccolta è vuota. Importa i file del gioco o salva una carta dall’editor.</p>}
        <ul className="colGrid">{shown.map(c=><li key={c.id}><button className="cardTile" aria-label={`Apri ${c.name}`} onClick={()=>p.onOpenCard(c.id)}><img src={c.thumb} alt="" loading="lazy"/><b>{c.name}</b><small>{c.typeLabel} · {c.scope} · ×{c.copies}</small>{usedIn.get(c.id)&&<small className="colUsed">in {usedIn.get(c.id)!.length} {usedIn.get(c.id)!.length===1?'mazzo':'mazzi'}</small>}</button><label className="colPick"><input type="checkbox" aria-label={`Seleziona ${c.name}`} checked={picked.includes(c.id)} onChange={ev=>setPicked(ev.target.checked?[...picked,c.id]:picked.filter(x=>x!==c.id))}/></label></li>)}</ul>
      </section>}
    </main>
  </div>;
}
