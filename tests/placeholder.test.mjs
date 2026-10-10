import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {ART_STYLES,isPlaceholderArt,pickStyle,placeholderDataUrl,placeholderSvg} from '../src/placeholder.ts';
import {contrast,rotateHue} from '../src/color.ts';
const {window}=new JSDOM();globalThis.DOMParser=window.DOMParser;
const parse=s=>new DOMParser().parseFromString(s,'image/svg+xml');

test('every style yields well-formed, bounded SVG tinted by the colour',()=>{
 for(const {id} of ART_STYLES){
  const svg=placeholderSvg('CMB-prova','#2f7d4f',id),doc=parse(svg);
  assert.equal(doc.querySelector('parsererror'),null,id);assert.equal(doc.documentElement.getAttribute('viewBox'),'0 0 600 840');
  assert.ok(svg.length<25000,`${id}: ${svg.length} bytes`);assert.ok(doc.querySelectorAll('*').length<140,id);
  assert.match(svg,/#[0-9a-f]{6}/i);assert.doesNotMatch(svg,/NaN|undefined|Infinity/);
 }
});
test('the same seed always gives the same picture, other seeds and colours give other ones',()=>{
 const a=placeholderSvg('X','#1d5c6b','paesaggio');
 assert.equal(a,placeholderSvg('X','#1d5c6b','paesaggio'));assert.notEqual(a,placeholderSvg('Y','#1d5c6b','paesaggio'));assert.notEqual(a,placeholderSvg('X','#b5452d','paesaggio'));assert.notEqual(a,placeholderSvg('X','#1d5c6b','onde'));
 assert.equal(pickStyle('CMB-a'),pickStyle('CMB-a'));assert.ok(new Set(Array.from({length:60},(_,i)=>pickStyle('carta-'+i))).size===ART_STYLES.length,'all styles get used');
});
test('an invalid colour falls back instead of breaking the picture',()=>{assert.equal(parse(placeholderSvg('X','rosso','cristalli')).querySelector('parsererror'),null);});
test('placeholders are recognised, real pictures are not, and the data URL is accepted by the card',()=>{
 const url=placeholderDataUrl('CMB-prova','#2f7d4f','geometrica');
 assert.match(url,/^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/]+=*$/i,'same pattern the card requires for artwork');assert.equal(isPlaceholderArt(url),true);
 for(const other of [undefined,null,'',7,'data:image/png;base64,iVBORw0KGgo=','data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=','data:image/svg+xml;base64,@@@'])assert.equal(isPlaceholderArt(other),false);
});
test('hue rotation keeps the family of the colour and handles greys',()=>{
 assert.equal(rotateHue('#ff0000',120),'#00ff00');assert.equal(rotateHue('#ff0000',-120),'#0000ff');assert.equal(rotateHue('#808080',90),'#808080');assert.equal(rotateHue('bad',90),'bad');
 assert.ok(contrast(rotateHue('#336699',0),'#336699')<1.01);
});
