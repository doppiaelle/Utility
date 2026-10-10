import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BACK_LAYOUTS,DEFAULT_BACK,backFields,normalizeBack} from '../src/back.ts';
import {buildBackup,normalizeTemplates,parseBackup} from '../src/liveModel.ts';

test('the back falls back to the default design for anything unusable',()=>{
 for(const bad of [null,undefined,'x',7,[],{}])assert.deepEqual(normalizeBack(bad),{...DEFAULT_BACK,frame:{},liveEdits:{},extras:[]});
 assert.equal(DEFAULT_BACK.monogram,'K');
});
test('title, colour and layout are validated; the monogram follows the title unless set',()=>{
 const b=normalizeBack({layout:'bogus',color:'red',title:'  Draghi   e Tesori  ',subtitle:'x'.repeat(200)});
 assert.deepEqual([b.layout,b.color,b.title,b.monogram,b.subtitle.length],['emblem','#1d5c6b','Draghi e Tesori','D',60]);
 assert.equal(normalizeBack({title:'Luna',monogram:'ΩΩΩΩ'}).monogram,'ΩΩΩ');assert.equal(normalizeBack({title:''}).title,'');
 for(const layout of BACK_LAYOUTS.map(l=>l.id))assert.equal(normalizeBack({layout}).layout,layout);
});
test('frame settings keep only finite numbers and plain preset words',()=>{
 const b=normalizeBack({frame:{size:3,radius:Infinity,inset:'x',framePreset:'bevel',accentPreset:'a"onload="x',frameSeed:99,evil:1,opacity:-4}});
 assert.deepEqual(b.frame,{size:3,frameSeed:99,opacity:0,framePreset:'bevel'});
});
test('edits and free elements on the back are validated like on the front',()=>{
 const b=normalizeBack({liveEdits:{'back-title':{x:5,fill:'url(x)'}},extras:[{id:'custom-a',kind:'ellipse',x:1,y:2,w:30,h:40},{id:'custom-b',kind:'nope'}]});
 assert.deepEqual(b.liveEdits,{'back-title':{x:5}});assert.deepEqual(b.extras.map(e=>e.id),['custom-a']);
 assert.deepEqual(backFields(b).map(f=>f.key),['title','subtitle','monogram']);
});
test('backups carry the back, and templates can be saved for it',()=>{
 const store={'kritoma.back':JSON.stringify({layout:'pattern',title:'Prova'})};
 const r=parseBackup(buildBackup(k=>store[k]??null));assert.equal(r.ok,true);assert.equal(r.summary.back,true);assert.equal(JSON.parse(r.entries['kritoma.back']).layout,'pattern');
 assert.equal(parseBackup(JSON.stringify({format:'kritoma-backup',version:1,data:{'kritoma.back':'x'}})).ok,false);
 assert.equal(parseBackup(JSON.stringify({format:'kritoma-backup',version:1,data:{'kritoma.back':{title:'y'.repeat(400000)}}})).ok,false);
 assert.deepEqual(normalizeTemplates([{id:'tpl-b',name:'Retro',kind:'back'},{id:'tpl-c',name:'x',kind:'other'}]).map(t=>t.kind),['back']);
 assert.equal(normalizeTemplates([{id:'tpl-b',name:'Retro',kind:'back'}],'card').length,0);
});
