import {test,expect} from '@playwright/test';
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
test('canvas selection, drag and resize use scaled preview coordinates',async({page})=>{
 await page.locator('[data-live-id=title] text').click();await expect(page.getByLabel('Nome della carta',{exact:true})).toBeVisible();
 const text=page.locator('[data-live-id=title] text'),b=await text.boundingBox();expect(b).toBeTruthy();
 await page.mouse.move(b!.x+b!.width/2,b!.y+b!.height/2);await page.mouse.down();await page.mouse.move(b!.x+b!.width/2+20,b!.y+b!.height/2+15,{steps:4});await page.mouse.up();
 await expect(page.getByLabel('Sposta a destra / sinistra',{exact:true})).not.toHaveValue('0');
 const handle=page.locator('[data-live-handle=resize]'),h=await handle.boundingBox();expect(h).toBeTruthy();await page.mouse.move(h!.x+h!.width/2,h!.y+h!.height/2);await page.mouse.down();await page.mouse.move(h!.x+h!.width/2+15,h!.y+h!.height/2+10,{steps:4});await page.mouse.up();
 await expect(page.getByLabel('Larghezza (×)',{exact:true})).not.toHaveValue('1');
 await page.getByRole('button',{name:'Annulla',exact:true}).click();await expect(page.getByLabel('Larghezza (×)',{exact:true})).toHaveValue('1');
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
