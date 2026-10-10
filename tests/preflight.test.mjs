import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LIMITS,contrastIssues,fontPt,imageIssues,layoutIssues,summarize,textSizeIssues} from '../src/preflight.ts';

test('text size is judged in points: 10 drawing units are 1 mm',()=>{
 assert.ok(Math.abs(fontPt(24)-6.8)<.05);assert.ok(Math.abs(fontPt(16)-4.54)<.02);assert.ok(Math.abs(fontPt(25.4)-7.2)<.01);
 const issues=textSizeIssues([{label:'Titolo',units:24},{label:'Effetto',units:16},{label:'Effetto',units:20},{label:'Chip',units:10},{label:'Codice',units:0}]);
 assert.deepEqual(issues.map(i=>[i.severity,i.message.split(':')[0]]),[['warning','Effetto'],['error','Chip']]);
 assert.match(issues[0].message,/4,5 pt.*6 pt/);assert.match(issues[1].message,/2,8 pt.*troppo piccolo/);
});
test('contrast is judged on the worst pair of a block',()=>{
 const issues=contrastIssues([{label:'A',fg:'#000000',bg:'#ffffff'},{label:'B',fg:'#777777',bg:'#888888'},{label:'C',fg:'#8a8a8a',bg:'#ffffff'},{label:'C',fg:'#000000',bg:'#ffffff'}]);
 assert.deepEqual(issues.map(i=>[i.severity,i.message.split(':')[0]]),[['error','B'],['warning','C']]);assert.match(issues[0].message,/1,3:1/);
});
test('image resolution is judged from pixels and printed width',()=>{
 const issues=imageIssues([{label:'Ok',pixels:1000,widthMm:60},{label:'Bassa',pixels:300,widthMm:60},{label:'Pessima',pixels:200,widthMm:60},{label:'Vuota',pixels:0,widthMm:60},{label:'Zero',pixels:500,widthMm:0}]);
 assert.deepEqual(issues.map(i=>[i.severity,i.message.split(':')[0]]),[['warning','Bassa'],['error','Pessima']]);assert.match(issues[0].message,/127 dpi/);assert.match(issues[1].message,/85 dpi/);
 assert.ok(LIMITS.minDpi>LIMITS.lowDpi);
});
test('blocks leaving the safe margin or lying over each other are reported once each',()=>{
 const sheet={w:630,h:880},box=(label,l,t,r,b,overlap=true)=>({label,l,t,r,b,overlap});
 const ok=layoutIssues([box('Titolo',60,45,570,110),box('Testo',60,600,570,760)],sheet,30);assert.deepEqual(ok,[]);
 const edge=layoutIssues([box('Titolo',10,45,570,110)],sheet,30);assert.equal(edge.length,1);assert.match(edge[0].message,/Titolo.*zona sicura di 3 mm/);
 const over=layoutIssues([box('Titolo',60,100,570,200),box('Testo',60,150,570,300),box('Disegno',60,150,570,300,false)],sheet,30);assert.deepEqual(over.map(i=>i.code),['overlap']);assert.match(over[0].message,/«Titolo» e «Testo»/);
 assert.deepEqual(layoutIssues([box('Titolo',60,100,570,200),box('Testo',60,200,570,300)],sheet,30),[],'touching is not overlapping');
 assert.deepEqual(layoutIssues([box('Nascosto',0,0,0,0)],sheet,30),[],'empty boxes are ignored');
});
test('the summary counts each severity',()=>{
 assert.deepEqual(summarize([{severity:'error',code:'a',message:''},{severity:'warning',code:'b',message:''},{severity:'warning',code:'c',message:''},{severity:'info',code:'d',message:''}]),{errors:1,warnings:2,infos:1});
 assert.deepEqual(summarize([]),{errors:0,warnings:0,infos:0});
});
