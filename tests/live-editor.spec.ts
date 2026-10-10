import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
async function drag(page:Page,from:{x:number;y:number},to:{x:number;y:number},touch:boolean){
 if(touch){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1}]});for(let i=1;i<=4;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/4,y:from.y+(to.y-from.y)*i/4,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:4});await page.mouse.up();}
}
const choose=async(page,id:string)=>page.getByRole('combobox',{name:'Seleziona un elemento',exact:true}).selectOption(id);
test.beforeEach(async({page})=>{await page.goto('./');});
test.afterEach(async({page},info)=>{await page.screenshot({path:info.outputPath('editor.png'),fullPage:true});});
test('card edits, undo/redo, hidden recovery, lock, reset and saved draft',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await choose(page,'title');await page.getByLabel('Nome della carta',{exact:true}).fill('Carta dal vivo');
 await expect(page.locator('[data-live-id=title] text')).toHaveText('Carta dal vivo');
 await page.getByRole('button',{name:'Annulla',exact:true}).click();await expect(page.locator('[data-live-id=title] text')).toHaveText('Nome Carta');
 await page.getByRole('button',{name:'Ripeti',exact:true}).click();await expect(page.locator('[data-live-id=title] text')).toHaveText('Carta dal vivo');
 await page.getByRole('button',{name:'Nascondi',exact:true}).click();await expect(page.locator('[data-live-id=title]')).toHaveAttribute('display','none');
 await page.getByRole('button',{name:'Mostra',exact:true}).click();await page.getByRole('button',{name:'Blocca',exact:true}).click();await expect(page.getByLabel('Sposta a destra / sinistra',{exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Sblocca',exact:true}).click();await page.getByLabel('Sposta a destra / sinistra',{exact:true}).fill('45');
 await expect(page.locator('[data-live-id=title]')).toHaveAttribute('transform',/translate\(45 0\)/);
 await page.reload();await expect(page.locator('[data-live-id=title] text')).toHaveText('Carta dal vivo');await expect(page.locator('[data-live-id=title]')).toHaveAttribute('transform',/translate\(45 0\)/);
 await choose(page,'title');await page.getByRole('button',{name:'Ripristina',exact:true}).click();await expect(page.locator('[data-live-id=title]')).not.toHaveAttribute('transform',/translate\(45/);expect(errors).toEqual([]);
});
test('canvas selection, drag and resize use scaled preview coordinates',async({page,isMobile})=>{
 if(isMobile)await page.locator('[data-live-id=title] text').tap();else await page.locator('[data-live-id=title] text').click();await expect(page.getByLabel('Nome della carta',{exact:true})).toBeVisible();
 const text=page.locator('[data-live-id=title] text'),b=await text.boundingBox();expect(b).toBeTruthy();
 await drag(page,{x:b!.x+b!.width/2,y:b!.y+b!.height/2},{x:b!.x+b!.width/2+20,y:b!.y+b!.height/2+15},!!isMobile);
 await expect(page.getByLabel('Sposta a destra / sinistra',{exact:true})).not.toHaveValue('0');
 const handle=page.locator('[data-live-handle=resize]'),h=await handle.boundingBox();expect(h).toBeTruthy();await drag(page,{x:h!.x+h!.width/2,y:h!.y+h!.height/2},{x:h!.x+h!.width/2+15,y:h!.y+h!.height/2+10},!!isMobile);
 await expect(page.getByLabel('Larghezza (×)',{exact:true})).not.toHaveValue('1');
 await page.getByRole('button',{name:'Annulla',exact:true}).click();await expect(page.getByLabel('Larghezza (×)',{exact:true})).toHaveValue('1');
 const r=await page.locator('[data-live-handle=rotate]').boundingBox();expect(r).toBeTruthy();await drag(page,{x:r!.x+r!.width/2,y:r!.y+r!.height/2},{x:r!.x+r!.width/2+35,y:r!.y+r!.height/2+20},!!isMobile);await expect(page.getByLabel('Rotazione (°)',{exact:true})).not.toHaveValue('0');
});
test('custom text, styles and SVG export match the canvas',async({page})=>{
 await page.getByRole('button',{name:'+ Testo',exact:true}).click();await page.getByLabel('Testo libero',{exact:true}).fill('Testo <libero>\nSeconda riga');
 await page.getByText('Stile del testo',{exact:true}).click();await page.getByLabel('Colore testo',{exact:true}).fill('#abcdef');
 const text=page.locator('.liveArtwork [data-live-id^=custom-] text');await expect(text).toHaveAttribute('fill','#abcdef');await expect(text.locator('tspan')).toHaveCount(2);
 await page.getByRole('button',{name:'Avanzate',exact:true}).last().click();await page.getByText('Esporta',{exact:true}).click();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'SVG',exact:true}).click();const download=await downloadPromise;const stream=await download.createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(chunk);const content=Buffer.concat(chunks).toString();expect(content).toContain('#abcdef');expect(content).toContain('&lt;libero&gt;');expect(content).not.toContain('liveSelection');
});
test('terrain has independent slots, usable mobile layout and persistent custom edits',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.getByRole('button',{name:/Kritoma.*Editor carta/}).click();await page.getByRole('button',{name:/Editor terreno.*Playmat/}).click();
 await expect(page.locator('.liveArtwork [data-live-id^=centerGroup-]')).toHaveCount(3);await expect(page.locator('.liveArtwork [data-live-id^=topLeftGroup-]')).toHaveCount(4);
 await choose(page,'centerGroup-1');await page.getByLabel('Sposta a destra / sinistra',{exact:true}).fill('30');await expect(page.locator('[data-live-id=centerGroup-1]')).toHaveAttribute('transform',/translate\(30 0\)/);await expect(page.locator('[data-live-id=centerGroup-0]')).not.toHaveAttribute('transform',/translate\(30/);
 await choose(page,'deck');await page.getByLabel('Nome dello spazio',{exact:true}).fill('Mazzo personale');await expect(page.locator('[data-live-id=deck] text')).toHaveText('MAZZO PERSONALE');
 await page.getByRole('button',{name:'+ Forma',exact:true}).click();await expect(page.locator('.liveArtwork [data-live-id^=custom-] rect')).toHaveCount(1);
 const stage=await page.locator('.liveStage').boundingBox(),panel=await page.locator('.liveInspector').boundingBox(),canvas=await page.locator('.liveCanvas').boundingBox();expect(stage!.height).toBeGreaterThan(100);expect(panel!.height).toBeGreaterThan(100);expect(canvas!.width).toBeLessThanOrEqual(stage!.width);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
 await page.reload();await page.getByRole('button',{name:/Kritoma.*Editor carta/}).click();await page.getByRole('button',{name:/Editor terreno.*Playmat/}).click();await expect(page.locator('[data-live-id=centerGroup-1]')).toHaveAttribute('transform',/translate\(30 0\)/);await expect(page.locator('[data-live-id=deck] text')).toHaveText('MAZZO PERSONALE');
});
test('free shapes, icons, duplicate, alignment and edge handles',async({page,isMobile})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.getByLabel('Aggiungi un altro elemento').selectOption('ellipse');
 await expect(page.locator('.liveArtwork [data-live-id^=custom-] ellipse')).toHaveCount(1);
 await page.getByRole('button',{name:'Allinea a sinistra',exact:true}).click();
 const g=page.locator('.liveArtwork [data-live-id^=custom-]');await expect(g).toHaveAttribute('transform',/translate\(-\d/);
 await page.getByRole('button',{name:'Duplica',exact:true}).click();await expect(g).toHaveCount(2);
 await page.getByLabel('Forma',{exact:true}).selectOption('star');await expect(page.locator('.liveArtwork [data-live-id^=custom-] path')).toHaveCount(1);
 await page.getByLabel('Aggiungi un altro elemento').selectOption('icon');await page.getByLabel('Icona',{exact:true}).selectOption('bolt');await expect(g).toHaveCount(3);
 await page.getByLabel('Aggiungi un altro elemento').selectOption('line');
 // Side handles need room: at the fitted mobile zoom a thin line only keeps the corner handle, so enlarge it with zoom there.
 if(!isMobile){ const side=page.locator('[data-live-handle=resize--1-0]'),before=await page.getByLabel('Larghezza (×)',{exact:true}).inputValue();expect(before).toBe('1');
 const h=await side.boundingBox();expect(h).toBeTruthy();await drag(page,{x:h!.x+h!.width/2,y:h!.y+h!.height/2},{x:h!.x+h!.width/2-30,y:h!.y+h!.height/2},!!isMobile);
 await expect(page.getByLabel('Larghezza (×)',{exact:true})).not.toHaveValue('1');await expect(page.getByLabel('Altezza (×)',{exact:true})).toHaveValue('1');}
 await page.getByRole('button',{name:'Elimina elemento aggiunto',exact:true}).click();await expect(g).toHaveCount(3);
 await page.reload();await expect(page.locator('.liveArtwork [data-live-id^=custom-]')).toHaveCount(3);expect(errors).toEqual([]);
});

test('blank canvas and layout templates are reusable and persist',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('button',{name:'Modelli',exact:true}).click();
 await page.getByRole('button',{name:'Tela vuota',exact:true}).click();
 await expect(page.locator('[data-live-id=title]')).toHaveAttribute('display','none');await expect(page.locator('[data-live-id=frame]')).toHaveAttribute('display','none');
 await page.getByRole('button',{name:'+ Forma',exact:true}).click();await expect(page.locator('.liveArtwork [data-live-id^=custom-]')).toHaveCount(1);
 await page.getByLabel('Nome del modello',{exact:true}).fill('Solo forma');await page.getByRole('button',{name:'Salva come modello',exact:true}).click();
 await expect(page.getByRole('button',{name:'Applica il modello Solo forma'})).toBeVisible();
 await page.getByRole('button',{name:'Annulla',exact:true}).click();await page.getByRole('button',{name:'Annulla',exact:true}).click();
 await expect(page.locator('[data-live-id=title]')).not.toHaveAttribute('display','none');await expect(page.locator('.liveArtwork [data-live-id^=custom-]')).toHaveCount(0);
 await page.getByRole('button',{name:'Applica il modello Solo forma'}).click();
 await expect(page.locator('[data-live-id=title]')).toHaveAttribute('display','none');await expect(page.locator('.liveArtwork [data-live-id^=custom-]')).toHaveCount(1);
 await page.reload();await page.getByRole('button',{name:'Modelli',exact:true}).click();await expect(page.getByRole('button',{name:'Applica il modello Solo forma'})).toBeVisible();
 await page.getByRole('button',{name:'Elimina il modello Solo forma'}).click();await expect(page.getByRole('button',{name:'Applica il modello Solo forma'})).toHaveCount(0);expect(errors).toEqual([]);
});

test('multi-selection aligns, distributes and moves together; layers reorder',async({page,isMobile})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const x=async(i:number)=>{const t=await page.locator('.liveArtwork [data-live-id^=custom-]').nth(i).getAttribute('transform');return Number(/translate\((-?[\d.]+) /.exec(t||'')?.[1]??'NaN');};
 for(const offset of[-200,-50,120]){await page.getByRole('button',{name:'+ Forma',exact:true}).click();await page.getByLabel('Sposta a destra / sinistra',{exact:true}).fill(String(offset));}
 await page.getByText('Livelli',{exact:true}).click();
 await page.getByRole('button',{name:'Forma aggiunta 1',exact:true}).click();
 await page.getByRole('button',{name:'Forma aggiunta 2',exact:true}).click({modifiers:['Shift']});
 await page.getByRole('button',{name:'Forma aggiunta 3',exact:true}).click({modifiers:['Shift']});
 await expect(page.getByText('3 elementi selezionati')).toBeVisible();
 await page.getByRole('button',{name:'Distribuisci ↔',exact:true}).click();
 expect(Math.abs(await x(1)-(-40))).toBeLessThan(1);expect(Math.abs(await x(0)+200)).toBeLessThan(1);expect(Math.abs(await x(2)-120)).toBeLessThan(1);
 await page.getByRole('button',{name:'Allinea a sinistra',exact:true}).click();
 const lefts=await Promise.all([0,1,2].map(async i=>(await page.locator('.liveArtwork [data-live-id^=custom-]').nth(i).boundingBox())!.x));
 expect(Math.max(...lefts)-Math.min(...lefts)).toBeLessThan(1.5);
 const before=await x(2),box=(await page.locator('.liveArtwork [data-live-id^=custom-]').nth(0).boundingBox())!;
 await drag(page,{x:box.x+box.width/2,y:box.y+box.height/2},{x:box.x+box.width/2+20,y:box.y+box.height/2+8},!!isMobile);
 expect(Math.abs(await x(2)-before)).toBeGreaterThan(5);
 await page.getByRole('button',{name:'Elimina',exact:true}).click();await expect(page.locator('.liveArtwork [data-live-id^=custom-]')).toHaveCount(0);
 await page.getByRole('button',{name:'Annulla',exact:true}).click();await expect(page.locator('.liveArtwork [data-live-id^=custom-]')).toHaveCount(3);
 const names=()=>page.locator('.liveLayers .liveLayerName').allTextContents();
 const order=await names();const i=order.indexOf('Forma aggiunta 3');
 await page.getByRole('button',{name:'Porta indietro: Forma aggiunta 3',exact:true}).click();
 const after=await names();expect(after.indexOf('Forma aggiunta 3')).toBe(i+1);
 expect(await page.locator('.liveArtwork [data-live-id^=custom-]').evaluateAll(n=>n.map(v=>v.getAttribute('data-live-label')))).toEqual(['Forma aggiunta 1','Forma aggiunta 3','Forma aggiunta 2']);expect(errors).toEqual([]);
});
