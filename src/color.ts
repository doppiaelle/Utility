/** Colour helpers, DOM-free so they can be tested. Colours are "#rrggbb". */
export const DARK_SURFACE='#151d24';
type Rgb=[number,number,number];
export function parseHex(hex:string):Rgb|null{
  const m=/^#([0-9a-f]{6})$/i.exec(String(hex).trim());
  return m?[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)) as Rgb:null;
}
const toHex=(c:Rgb)=>'#'+c.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex:string):number{
  const c=parseHex(hex);if(!c)return 0;
  const [r,g,b]=c.map(v=>{const x=v/255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4;});
  return .2126*r+.7152*g+.0722*b;
}
/** WCAG contrast ratio between two colours, 1 (none) to 21 (black on white). */
export function contrast(a:string,b:string):number{
  const la=luminance(a),lb=luminance(b);
  return (Math.max(la,lb)+.05)/(Math.min(la,lb)+.05);
}
/** Blends `a` towards `b` by `t` (0 keeps a, 1 gives b). */
export function mix(a:string,b:string,t:number):string{
  const x=parseHex(a),y=parseHex(b);if(!x||!y)return a;
  const k=Math.max(0,Math.min(1,t));return toHex([0,1,2].map(i=>x[i]+(y[i]-x[i])*k) as Rgb);
}
/** The colour itself when it is readable on the background, otherwise the nearest lighter (or darker) shade that is. */
export function readableOn(color:string,background:string,min=4.5):string{
  if(!parseHex(color)||!parseHex(background)||contrast(color,background)>=min)return color;
  const towards=luminance(background)<.4?'#ffffff':'#000000';
  for(let t=.05;t<=1.0001;t+=.05){const c=mix(color,towards,t);if(contrast(c,background)>=min)return c;}
  return towards;
}
/** Rotates the hue by `deg` degrees keeping saturation and lightness, for related colours of one palette. */
export function rotateHue(hex:string,deg:number):string{
  const c=parseHex(hex);if(!c)return hex;
  const [r,g,b]=c.map(v=>v/255),max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min;
  if(!d)return hex;
  const sat=l>.5?d/(2-max-min):d/(max+min);
  let h=max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4;h=((h/6*360+deg)%360+360)%360/360;
  const q=l<.5?l*(1+sat):l+sat-l*sat,p=2*l-q,f=(t:number)=>{const x=((t%1)+1)%1;return x<1/6?p+(q-p)*6*x:x<1/2?q:x<2/3?p+(q-p)*(2/3-x)*6:p;};
  return toHex([f(h+1/3)*255,f(h)*255,f(h-1/3)*255]);
}
