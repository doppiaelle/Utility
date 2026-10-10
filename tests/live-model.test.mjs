import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {THEMES} from '../src/themes.ts';
import {applyEdits,blankEdits,buildBackup,clearGeometry,fieldData,parseBackup,safeSvg,normalizeEdits,normalizeExtras,normalizeTemplates,renderExtras,removeIndexedEdits} from '../src/liveModel.ts';
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

test('removing a card field remaps its sibling and icon edits without reusing deleted styles',()=>{const result=removeIndexedEdits({'meta-0':{x:10},'meta-icon-0':{fill:'#123456'},'meta-1':{x:30},'meta-icon-1':{fill:'#abcdef'},'title':{y:4}},'meta',0);assert.deepEqual(result,{'meta-0':{x:30},'meta-icon-0':{fill:'#abcdef'},'title':{y:4}});});

test('every free element kind renders valid, independent SVG and unknown kinds are dropped',()=>{
 const png='data:image/png;base64,iVBORw0KGgo=';
 const extras=normalizeExtras([...['shape','ellipse','line','triangle','diamond','hexagon','star'].map(kind=>({id:`custom-${kind}`,kind,x:10,y:20,w:100,h:60})),{id:'custom-img',kind:'image',src:png,x:0,y:0,w:50,h:50},{id:'custom-ico',kind:'icon',icon:'bolt',x:0,y:0,w:56,h:56},{id:'custom-bad',kind:'script',x:0,y:0},{id:'custom-evil',kind:'image',src:'javascript:alert(1)',x:0,y:0},{id:'custom-ext',kind:'image',src:'https://example.com/a.png',x:0,y:0},{id:'custom-icon2',kind:'icon',icon:'nope"onload="x',x:0,y:0}]);
 assert.deepEqual(extras.map(v=>v.id),['custom-shape','custom-ellipse','custom-line','custom-triangle','custom-diamond','custom-hexagon','custom-star','custom-img','custom-ico','custom-icon2']);
 assert.equal(extras.at(-1).icon,'star');
 const doc=parse(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${renderExtras(extras)}</svg>`);
 assert.equal(doc.querySelectorAll('[data-live-id]').length,10);assert.equal(doc.querySelector('parsererror'),null);
 assert.ok(doc.querySelector('[data-live-id=custom-ellipse] ellipse'));assert.ok(doc.querySelector('[data-live-id=custom-line] line'));assert.equal(doc.querySelector('[data-live-id=custom-star] path').getAttribute('d').match(/L/g).length,9);
 assert.equal(doc.querySelector('[data-live-id=custom-img] image').getAttribute('href'),png);assert.ok(doc.querySelector('[data-live-id=custom-ico] path'));
 const labels=Array.from(doc.querySelectorAll('[data-live-id]')).map(n=>n.getAttribute('data-live-label'));assert.equal(new Set(labels).size,labels.length);
});
test('a free element survives edits applied to it like any other block',()=>{
 const [one]=normalizeExtras([{id:'custom-a',kind:'ellipse',x:0,y:0,w:100,h:50}]);
 const doc=parse(applyEdits(`<svg xmlns="http://www.w3.org/2000/svg">${renderExtras([one])}</svg>`,{'custom-a':{fill:'#102030',x:15,sx:2}}));
 const g=doc.querySelector('[data-live-id=custom-a]');assert.equal(g.querySelector('ellipse').getAttribute('fill'),'#102030');assert.match(g.getAttribute('transform'),/translate\(15 0\)/);
});

test('templates drop anything malformed and re-validate their contents',()=>{
 const list=normalizeTemplates([
  {id:'tpl-a',name:'  Base  ',kind:'card',liveEdits:{title:{x:5,fill:'url(x)'}},extras:[{id:'custom-1',kind:'ellipse',x:1,y:2,w:30,h:40},{id:'custom-2',kind:'nope'}]},
  {id:'tpl-a',name:'dup',kind:'card'},{id:'bad id',name:'x',kind:'card'},{id:'tpl-b',name:'',kind:'card'},{id:'tpl-c',name:'x',kind:'other'},{id:'tpl-d',name:'Mat',kind:'terrain'},null,7]);
 assert.deepEqual(list.map(t=>[t.id,t.name,t.kind]),[['tpl-a','Base','card'],['tpl-d','Mat','terrain']]);
 assert.deepEqual(list[0].liveEdits,{title:{x:5}});assert.deepEqual(list[0].extras.map(v=>v.id),['custom-1']);
 assert.deepEqual(normalizeTemplates(list,'terrain').map(t=>t.id),['tpl-d']);assert.deepEqual(normalizeTemplates('x'),[]);
});
test('blank canvas hides built-in blocks, keeps their other edits and ignores free elements',()=>{
 const edits=blankEdits(['title','cost','custom-9'],{title:{x:3,fill:'#112233'},'custom-9':{x:4}});
 assert.deepEqual(edits,{title:{x:3,fill:'#112233',hidden:true},cost:{hidden:true}});
});

test('a linked text shows the live value, escaped, and falls back to its own text',()=>{
 const extras=normalizeExtras([{id:'custom-a',kind:'text',text:'fallback',bind:'name',x:0,y:0,w:10,h:10},{id:'custom-b',kind:'text',text:'own',bind:'missing',x:0,y:0,w:10,h:10},{id:'custom-c',kind:'text',text:'t',bind:'a"onload="x',x:0,y:0,w:10,h:10},{id:'custom-d',kind:'text',text:'toString',bind:'toString',x:0,y:0,w:10,h:10},{id:'custom-e',kind:'ellipse',bind:'name',x:0,y:0,w:10,h:10}]);
 assert.deepEqual(extras.map(v=>v.bind),['name','missing',undefined,'toString',undefined]);
 const doc=parse(`<svg xmlns="http://www.w3.org/2000/svg">${renderExtras(extras,fieldData([{key:'name',label:'Nome',value:'Drago <A>\nrosso'}]))}</svg>`);
 const texts=Array.from(doc.querySelectorAll('[data-live-id] text')).map(t=>Array.from(t.querySelectorAll('tspan')).map(s=>s.textContent));
 assert.deepEqual(texts,[['Drago <A>','rosso'],['own'],['t'],['toString']]);
 assert.equal(renderExtras(extras),renderExtras(extras,{}));
});

test('safeSvg strips handlers, scripts and javascript: links and leaves clean markup untouched',()=>{
 const clean='<svg xmlns="http://www.w3.org/2000/svg"><g onclick-label="x"><text>on=1</text></g></svg>';
 assert.equal(safeSvg(clean),clean);
 const dirty=safeSvg('<svg xmlns="http://www.w3.org/2000/svg"><rect onload="alert(1)" fill="#fff"/><script>alert(2)</script><foreignObject><div/></foreignObject><a href="javascript:alert(3)"><circle/></a></svg>');
 const doc=parse(dirty);assert.equal(doc.querySelector('script'),null);assert.equal(doc.querySelector('foreignObject'),null);assert.equal(doc.querySelector('rect').getAttribute('onload'),null);assert.equal(doc.querySelector('rect').getAttribute('fill'),'#fff');assert.equal(doc.querySelector('a').getAttribute('href'),null);
 assert.match(safeSvg('<svg onload="x"><unclosed></svg>'),/viewBox="0 0 10 10"/);
});
test('backups round-trip, drop invalid templates and refuse foreign or oversized files',()=>{
 const store={'kritoma.cards':JSON.stringify([{id:'A'}]),'kritoma.terrain':JSON.stringify({name:'T'}),'kritoma.templates':JSON.stringify([{id:'tpl-a',name:'Base',kind:'card',liveEdits:{},extras:[]},{id:'bad',name:'x',kind:'card'}]),'kritoma.cardDraft':'not json'};
 const json=buildBackup(k=>store[k]??null,new Date('2026-01-02T03:04:05Z'));
 const result=parseBackup(json);assert.equal(result.ok,true);assert.deepEqual(result.summary,{cards:1,terrain:true,draft:false,templates:1});
 assert.deepEqual(JSON.parse(result.entries['kritoma.templates']).map(t=>t.id),['tpl-a']);assert.equal('kritoma.cardDraft' in result.entries,false);
 for(const bad of['{','[]','{"format":"x"}','{"format":"kritoma-backup","version":2,"data":{}}','{"format":"kritoma-backup","version":1,"data":{}}','{"format":"kritoma-backup","version":1,"data":{"kritoma.cards":[1]}}','{"format":"kritoma-backup","version":1,"data":{"kritoma.cards":"x"}}'])assert.equal(parseBackup(bad).ok,false,bad);
 assert.equal(parseBackup('x'.repeat(40_000_001)).ok,false);
});

test('image boxes remember their pixel size, rejecting nonsense values',()=>{
 const png='data:image/png;base64,iVBORw0KGgo=';
 const [a,b,c]=normalizeExtras([{id:'custom-a',kind:'image',src:png,nw:1200.4,nh:800,x:0,y:0,w:10,h:10},{id:'custom-b',kind:'image',src:png,nw:-5,nh:Infinity,x:0,y:0,w:10,h:10},{id:'custom-c',kind:'ellipse',nw:10,nh:10,x:0,y:0,w:10,h:10}]);
 assert.deepEqual([a.nw,a.nh],[1200,800]);assert.deepEqual([b.nw,b.nh],[undefined,undefined]);assert.equal('nw' in c,false);
});

test('changing layout drops hand-placed geometry but keeps colours, text styling and visibility',()=>{
 const result=clearGeometry({title:{x:40,y:2,sx:1.5,sy:1.2,rotation:10,cx:5,cy:6,order:2,fill:'#123456',hidden:true},cost:{x:9},frame:{locked:true,fontSize:20},bad:'x'});
 assert.deepEqual(result,{title:{fill:'#123456',hidden:true},frame:{locked:true,fontSize:20}});
 assert.deepEqual(clearGeometry(undefined),{});
});
test('themes are well formed: unique ids, valid colours and known presets',()=>{
 const hex=/^#[0-9a-f]{6}$/i,frames=['rounded','double','shield','arch','square','bevel','octagon','tech','offset','broken','wave'],accents=['corners','filigree','ribbons','waves','slashes','circuit','runes','orbits','spines','fragments','minimal','none'],fonts=['Arial','Inter','Trebuchet MS','Verdana','Georgia','Impact','Courier New'];
 assert.equal(new Set(THEMES.map(t=>t.id)).size,THEMES.length);assert.ok(THEMES.length>=6);
 for(const t of THEMES){assert.ok(t.label);assert.equal(t.colors.length,3);for(const c of [...t.colors,t.card.scopeColor,...Object.values(t.terrain)])assert.match(c,hex,t.id);
  assert.ok(frames.includes(t.card.framePreset),t.id);assert.ok(accents.includes(t.card.accentPreset),t.id);assert.ok(fonts.includes(t.card.titleFont)&&fonts.includes(t.card.textFont),t.id);}
});
