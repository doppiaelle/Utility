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
 await page.getByRole('button',{name:'Modelli',exact:true}).click();
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
 await page.getByRole('tab',{name:'Livelli',exact:true}).click();
 await page.getByRole('button',{name:'Forma aggiunta 1',exact:true}).click();
 await page.getByRole('button',{name:'Forma aggiunta 2',exact:true}).click({modifiers:['Shift']});
 await page.getByRole('button',{name:'Forma aggiunta 3',exact:true}).click({modifiers:['Shift']});
 await expect(page.getByText('3 elementi selezionati')).toBeVisible();
 await page.getByRole('tab',{name:'Elemento',exact:true}).click();
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
 await page.getByRole('tab',{name:'Livelli',exact:true}).click();
 const names=()=>page.locator('.liveLayers .liveLayerName').allTextContents();
 const order=await names();const i=order.indexOf('Forma aggiunta 3');
 await page.getByRole('button',{name:'Porta indietro: Forma aggiunta 3',exact:true}).click();
 const after=await names();expect(after.indexOf('Forma aggiunta 3')).toBe(i+1);
 expect(await page.locator('.liveArtwork [data-live-id^=custom-]').evaluateAll(n=>n.map(v=>v.getAttribute('data-live-label')))).toEqual(['Forma aggiunta 1','Forma aggiunta 3','Forma aggiunta 2']);expect(errors).toEqual([]);
});

test('a linked text follows the card data and survives reload',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('button',{name:'+ Testo',exact:true}).click();
 await page.getByLabel('Collega a un campo',{exact:true}).selectOption({label:'Nome'});
 const linked=page.locator('.liveArtwork [data-live-id^=custom-] text');await expect(linked).toHaveText('Nome Carta');await expect(page.getByLabel('Testo libero',{exact:true})).toHaveCount(0);
 await choose(page,'title');await page.getByLabel('Nome della carta',{exact:true}).fill('Drago <rosso>');
 await expect(linked).toHaveText('Drago <rosso>');
 await page.reload();await expect(page.locator('.liveArtwork [data-live-id^=custom-] text')).toHaveText('Drago <rosso>');expect(errors).toEqual([]);
});
test('terrain texts can show the terrain name',async({page})=>{
 await page.getByRole('button',{name:/Kritoma.*Editor carta/}).click();await page.getByRole('button',{name:/Editor terreno.*Playmat/}).click();
 await page.getByRole('button',{name:'+ Testo',exact:true}).click();await page.getByLabel('Collega a un campo',{exact:true}).selectOption({label:'Nome del terreno'});
 await expect(page.locator('.liveArtwork [data-live-id^=custom-] text')).not.toHaveText('Nuovo testo');
});

test('backup exports everything, rejects bad files and restores after the browser is cleared',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));let confirms=0;page.on('dialog',d=>{confirms++;void d.accept();});
 await choose(page,'title');await page.getByLabel('Nome della carta',{exact:true}).fill('Carta di backup');
 await page.getByRole('button',{name:'Modelli',exact:true}).click();await page.getByLabel('Nome del modello',{exact:true}).fill('Mio modello');await page.getByRole('button',{name:'Salva come modello',exact:true}).click();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Esporta progetto (JSON)',exact:true}).click();const download=await downloadPromise;
 expect(download.suggestedFilename()).toMatch(/^kritoma-progetto-\d{4}-\d{2}-\d{2}\.json$/);
 const stream=await download.createReadStream();const chunks:Buffer[]=[];for await(const c of stream!)chunks.push(c);const json=Buffer.concat(chunks).toString();
 expect(json).toContain('Carta di backup');expect(json).toContain('Mio modello');
 await page.locator('input[type=file][accept*=json]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"format":"altro"}')});
 await expect(page.getByRole('alert')).toContainText('Non è un backup');expect(confirms).toBe(0);
 await page.evaluate(()=>localStorage.clear());await page.reload();await expect(page.locator('[data-live-id=title] text')).toHaveText('Nome Carta');
 await page.getByRole('button',{name:'Modelli',exact:true}).click();
 await page.locator('input[type=file][accept*=json]').setInputFiles({name:'ok.json',mimeType:'application/json',buffer:Buffer.from(json)});
 await expect(page.locator('[data-live-id=title] text')).toHaveText('Carta di backup');expect(confirms).toBe(1);
 await page.getByRole('button',{name:'Modelli',exact:true}).click();await expect(page.getByRole('button',{name:'Applica il modello Mio modello'})).toBeVisible();expect(errors).toEqual([]);
});
test('a crafted draft cannot run script or break the preview',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('kritoma.cardDraft',JSON.stringify({name:'<img src=x onerror=window.__pwned=1>',scopeColor:'#fff" onload="window.__pwned=1',art:'javascript:window.__pwned=1',type:'nope',meta:'x',frame:{size:'3" onload="window.__pwned=1'}}));});
 await page.goto('./');await expect(page.locator('.liveArtwork svg')).toBeVisible();
 expect(await page.evaluate(()=>(window as unknown as {__pwned?:number}).__pwned)).toBeUndefined();expect(await page.locator('.liveArtwork [onload],.liveArtwork [onerror]').count()).toBe(0);
});

test('workspace fills the stage, zooms and pans, shows guides and sizes in mm',async({page,isMobile})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const stage=page.locator('.liveStage'),canvas=page.locator('.liveCanvas');
 const s=(await stage.boundingBox())!,c=(await canvas.boundingBox())!;
 expect(Math.max(c.height/s.height,c.width/s.width)).toBeGreaterThan(.85);
 await page.getByRole('button',{name:'Aumenta zoom',exact:true}).click();
 expect((await canvas.boundingBox())!.width).toBeGreaterThan(c.width*1.4);
 await page.getByRole('button',{name:'Adatta allo spazio',exact:true}).click();
 expect(Math.abs((await canvas.boundingBox())!.width-c.width)).toBeLessThan(1);
 await page.getByRole('button',{name:'Griglia',exact:true}).click();await expect(page.locator('.liveGridLine')).toHaveCount(1);
 await page.getByRole('button',{name:'Zona sicura',exact:true}).click();await expect(page.locator('.liveSafe')).toHaveCount(1);
 await page.reload();await expect(page.locator('.liveGridLine')).toHaveCount(1);await expect(page.locator('.liveSafe')).toHaveCount(1);
 await choose(page,'title');
 if(!isMobile)await expect(page.getByRole('status')).toContainText(/\d+(,\d)?×\d+(,\d)? mm · x /);
 await page.getByRole('button',{name:'Anteprima pulita',exact:true}).click();await expect(page.locator('.liveOverlay')).toBeHidden();
 await page.getByRole('button',{name:'Anteprima pulita',exact:true}).click();await expect(page.locator('.liveOverlay')).toBeVisible();
 await page.getByRole('button',{name:'Griglia',exact:true}).click();await expect(page.locator('.liveGridLine')).toHaveCount(0);
 if(!isMobile){
  const box=(await canvas.boundingBox())!,cx=box.x+box.width/2,cy=box.y+box.height/2;
  await page.mouse.move(cx,cy);await page.keyboard.down('Control');await page.mouse.wheel(0,-400);await page.keyboard.up('Control');
  expect((await canvas.boundingBox())!.width).toBeGreaterThan(box.width*1.2);
  await page.getByLabel('Zoom grafica',{exact:true}).selectOption('3');
  const before=await stage.evaluate(e=>e.scrollLeft+e.scrollTop);
  await page.mouse.move(cx,cy);await page.mouse.down({button:'middle'});await page.mouse.move(cx-80,cy-60,{steps:4});await page.mouse.up({button:'middle'});
  expect(await stage.evaluate(e=>e.scrollLeft+e.scrollTop)).toBeGreaterThan(before+50);
 }
 expect(errors).toEqual([]);
});

test('inspector tabs keep properties, layers and templates one click apart',async({page,isMobile})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await expect(page.getByRole('tab',{name:'Elemento',exact:true})).toHaveAttribute('aria-selected','true');
 await page.getByRole('tab',{name:'Livelli',exact:true}).click();
 await expect(page.locator('.liveLayers .liveLayerName').first()).toBeVisible();await expect(page.getByLabel('Nome del modello',{exact:true})).toHaveCount(0);
 await page.getByRole('tab',{name:'Modelli',exact:true}).click();await expect(page.getByLabel('Nome del modello',{exact:true})).toBeVisible();await expect(page.locator('.liveLayers')).toHaveCount(0);
 await choose(page,'title');await expect(page.getByRole('tab',{name:'Modelli',exact:true})).toHaveAttribute('aria-selected','true');
 if(isMobile)await page.locator('[data-live-id=title] text').tap();else await page.locator('[data-live-id=title] text').click();
 await expect(page.getByRole('tab',{name:'Elemento',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.getByLabel('Nome della carta',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Modelli',exact:true}).click();await expect(page.getByLabel('Nome del modello',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Modelli',exact:true}).click();await expect(page.locator('.liveInspector')).toHaveCount(0);expect(errors).toEqual([]);
});

async function testPng(page:Page,w=400,h=200){const b64=await page.evaluate(([w,h])=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d')!;g.fillStyle='#c33';g.fillRect(0,0,w,h);g.fillStyle='#fff';g.fillRect(w/4,h/4,w/2,h/2);return c.toDataURL('image/png').split(',')[1];},[w,h]);return Buffer.from(b64,'base64');}
test('pictures: insert, exact size in mm, ratio lock, print resolution, fit, drop and paste',async({page,isMobile})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const png=await testPng(page);
 await page.locator('input[type=file][accept*=png]').setInputFiles({name:'a.png',mimeType:'image/png',buffer:png});
 const img=page.locator('.liveArtwork [data-live-id^=custom-] image');await expect(img).toHaveCount(1);await expect(img).toHaveAttribute('href',/^data:image\//);
 const wmm=page.getByLabel('Larghezza (mm)',{exact:true}),hmm=page.getByLabel('Altezza (mm)',{exact:true});
 await wmm.fill('40');await expect(hmm).toHaveValue('20');await expect(wmm).toHaveValue('40');
 await expect(page.locator('.liveDpi')).toContainText('dpi');
 await page.getByLabel('Mantieni proporzioni',{exact:true}).uncheck();await hmm.fill('50');await expect(wmm).toHaveValue('40');await expect(hmm).toHaveValue('50');
 await page.getByLabel('Mantieni proporzioni',{exact:true}).check();
 await page.getByRole('button',{name:'Adatta al foglio',exact:true}).click();await expect(wmm).toHaveValue('63');await expect(hmm).toHaveValue('31.5');
 await page.getByRole('button',{name:'Riempi il foglio',exact:true}).click();await expect(hmm).toHaveValue('88');
 await page.getByRole('button',{name:'A 300 dpi',exact:true}).click();await expect(page.locator('.liveDpi')).toContainText('300 dpi');
 await page.getByRole('button',{name:'Annulla',exact:true}).click();await expect(page.locator('.liveDpi')).toContainText('dpi');
 if(!isMobile){
  const dt=await page.evaluateHandle(async([b64])=>{const bin=atob(b64),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0)),d=new DataTransfer();d.items.add(new File([bytes],'drop.png',{type:'image/png'}));return d;},[png.toString('base64')]);
  await page.locator('.liveStage').dispatchEvent('drop',{dataTransfer:dt});await expect(page.locator('.liveArtwork [data-live-id^=custom-] image')).toHaveCount(2);
 }
 await page.reload();await expect(page.locator('.liveArtwork [data-live-id^=custom-] image').first()).toHaveAttribute('href',/^data:image\//);expect(errors).toEqual([]);
});

test('every card layout keeps title, cost, details, text and values apart and inside the sheet',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('tab',{name:'Stile',exact:true}).click();
 for(const label of['Classica','Finestra','Molto testo','Illustrazione piena','Titolo in basso']){
  const button=page.getByRole('button',{name:`Impostazione ${label}`,exact:true});await button.click();await expect(button).toHaveAttribute('aria-pressed','true');
  const boxes=await page.evaluate(()=>{const sheet=document.querySelector('.liveArtwork svg')!.getBoundingClientRect(),get=(id:string)=>{const r=document.querySelector(`.liveArtwork [data-live-id="${id}"]`)!.getBoundingClientRect();return{id,l:r.left-sheet.left,t:r.top-sheet.top,r:r.right-sheet.left,b:r.bottom-sheet.top};};return{w:sheet.width,h:sheet.height,items:['header','cost','meta-0','effects','stat-0'].map(get)};});
  for(const a of boxes.items){expect(a.l,`${label} ${a.id}`).toBeGreaterThanOrEqual(-1);expect(a.t,`${label} ${a.id}`).toBeGreaterThanOrEqual(-1);expect(a.r,`${label} ${a.id}`).toBeLessThanOrEqual(boxes.w+1);expect(a.b,`${label} ${a.id}`).toBeLessThanOrEqual(boxes.h+1);}
  for(const [i,a] of boxes.items.entries())for(const b of boxes.items.slice(i+1)){const overlap=a.l<b.r-1&&a.r>b.l+1&&a.t<b.b-1&&a.b>b.t+1;expect(overlap,`${label}: ${a.id} overlaps ${b.id}`).toBe(false);}
 }
 expect(errors).toEqual([]);
});
test('a new card layout resets block positions but keeps colours and visibility; themes persist',async({page})=>{
 await choose(page,'title');await page.getByLabel('Sposta a destra / sinistra',{exact:true}).fill('45');
 await expect(page.locator('[data-live-id=title]')).toHaveAttribute('transform',/translate\(45 0\)/);
 await choose(page,'accents');await page.getByRole('button',{name:'Nascondi',exact:true}).click();
 await page.getByRole('tab',{name:'Stile',exact:true}).click();
 await page.getByRole('button',{name:'Impostazione Finestra',exact:true}).click();
 await expect(page.locator('[data-live-id=title]')).not.toHaveAttribute('transform',/translate\(45/);await expect(page.locator('[data-live-id=accents]')).toHaveAttribute('display','none');
 await expect(page.locator('.liveArtwork #artWindowClip-window')).toHaveCount(1);
 await page.getByRole('button',{name:'Tema Brace',exact:true}).click();
 const draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('kritoma.cardDraft')!));
 expect(draft.layout).toBe('window');expect(draft.scopeColor).toBe('#b5452d');expect(draft.frame.framePreset).toBe('bevel');expect(draft.typography.title.family).toBe('Impact');
 await page.reload();await page.getByRole('tab',{name:'Stile',exact:true}).click();await expect(page.getByRole('button',{name:'Impostazione Finestra',exact:true})).toHaveAttribute('aria-pressed','true');
});
test('terrain looks and themes: slots survive every look and the choice persists',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('button',{name:/Kritoma.*Editor carta/}).click();await page.getByRole('button',{name:/Editor terreno.*Playmat/}).click();
 await page.getByRole('tab',{name:'Stile',exact:true}).click();
 const count=(prefix:string)=>page.locator(`.liveArtwork [data-live-id^=${prefix}]`).count();
 for(const label of['Duello classico','Essenziale','Compatto']){await page.getByRole('button',{name:`Impostazione ${label}`,exact:true}).click();expect(await count('topLeftGroup-'),label).toBe(4);expect(await count('topRightGroup-'),label).toBe(4);expect(await count('centerGroup-'),label).toBe(3);}
 await page.getByRole('button',{name:'Impostazione Zona centrale',exact:true}).click();expect(await count('topLeftGroup-')).toBe(0);expect(await count('centerGroup-')).toBe(3);
 await page.getByRole('button',{name:'Tema Neon',exact:true}).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kritoma.terrain')!));expect(saved.look).toBe('campaign');expect(saved.backgroundColor).toBe('#0a0a14');expect(saved.outer.accentColor).toBe('#b36bff');
 await page.getByRole('button',{name:'Impostazione Duello classico',exact:true}).click();expect(await count('topLeftGroup-')).toBe(4);
 await page.reload();await page.getByRole('button',{name:/Kritoma.*Editor carta/}).click();await page.getByRole('button',{name:/Editor terreno.*Playmat/}).click();await page.getByRole('tab',{name:'Stile',exact:true}).click();
 await expect(page.getByRole('button',{name:'Impostazione Duello classico',exact:true})).toHaveAttribute('aria-pressed','true');expect(errors).toEqual([]);
});

async function readDownload(download:import('@playwright/test').Download){const stream=await download.createReadStream();const chunks:Buffer[]=[];for await(const c of stream!)chunks.push(c);return Buffer.concat(chunks).toString('latin1');}
const pdfPages=(pdf:string)=>(pdf.match(/\/Type\s*\/Page(?![s\w])/g)||[]).length;
test('print dialog: a sheet of nine cards and a terrain split into pages',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('button',{name:'PDF',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Stampa'});await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('status')).toContainText('9 carte per pagina (3×3)');await expect(dialog.getByRole('status')).toContainText('9 carte su 1 pagina A4');
 await dialog.getByLabel('Copie',{exact:true}).fill('20');await expect(dialog.getByRole('status')).toContainText('20 carte su 3 pagine A4');
 await dialog.getByLabel('Dimensione della pagina',{exact:true}).selectOption('A3');await expect(dialog.getByRole('status')).toContainText('16 carte per pagina');
 await dialog.getByLabel('Dimensione della pagina',{exact:true}).selectOption('A4');await dialog.getByLabel('Copie',{exact:true}).fill('10');
 const first=page.waitForEvent('download');await dialog.getByRole('button',{name:'Crea PDF',exact:true}).click();const sheet=await first;
 expect(sheet.suggestedFilename()).toMatch(/-foglio\.pdf$/);const pdf=await readDownload(sheet);expect(pdf.startsWith('%PDF')).toBe(true);expect(pdfPages(pdf)).toBe(2);
 await expect(dialog).toHaveCount(0);
 await page.getByRole('button',{name:'PDF',exact:true}).click();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Stampa'})).toHaveCount(0);
 await page.getByRole('button',{name:/Kritoma.*Editor carta/}).click();await page.getByRole('button',{name:/Editor terreno.*Playmat/}).click();
 await page.getByRole('button',{name:'PDF',exact:true}).click();const t=page.getByRole('dialog',{name:'Stampa'});
 await expect(t.getByRole('status')).toContainText('6 pagine A4 orizzontali (3×2)');
 const second=page.waitForEvent('download');await t.getByRole('button',{name:'Crea PDF',exact:true}).click();const tiles=await second;
 expect(tiles.suggestedFilename()).toMatch(/-pagine\.pdf$/);expect(pdfPages(await readDownload(tiles))).toBe(6);expect(errors).toEqual([]);
});

const sample=(o:Record<string,unknown>)=>({name:`${o.id}.json`,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(o))});
test('importing game cards: browse, open, duplicate, delete, keep after reload, print with copies',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>void d.accept());
 await page.getByRole('tab',{name:'Carte',exact:true}).click();await expect(page.getByText('Nessuna carta salvata')).toBeVisible();
 const input=page.locator('input[type=file][accept*=json][multiple]');
 await input.setInputFiles([
  sample({id:'CMB-uno',categoria:'Combattente',nome:'Primo Guerriero',disciplina:'Sportivi',costo:2,atk:3,res:4,prf:0,personalita:['Metodico'],velocita:'Rapido',effetto:'Pesca 1 carta.',lore:'Corre sempre.',rarita:'Comune',copie:3}),
  sample({id:'OBI-due',categoria:'Obiettivo',nome:'Secondo Traguardo',disciplina:'Medicina',costo:0,condizione:'Hai 4 carte.',pv:2,rarita:'Rara',copie:2}),
  sample({id:'AZI-tre',categoria:'Azione',nome:'Terza Mossa',disciplina:'Sportivi',costo:1,tipo:'Istantanea',velocita:'Rapido',effetto:'Scarta 1 carta.',rarita:'Leggendaria',copie:4}),
  {name:'rotto.json',mimeType:'application/json',buffer:Buffer.from('{non e json')},
  sample({id:'x',categoria:'Boh',nome:'Sconosciuta'}),
 ]);
 const status=page.getByRole('status').filter({hasText:'Importate'});await expect(status).toContainText('Importate 3 carte');await expect(status).toContainText('2 scartate');await expect(status).toContainText('Leggendaria');
 await expect(page.getByText('3 carte salvate · 9 copie in totale')).toBeVisible();
 await expect(page.locator('[data-live-id=title] text')).toHaveText('Primo Guerriero');await expect(page.locator('[data-live-id=cost-value] text')).toHaveText('2');
 await expect(page.locator('[data-live-id=stat-0]')).toContainText('3');await expect(page.locator('[data-live-id=meta-0]')).toContainText('Metodico');
 await expect(page.locator('[data-live-id=effects]')).toContainText('Pesca 1 carta.');await expect(page.locator('[data-live-id=effects]')).toContainText('Corre sempre.');
 await page.getByRole('button',{name:/^Secondo Traguardo/}).click();await expect(page.locator('[data-live-id=title] text')).toHaveText('Secondo Traguardo');await expect(page.locator('[data-live-id=effects]')).toContainText('CONDIZIONE: Hai 4 carte.');
 await page.getByLabel('Cerca una carta',{exact:true}).fill('sportivi');await expect(page.getByRole('button',{name:/^Secondo Traguardo/})).toHaveCount(0);await expect(page.getByRole('button',{name:/^Terza Mossa/})).toBeVisible();
 await page.getByLabel('Cerca una carta',{exact:true}).fill('');
 await page.getByRole('button',{name:'Duplica la carta Terza Mossa',exact:true}).click();await expect(page.getByText('4 carte salvate')).toBeVisible();await expect(page.locator('[data-live-id=id] text').last()).toContainText('AZI-tre-copia');
 await page.getByRole('button',{name:'Elimina la carta Terza Mossa',exact:true}).first().click();await expect(page.getByText('3 carte salvate')).toBeVisible();
 await page.reload();await page.getByRole('tab',{name:'Carte',exact:true}).click();await expect(page.getByText('3 carte salvate')).toBeVisible();await expect(page.getByRole('button',{name:/^Primo Guerriero/})).toBeVisible();
 await page.getByRole('button',{name:'PDF',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Stampa'});
 await dialog.getByLabel('Quali carte',{exact:true}).selectOption('savedCopies');await expect(dialog.getByRole('status')).toContainText('9 carte su 1 pagina A4');
 await dialog.getByLabel('Quali carte',{exact:true}).selectOption('saved');await expect(dialog.getByRole('status')).toContainText('3 carte su 1 pagina A4');
 await dialog.getByLabel('Quali carte',{exact:true}).selectOption('savedCopies');
 const download=page.waitForEvent('download');await dialog.getByRole('button',{name:'Crea PDF',exact:true}).click();const pdf=await readDownload(await download);expect(pdfPages(pdf)).toBe(1);expect(errors).toEqual([]);
});
