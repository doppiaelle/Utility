import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyFile,mapTcgDeck,mapTcgRoles,normalizeDecks,normalizeRoles,deckSummary,setCopies,removeCard,addCard,duplicateDeck,newDeck,uniqueDeckId} from '../src/decks.ts';
import {parseBackup,buildBackup} from '../src/liveModel.ts';

const deckFile={id:'mazzo-prova',nome:'Mazzo di Prova',descrizione:'Prova  a   capo',disciplina:'Economia',ruolo:'risorse',stato:'bozza',carte:[{id:'CMB-a',copie:4},{id:'CMB-b',copie:0},{id:'bad id',copie:2},{id:'CMB-a',copie:9},null],extra:['EXT-a','EXT-a','bad id'],obiettivi:['OBI-a']};

test('files are told apart by what they contain, not by their name',()=>{
 assert.equal(classifyFile({categoria:'Azione',nome:'x'}),'card');assert.equal(classifyFile(deckFile),'deck');assert.equal(classifyFile({ruoli:[]}),'roles');
 for(const other of [{ambiti:[]},{carte:[]},[],null,'x',7])assert.equal(classifyFile(other),'other');
});
test('a deck file keeps its cards with copies, drops duplicates and invalid ids, and normalizes text',()=>{
 const r=mapTcgDeck(deckFile);assert.equal(r.ok,true);const d=r.deck;
 assert.deepEqual([d.id,d.name,d.scope,d.role,d.status,d.description],['mazzo-prova','Mazzo di Prova','Economia','risorse','bozza','Prova a capo']);
 assert.deepEqual(d.cards,[{id:'CMB-a',copies:4},{id:'CMB-b',copies:1}]);assert.deepEqual([d.extra,d.goals],[['EXT-a'],['OBI-a']]);
 assert.equal(mapTcgDeck({nome:'Senza id',carte:[]}).deck.id,'senza-id');assert.equal(mapTcgDeck({carte:[],nome:'  '}).ok,false);assert.equal(mapTcgDeck({x:1}).ok,false);
});
test('roles keep a name, a valid colour and a description; nameless ones are dropped',()=>{
 const roles=mapTcgRoles({ruoli:[{id:'ricerca',nome:'Ricerca',colore:'#3b82f6',descrizione:'Trova.'},{id:'senza',nome:'',colore:'#000000'},{id:'strano',nome:'Strano',colore:'red'},{nome:'senza id'}]});
 assert.deepEqual(Object.keys(roles).sort(),['ricerca','strano']);assert.equal(roles.ricerca.color,'#3b82f6');assert.match(roles.strano.color,/^#[0-9a-f]{6}$/i);assert.deepEqual(mapTcgRoles({x:1}),{});
});
test('stored decks are validated: unique ids, bounded, no garbage',()=>{
 const list=normalizeDecks([{id:'a',name:'A',cards:[{id:'c1',copies:3}]},{id:'a',name:'Doppione'},{id:'b',name:''},{id:'bad id',name:'x'},null,7,{id:'c',name:'C',cards:'x',extra:'y',status:''}]);
 assert.deepEqual(list.map(d=>d.id),['a','c']);assert.equal(list[1].status,'bozza');assert.deepEqual(list[1].cards,[]);assert.deepEqual(normalizeDecks('x'),[]);
 assert.equal(normalizeDecks(Array.from({length:300},(_,i)=>({id:'d'+i,name:'D'+i}))).length,200);
 assert.deepEqual(normalizeRoles({a:{name:'A',color:'#112233'},'bad key!':{name:'x'},b:{color:'#fff'}}).a.color,'#112233');
});
test('a deck summary counts copies and lists what is missing from the collection',()=>{
 const d=mapTcgDeck(deckFile).deck,s=deckSummary(d,new Set(['CMB-a','OBI-a']));
 assert.deepEqual([s.distinct,s.copies,s.extra,s.goals],[2,5,1,1]);assert.deepEqual(s.missing,['CMB-b','EXT-a']);
});
test('deck edits are immutable, bounded and never duplicate a card',()=>{
 const d=mapTcgDeck(deckFile).deck;
 assert.equal(setCopies(d,'CMB-a',500).cards[0].copies,99);assert.equal(setCopies(d,'CMB-a',0).cards[0].copies,1);assert.equal(d.cards[0].copies,4);
 const r=removeCard(d,'EXT-a');assert.deepEqual(r.extra,[]);assert.equal(removeCard(d,'CMB-a').cards.length,1);
 assert.equal(addCard(d,'CMB-a').cards.length,2,'already present');assert.deepEqual(addCard(d,'NEW-1').cards.at(-1),{id:'NEW-1',copies:1});assert.deepEqual(addCard(d,'NEW-2','goals').goals,['OBI-a','NEW-2']);assert.equal(addCard(d,'bad id'),d);
 const c1=duplicateDeck(d,[d]),c2=duplicateDeck(d,[d,c1]);assert.deepEqual([c1.id,c2.id],['mazzo-prova-copia','mazzo-prova-copia-2']);assert.equal(c1.name,'Mazzo di Prova (copia)');
 assert.equal(uniqueDeckId('x',['x','x-2']),'x-3');assert.equal(newDeck([newDeck([])]).id,'nuovo-mazzo-2');
});
test('backups carry decks and roles, validated',()=>{
 const store={'kritoma.decks':JSON.stringify([{id:'a',name:'A',cards:[{id:'c1',copies:2}]},{id:'a',name:'dup'}]),'kritoma.roles':JSON.stringify({r:{name:'R',color:'#112233'}})};
 const r=parseBackup(buildBackup(k=>store[k]??null));assert.equal(r.ok,true);assert.equal(r.summary.decks,1);assert.equal(JSON.parse(r.entries['kritoma.roles']).r.name,'R');
});
