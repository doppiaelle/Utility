/** Measures a card or back as drawn and applies the print rules. Needs a browser: it lays the SVG out off screen. */
import {MM_PER_UNIT,contrastIssues,imageIssues,layoutIssues,textSizeIssues} from './preflight';
import type {Box,Issue} from './preflight';
import {isPlaceholderArt} from './placeholder';

const HEX=/^#[0-9a-f]{6}$/i,PAPER='#ece4d6';
/** The paper gradient of the boxes is the only non-flat fill that carries text. */
const resolve=(v:string|null|undefined)=>v&&HEX.test(v)?v:v==='url(#paperGrad)'?PAPER:null;
const STANDARD=/^(header|cost|effects|id|(meta|stat)-\d+)$/;
const loadImage=(src:string)=>new Promise<HTMLImageElement|null>(done=>{const im=new Image();im.onload=()=>done(im);im.onerror=()=>done(null);im.src=src;});

/** The colour of the nearest box under the text's centre. */
function background(el:Element,svg:Element,r:DOMRect):string|null{
  const cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2;
  for(let node=el.parentElement;node&&node!==svg.parentElement;node=node.parentElement){
    const shapes=Array.from(node.children).filter(c=>/^(rect|path|circle|ellipse)$/i.test(c.tagName)&&c.getAttribute('fill')&&c.getAttribute('fill')!=='none');
    for(const shape of shapes.reverse()){
      const b=shape.getBoundingClientRect();
      if(cx>=b.left&&cx<=b.right&&cy>=b.top&&cy<=b.bottom){const colour=resolve(shape.getAttribute('fill'));if(colour)return colour;}
    }
  }
  return null;
}

export async function auditMarkup(markup:string,o:{safe?:number}={}):Promise<Issue[]>{
  const safe=o.safe??30,host=document.createElement('div');
  host.style.cssText='position:fixed;left:-10000px;top:0;width:630px;height:880px;pointer-events:none;visibility:hidden';
  host.innerHTML=markup;document.body.appendChild(host);
  try{
    const svg=host.querySelector('svg');if(!svg)return[];
    const sheet=svg.getBoundingClientRect(),labelOf=(el:Element)=>el.closest('[data-live-label]')?.getAttribute('data-live-label')??'Testo';
    const sizes:{label:string;units:number}[]=[],pairs:{label:string;fg:string;bg:string}[]=[];
    for(const t of Array.from(svg.querySelectorAll('text'))){
      if(!t.textContent?.trim()||t.closest('[data-live-id="id"]'))continue; // the card code is small by convention
      const r=t.getBoundingClientRect();if(r.width<=0)continue;
      const label=labelOf(t),size=parseFloat(t.getAttribute('font-size')||'');
      if(size>0)sizes.push({label,units:size});
      const fg=resolve(t.getAttribute('fill')),bg=background(t,svg,r);if(fg&&bg)pairs.push({label,fg,bg});
    }
    const boxes:Box[]=[];
    for(const g of Array.from(svg.querySelectorAll('[data-live-id]'))){
      const id=g.getAttribute('data-live-id')||'',standard=STANDARD.test(id),freeText=/^(custom-|back-(title|subtitle))/.test(id)&&!!g.querySelector('text');
      if(!standard&&!freeText)continue;
      const r=g.getBoundingClientRect();if(r.width<=0||r.height<=0)continue;
      boxes.push({label:g.getAttribute('data-live-label')||id,l:r.left-sheet.left,t:r.top-sheet.top,r:r.right-sheet.left,b:r.bottom-sheet.top,overlap:standard});
    }
    const images:{label:string;pixels:number;widthMm:number}[]=[],extra:Issue[]=[];
    for(const im of Array.from(svg.querySelectorAll('image'))){
      const href=im.getAttribute('href')||'',label=labelOf(im);
      if(isPlaceholderArt(href)){extra.push({severity:'info',code:'placeholder',message:`${label}: è un segnaposto, da sostituire con l’illustrazione vera prima della stampa finale.`});continue;}
      if(/^data:image\/svg/.test(href))continue;
      const loaded=await loadImage(href);
      if(loaded)images.push({label,pixels:loaded.naturalWidth,widthMm:im.getBoundingClientRect().width*MM_PER_UNIT});
    }
    const artwork=svg.querySelector('[data-live-id="artwork"]');
    if(artwork&&!artwork.querySelector('image'))extra.push({severity:'info',code:'no-art',message:'Illustrazione: mancante, resta lo sfondo scuro.'});
    return[...textSizeIssues(sizes),...contrastIssues(pairs),...layoutIssues(boxes,{w:sheet.width,h:sheet.height},safe),...imageIssues(images),...extra];
  }finally{host.remove();}
}
export type AuditReport={name:string;issues:Issue[]};
export async function auditCards(list:{name:string;markup:string}[]):Promise<AuditReport[]>{
  const out:AuditReport[]=[];
  for(const c of list)out.push({name:c.name,issues:await auditMarkup(c.markup)});
  return out;
}
