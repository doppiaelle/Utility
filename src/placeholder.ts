/** Procedural placeholder illustrations: stable for a given seed, tinted by a colour, never a real picture. */
import {mix,rotateHue} from './color.ts';

export type ArtStyle='paesaggio'|'geometrica'|'cristalli'|'onde';
export const ART_STYLES:{id:ArtStyle;label:string}[]=[
  {id:'paesaggio',label:'Paesaggio'},{id:'geometrica',label:'Geometrica'},{id:'cristalli',label:'Cristalli'},{id:'onde',label:'Onde'}
];
const W=600,H=840,MARK='data-placeholder="1"';

const hash=(s:string)=>{let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h>>>0;};
/** Small seeded generator (mulberry32). */
function rng(seed:number){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
const n=(v:number)=>Math.round(v*10)/10;
export const pickStyle=(seed:string):ArtStyle=>ART_STYLES[hash(seed)%ART_STYLES.length].id;

function glow(id:string,color:string){return`<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity=".95"/><stop offset=".45" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;}

function landscape(r:()=>number,color:string){
  const sky1=mix(color,'#050a14',.72),sky2=mix(rotateHue(color,25),'#ffffff',.28),sun=mix(rotateHue(color,-30),'#ffffff',.72);
  let out=`<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient>${glow('sunGlow',sun)}</defs><rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  for(let i=0;i<26;i++)out+=`<circle cx="${n(r()*W)}" cy="${n(r()*H*.45)}" r="${n(.6+r()*1.6)}" fill="#fff" fill-opacity="${n(.25+r()*.6)}"/>`;
  const sx=110+r()*380,sy=190+r()*170,sr=50+r()*40;
  out+=`<circle cx="${n(sx)}" cy="${n(sy)}" r="${n(sr*3)}" fill="url(#sunGlow)"/><circle cx="${n(sx)}" cy="${n(sy)}" r="${n(sr)}" fill="${sun}"/>`;
  for(let k=0;k<4;k++){
    const base=470+k*85,peaks=6+k;let d=`M-20 ${H} L-20 ${n(base)}`;
    for(let i=0;i<=peaks;i++)d+=` L${n(-20+i*(W+40)/peaks)} ${n(base-(40+r()*(170-k*28)))}`;
    out+=`<path d="${d} L${W+20} ${H} Z" fill="${mix(color,'#000000',.3+k*.16)}"/>`;
  }
  return out;
}
function geometric(r:()=>number,color:string){
  const bg=mix(color,'#0b1220',.55),a=mix(rotateHue(color,40),'#ffffff',.12),b=mix(rotateHue(color,-40),'#ffffff',.05),c=mix(rotateHue(color,160),'#ffffff',.35);
  let out=`<rect width="${W}" height="${H}" fill="${bg}"/><circle cx="${n(120+r()*360)}" cy="${n(240+r()*260)}" r="${n(150+r()*110)}" fill="${a}"/>`;
  for(let i=0;i<3;i++){const x=r()*360,y=120+r()*560,w=140+r()*220,h=80+r()*220,rot=-20+r()*40;out+=`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${i%2?b:c}" fill-opacity="${n(.55+r()*.4)}" transform="rotate(${n(rot)} ${n(x+w/2)} ${n(y+h/2)})"/>`;}
  const tx=r()*400,ty=420+r()*300;out+=`<path d="M${n(tx)} ${n(ty+170)} L${n(tx+110)} ${n(ty)} L${n(tx+220)} ${n(ty+170)} Z" fill="${c}" fill-opacity=".85"/>`;
  for(let i=0;i<5;i++)out+=`<line x1="0" y1="${n(r()*H)}" x2="${W}" y2="${n(r()*H)}" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>`;
  return out;
}
function crystals(r:()=>number,color:string){
  const bg=mix(color,'#050a14',.7);
  let out=`<defs>${glow('coreGlow',mix(color,'#ffffff',.65))}</defs><rect width="${W}" height="${H}" fill="${bg}"/>`;
  const pts=Array.from({length:14},(_,i)=>{const a=i/14*Math.PI*2+r()*.3,rad=250+r()*110;return[300+Math.cos(a)*rad*.95,420+Math.sin(a)*rad*1.3] as [number,number];});
  pts.forEach((p,i)=>{const q=pts[(i+1)%pts.length],t=r(),fill=t<.5?mix(color,'#000000',.1+t):mix(rotateHue(color,20),'#ffffff',.12+t*.4);out+=`<path d="M300 420 L${n(p[0])} ${n(p[1])} L${n(q[0])} ${n(q[1])} Z" fill="${fill}" stroke="#fff" stroke-opacity=".16" stroke-width="1.5"/>`;});
  return out+`<circle cx="300" cy="420" r="230" fill="url(#coreGlow)"/>`;
}
function waves(r:()=>number,color:string){
  const sky1=mix(color,'#050a14',.6),sky2=mix(rotateHue(color,-20),'#ffffff',.3),sun=mix(rotateHue(color,35),'#ffffff',.7);
  let out=`<defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#sea)"/><circle cx="${n(150+r()*300)}" cy="${n(250+r()*120)}" r="${n(70+r()*40)}" fill="${sun}"/>`;
  for(let k=0;k<6;k++){
    const y0=400+k*72,amp=16+r()*20,len=120+r()*100,ph=r()*Math.PI*2;let d=`M-10 ${H}`;
    for(let x=-10;x<=W+10;x+=20)d+=` L${x} ${n(y0+Math.sin(x/len*Math.PI*2+ph)*amp)}`;
    out+=`<path d="${d} L${W+10} ${H} Z" fill="${mix(color,'#000000',.15+k*.11)}" fill-opacity=".96"/>`;
  }
  return out;
}

/** A 600x840 illustration, cropped by the card to whatever window it fills. */
export function placeholderSvg(seed:string,color:string,style:ArtStyle):string{
  const r=rng(hash(`${seed}|${style}`)),base=/^#[0-9a-f]{6}$/i.test(color)?color:'#1d5c6b';
  const body=style==='geometrica'?geometric(r,base):style==='cristalli'?crystals(r,base):style==='onde'?waves(r,base):landscape(r,base);
  return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ${MARK}>${body}</svg>`;
}
const PREFIX='data:image/svg+xml;base64,';
export const placeholderDataUrl=(seed:string,color:string,style:ArtStyle)=>PREFIX+btoa(placeholderSvg(seed,color,style));
/** True for pictures made by this generator, so they can be told from real artwork. */
export function isPlaceholderArt(url:unknown):boolean{
  if(typeof url!=='string'||!url.startsWith(PREFIX))return false;
  try{return atob(url.slice(PREFIX.length)).includes(MARK);}catch{return false;}
}
