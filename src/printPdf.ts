import jsPDF from 'jspdf';
import {CARD_MM,PAGES,bestTilePlan,cardSheetPlan} from './print';
import type {PageName,Size} from './print';

/** Draws an SVG into a canvas of the given pixel size. */
export function rasterize(markup:string,w:number,h:number):Promise<HTMLCanvasElement>{
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml'})),im=new Image();
    im.onload=()=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d')!.drawImage(im,0,0,w,h);URL.revokeObjectURL(url);resolve(c);};
    im.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Impossibile disegnare la grafica'));};
    im.src=url;
  });
}
const jpeg=(c:HTMLCanvasElement)=>c.toDataURL('image/jpeg',.92);
/** Renders an SVG straight to a JPEG data URL, releasing the canvas. */
export async function rasterizeJpeg(markup:string,w:number,h:number):Promise<string>{const c=await rasterize(markup,w,h),data=jpeg(c);c.width=c.height=0;return data;}

/** Cut marks live in the page margins, so they never touch a card. */
function drawCardMarks(pdf:jsPDF,plan:ReturnType<typeof cardSheetPlan>){
  pdf.setDrawColor(0).setLineWidth(.15);
  const xs=Array.from({length:plan.cols+1},(_,i)=>plan.x0+i*CARD_MM.w),ys=Array.from({length:plan.rows+1},(_,i)=>plan.y0+i*CARD_MM.h),gap=1.5,len=4.5;
  for(const x of xs){pdf.line(x,plan.y0-gap-len,x,plan.y0-gap);pdf.line(x,plan.y0+plan.gridH+gap,x,plan.y0+plan.gridH+gap+len);}
  for(const y of ys){pdf.line(plan.x0-gap-len,y,plan.x0-gap,y);pdf.line(plan.x0+plan.gridW+gap,y,plan.x0+plan.gridW+gap+len,y);}
}

/** Pages of cards at true size; every image is repeated `copies` times in reading order. */
export function cardSheetPdf(parts:{image:string;copies:number}[],o:{page:PageName;marks:boolean}):jsPDF{
  const page=PAGES[o.page],plan=cardSheetPlan(page);
  if(!plan.perPage)throw new Error('La pagina è troppo piccola per una carta');
  const pdf=new jsPDF({unit:'mm',format:[page.w,page.h],orientation:'portrait',compress:true});
  const sequence=parts.flatMap((p,id)=>Array.from({length:Math.max(1,p.copies)},()=>id)),images=parts.map(p=>p.image);
  for(let i=0;i<sequence.length;i+=plan.perPage){
    if(i)pdf.addPage([page.w,page.h],'portrait');
    sequence.slice(i,i+plan.perPage).forEach((id,k)=>pdf.addImage(images[id],'JPEG',plan.cells[k].x,plan.cells[k].y,CARD_MM.w,CARD_MM.h,`card${id}`,'FAST'));
    if(o.marks)drawCardMarks(pdf,plan);
  }
  return pdf;
}

/** A large sheet split over pages: print at 100 %, trim the margins and glue along the overlaps. */
export function tilesPdf(canvas:HTMLCanvasElement,total:Size,o:{page:PageName;overlap:number}):jsPDF{
  const plan=bestTilePlan(total,PAGES[o.page],{overlap:o.overlap}),m=plan.margin,orientation=plan.landscape?'landscape':'portrait';
  const pdf=new jsPDF({unit:'mm',format:[plan.pageW,plan.pageH],orientation,compress:true}),kx=canvas.width/total.w,ky=canvas.height/total.h;
  plan.tiles.forEach((t,i)=>{
    if(i)pdf.addPage([plan.pageW,plan.pageH],orientation);
    const tile=document.createElement('canvas');tile.width=Math.round(t.w*kx);tile.height=Math.round(t.h*ky);
    tile.getContext('2d')!.drawImage(canvas,t.x*kx,t.y*ky,t.w*kx,t.h*ky,0,0,tile.width,tile.height);
    pdf.addImage(jpeg(tile),'JPEG',m,m,t.w,t.h,undefined,'FAST');
    pdf.setDrawColor(0).setLineWidth(.15);
    for(const [cx,cy,dx,dy] of [[m,m,1,1],[m+t.w,m,-1,1],[m,m+t.h,1,-1],[m+t.w,m+t.h,-1,-1]]){pdf.line(cx-dx*5,cy,cx-dx*1,cy);pdf.line(cx,cy-dy*5,cx,cy-dy*1);}
    // Dashed lines mark where the next page lies over this one.
    pdf.setLineDashPattern([1.5,1.5],0);
    if(t.col<plan.cols-1&&plan.overlap>0)pdf.line(m+plan.usable.w-plan.overlap,m,m+plan.usable.w-plan.overlap,m+t.h);
    if(t.row<plan.rows-1&&plan.overlap>0)pdf.line(m,m+plan.usable.h-plan.overlap,m+t.w,m+plan.usable.h-plan.overlap);
    pdf.setLineDashPattern([],0);
    pdf.setFontSize(8).text(`Parte ${i+1} di ${plan.count} · riga ${t.row+1}, colonna ${t.col+1} · stampa al 100%`,m,plan.pageH-3);
  });
  return pdf;
}
