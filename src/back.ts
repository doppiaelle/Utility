/** The back of the cards: one design shared by the whole game. No DOM, so it can be tested. */
import {normalizeEdits,normalizeExtras} from './liveModel.ts';
import type {DataField,ExtraElement,LiveEdits} from './liveModel.ts';

export type BackLayoutId='emblem'|'pattern'|'minimal';
export const BACK_LAYOUTS:{id:BackLayoutId;label:string;note:string}[]=[
  {id:'emblem',label:'Emblema',note:'Un emblema con anelli e raggi al centro, titolo e sottotitolo sotto'},
  {id:'pattern',label:'Motivo',note:'Un reticolo a rombi su tutta la carta e una targa centrale con il titolo'},
  {id:'minimal',label:'Essenziale',note:'Fondo pulito, un piccolo emblema e il titolo'}
];
export const isBackLayout=(v:unknown):v is BackLayoutId=>typeof v==='string'&&BACK_LAYOUTS.some(l=>l.id===v);

export type BackFrame=Record<string,number|string>;
export type BackDesign={layout:BackLayoutId;color:string;title:string;subtitle:string;monogram:string;frame:BackFrame;liveEdits:LiveEdits;extras:ExtraElement[]};
export const DEFAULT_BACK:BackDesign={layout:'emblem',color:'#1d5c6b',title:'KRITOMA',subtitle:'Gioco di carte',monogram:'K',frame:{},liveEdits:{},extras:[]};

const FRAME_NUMBERS=['size','radius','opacity','inset','frameDetail','frameSeed','accentSize','accentOpacity','accentDensity','accentMotion','accentSeed'];
const text=(v:unknown,fallback:string,max:number)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):fallback;
/** Only known frame settings survive: numbers must be finite and presets plain lowercase words. */
function cleanFrame(raw:unknown):BackFrame{
  const out:BackFrame={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
  const r=raw as Record<string,unknown>;
  for(const k of FRAME_NUMBERS)if(typeof r[k]==='number'&&Number.isFinite(r[k]))out[k]=Math.max(0,Math.min(1_000_000,r[k] as number));
  for(const k of ['framePreset','accentPreset'])if(typeof r[k]==='string'&&/^[a-z]{3,12}$/.test(r[k] as string))out[k]=r[k] as string;
  return out;
}
export function normalizeBack(raw:unknown):BackDesign{
  const r=(raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{}) as Record<string,unknown>;
  const title=text(r.title,DEFAULT_BACK.title,40);
  const monogram=text(r.monogram,'',3)||title.charAt(0).toUpperCase();
  return{
    layout:isBackLayout(r.layout)?r.layout:DEFAULT_BACK.layout,
    color:typeof r.color==='string'&&/^#[0-9a-f]{6}$/i.test(r.color)?r.color:DEFAULT_BACK.color,
    title,subtitle:text(r.subtitle,DEFAULT_BACK.subtitle,60),monogram,
    frame:cleanFrame(r.frame),liveEdits:normalizeEdits(r.liveEdits),extras:normalizeExtras(r.extras)
  };
}
/** What a free text on the back can show. */
export const backFields=(b:BackDesign):DataField[]=>[{key:'title',label:'Titolo del dorso',value:b.title},{key:'subtitle',label:'Sottotitolo del dorso',value:b.subtitle},{key:'monogram',label:'Monogramma',value:b.monogram}];
