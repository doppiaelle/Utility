/** Page maths for printing, kept free of the DOM so it can be tested. All sizes are millimetres. */
export const PAGES={A4:{w:210,h:297},A3:{w:297,h:420}} as const;
export type PageName=keyof typeof PAGES;
export const CARD_MM={w:63,h:88};
export type Size={w:number;h:number};

/** Cards laid edge to edge and centred, leaving the margins free for cut marks. */
export function cardSheetPlan(page:Size,card:Size=CARD_MM,margin=10){
  const cols=Math.max(0,Math.floor((page.w-2*margin)/card.w)),rows=Math.max(0,Math.floor((page.h-2*margin)/card.h));
  const gridW=cols*card.w,gridH=rows*card.h,x0=(page.w-gridW)/2,y0=(page.h-gridH)/2;
  const cells:{x:number;y:number}[]=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)cells.push({x:x0+c*card.w,y:y0+r*card.h});
  return{cols,rows,perPage:cols*rows,x0,y0,gridW,gridH,cells};
}

export type Tile={col:number;row:number;x:number;y:number;w:number;h:number};
export type TilePlan={landscape:boolean;pageW:number;pageH:number;margin:number;overlap:number;usable:Size;cols:number;rows:number;count:number;tiles:Tile[]};
/** A large sheet cut into pages that overlap by a glue strip; each tile is a window onto the sheet. */
function tilesFor(total:Size,page:Size,landscape:boolean,margin:number,overlap:number):TilePlan{
  const pageW=landscape?page.h:page.w,pageH=landscape?page.w:page.h,usable={w:pageW-2*margin,h:pageH-2*margin};
  const stepW=usable.w-overlap,stepH=usable.h-overlap;
  const cols=total.w<=usable.w?1:Math.ceil((total.w-overlap)/stepW),rows=total.h<=usable.h?1:Math.ceil((total.h-overlap)/stepH);
  const tiles:Tile[]=[];
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const x=col*stepW,y=row*stepH;tiles.push({col,row,x,y,w:Math.min(usable.w,total.w-x),h:Math.min(usable.h,total.h-y)});}
  return{landscape,pageW,pageH,margin,overlap,usable,cols,rows,count:tiles.length,tiles};
}
/** The orientation that needs fewer pages (landscape for a wide sheet when equal). */
export function bestTilePlan(total:Size,page:Size,o:{margin?:number;overlap?:number}={}):TilePlan{
  const margin=o.margin??8,overlap=Math.max(0,Math.min(40,o.overlap??10)),land=tilesFor(total,page,true,margin,overlap),port=tilesFor(total,page,false,margin,overlap);
  return port.count<land.count||(port.count===land.count&&total.h>total.w)?port:land;
}
