import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {applyEdits,normalizeEdits,normalizeExtras,renderExtras} from '../src/liveModel.ts';
const {window}=new JSDOM();globalThis.DOMParser=window.DOMParser;globalThis.XMLSerializer=window.XMLSerializer;
const parse=s=>new DOMParser().parseFromString(s,'image/svg+xml');
const source='<svg xmlns="http://www.w3.org/2000/svg"><defs/><g data-live-id="area"><rect width="100" height="50" rx="4" fill="#fff" stroke="#111"/><text>A</text><g data-live-id="title"><text fill="#222">B</text></g></g><g data-live-id="slot"><path fill="#fff"/></g><path id="overlay"/></svg>';
test('legacy SVG stays byte-identical without edits',()=>assert.equal(applyEdits(source,undefined),source));
test('transforms, appearance, visibility and nested independence survive SVG export',()=>{
 const doc=parse(applyEdits(source,{area:{x:20,y:-5,sx:1.5,sy:.8,rotation:30,cx:50,cy:25,fill:'#123456',strokeWidth:4,textColor:'#fedcba',opacity:.5},title:{textColor:'#abcdef',hidden:true}}));
 const area=doc.querySelector('[data-live-id=area]');assert.match(area.getAttribute('transform'),/translate\(20 -5\).*rotate\(30 50 25\)/);assert.equal(area.getAttribute('opacity'),'.5'.replace(/^\./,'0.'));
 assert.equal(area.querySelector('rect').getAttribute('fill'),'#123456');assert.equal(area.querySelector('rect').getAttribute('stroke-width'),'4');assert.equal(area.querySelector('text').getAttribute('fill'),'#fedcba');assert.equal(doc.querySelector('[data-live-id=title] text').getAttribute('fill'),'#abcdef');assert.equal(doc.querySelector('[data-live-id=title]').getAttribute('display'),'none');assert.equal(doc.querySelector('[data-live-id=slot] path').getAttribute('fill'),'#fff');
});
test('layer ordering retains definitions and fixed overlays',()=>{const doc=parse(applyEdits(source,{area:{order:2},slot:{order:-1}}));assert.deepEqual(Array.from(doc.documentElement.children).map(n=>n.getAttribute('data-live-id')||n.tagName),['defs','slot','area','path']);});
test('invalid imported parameters cannot inject attributes or non-finite transforms',()=>{
 const edits=normalizeEdits({title:{x:Infinity,y:999999,sx:-1,fill:'url(javascript:bad)',textColor:'#aabbcc',fontFamily:'bad" onload="evil',locked:true,hidden:'true'},'bad"id':{x:2}});
 assert.deepEqual(edits,{title:{y:3200,sx:.1,textColor:'#aabbcc',locked:true}});
});
test('custom texts are escaped, multiline and independent',()=>{const extras=normalizeExtras([{id:'custom-abc',kind:'text',text:'<script> &\nSeconda riga',x:10,y:20,w:30,h:40},{id:'custom-shape',kind:'shape',text:'',x:10,y:20,w:0,h:Infinity}]);const doc=parse(`<svg xmlns="http://www.w3.org/2000/svg">${renderExtras(extras)}</svg>`);assert.equal(doc.querySelector('script'),null);assert.equal(doc.querySelectorAll('tspan').length,2);assert.equal(doc.querySelector('text').textContent,'<script> &Seconda riga');assert.equal(doc.querySelector('rect').getAttribute('width'),'10');});
