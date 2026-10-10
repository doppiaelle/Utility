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
  {id:'neon',label:'Neon',colors:['#0a0a14','#b36bff','#d9b8ff'],card:{scopeColor:'#8a3fd1',framePreset:'tech',accentPreset:'circuit',titleFont:'Trebuchet MS',textFont:'Arial'},terrain:{bg:'#0a0a14',panel:'#10101e',inner:'#0c0c18',border:'#4a2f7a',accent:'#b36bff',text:'#d9b8ff'}},
  {id:'ghiaccio',label:'Ghiaccio',colors:['#0b1519','#8fd3f0','#cfeefa'],card:{scopeColor:'#4aa3c7',framePreset:'octagon',accentPreset:'minimal',titleFont:'Arial',textFont:'Arial'},terrain:{bg:'#0b1519',panel:'#10202a',inner:'#0d1a22',border:'#3c6a80',accent:'#8fd3f0',text:'#cfeefa'}},
  {id:'deserto',label:'Deserto',colors:['#1d150b','#e0a458','#f2d9a8'],card:{scopeColor:'#c27a2c',framePreset:'arch',accentPreset:'runes',titleFont:'Georgia',textFont:'Georgia'},terrain:{bg:'#1d150b',panel:'#271c0f',inner:'#21170c',border:'#7a5326',accent:'#e0a458',text:'#f2d9a8'}},
  {id:'sakura',label:'Sakura',colors:['#1c0e14','#f08cb0','#f7c9da'],card:{scopeColor:'#c2517a',framePreset:'wave',accentPreset:'ribbons',titleFont:'Trebuchet MS',textFont:'Trebuchet MS'},terrain:{bg:'#1c0e14',panel:'#26121b',inner:'#200f17',border:'#7a3350',accent:'#f08cb0',text:'#f7c9da'}},
  {id:'cosmo',label:'Cosmo',colors:['#0a0b1c','#8d9bff','#c7ceff'],card:{scopeColor:'#5b6bd6',framePreset:'offset',accentPreset:'orbits',titleFont:'Trebuchet MS',textFont:'Arial'},terrain:{bg:'#0a0b1c',panel:'#101229',inner:'#0c0e22',border:'#3a4290',accent:'#8d9bff',text:'#c7ceff'}},
  {id:'carbone',label:'Carbone',colors:['#101214','#a8b3bf','#d5dbe1'],card:{scopeColor:'#6b7785',framePreset:'square',accentPreset:'none',titleFont:'Arial',textFont:'Arial'},terrain:{bg:'#101214',panel:'#171a1d',inner:'#131517',border:'#4a525b',accent:'#a8b3bf',text:'#d5dbe1'}},
  {id:'veleno',label:'Veleno',colors:['#0f1507','#b6e03d','#dcf29a'],card:{scopeColor:'#8fbf2a',framePreset:'broken',accentPreset:'spines',titleFont:'Impact',textFont:'Arial'},terrain:{bg:'#0f1507',panel:'#161e0a',inner:'#121908',border:'#4d6a16',accent:'#b6e03d',text:'#dcf29a'}}
];
