import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapTcgCard,disciplineColor} from '../src/importCards.ts';

const fighter={categoria:'Combattente',nome:'Cavaliere di Prova',id:'CMB-prova',disciplina:'Economia',costo:3,atk:2,res:4,prf:1,personalita:['Ambizioso','Creativo'],velocita:'Rapido',effetto:'Fa una cosa.',lore:'Una riga.\nSeconda.',rarita:'Rara',copie:3,art_prompt:'Un cavaliere in armatura.',parole_chiave:['Veloce']};

test('a fighter keeps cost, values, traits, effect and lore, and gets the colour of its discipline',()=>{
 const r=mapTcgCard(fighter,{includeLore:true});assert.equal(r.ok,true);const c=r.card;
 assert.deepEqual([c.type,c.id,c.name,c.scope,c.cost,c.rarity,c.copies],['fighter','CMB-prova','Cavaliere di Prova','Economia','3','rare',3]);
 assert.deepEqual(c.stats.map(s=>[s.kind,s.value]),[['ATK','2'],['RES','4'],['PRF','1']]);
 assert.deepEqual(c.meta.map(m=>m.value),['Ambizioso · Creativo','Rapido']);
 assert.deepEqual(c.effects.map(e=>[e.label,e.value]),[['PAROLE CHIAVE','Veloce'],['EFFETTO','Fa una cosa.'],['','Una riga. Seconda.']]);
 assert.equal(c.scopeColor,'#2f7d4f');assert.equal(c.artPrompt,'Un cavaliere in armatura.');assert.equal(r.warnings.length,0);
 assert.equal(mapTcgCard(fighter).card.effects.some(e=>e.value.startsWith('Una riga')),false,'lore is optional');
});
test('every category maps to its own values, chips and effect label',()=>{
 const objective=mapTcgCard({categoria:'Obiettivo',nome:'Meta',costo:0,condizione:'Hai 3 carte.',pv:2,disciplina:'Media'}).card;
 assert.deepEqual([objective.type,objective.cost,objective.stats.map(s=>s.kind+s.value),objective.meta.length,objective.effects[0].label],['objective','',['PV2'],0,'CONDIZIONE']);
 const action=mapTcgCard({categoria:'Azione',nome:'Mossa',costo:2,tipo:'Istantanea',velocita:'Rapido',costo_cimitero:2,effetto:'Pesca 1 carta.'}).card;
 assert.deepEqual([action.type,action.stats.length,action.meta.map(m=>m.value)],['action',0,['Istantanea','Rapido','Cimitero 2']]);
 const extra=mapTcgCard({categoria:'ExtraCombattente',nome:'Fusione',costo:0,atk:3,res:5,prf:0,requisito_personalita:['Ambizioso'],materiali:2,personalita:['Ambizioso']}).card;
 assert.deepEqual([extra.type,extra.meta.map(m=>m.value)],['extraFighter',['Richiede 2× Ambizioso','Ambizioso']]);
 assert.equal(mapTcgCard({categoria:'ExtraCombattente',nome:'F',requisito_personalita:['Creativo'],materiali:1}).card.meta[0].value,'Richiede Creativo');
 const place=mapTcgCard({categoria:'Luogo',nome:'Piazza',costo:2,res:6,velocita:'Continuo',effetto:'Bonus.'}).card;
 assert.deepEqual([place.type,place.stats.map(s=>s.kind+s.value),place.meta.map(m=>m.value)],['location',['RES6'],['Continuo']]);
 assert.deepEqual(mapTcgCard({categoria:'Luogo',nome:'Vuoto'}).card.effects,[]);
});
test('rarities outside the editor list are mapped with a warning, never silently',()=>{
 const legendary=mapTcgCard({categoria:'Azione',nome:'A',rarita:'Leggendaria'});assert.equal(legendary.card.rarity,'ultra');assert.match(legendary.warnings[0],/Leggendaria/);
 const odd=mapTcgCard({categoria:'Azione',nome:'A',rarita:'Mitica'});assert.equal(odd.card.rarity,'common');assert.equal(odd.warnings.length,1);
 for(const [name,key] of [['Comune','common'],['Rare','rare'],['Super Rara','super'],['ultra rare','ultra']])assert.equal(mapTcgCard({categoria:'Azione',nome:'A',rarita:name}).card.rarity,key);
});
test('bad files are refused with a reason; ids and copies are made safe',()=>{
 for(const bad of [null,[],'x',{},{categoria:'Strana',nome:'X'},{categoria:'Azione'},{categoria:'Azione',nome:'   '}])assert.equal(mapTcgCard(bad).ok,false);
 assert.match(mapTcgCard({categoria:'Strana',nome:'X'}).error,/Strana/);
 assert.equal(mapTcgCard({categoria:'Azione',nome:'Nome Lungo',id:'a b/c<d>'}).card.id,'a-b-c-d');assert.equal(mapTcgCard({categoria:'Azione',nome:'Nome Lungo'}).card.id,'Nome-Lungo');
 for(const [copie,want] of [[0,1],[500,99],[2.6,3],['x',1],[undefined,1]])assert.equal(mapTcgCard({categoria:'Azione',nome:'A',copie}).card.copies,want);
});
test('disciplines get stable colours, including ones the importer has never seen',()=>{
 assert.equal(disciplineColor('Chimica'),disciplineColor(' chimica '));assert.match(disciplineColor('Chimica'),/^#[0-9a-f]{6}$/i);
 assert.notEqual(disciplineColor('Medicina'),disciplineColor('Economia'));
});
