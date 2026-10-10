import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {BACKUP_KEYS,EXTRA_KINDS,ICONS,TEMPLATE_LIMIT,blankEdits,buildBackup,isImageSrc,normalizeEdits,normalizeTemplates,parseBackup} from './liveModel';
import type {CardLibrary,DataField,StyleGallery,ElementEdit,ExtraElement,ExtraKind,LayoutTemplate,LiveEdits} from './liveModel';
import './live.css';

type History={undo:()=>void;redo:()=>void;begin:()=>void;end:()=>void;canUndo:boolean;canRedo:boolean};
type Props={kind:'card'|'terrain';gallery?:StyleGallery;library?:CardLibrary;markup:string;width:number;height:number;edits?:LiveEdits;onChange:(edits:LiveEdits)=>void;history:History;children:(id:string)=>React.ReactNode;onAdvanced:()=>void;unitMm?:number;gridMm?:number;safeMm?:number;fields?:DataField[];extras?:ExtraElement[];onExtras:(extras:ExtraElement[],edits:LiveEdits)=>void};
type Box={x:number;y:number;w:number;h:number;matrix:string;handle?:number};
type Rect={l:number;t:number;r:number;b:number};
type Measured=Rect&{id:string;m:DOMMatrix};
// getCTM() matrices must be written as a transform list: toString() yields "[object SVGMatrix]".
const css=(m:DOMMatrix)=>`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`;
const round2=(n:number)=>Math.round(n*100)/100;
type Gesture={id:string;pointer:number;x:number;y:number;edit:ElementEdit;box:Box;mode:string;hx:number;hy:number;inverse:DOMMatrix;original?:ElementEdit;rect?:Rect;xs?:number[];ys?:number[];threshold:number;peers?:{id:string;edit:ElementEdit;original?:ElementEdit}[]};
const HANDLES:[number,number][]=[[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[0,1],[-1,0],[1,0]];
const SHAPE_KINDS:ExtraKind[]=['shape','ellipse','triangle','diamond','hexagon','star'];
const VIEW_KEY='kritoma.liveView',ZOOMS=[.25,.5,.75,1,1.5,2,3,4,6];
type View={grid:boolean;safe:boolean};
type RectMm={x:number;y:number;w:number;h:number};
const loadView=():View=>{try{const v=JSON.parse(localStorage.getItem(VIEW_KEY)||'{}');return{grid:v.grid===true,safe:v.safe===true};}catch{return{grid:false,safe:false};}};
const mm=(n:number)=>String(Math.round(n*10)/10).replace('.',',');
const TEMPLATE_KEY='kritoma.templates';
const loadTemplates=():LayoutTemplate[]=>{try{return normalizeTemplates(JSON.parse(localStorage.getItem(TEMPLATE_KEY)||'[]'))}catch{return[]}};
const scaleLimit=(n:number)=>Math.max(.1,Math.min(5,n));
/** Nearest guide within reach of any edge of the moving block. */
function nearest(edges:number[],lines:number[]|undefined,delta:number,threshold:number){
  let best:{shift:number;line:number}|undefined,distance=threshold;
  for(const line of lines??[])for(const edge of edges){const d=Math.abs(line-edge-delta);if(d<distance){distance=d;best={shift:line-edge,line};}}
  return best;
}
/** Downscale uploads (2000 px at most, less if needed) so drafts keep fitting in browser storage. */
function readImage(file:File,done:(src:string,w:number,h:number)=>void,fail:()=>void){
  const url=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{URL.revokeObjectURL(url);if(!im.naturalWidth||!im.naturalHeight){fail();return;}
    let k=Math.min(1,2000/Math.max(im.naturalWidth,im.naturalHeight));
    for(let attempt=0;attempt<7;attempt++){
      const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*k));c.height=Math.max(1,Math.round(im.naturalHeight*k));c.getContext('2d')!.drawImage(im,0,0,c.width,c.height);
      let src=c.toDataURL('image/webp',.88);if(!src.startsWith('data:image/webp'))src=c.toDataURL('image/png');
      if(isImageSrc(src)){done(src,c.width,c.height);return;}k*=.75;}
    fail();};
  im.onerror=()=>{URL.revokeObjectURL(url);fail();};im.src=url;
}
export function LiveEditor({kind,gallery,library,markup,width,height,edits:raw,onChange,history,children,onAdvanced,unitMm=.1,gridMm=5,safeMm=3,fields=[],extras=[],onExtras}:Props){
  const edits=normalizeEdits(raw),[selected,setSelected]=useState(''),[more,setMore]=useState<string[]>([]),[multi,setMulti]=useState(false),[others,setOthers]=useState<Box[]>([]),[zoom,setZoom]=useState(1),[snap,setSnap]=useState(true),[panel,setPanel]=useState(true),[box,setBox]=useState<Box|null>(null),[appearance,setAppearance]=useState<Record<string,string>>({}),[fitWidth,setFitWidth]=useState(400),[layers,setLayers]=useState<{id:string;label:string;parent:number}[]>([]),[guides,setGuides]=useState<{x?:number;y?:number}|null>(null),[notice,setNotice]=useState(''),[templates,setTemplates]=useState(loadTemplates),[tplName,setTplName]=useState(''),[tab,setTab]=useState<'element'|'style'|'cards'|'layers'|'templates'>('element'),[keepRatio,setKeepRatio]=useState(true),[cardFilter,setCardFilter]=useState(''),[includeLore,setIncludeLore]=useState(true),[importMsg,setImportMsg]=useState(''),[view,setViewState]=useState(loadView),[clean,setClean]=useState(false),[rectMm,setRectMm]=useState<RectMm|null>(null);
  const select=(id:string)=>{setSelected(id);setMore([]);};
  const group=selected?[selected,...more]:[];
  const setView=(p:Partial<View>)=>{const next={...view,...p};setViewState(next);try{localStorage.setItem(VIEW_KEY,JSON.stringify(next));}catch{/* the view is a convenience only */}};
  // Zoom keeps the point under the cursor (or the centre of the stage) where it was.
  const zoomTo=(value:number,cx?:number,cy?:number)=>{const el=stage.current,c=canvas.current;if(!el||!c)return;
    const next=Math.max(ZOOMS[0],Math.min(ZOOMS[ZOOMS.length-1],value)),r=c.getBoundingClientRect(),s=el.getBoundingClientRect(),x=cx??s.left+s.width/2,y=cy??s.top+s.height/2;
    anchor.current={fx:(x-r.left)/Math.max(1,r.width),fy:(y-r.top)/Math.max(1,r.height),x,y};setZoom(next);};
  const stepZoom=(dir:1|-1)=>{const z=zoomRef.current;zoomTo(dir>0?ZOOMS.find(v=>v>z+.001)??ZOOMS[ZOOMS.length-1]:[...ZOOMS].reverse().find(v=>v<z-.001)??ZOOMS[0]);};
  const fit=()=>{setZoom(1);stage.current?.scrollTo({left:0,top:0});};
  const stage=useRef<HTMLDivElement>(null),canvas=useRef<HTMLDivElement>(null),editor=useRef<HTMLDivElement>(null),pan=useRef<{pointer:number;x:number;y:number;left:number;top:number}|null>(null),anchor=useRef<{fx:number;fy:number;x:number;y:number}|null>(null),zoomRef=useRef(1),cardFiles=useRef<HTMLInputElement>(null),file=useRef<HTMLInputElement>(null),backupFile=useRef<HTMLInputElement>(null),fileTarget=useRef(''),gesture=useRef<Gesture|null>(null),latest=useRef({edits,onChange,history});latest.current={edits,onChange,history};zoomRef.current=zoom;
  const e=edits[selected]||{},locked=!!e.locked,item=extras.find(v=>v.id===selected),full=extras.length>=100;
  const linked=item?.kind==='text'&&item.bind?fields.find(f=>f.key===item.bind):undefined;
  const setItem=(p:Partial<ExtraElement>)=>onExtras(extras.map(v=>v.id===selected?{...v,...p}:v),edits);
  const add=(kind:ExtraKind,more:Partial<ExtraElement>={})=>{if(full)return;
    const id=`custom-${crypto.randomUUID()}`,wide=kind==='text'||kind==='shape',w=more.w??(kind==='line'?200:wide?180:120),h=more.h??(kind==='line'?20:wide?80:120);
    onExtras([...extras,{id,kind,text:kind==='text'?'Nuovo testo':'',x:Math.round(width/2-w/2),y:Math.round(height/2-h/2),w,h,...more}],edits);select(id);setPanel(true);setTab('element');};
  const remove=()=>{const next={...edits};delete next[selected];onExtras(extras.filter(v=>v.id!==selected),next);select('');};
  // The copy keeps the same geometry and pivot; only its offset differs.
  const duplicate=()=>{if(!item||full)return;const id=`custom-${crypto.randomUUID()}`;onExtras([...extras,{...item,id}],{...edits,[id]:{...e,locked:false,x:(e.x??0)+20,y:(e.y??0)+20}});select(id);};
  // Templates of both editors share one list; the other kind is kept untouched when saving.
  const storeTemplates=(next:LayoutTemplate[])=>{try{localStorage.setItem(TEMPLATE_KEY,JSON.stringify(next));setTemplates(next);setNotice('');}catch{setNotice('Spazio del browser esaurito: elimina un modello o un’immagine pesante.');}};
  const mine=templates.filter(t=>t.kind===kind);
  const saveTemplate=()=>{const name=tplName.trim().slice(0,60);if(!name)return;if(templates.length>=TEMPLATE_LIMIT){setNotice('Hai raggiunto il limite di modelli: eliminane qualcuno.');return;}
    storeTemplates([...templates,{id:`tpl-${crypto.randomUUID()}`,name,kind,liveEdits:normalizeEdits(edits),extras:[...extras]}]);setTplName('');};
  const applyTemplate=(t:LayoutTemplate)=>{onExtras(t.extras.map(v=>({...v})),normalizeEdits(t.liveEdits));select('');setTab('element');};
  const exportBackup=()=>{try{const json=buildBackup(k=>localStorage.getItem(k)),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([json],{type:'application/json'}));a.download=`kritoma-progetto-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);setNotice('');}catch{setNotice('Impossibile creare il backup: i dati del browser non sono leggibili.');}};
  // Import replaces the stored entries it contains, then reloads so both editors start from them.
  const importBackup=async(ev:React.ChangeEvent<HTMLInputElement>)=>{const f=ev.target.files?.[0];ev.target.value='';if(!f)return;
    const result=parseBackup(await f.text());if(!result.ok){setNotice(result.error);return;}
    const {cards,terrain,draft,templates:n,decks}=result.summary;
    if(!window.confirm(`Importare il backup? Sostituisce i dati salvati in questo browser: ${cards} carte, ${draft?'bozza carta, ':''}${terrain?'terreno, ':''}${decks?`${decks} mazzi, `:''}${n} modelli.`))return;
    const before=Object.fromEntries(BACKUP_KEYS.map(k=>[k,localStorage.getItem(k)]));
    try{for(const [k,v] of Object.entries(result.entries))localStorage.setItem(k,v);}catch{for(const [k,v] of Object.entries(before)){try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch{/* best effort */}}setNotice('Spazio del browser insufficiente: importazione annullata, i dati precedenti sono intatti.');return;}
    window.location.reload();};
  const blank=()=>{onExtras([],blankEdits(layers.map(l=>l.id),edits));select('');setTab('element');};
  const pickImage=(target:string)=>{fileTarget.current=target;file.current?.click();};
  const tooBig=()=>setNotice('Immagine non leggibile o troppo pesante: prova con un file più piccolo.');
  // Pictures arrive from the toolbar, a drop or a paste; the box keeps the picture's own proportions.
  const insertImage=(f:File,at?:{x:number;y:number})=>{setNotice('');
    readImage(f,(src,w,h)=>{const k=Math.min(1,width*.5/w,height*.5/h),bw=Math.max(10,Math.round(w*k)),bh=Math.max(10,bw*h/w);
      add('image',{src,w:bw,h:bh,nw:w,nh:h,...(at?{x:Math.round(at.x-bw/2),y:Math.round(at.y-bh/2)}:{})});},tooBig);};
  const insertRef=useRef(insertImage);insertRef.current=insertImage;
  const onFile=(ev:React.ChangeEvent<HTMLInputElement>)=>{const f=ev.target.files?.[0];ev.target.value='';if(!f)return;setNotice('');
    if(fileTarget.current)readImage(f,(src,w,h)=>setItem({src,nw:w,nh:h}),tooBig);else insertImage(f);};
  const pointAt=(x:number,y:number)=>{const m=canvas.current?.querySelector('svg')?.getScreenCTM();if(!m)return undefined;const p=new DOMPoint(x,y).matrixTransform(m.inverse());return p.x>=0&&p.y>=0&&p.x<=width&&p.y<=height?{x:p.x,y:p.y}:undefined;};
  const dropImage=(ev:React.DragEvent)=>{const f=Array.from(ev.dataTransfer.files).find(v=>v.type.startsWith('image/'));if(!f)return;ev.preventDefault();fileTarget.current='';insertImage(f,pointAt(ev.clientX,ev.clientY));};
  useEffect(()=>{const paste=(ev:ClipboardEvent)=>{if(!editor.current?.contains(document.activeElement)||/INPUT|TEXTAREA|SELECT/.test((document.activeElement as Element).tagName))return;
    const f=Array.from(ev.clipboardData?.files??[]).find(v=>v.type.startsWith('image/'));if(!f)return;ev.preventDefault();fileTarget.current='';insertRef.current(f);};
    window.addEventListener('paste',paste);return()=>window.removeEventListener('paste',paste);},[]);
  // Real measures: the box takes the new size and the scale handles reset, so mm stay honest.
  const sizeBox=(dw:number,dh:number,cx?:number,cy?:number,patchEdit:Partial<ElementEdit>={})=>{if(!item)return;
    const mx=cx??item.x+item.w/2,my=cy??item.y+item.h/2,w2=Math.max(10,Math.min(3200,dw)),h2=Math.max(10,Math.min(3200,dh));
    onExtras(extras.map(v=>v.id===item.id?{...v,x:mx-w2/2,y:my-h2/2,w:w2,h:h2}:v),{...edits,[item.id]:{...e,sx:1,sy:1,cx:mx,cy:my,...patchEdit}});};
  const shownW=item?item.w*(e.sx??1):0,shownH=item?item.h*(e.sy??1):0,natural=item?.nw&&item?.nh?item.nw/item.nh:shownH?shownW/shownH:1;
  const setMm=(axis:'w'|'h',valueMm:number)=>{if(!item||!(valueMm>0))return;const units=valueMm/unitMm,ratio=shownW/Math.max(1,shownH);
    if(axis==='w')sizeBox(units,keepRatio?units/ratio:shownH);else sizeBox(keepRatio?units*ratio:shownW,units);};
  const fitSheet=(cover:boolean)=>{const w2=cover?Math.max(width,height*natural):Math.min(width,height*natural);sizeBox(w2,w2/natural,width/2,height/2,{x:0,y:0});};
  const dpi=item?.nw&&shownW>0?item.nw/(shownW*unitMm/25.4):0;
  const mmField=(label:string,axis:'w'|'h',value:number)=><label>{label}<input type="number" min={.5} max={2000} step={.5} value={Number((value*unitMm).toFixed(2))} disabled={locked} onChange={ev=>{if(ev.target.value!==''&&Number.isFinite(ev.target.valueAsNumber))setMm(axis,ev.target.valueAsNumber);}}/></label>;
  const patch=(p:Partial<ElementEdit>)=>onChange({...edits,[selected]:{...e,...p,...(box?{cx:box.x+box.w/2,cy:box.y+box.h/2}:{})}});
  const measure=()=>{const svg=canvas.current?.querySelector('svg'),nodes=svg?.querySelectorAll<SVGGElement>('[data-live-id]');
    if(!svg||!nodes)return;const parents=new Map<Node,number>();
    setLayers(Array.from(nodes).map(n=>{if(!parents.has(n.parentNode!))parents.set(n.parentNode!,parents.size);return{id:n.dataset.liveId!,label:n.dataset.liveLabel!,parent:parents.get(n.parentNode!)!};}));
    setOthers(more.flatMap(id=>{const n=Array.from(nodes).find(v=>v.dataset.liveId===id);if(!n)return[];try{const b=n.getBBox(),root=svg.getCTM(),m=n.getCTM();return[{x:b.x,y:b.y,w:b.width,h:b.height,matrix:root&&m?css(root.inverse().multiply(m)):''}];}catch{return[];}}));
    const node=Array.from(nodes).find(n=>n.dataset.liveId===selected);if(!node){setBox(null);setRectMm(null);return;}
    const own=Array.from(node.querySelectorAll('*')).filter(n=>n.closest('[data-live-id]')===node),shape=own.find(n=>n.hasAttribute('fill')&&n.getAttribute('fill')!=='none'&&n.tagName!=='text'&&n.tagName!=='tspan'),border=own.find(n=>n.hasAttribute('stroke')),text=own.find(n=>n.tagName==='text'),rect=own.find(n=>n.tagName==='rect'&&n.hasAttribute('rx'));setAppearance({hasShape:String(!!shape),hasBorder:String(!!border),hasText:String(!!text),hasRadius:String(!!rect),fill:shape?.getAttribute('fill')||'#18232b',stroke:border?.getAttribute('stroke')||'#eee6da',strokeWidth:border?.getAttribute('stroke-width')||'1.5',radius:rect?.getAttribute('rx')||'0',textColor:text?.getAttribute('fill')||'#213749',fontSize:text?.getAttribute('font-size')||'16',fontWeight:text?.getAttribute('font-weight')||'700',letterSpacing:text?.getAttribute('letter-spacing')||'0'});
    try{const b=node.getBBox(),root=svg.getCTM(),m=node.getCTM();setBox({x:b.x,y:b.y,w:b.width,h:b.height,matrix:root&&m?css(root.inverse().multiply(m)):'',handle:m?14/Math.max(.01,Math.hypot(m.a,m.b)):14});const rr=node.getBoundingClientRect(),inv=svg.getScreenCTM()!.inverse(),p0=new DOMPoint(rr.left,rr.top).matrixTransform(inv),p1=new DOMPoint(rr.right,rr.bottom).matrixTransform(inv);setRectMm({x:p0.x*unitMm,y:p0.y*unitMm,w:(p1.x-p0.x)*unitMm,h:(p1.y-p0.y)*unitMm});}catch{setBox(null);setRectMm(null);}
  };
  useLayoutEffect(measure,[markup,selected,more,zoom]);
  useEffect(()=>{const resize=new ResizeObserver(()=>{const el=stage.current;if(el)setFitWidth(Math.max(100,Math.min(el.clientWidth-28,(el.clientHeight-28)*width/height)));measure();});if(stage.current)resize.observe(stage.current);return()=>resize.disconnect();},[selected,more,width,height,panel]);
  // Guides are measured in drawing units, so they apply only where the block's parent is not itself scaled or rotated.
  const collectGuides=(g:Gesture,node:SVGGElement)=>{
    const svg=canvas.current!.querySelector('svg')!,toRoot=svg.getScreenCTM()!.inverse(),rel=toRoot.multiply((node.parentElement as unknown as SVGGraphicsElement).getScreenCTM()!);
    if(Math.abs(rel.a-1)>.001||Math.abs(rel.d-1)>.001||Math.abs(rel.b)>.001||Math.abs(rel.c)>.001)return;
    const rect=(n:Element):Rect=>{const r=n.getBoundingClientRect(),a=new DOMPoint(r.left,r.top).matrixTransform(toRoot),b=new DOMPoint(r.right,r.bottom).matrixTransform(toRoot);return{l:a.x,t:a.y,r:b.x,b:b.y};};
    g.rect=rect(node);g.xs=[0,width/2,width];g.ys=[0,height/2,height];g.threshold=6*toRoot.a;
    svg.querySelectorAll<SVGGElement>('[data-live-id]').forEach(n=>{if(n===node||n.contains(node)||node.contains(n))return;const r=rect(n);if(r.r-r.l<=0&&r.b-r.t<=0)return;g.xs!.push(r.l,(r.l+r.r)/2,r.r);g.ys!.push(r.t,(r.t+r.b)/2,r.b);});
  };
  useLayoutEffect(()=>{const a=anchor.current,el=stage.current,c=canvas.current;if(!a||!el||!c)return;anchor.current=null;
    const r=c.getBoundingClientRect();el.scrollLeft+=r.left+a.fx*r.width-a.x;el.scrollTop+=r.top+a.fy*r.height-a.y;},[zoom]);
  useEffect(()=>{const el=stage.current;if(!el)return;
    const wheel=(ev:WheelEvent)=>{if(!(ev.ctrlKey||ev.metaKey))return;ev.preventDefault();zoomTo(zoomRef.current*Math.exp(-ev.deltaY*.002),ev.clientX,ev.clientY);};
    el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);},[]);
  // Empty background or the middle button pans the view; touch keeps native scrolling.
  const panStart=(ev:React.PointerEvent)=>{const el=stage.current;if(!el||ev.pointerType==='touch')return;
    if(!(ev.button===1||(ev.button===0&&ev.target===el)))return;
    if(ev.button===0&&!(ev.shiftKey||ev.ctrlKey||ev.metaKey||multi))select('');
    pan.current={pointer:ev.pointerId,x:ev.clientX,y:ev.clientY,left:el.scrollLeft,top:el.scrollTop};el.focus();el.setPointerCapture(ev.pointerId);ev.preventDefault();};
  const panMove=(ev:React.PointerEvent)=>{const p=pan.current,el=stage.current;if(!p||!el||p.pointer!==ev.pointerId)return;el.scrollLeft=p.left-(ev.clientX-p.x);el.scrollTop=p.top-(ev.clientY-p.y);};
  const panEnd=(ev:React.PointerEvent)=>{if(pan.current?.pointer===ev.pointerId)pan.current=null;};
  const start=(ev:React.PointerEvent,mode='move',hx=0,hy=0)=>{
    if(ev.button!==0)return;
    const additive=mode==='move'&&(ev.shiftKey||ev.ctrlKey||ev.metaKey||multi);
    const target=(ev.target as Element).closest('[data-live-id]') as SVGGElement|null,id=mode==='move'?target?.dataset.liveId:selected;
    if(!id){if(!additive)select('');return;}
    if(additive){toggle(id);setPanel(true);setTab('element');return;}
    if(!(mode==='move'&&group.length>1&&group.includes(id)))select(id);setPanel(true);setTab('element');
    const node=Array.from(canvas.current!.querySelectorAll<SVGGElement>('[data-live-id]')).find(n=>n.dataset.liveId===id);
    if(!node||edits[id]?.locked)return;
    const b=node.getBBox(),inverse=(node.parentElement as unknown as SVGGraphicsElement).getScreenCTM()!.inverse(),p=new DOMPoint(ev.clientX,ev.clientY).matrixTransform(inverse);gesture.current={id,pointer:ev.pointerId,x:p.x,y:p.y,edit:{...edits[id],cx:b.x+b.width/2,cy:b.y+b.height/2},box:{x:b.x,y:b.y,w:b.width,h:b.height,matrix:''},mode,hx,hy,inverse,original:edits[id],threshold:0};
    if(mode==='move'&&group.length>1&&group.includes(id))gesture.current.peers=group.filter(i=>i!==id&&!edits[i]?.locked).map(i=>({id:i,edit:{...edits[i]},original:edits[i]}));
    else if(mode==='move'&&snap)collectGuides(gesture.current,node);
    history.begin();ev.currentTarget.setPointerCapture(ev.pointerId);ev.preventDefault();
  };
  const move=(ev:React.PointerEvent)=>{const g=gesture.current;if(!g||g.pointer!==ev.pointerId)return;const p=new DOMPoint(ev.clientX,ev.clientY).matrixTransform(g.inverse),dx=p.x-g.x,dy=p.y-g.y,base=g.edit;
    const round=(n:number)=>snap?Math.round(n/5)*5:n;let change:ElementEdit;
    if(g.mode==='resize'){
      // The opposite side stays where it is: the pivot moves by half of the size change.
      const angle=(base.rotation??0)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),localX=dx*cos+dy*sin,localY=-dx*sin+dy*cos,w=Math.max(1,g.box.w),h=Math.max(1,g.box.h),sx0=base.sx??1,sy0=base.sy??1;
      const sx=g.hx?scaleLimit(sx0+g.hx*localX/w):sx0;let sy=g.hy?scaleLimit(sy0+g.hy*localY/h):sy0;if(ev.shiftKey&&g.hx&&g.hy)sy=scaleLimit(sy0*sx/sx0);
      const lx=g.hx*(sx-sx0)*w/2,ly=g.hy*(sy-sy0)*h/2;change={sx,sy,x:(base.x??0)+lx*cos-ly*sin,y:(base.y??0)+lx*sin+ly*cos};}
    else if(g.mode==='rotate'){const cx=(base.cx??0)+(base.x??0),cy=(base.cy??0)+(base.y??0),angle=(Math.atan2(p.y-cy,p.x-cx)-Math.atan2(g.y-cy,g.x-cx))*180/Math.PI+(base.rotation??0);const turned=snap?Math.round(angle/15)*15:angle;change={rotation:((turned+180)%360+360)%360-180};}
    else{const r=g.rect,gx=r&&nearest([r.l,(r.l+r.r)/2,r.r],g.xs,dx,g.threshold),gy=r&&nearest([r.t,(r.t+r.b)/2,r.b],g.ys,dy,g.threshold);
      change={x:gx?(base.x??0)+gx.shift:round((base.x??0)+dx),y:gy?(base.y??0)+gy.shift:round((base.y??0)+dy)};setGuides(gx||gy?{x:gx?.line,y:gy?.line}:null);}
    const current=latest.current,next={...current.edits,[g.id]:{...base,...change}};
    // Peers follow the primary block by the same applied offset, guides and snapping included.
    if(g.peers&&change.x!==undefined&&change.y!==undefined){const mx=change.x-(base.x??0),my=change.y-(base.y??0);for(const q of g.peers)next[q.id]={...q.edit,x:round2((q.edit.x??0)+mx),y:round2((q.edit.y??0)+my)};}
    current.onChange(next);
  };
  const finish=(ev:React.PointerEvent,cancel=false)=>{const g=gesture.current;if(!g||g.pointer!==ev.pointerId)return;if(cancel){const next={...latest.current.edits};for(const q of [{id:g.id,original:g.original},...(g.peers??[])]){if(q.original)next[q.id]=q.original;else delete next[q.id];}latest.current.onChange(next);}gesture.current=null;setGuides(null);history.end();};
  useEffect(()=>{const key=(ev:KeyboardEvent)=>{if(!editor.current?.contains(document.activeElement)||/INPUT|TEXTAREA|SELECT/.test((ev.target as Element).tagName))return;
    const h=latest.current.history;if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='z'){ev.preventDefault();ev.shiftKey?h.redo():h.undo();return;}
    if(ev.key==='Escape'){select('');return;}
    if((ev.ctrlKey||ev.metaKey)&&ev.key==='0'){ev.preventDefault();fit();return;}
    if((ev.ctrlKey||ev.metaKey)&&(ev.key==='+'||ev.key==='=')){ev.preventDefault();stepZoom(1);return;}
    if((ev.ctrlKey||ev.metaKey)&&ev.key==='-'){ev.preventDefault();stepZoom(-1);return;}
    if(!ev.ctrlKey&&!ev.metaKey&&!ev.altKey&&ev.key.toLowerCase()==='g'){setView({grid:!view.grid});return;}
    if(!selected||locked)return;
    if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='d'&&item){ev.preventDefault();duplicate();return;}
    const delta=ev.shiftKey?10:1;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key)){ev.preventDefault();nudge(ev.key==='ArrowRight'?delta:ev.key==='ArrowLeft'?-delta:0,ev.key==='ArrowDown'?delta:ev.key==='ArrowUp'?-delta:0);}
    if(ev.key==='Delete'||ev.key==='Backspace'){ev.preventDefault();more.length?deleteGroup():item?remove():patch({hidden:true});}
  };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[selected,more,e,box,locked,extras,view]);
  const toggle=(id:string)=>{if(!selected){select(id);return;}
    if(id===selected){if(more.length){setSelected(more[0]);setMore(more.slice(1));}else select('');return;}
    setMore(more.includes(id)?more.filter(v=>v!==id):[...more,id]);};
  const nudge=(dx:number,dy:number)=>{if(!more.length){patch({x:(e.x??0)+dx,y:(e.y??0)+dy});return;}
    const next={...edits};for(const id of group)if(!edits[id]?.locked)next[id]={...edits[id],x:(edits[id]?.x??0)+dx,y:(edits[id]?.y??0)+dy};onChange(next);};
  // Rectangles in drawing units plus the parent matrix, so shifts stay correct inside scaled groups.
  const measureIds=(ids:string[]):Measured[]=>{const svg=canvas.current?.querySelector('svg');if(!svg)return[];
    const toRoot=svg.getScreenCTM()!.inverse(),nodes=Array.from(svg.querySelectorAll<SVGGElement>('[data-live-id]'));
    return ids.flatMap(id=>{const n=nodes.find(v=>v.dataset.liveId===id);if(!n||edits[id]?.locked||edits[id]?.hidden)return[];const r=n.getBoundingClientRect();if(!r.width&&!r.height)return[];
      const a=new DOMPoint(r.left,r.top).matrixTransform(toRoot),b=new DOMPoint(r.right,r.bottom).matrixTransform(toRoot),m=toRoot.multiply((n.parentElement as unknown as SVGGraphicsElement).getScreenCTM()!).inverse();
      return[{id,l:a.x,t:a.y,r:b.x,b:b.y,m}];});};
  const shiftBy=(next:LiveEdits,r:Measured,dx:number,dy:number)=>{next[r.id]={...next[r.id],x:round2((next[r.id]?.x??0)+r.m.a*dx+r.m.c*dy),y:round2((next[r.id]?.y??0)+r.m.b*dx+r.m.d*dy)};};
  // One block aligns to the sheet; several align to the bounds of the selection.
  const align=(axis:'x'|'y',pos:number)=>{const rs=measureIds(group);if(!rs.length)return;
    const lo=(r:Measured)=>axis==='x'?r.l:r.t,hi=(r:Measured)=>axis==='x'?r.r:r.b,together=rs.length>1,from=together?Math.min(...rs.map(lo)):0,to=together?Math.max(...rs.map(hi)):axis==='x'?width:height,next={...edits};
    for(const r of rs){const d=from+(to-from-(hi(r)-lo(r)))*pos-lo(r);shiftBy(next,r,axis==='x'?d:0,axis==='y'?d:0);}onChange(next);};
  const distribute=(axis:'x'|'y')=>{const rs=measureIds(group);if(rs.length<3)return;
    const lo=(r:Measured)=>axis==='x'?r.l:r.t,hi=(r:Measured)=>axis==='x'?r.r:r.b,sorted=[...rs].sort((p,q)=>lo(p)+hi(p)-lo(q)-hi(q)),end=Math.max(...sorted.map(hi)),gap=(end-lo(sorted[0])-sorted.reduce((t,r)=>t+hi(r)-lo(r),0))/(sorted.length-1),next={...edits};let cursor=lo(sorted[0]);
    for(const r of sorted){const d=cursor-lo(r);shiftBy(next,r,axis==='x'?d:0,axis==='y'?d:0);cursor+=hi(r)-lo(r)+gap;}onChange(next);};
  const setGroup=(p:Partial<ElementEdit>)=>{const next={...edits};for(const id of group)next[id]={...edits[id],...p};onChange(next);};
  const deleteGroup=()=>{const next={...edits},gone=new Set(group.filter(id=>!edits[id]?.locked&&extras.some(v=>v.id===id)));
    for(const id of group){if(gone.has(id))delete next[id];else if(!edits[id]?.locked)next[id]={...edits[id],hidden:true};}
    onExtras(extras.filter(v=>!gone.has(v.id)),next);select('');};
  // DOM order is paint order: moving a block "forward" swaps it with the next sibling that shares its parent.
  const moveLayer=(id:string,dir:1|-1)=>{const me=layers.find(l=>l.id===id);if(!me)return;const sib=layers.filter(l=>l.parent===me.parent).map(l=>l.id),i=sib.indexOf(id),j=i+dir;if(j<0||j>=sib.length)return;
    [sib[i],sib[j]]=[sib[j],sib[i]];const next={...edits};sib.forEach((sid,k)=>{if((edits[sid]?.order??0)!==k)next[sid]={...edits[sid],order:k};});onChange(next);};
  const rowClick=(ev:React.MouseEvent,id:string)=>{if(ev.shiftKey||ev.ctrlKey||ev.metaKey)toggle(id);else select(id);setPanel(true);};
  const hs=box?.handle??10;
  const number=(label:string,key:keyof ElementEdit,value:number,min:number,max:number,step=1)=><label>{label}<input type="number" value={Number(value.toFixed(2))} min={min} max={max} step={step} disabled={locked} onChange={ev=>{if(ev.target.value!==''&&Number.isFinite(ev.target.valueAsNumber))patch({[key]:Math.max(min,Math.min(max,ev.target.valueAsNumber))});}}/></label>;
  const color=(label:string,key:keyof ElementEdit,fallback:string)=><label>{label}<input type="color" value={String(e[key]??(/^#[0-9a-f]{6}$/i.test(appearance[key]||'')?appearance[key]:fallback))} disabled={locked} onChange={ev=>patch({[key]:ev.target.value})}/></label>;
  return <div className="liveEditor" ref={editor}>
    <div className="liveToolbar" role="toolbar" aria-label="Strumenti di modifica"><button onClick={history.undo} disabled={!history.canUndo} aria-label="Annulla">↶</button><button onClick={history.redo} disabled={!history.canRedo} aria-label="Ripeti">↷</button><div className="liveGroup" role="group" aria-label="Zoom"><button aria-label="Riduci zoom" title="Riduci (Ctrl/Cmd −)" onClick={()=>stepZoom(-1)} disabled={zoom<=ZOOMS[0]}>−</button><select aria-label="Zoom grafica" value={zoom} onChange={ev=>zoomTo(Number(ev.target.value))}>{(ZOOMS.includes(zoom)?ZOOMS:[...ZOOMS,zoom].sort((p,q)=>p-q)).map(z=><option key={z} value={z}>{z===1?'Adatta':`${Math.round(z*100)}%`}</option>)}</select><button aria-label="Aumenta zoom" title="Ingrandisci (Ctrl/Cmd +, o Ctrl + rotella)" onClick={()=>stepZoom(1)} disabled={zoom>=ZOOMS[ZOOMS.length-1]}>+</button><button aria-label="Adatta allo spazio" title="Adatta allo spazio (Ctrl/Cmd 0)" onClick={fit}>⤢</button></div><label className="liveSnap"><input type="checkbox" checked={snap} onChange={ev=>setSnap(ev.target.checked)}/>Allinea</label><div className="liveGroup" role="group" aria-label="Guide di lavoro"><button aria-pressed={view.grid} title={`Griglia da ${gridMm} mm (G)`} onClick={()=>setView({grid:!view.grid})}>Griglia</button><button aria-pressed={view.safe} title={`Zona sicura: ${safeMm} mm dal bordo`} onClick={()=>setView({safe:!view.safe})}>Zona sicura</button><button aria-pressed={clean} title="Nasconde selezione, maniglie e guide per vedere il risultato" onClick={()=>{setClean(v=>!v);}}>Anteprima pulita</button></div><button onClick={()=>setPanel(v=>!v)} aria-expanded={panel}>Elementi</button><button aria-pressed={multi} onClick={()=>setMulti(v=>!v)} title="Tocca più blocchi per selezionarli insieme">Selezione multipla</button><button disabled={full} onClick={()=>add('text')}>+ Testo</button><button disabled={full} onClick={()=>add('shape')}>+ Forma</button><button disabled={full} onClick={()=>pickImage('')}>+ Immagine</button><select className="liveAdd" aria-label="Aggiungi un altro elemento" disabled={full} value="" onChange={ev=>{const kind=ev.target.value as ExtraKind;if(kind==='image')pickImage('');else if(kind)add(kind,kind==='icon'?{icon:'star'}:{});}}><option value="">+ Altro…</option>{(['ellipse','line','triangle','diamond','hexagon','star','image','icon'] as ExtraKind[]).map(k=><option key={k} value={k}>{EXTRA_KINDS[k]}</option>)}</select><input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onFile}/><button onClick={()=>{if(panel&&tab==='templates')setPanel(false);else{setPanel(true);setTab('templates');}}} aria-pressed={panel&&tab==='templates'}>Modelli</button><button onClick={onAdvanced}>Avanzate</button></div>
    {notice&&<p className="liveNotice" role="alert">{notice}</p>}
    <div className="liveBody"><div className="liveStage" ref={stage} tabIndex={0} aria-label="Area di modifica: seleziona un elemento e usa le frecce per spostarlo" onPointerDown={panStart} onPointerMove={panMove} onPointerUp={panEnd} onPointerCancel={panEnd} onDragOver={ev=>{if(ev.dataTransfer.types.includes('Files'))ev.preventDefault();}} onDrop={dropImage}>
      <div className="liveCanvas" ref={canvas} style={{width:`${fitWidth*zoom}px`,maxWidth:'none',aspectRatio:`${width}/${height}`}} onPointerDown={start} onPointerMove={move} onPointerUp={ev=>finish(ev)} onPointerCancel={ev=>finish(ev,true)} onLostPointerCapture={ev=>finish(ev,true)} onDoubleClick={()=>editor.current?.querySelector<HTMLTextAreaElement>('.liveContent textarea')?.focus()}>
        <div className="liveArtwork" dangerouslySetInnerHTML={{__html:markup}}/>
        <svg className="liveOverlay" viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={clean?{display:'none'}:undefined}>{view.grid&&<><defs><pattern id="liveGridPattern" width={gridMm/unitMm} height={gridMm/unitMm} patternUnits="userSpaceOnUse"><path className="liveGridLine" d={`M${gridMm/unitMm} 0H0V${gridMm/unitMm}`}/></pattern></defs><rect width={width} height={height} fill="url(#liveGridPattern)"/></>}{view.safe&&<rect className="liveSafe" x={safeMm/unitMm} y={safeMm/unitMm} width={width-2*safeMm/unitMm} height={height-2*safeMm/unitMm}/>}{others.map((o,i)=><g key={i} transform={o.matrix}><rect className="liveSelection liveSecondary" x={o.x} y={o.y} width={o.w} height={o.h}/></g>)}{box&&!e.hidden&&<g transform={box.matrix}><rect className="liveSelection" x={box.x} y={box.y} width={box.w} height={box.h}/>{!locked&&!more.length&&<>{HANDLES.filter(([hx,hy])=>hx&&hy?(hx===1&&hy===1)||(box.w>hs*6&&box.h>hs*4):hx?box.w>hs*5&&(hx===-1||box.h>hs*7):box.w>hs*7&&box.h>hs*5).map(([hx,hy])=>{const s=hx&&hy?hs:hs*.6;return <rect key={`${hx},${hy}`} className="liveHandle" data-live-handle={hx===1&&hy===1?'resize':`resize-${hx}-${hy}`} data-dir={hx&&hy?(hx===hy?'nwse':'nesw'):hx?'ew':'ns'} x={box.x+box.w*(hx+1)/2-s} y={box.y+box.h*(hy+1)/2-s} width={s*2} height={s*2} onPointerDown={ev=>{ev.stopPropagation();start(ev,'resize',hx,hy);}}/>;})}<line className="liveSelection" x1={box.x+box.w/2} x2={box.x+box.w/2} y1={box.y} y2={box.y-hs*3}/><circle className="liveHandle" data-live-handle="rotate" cx={box.x+box.w/2} cy={box.y-hs*3} r={hs} onPointerDown={ev=>{ev.stopPropagation();start(ev,'rotate');}}/></>}</g>}{guides?.x!==undefined&&<line className="liveGuide" x1={guides.x} x2={guides.x} y1={0} y2={height}/>}{guides?.y!==undefined&&<line className="liveGuide" x1={0} x2={width} y1={guides.y} y2={guides.y}/>}</svg>
      </div>
    </div>{panel&&<aside className="liveInspector" aria-label="Elemento selezionato"><label>Seleziona un elemento<select aria-label="Seleziona un elemento" value={selected} onChange={ev=>select(ev.target.value)}><option value="">Scegli dalla grafica o dall’elenco</option>{layers.map(l=><option key={l.id} value={l.id}>{l.label}{edits[l.id]?.hidden?' · nascosto':''}{edits[l.id]?.locked?' · bloccato':''}</option>)}</select></label>
      <div className="liveTabs" role="tablist" aria-label="Pannello">{([['element','Elemento'],...(gallery?[['style','Stile']]:[]),...(library?[['cards','Carte']]:[]),['layers','Livelli'],['templates','Modelli']] as ['element'|'style'|'cards'|'layers'|'templates',string][]).map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</div>
      {more.length>0&&<div className="liveSelBar"><strong>{group.length} elementi selezionati</strong><button aria-label="Deseleziona" onClick={()=>select('')}>×</button></div>}
      {tab==='style'&&gallery&&<div className="liveStyle"><h4>{gallery.layoutTitle}</h4><div className="liveThumbs">{gallery.layouts.map(l=><button key={l.id} aria-label={`Impostazione ${l.label}`} aria-pressed={gallery.active===l.id} title={l.note} onClick={()=>gallery.onLayout(l.id)}><span className="liveThumb" style={{aspectRatio:`${width}/${height}`}} dangerouslySetInnerHTML={{__html:l.thumb.replace(/ data-live-(?:id|label)="[^"]*"/g,'')}}/><b>{l.label}</b></button>)}</div><small>{gallery.layouts.find(l=>l.id===gallery.active)?.note}. Cambiare impostazione riporta i blocchi alle posizioni dell’impostazione; colori, testi e visibilità restano.</small>
        <h4>Tema</h4><div className="liveThemes">{gallery.themes.map(t=><button key={t.id} aria-label={`Tema ${t.label}`} onClick={()=>gallery.onTheme(t.id)}><span className="liveSwatches" aria-hidden="true">{t.colors.map(c=><i key={c} style={{background:c}}/>)}</span><b>{t.label}</b></button>)}</div><small>Il tema cambia colori, cornice e caratteri; lo stesso tema si applica a carta e terreno.</small></div>}
      {tab==='cards'&&library&&(()=>{const q=cardFilter.trim().toLowerCase(),shown=library.items.filter(it=>!q||`${it.name} ${it.scope} ${it.type}`.toLowerCase().includes(q)),total=library.items.reduce((n,it)=>n+it.copies,0);
        return <div className="liveCards"><div className="liveActions"><button onClick={library.onNew}>Nuova carta</button><button onClick={()=>cardFiles.current?.click()}>Importa carte (JSON)…</button><input ref={cardFiles} type="file" accept="application/json,.json" multiple hidden onChange={async ev=>{const files=Array.from(ev.target.files??[]);ev.target.value='';if(!files.length)return;setImportMsg('Importazione in corso…');setImportMsg(await library.onImport(files,{includeLore}));}}/></div>
        <label className="liveCheck"><input type="checkbox" checked={includeLore} onChange={ev=>setIncludeLore(ev.target.checked)}/>Aggiungi la lore al riquadro di testo</label>
        {importMsg&&<p className="liveImportMsg" role="status">{importMsg}</p>}
        {library.current&&(library.current.rules.length>0||library.current.lore||library.current.artPrompt)&&<details className="liveRules" open><summary>Dati del gioco · {library.current.name}</summary>
          {library.current.rules.length>0&&<dl>{library.current.rules.map(r=><React.Fragment key={r.label}><dt>{r.label}</dt><dd>{r.text}</dd></React.Fragment>)}</dl>}
          {library.current.lore&&<p><b>Lore:</b> <i>{library.current.lore}</i></p>}{library.current.artPrompt&&<p><b>Illustrazione:</b> {library.current.artPrompt}</p>}
          <small>Questi dati vengono dal file della carta e restano salvati con essa; non compaiono sulla carta.</small></details>}
        <input aria-label="Cerca una carta" placeholder="Cerca per nome, disciplina o tipo" value={cardFilter} onChange={ev=>setCardFilter(ev.target.value)}/>
        <small>{library.items.length} {library.items.length===1?'carta':'carte'} salvate · {total} {total===1?'copia':'copie'} in totale. Aprire una carta sostituisce quella in modifica (Ctrl/Cmd+Z per tornare indietro).</small>
        {shown.length?<ul>{shown.map(it=><li key={it.id} className={it.active?'isSelected':''}><button className="liveCardName" aria-pressed={it.active} onClick={()=>library.onOpen(it.id)}><b>{it.name}</b><i>{it.type} · {it.scope} · ×{it.copies}</i></button><button aria-label={`Duplica la carta ${it.name}`} title="Duplica" onClick={()=>library.onDuplicate(it.id)}>⧉</button><button aria-label={`Elimina la carta ${it.name}`} title="Elimina dalla raccolta" onClick={()=>library.onDelete(it.id)}>×</button></li>)}</ul>:<p>{library.items.length?'Nessuna carta corrisponde alla ricerca.':'Nessuna carta salvata. Usa “Salva” in basso oppure importa i file del tuo gioco.'}</p>}</div>;})()}
      {tab==='layers'&&<div className="liveLayers"><ol>{[...layers].reverse().map(l=>{const sib=layers.filter(v=>v.parent===l.parent),at=sib.findIndex(v=>v.id===l.id),ed=edits[l.id]||{};
        return <li key={l.id} className={group.includes(l.id)?'isSelected':''}><button className="liveLayerName" aria-pressed={group.includes(l.id)} onClick={ev=>rowClick(ev,l.id)}>{l.label}</button>{ed.locked&&<i>bloccato</i>}<button aria-label={`Porta avanti: ${l.label}`} disabled={at>=sib.length-1} onClick={()=>moveLayer(l.id,1)}>▲</button><button aria-label={`Porta indietro: ${l.label}`} disabled={at<=0} onClick={()=>moveLayer(l.id,-1)}>▼</button><button aria-label={`${ed.hidden?'Mostra':'Nascondi'}: ${l.label}`} aria-pressed={!!ed.hidden} disabled={!!ed.locked} onClick={()=>onChange({...edits,[l.id]:{...ed,hidden:!ed.hidden}})}>{ed.hidden?'◌':'●'}</button></li>;})}</ol><small>Maiusc o Ctrl/Cmd + clic aggiunge alla selezione. L’ordine cambia tra blocchi dello stesso gruppo.</small></div>}
      {tab==='templates'&&<section className="liveTemplates" aria-label="Modelli di layout"><div className="liveActions"><button onClick={blank}>Tela vuota</button><label className="liveTplName">Nome del modello<input value={tplName} maxLength={60} onChange={ev=>setTplName(ev.target.value)} onKeyDown={ev=>{if(ev.key==='Enter')saveTemplate();}}/></label><button disabled={!tplName.trim()} onClick={saveTemplate}>Salva come modello</button></div>{mine.length?<ul>{mine.map(t=><li key={t.id}><span>{t.name}</span><button aria-label={`Applica il modello ${t.name}`} onClick={()=>applyTemplate(t)}>Applica</button><button aria-label={`Elimina il modello ${t.name}`} onClick={()=>storeTemplates(templates.filter(v=>v.id!==t.id))}>Elimina</button></li>)}</ul>:<small>Nessun modello salvato. “Tela vuota” nasconde i blocchi di partenza (restano nell’elenco per ripristinarli); “Salva come modello” conserva posizioni, stili ed elementi aggiunti per riusarli su altre carte.</small>}<div className="liveActions liveBackup"><button onClick={exportBackup}>Esporta progetto (JSON)</button><button onClick={()=>backupFile.current?.click()}>Importa progetto</button><input ref={backupFile} type="file" accept="application/json,.json" hidden onChange={importBackup}/><small>Il backup contiene carte, bozze, terreno e modelli di questo browser.</small></div></section>}
      {tab==='element'&&(selected&&more.length?<>
        <div className="liveActions liveAlign" role="group" aria-label="Allinea la selezione">{([['x',0,'⇤','Allinea a sinistra'],['x',.5,'↔','Centra in orizzontale'],['x',1,'⇥','Allinea a destra'],['y',0,'⤒','Allinea in alto'],['y',.5,'↕','Centra in verticale'],['y',1,'⤓','Allinea in basso']] as ['x'|'y',number,string,string][]).map(([axis,pos,glyph,label])=><button key={label} aria-label={label} title={`${label} (rispetto alla selezione)`} onClick={()=>align(axis,pos)}>{glyph}</button>)}</div>
        <div className="liveActions"><button disabled={group.length<3} onClick={()=>distribute('x')}>Distribuisci ↔</button><button disabled={group.length<3} onClick={()=>distribute('y')}>Distribuisci ↕</button></div>
        <div className="liveActions"><button onClick={()=>setGroup({locked:true})}>Blocca tutti</button><button onClick={()=>setGroup({hidden:true})}>Nascondi tutti</button><button onClick={deleteGroup}>Elimina</button></div>
        <small>Trascina uno dei blocchi selezionati per spostarli insieme; le frecce muovono tutto il gruppo. “Elimina” toglie gli elementi aggiunti e nasconde gli altri.</small></>
      :selected?<><header><strong>{layers.find(l=>l.id===selected)?.label}</strong><button aria-label="Deseleziona" onClick={()=>select('')}>×</button></header><div className="liveActions"><button onClick={()=>patch({locked:!locked})}>{locked?'Sblocca':'Blocca'}</button><button disabled={locked} onClick={()=>patch({hidden:!e.hidden})}>{e.hidden?'Mostra':'Nascondi'}</button><button disabled={locked} onClick={()=>{const next={...edits};delete next[selected];onChange(next);}}>Ripristina</button></div>{item&&<div className="liveActions"><button disabled={locked||full} onClick={duplicate}>Duplica</button><button disabled={locked} onClick={remove}>Elimina elemento aggiunto</button></div>}<fieldset disabled={locked} className="liveContent">{!item?children(selected):<>
        {item.kind==='text'&&<>{fields.length>0&&<label>Collega a un campo<select aria-label="Collega a un campo" value={item.bind??''} onChange={ev=>setItem({bind:ev.target.value||undefined})}><option value="">Testo libero</option>{item.bind&&!fields.some(f=>f.key===item.bind)&&<option value={item.bind}>{item.bind} (assente)</option>}{fields.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</select></label>}
          {linked?<small>Mostra «{linked.value||'vuoto'}»: si aggiorna con la carta. Modifica il valore dal campo originale.</small>:<label>Testo libero<textarea aria-label="Testo libero" value={item.text} onChange={ev=>setItem({text:ev.target.value})}/></label>}</>}
        {SHAPE_KINDS.includes(item.kind)&&<label>Forma<select aria-label="Forma" value={item.kind} onChange={ev=>setItem({kind:ev.target.value as ExtraKind})}>{SHAPE_KINDS.map(k=><option key={k} value={k}>{EXTRA_KINDS[k]}</option>)}</select></label>}
        {item.kind==='icon'&&<label>Icona<select aria-label="Icona" value={item.icon} onChange={ev=>setItem({icon:ev.target.value})}>{Object.entries(ICONS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label>}
        {item.kind==='image'&&<button type="button" onClick={()=>pickImage(item.id)}>Sostituisci immagine</button>}</>}</fieldset>
      {item&&item.kind!=='text'&&<details open><summary>Misure reali</summary><div className="liveGrid">{mmField('Larghezza (mm)','w',shownW)}{mmField('Altezza (mm)','h',shownH)}</div><label className="liveCheck"><input type="checkbox" checked={keepRatio} onChange={ev=>setKeepRatio(ev.target.checked)}/>Mantieni proporzioni</label>
        {item.kind==='image'&&<><div className="liveActions"><button disabled={locked} onClick={()=>fitSheet(false)}>Adatta al foglio</button><button disabled={locked} onClick={()=>fitSheet(true)}>Riempi il foglio</button>{item.nw&&<button disabled={locked} onClick={()=>{const wu=item.nw!/300*25.4/unitMm;sizeBox(wu,wu/natural);}}>A 300 dpi</button>}</div>
        {dpi>0&&<small className={dpi<150?'liveDpi isLow':'liveDpi'}>Risoluzione a questa misura: circa {Math.round(dpi)} dpi{dpi<150?' — bassa per la stampa: riduci la misura o usa un file più grande':dpi>=300?' — ottima per la stampa':''}.</small>}</>}</details>}
      <details open><summary>Posizione e dimensione</summary><div className="liveGrid">{number('Sposta a destra / sinistra','x',e.x??0,-3200,3200)}{number('Sposta in alto / basso','y',e.y??0,-3200,3200)}{number('Larghezza (×)','sx',e.sx??1,.1,5,.05)}{number('Altezza (×)','sy',e.sy??1,.1,5,.05)}{number('Rotazione (°)','rotation',e.rotation??0,-180,180)}{number('Opacità (0–1)','opacity',e.opacity??1,0,1,.05)}</div><div className="liveActions liveAlign" role="group" aria-label="Allinea al foglio">{([['x',0,'⇤','Allinea a sinistra'],['x',.5,'↔','Centra in orizzontale'],['x',1,'⇥','Allinea a destra'],['y',0,'⤒','Allinea in alto'],['y',.5,'↕','Centra in verticale'],['y',1,'⤓','Allinea in basso']] as ['x'|'y',number,string,string][]).map(([axis,pos,glyph,label])=><button key={label} disabled={locked||!box} aria-label={label} title={label} onClick={()=>align(axis,pos)}>{glyph}</button>)}</div></details>
      {(appearance.hasShape==='true'||appearance.hasBorder==='true')&&<details><summary>Colori e bordi</summary><div className="liveGrid">{appearance.hasShape==='true'&&color('Fondo','fill','#18232b')}{appearance.hasBorder==='true'&&color('Bordo','stroke','#eee6da')}{appearance.hasBorder==='true'&&number('Spessore bordo','strokeWidth',e.strokeWidth??Number(appearance.strokeWidth),0,20,.5)}{appearance.hasRadius==='true'&&number('Angoli arrotondati','radius',e.radius??Number(appearance.radius),0,100)}</div></details>}
      {appearance.hasText==='true'&&<details><summary>Stile del testo</summary><div className="liveGrid">{color('Colore testo','textColor','#213749')}{number('Grandezza testo','fontSize',e.fontSize??Number(appearance.fontSize),8,80)}{number('Spessore testo','fontWeight',e.fontWeight??Number(appearance.fontWeight),300,900,100)}{number('Spazio tra lettere','letterSpacing',e.letterSpacing??Number(appearance.letterSpacing),-2,12,.5)}</div><label>Carattere<select disabled={locked} value={e.fontFamily??'Arial'} onChange={ev=>patch({fontFamily:ev.target.value})}>{['Arial','Inter','Trebuchet MS','Verdana','Georgia','Impact','Courier New'].map(f=><option key={f}>{f}</option>)}</select></label></details>}
      <details><summary>Ordine degli elementi</summary><div className="liveActions"><button disabled={locked} onClick={()=>patch({order:Math.max(0,...Object.values(edits).map(v=>v.order??0))+1})}>Porta davanti</button><button disabled={locked} onClick={()=>patch({order:Math.min(0,...Object.values(edits).map(v=>v.order??0))-1})}>Porta dietro</button></div><small>L’ordine cambia tra elementi dello stesso gruppo.</small></details></>:<p>Seleziona sulla grafica o nell’elenco. Anche gli elementi nascosti possono essere selezionati e riattivati.</p>)}
    </aside>}</div>
    <div className="liveStatus" role="status"><span>{selected&&rectMm?`${layers.find(l=>l.id===selected)?.label??''}${more.length?` +${more.length}`:''} · ${mm(rectMm.w)}×${mm(rectMm.h)} mm · x ${mm(rectMm.x)} · y ${mm(rectMm.y)}`:`Foglio ${mm(width*unitMm)}×${mm(height*unitMm)} mm`}</span><span className="liveHints">Ctrl + rotella: zoom · trascina lo sfondo: sposta la vista · Maiusc + clic: più blocchi · G: griglia</span></div>
  </div>;
}
