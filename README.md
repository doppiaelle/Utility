# Kritoma · Editor carta e terreno

Editor SVG per le sei tipologie di carte e per i terreni di gioco, con anteprima, cache locale e export SVG, PNG e PDF.

## Modifica direttamente sulla grafica

- Tocca o clicca un elemento per selezionarlo; trascinalo per spostarlo.
- La maniglia quadrata modifica larghezza e altezza; quella tonda ruota. Su desktop, Shift mantiene le proporzioni durante il ridimensionamento.
- Il pannello dell’elemento compare a destra su desktop e sotto la grafica su mobile. L’elenco permette di raggiungere anche blocchi nascosti, sovrapposti o vuoti.
- Modifica testi, colori, bordi, caratteri, dimensioni, rotazione, opacità e ordine, separatamente per ciascun elemento. I controlli di aspetto compaiono quando applicabili.
- Aggiungi testi e forme liberi. Blocca, nascondi, ripristina o elimina gli elementi aggiunti.
- “Allinea” aggancia gli spostamenti a passi di 5 unità del disegno e le rotazioni a 15°. Lo zoom parte adattando il disegno allo spazio disponibile.
- Annulla/ripeti comprende anche testi, aggiunte e impostazioni avanzate. Un trascinamento conta come una sola operazione; la cronologia conserva fino a 100 operazioni durante la sessione dell’editor.
- Con l’area di modifica a fuoco: frecce per spostare (Shift = 10 unità), Canc per nascondere, Esc per deselezionare, Ctrl/Cmd+Z per annullare e Ctrl/Cmd+Shift+Z per ripetere.
- “Avanzate” apre i parametri completi. “Anteprima” nella carta riattiva i riflessi foil interattivi.

Le bozze si salvano automaticamente nel browser. “Salva” conserva la carta nella raccolta locale. I progetti precedenti mantengono l’aspetto di partenza: `liveEdits` ed `extras` sono campi aggiuntivi. La stessa grafica SVG alimenta tutte le esportazioni; contorni di selezione e maniglie restano esclusi. L’ordine si applica agli elementi dello stesso gruppo; le finiture fisse conservano la loro posizione. La dimensione del testo può essere regolata oltre l’adattamento automatico: verifica l’anteprima prima di stampare.

## Sviluppo e verifiche

Node.js 24 per i test unitari che importano TypeScript senza compilazione intermedia.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

I test Playwright eseguono gli stessi flussi su desktop e su un dispositivo mobile con touch: selezione, trascinamento, ridimensionamento, cronologia, blocco/visibilità, bozza persistente, slot indipendenti, elementi liberi ed export SVG. Il workflow `Editor checks` li esegue sulle PR. Il deploy GitHub Pages resta sul branch `main`.
