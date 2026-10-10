import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contrast,luminance,mix,parseHex,readableOn,DARK_SURFACE} from '../src/color.ts';

test('contrast follows the WCAG scale',()=>{
 assert.equal(Math.round(contrast('#000000','#ffffff')),21);assert.equal(contrast('#336699','#336699'),1);
 assert.ok(Math.abs(contrast('#64748b',DARK_SURFACE)-3.58)<.05,'the Difesa role colour');
 assert.equal(luminance('nope'),0);assert.equal(parseHex('#12'),null);assert.deepEqual(parseHex('#0a1B2c'),[10,27,44]);
});
test('a colour is lightened only as much as needed to be readable, and left alone when it already is',()=>{
 for(const c of ['#64748b','#a855f7','#334455','#000000']){const r=readableOn(c,DARK_SURFACE);assert.ok(contrast(r,DARK_SURFACE)>=4.5,c);}
 assert.equal(readableOn('#22c55e',DARK_SURFACE),'#22c55e');assert.equal(readableOn('#3b82f6',DARK_SURFACE),'#3b82f6');
 assert.notEqual(readableOn('#64748b',DARK_SURFACE),'#64748b');
 assert.ok(contrast(readableOn('#64748b',DARK_SURFACE),'#64748b')<2,'stays recognisably the same hue family');
 assert.equal(readableOn('not a colour',DARK_SURFACE),'not a colour');
 assert.ok(contrast(readableOn('#ffee99','#ffffff'),'#ffffff')>=4.5,'on a light surface it darkens instead');
});
test('mixing is bounded and ignores invalid input',()=>{
 assert.equal(mix('#000000','#ffffff',.5),'#808080');assert.equal(mix('#102030','#ffffff',-3),'#102030');assert.equal(mix('#102030','#ffffff',9),'#ffffff');assert.equal(mix('bad','#ffffff',.5),'bad');
});
