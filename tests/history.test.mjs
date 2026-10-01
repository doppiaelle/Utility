import {test} from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {useHistory} from '../src/useHistory.ts';
const dom=new JSDOM('<div id="root"></div>');globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
function harness(){let history;const root=createRoot(document.getElementById('root'));function App(){history=useHistory({text:'base',hidden:false,x:0});return null;}act(()=>root.render(React.createElement(App)));return {get h(){return history},close:()=>act(()=>root.unmount())};}
test('typing coalesces while separate controls retain their own undo steps',()=>{const t=harness();try{act(()=>{t.h.set(v=>({...v,text:'a'}));t.h.set(v=>({...v,text:'ab'}));});act(()=>t.h.set(v=>({...v,hidden:true})));act(()=>t.h.undo());assert.deepEqual(t.h.value,{text:'ab',hidden:false,x:0});act(()=>t.h.undo());assert.equal(t.h.value.text,'base');act(()=>t.h.redo());assert.equal(t.h.value.text,'ab');act(()=>t.h.set(v=>({...v,x:20})));assert.equal(t.h.canRedo,false);}finally{t.close();}});
test('a gesture undoes in one step and a click alone creates no undo entry',()=>{const t=harness();try{act(()=>t.h.begin());act(()=>t.h.end());assert.equal(t.h.canUndo,false);act(()=>t.h.begin());act(()=>{for(let x=1;x<=10;x++)t.h.set(v=>({...v,x}));});act(()=>t.h.end());act(()=>t.h.undo());assert.equal(t.h.value.x,0);assert.equal(t.h.canUndo,false);act(()=>t.h.redo());assert.equal(t.h.value.x,10);}finally{t.close();}});
test('the history limit also applies to pointer gestures',()=>{const t=harness();try{for(let x=1;x<=110;x++){act(()=>t.h.begin());act(()=>t.h.set(v=>({...v,x})));act(()=>t.h.end());}for(let i=0;i<100;i++)act(()=>t.h.undo());assert.equal(t.h.value.x,10);assert.equal(t.h.canUndo,false);}finally{t.close();}});
