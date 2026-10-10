/** Rules of the check before printing, DOM-free so they can be tested. Sizes are drawing units: 10 units = 1 mm. */
import {contrast} from './color.ts';

export type Severity='error'|'warning'|'info';
export type Issue={severity:Severity;code:string;message:string};
export const MM_PER_UNIT=.1;
/** Thresholds in typographic points, WCAG contrast ratio and dots per inch. */
export const LIMITS={errorPt:4,warnPt:6,errorContrast:3,warnContrast:4.5,lowDpi:100,minDpi:150,overlapArea:40};

export const fontPt=(units:number)=>units*MM_PER_UNIT*72/25.4;
const num=(n:number)=>String(Math.round(n*10)/10).replace('.',',');

/** One line per block, for its smallest text. */
export function textSizeIssues(items:{label:string;units:number}[]):Issue[]{
  const smallest=new Map<string,number>();
  for(const it of items)if(it.units>0)smallest.set(it.label,Math.min(smallest.get(it.label)??Infinity,it.units));
  const out:Issue[]=[];
  for(const [label,units] of smallest){
    const pt=fontPt(units);
    if(pt<LIMITS.errorPt)out.push({severity:'error',code:'text-size',message:`${label}: testo da ${num(pt)} pt, troppo piccolo per essere letto una volta stampato.`});
    else if(pt<LIMITS.warnPt)out.push({severity:'warning',code:'text-size',message:`${label}: testo da ${num(pt)} pt, sotto i ${LIMITS.warnPt} pt consigliati.`});
  }
  return out;
}
export function contrastIssues(items:{label:string;fg:string;bg:string}[]):Issue[]{
  const worst=new Map<string,number>();
  for(const it of items)worst.set(it.label,Math.min(worst.get(it.label)??Infinity,contrast(it.fg,it.bg)));
  const out:Issue[]=[];
  for(const [label,ratio] of worst){
    if(ratio<LIMITS.errorContrast)out.push({severity:'error',code:'contrast',message:`${label}: contrasto ${num(ratio)}:1 tra testo e sfondo, quasi illeggibile.`});
    else if(ratio<LIMITS.warnContrast)out.push({severity:'warning',code:'contrast',message:`${label}: contrasto ${num(ratio)}:1, sotto il 4,5:1 consigliato.`});
  }
  return out;
}
export function imageIssues(items:{label:string;pixels:number;widthMm:number}[]):Issue[]{
  const out:Issue[]=[];
  for(const it of items){
    if(!(it.pixels>0)||!(it.widthMm>0))continue;
    const dpi=it.pixels/(it.widthMm/25.4);
    if(dpi<LIMITS.lowDpi)out.push({severity:'error',code:'resolution',message:`${it.label}: ${Math.round(dpi)} dpi a questa misura, verrà molto sgranata.`});
    else if(dpi<LIMITS.minDpi)out.push({severity:'warning',code:'resolution',message:`${it.label}: ${Math.round(dpi)} dpi, sotto i ${LIMITS.minDpi} consigliati per la stampa.`});
  }
  return out;
}

export type Box={label:string;l:number;t:number;r:number;b:number;/** Compared against the other boxes that overlap too. */overlap:boolean};
/** Blocks leaving the safe margin, and standard blocks lying over each other. */
export function layoutIssues(boxes:Box[],sheet:{w:number;h:number},safe:number):Issue[]{
  const out:Issue[]=[];
  for(const b of boxes){
    if(b.r-b.l<=0||b.b-b.t<=0)continue;
    if(b.l<safe-.5||b.t<safe-.5||b.r>sheet.w-safe+.5||b.b>sheet.h-safe+.5)out.push({severity:'warning',code:'safe-zone',message:`${b.label}: esce dalla zona sicura di ${num(safe*MM_PER_UNIT)} mm dal bordo; un taglio impreciso potrebbe tagliarlo.`});
  }
  const flat=boxes.filter(b=>b.overlap&&b.r-b.l>0&&b.b-b.t>0);
  for(const [i,a] of flat.entries())for(const b of flat.slice(i+1)){
    const w=Math.min(a.r,b.r)-Math.max(a.l,b.l),h=Math.min(a.b,b.b)-Math.max(a.t,b.t);
    if(w>0&&h>0&&w*h>LIMITS.overlapArea)out.push({severity:'warning',code:'overlap',message:`«${a.label}» e «${b.label}» si sovrappongono.`});
  }
  return out;
}
export function summarize(issues:Issue[]){
  return{errors:issues.filter(i=>i.severity==='error').length,warnings:issues.filter(i=>i.severity==='warning').length,infos:issues.filter(i=>i.severity==='info').length};
}
