# Kritoma · Editor carta e terreno

Editor SVG per le sei tipologie di carte e per i terreni di gioco, con anteprima, cache locale e export SVG, PNG e PDF.

## Modifica direttamente sulla grafica

- Tocca o clicca un elemento per selezionarlo; trascinalo per spostarlo.
- La maniglia quadrata modifica larghezza e altezza; quella tonda ruota. Su desktop, Shift mantiene le proporzioni durante il ridimensionamento.
- Il pannello laterale ha tre schede: “Elemento” (proprietà del blocco selezionato), “Livelli” (pila dei blocchi con riordino, visibilità e selezione) e “Modelli” (tela vuota, modelli, backup). Il selettore in alto resta sempre visibile; toccare un blocco sulla grafica riporta su “Elemento”, e con più blocchi selezionati una barra lo ricorda in ogni scheda. Il pulsante “Modelli” della barra apre e chiude la scheda omonima.
- Il pannello dell’elemento compare a destra su desktop e sotto la grafica su mobile. L’elenco permette di raggiungere anche blocchi nascosti, sovrapposti o vuoti.
- Modifica testi, colori, bordi, caratteri, dimensioni, rotazione, opacità e ordine, separatamente per ciascun elemento. I controlli di aspetto compaiono quando applicabili.
- Aggiungi elementi liberi: testo, rettangolo, cerchio, linea, triangolo, rombo, esagono, stella, icone del gioco e immagini (ridimensionate al caricamento per restare nello spazio del browser). Duplicali (Ctrl/Cmd+D), blocca, nascondi, ripristina o elimina quelli aggiunti; con Canc un elemento aggiunto viene eliminato, uno della carta viene nascosto.
- Le maniglie di lato e di angolo ridimensionano tenendo ferma la parte opposta; compaiono solo quando il blocco è abbastanza grande da lasciare libero il centro per trascinarlo (ingrandisci con lo zoom per i blocchi piccoli). La rotazione compie il giro completo.
- Con “Allinea” attivo, durante il trascinamento compaiono guide rosa che agganciano bordi e centro agli altri blocchi e al foglio. I sei pulsanti di allineamento portano il blocco a sinistra, al centro o a destra, in alto, al centro o in basso rispetto al foglio.
- Spazio di lavoro: la grafica occupa tutto lo spazio disponibile. Zoom con − / + / “Adatta”, Ctrl/Cmd + rotella (ancorato al cursore) e Ctrl/Cmd + 0, + e −; per spostare la vista trascina lo sfondo o usa il tasto centrale del mouse (su touch si scorre normalmente). “Griglia” (tasto G) mostra una trama in millimetri (5 mm sulla carta, 20 mm sul terreno), “Zona sicura” il margine da tenere libero (3 mm e 10 mm) e “Anteprima pulita” nasconde selezione, maniglie e guide. Griglia e zona sicura non finiscono mai negli export. La barra di stato in basso indica nome, dimensioni e posizione in mm del blocco selezionato.
- Immagini a misura: “+ Immagine”, trascinamento di un file sulla grafica (cade dove lo rilasci) o incolla (Ctrl/Cmd + V con l’area di modifica a fuoco). Le immagini mantengono le proprie proporzioni e vengono ridotte a 2000 px al massimo per restare nello spazio del browser. Nella scheda Elemento, “Misure reali” permette di scegliere larghezza e altezza in millimetri (con “Mantieni proporzioni”), “Adatta al foglio”, “Riempi il foglio” e “A 300 dpi”, e indica la risoluzione a quella misura: sotto circa 150 dpi la stampa risulta sgranata.
- Campi collegati: un testo aggiunto può mostrare un valore della carta (nome, costo, ambito, tipologia, rarità, dettagli, effetti, statistiche) o del terreno (nome, dimensioni). Con un modello il layout si disegna una volta e ogni carta lo riempie con i propri dati; se il campo manca, resta il testo libero.
- Selezione multipla: Maiusc o Ctrl/Cmd + clic (o il pulsante “Selezione multipla” su touch) aggiunge blocchi alla selezione; trascinarne uno muove tutti, le frecce muovono il gruppo. Gli allineamenti lavorano sui limiti della selezione, “Distribuisci” spazia in modo uniforme da tre elementi in su. “Livelli” elenca i blocchi dall’alto, con riordino, visibilità e selezione.
- “Modelli”: “Tela vuota” nasconde i blocchi di partenza (restano nell’elenco per ripristinarli) e toglie gli elementi aggiunti, in un solo passo annullabile. “Salva come modello” conserva posizioni, stili ed elementi aggiunti, senza i contenuti della carta, e “Applica” li riusa su altre carte o terreni. I modelli stanno nel browser, separati per carta e terreno.
- “Allinea” aggancia gli spostamenti a passi di 5 unità del disegno e le rotazioni a 15°. Lo zoom parte adattando il disegno allo spazio disponibile.
- Annulla/ripeti comprende anche testi, aggiunte e impostazioni avanzate. Un trascinamento conta come una sola operazione; la cronologia conserva fino a 100 operazioni durante la sessione dell’editor.
- Con l’area di modifica a fuoco: frecce per spostare (Shift = 10 unità), Canc per nascondere, Esc per deselezionare, Ctrl/Cmd+Z per annullare e Ctrl/Cmd+Shift+Z per ripetere.
- “Avanzate” apre i parametri completi. “Anteprima” nella carta riattiva i riflessi foil interattivi.

Backup: nel pannello “Modelli”, “Esporta progetto (JSON)” salva carte, bozza, terreno e modelli in un solo file; “Importa progetto” li ripristina (dopo conferma) e se lo spazio del browser non basta lascia intatti i dati precedenti. Il file importato è trattato come non fidato: i campi della carta vengono convalidati e l’SVG mostrato o esportato è ripulito da script, gestori `on…` e link `javascript:`.

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

I test Playwright eseguono gli stessi flussi su desktop e su un dispositivo mobile con touch: selezione, trascinamento, ridimensionamento, cronologia, blocco/visibilità, bozza persistente, slot indipendenti, elementi liberi ed export SVG. Il workflow `Editor checks` li esegue sulle PR. Il deploy GitHub Pages resta sul branch `main`, usa Node 24 e `npm ci` come i controlli e non pubblica se typecheck, test unitari o build falliscono. Le dipendenze hanno intervalli espliciti (il lockfile fissa le versioni).
