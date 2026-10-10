/** Looks shared by card and terrain, so a game's pieces match with one click. */
export type Theme={
  id:string;label:string;
  /** Three swatches for the picker: background, accent, text. */
  colors:[string,string,string];
  card:{scopeColor:string;framePreset:string;accentPreset:string;titleFont:string;textFont:string};
  terrain:{bg:string;panel:string;inner:string;border:string;accent:string;text:string};
};
export const THEMES:Theme[]=[
  {id:'notte',label:'Notte',colors:['#0e1520','#5b8cc7','#9fc0e6'],card:{scopeColor:'#3a6ea5',framePreset:'rounded',accentPreset:'corners',titleFont:'Arial',textFont:'Arial'},terrain:{bg:'#0e1520',panel:'#121b27',inner:'#101822',border:'#2f4a6b',accent:'#5b8cc7',text:'#9fc0e6'}},
  {id:'foresta',label:'Foresta',colors:['#0f1a12','#6fae7d','#a9d4b3'],card:{scopeColor:'#2f7d4f',framePreset:'double',accentPreset:'filigree',titleFont:'Georgia',textFont:'Arial'},terrain:{bg:'#0f1a12',panel:'#142319',inner:'#111d15',border:'#2f5a3a',accent:'#6fae7d',text:'#a9d4b3'}},
  {id:'brace',label:'Brace',colors:['#1c0f0c','#d9693f','#f0b49c'],card:{scopeColor:'#b5452d',framePreset:'bevel',accentPreset:'slashes',titleFont:'Impact',textFont:'Arial'},terrain:{bg:'#1c0f0c',panel:'#241410',inner:'#1f110e',border:'#7a3524',accent:'#d9693f',text:'#f0b49c'}},
  {id:'oceano',label:'Oceano',colors:['#08181c','#3fb4c0','#a6e3ea'],card:{scopeColor:'#1d7f8a',framePreset:'wave',accentPreset:'waves',titleFont:'Trebuchet MS',textFont:'Trebuchet MS'},terrain:{bg:'#08181c',panel:'#0d2328',inner:'#0a1d21',border:'#1d5a63',accent:'#3fb4c0',text:'#a6e3ea'}},
  {id:'antico',label:'Antico',colors:['#17120a','#c6a14f','#e5cf9b'],card:{scopeColor:'#8a6a2f',framePreset:'shield',accentPreset:'ribbons',titleFont:'Georgia',textFont:'Georgia'},terrain:{bg:'#17120a',panel:'#1e1710',inner:'#1a140d',border:'#6b5224',accent:'#c6a14f',text:'#e5cf9b'}},
  {id:'neon',label:'Neon',colors:['#0a0a14','#b36bff','#d9b8ff'],card:{scopeColor:'#8a3fd1',framePreset:'tech',accentPreset:'circuit',titleFont:'Trebuchet MS',textFont:'Arial'},terrain:{bg:'#0a0a14',panel:'#10101e',inner:'#0c0c18',border:'#4a2f7a',accent:'#b36bff',text:'#d9b8ff'}}
];
