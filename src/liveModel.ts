/** Per-element changes are additive: old designs keep their original appearance. */
export type ElementEdit = {x?:number;y?:number;sx?:number;sy?:number;rotation?:number;cx?:number;cy?:number;opacity?:number;hidden?:boolean;locked?:boolean;fill?:string;stroke?:string;strokeWidth?:number;radius?:number;textColor?:string;fontSize?:number;fontFamily?:string;fontWeight?:number;letterSpacing?:number;order?:number};
export type LiveEdits = Record<string,ElementEdit>;
const limits:Record<string,[number,number]>={x:[-3200,3200],y:[-3200,3200],sx:[.1,5],sy:[.1,5],rotation:[-180,180],cx:[-3200,3200],cy:[-3200,3200],opacity:[0,1],strokeWidth:[0,20],radius:[0,100],fontSize:[8,80],fontWeight:[300,900],letterSpacing:[-2,12],order:[-1000,1000]};
export function normalizeEdits(raw:unknown):LiveEdits{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return{};
  const result:LiveEdits={};
  for(const [id,value] of Object.entries(raw).slice(0,500)){
    if(!/^[a-zA-Z][\w-]{0,79}$/.test(id)||!value||typeof value!=='object')continue;
    const clean:Record<string,unknown>={};
    for(const [key,v] of Object.entries(value)){
      if(key in limits&&typeof v==='number'&&Number.isFinite(v)){const [min,max]=limits[key];clean[key]=Math.max(min,Math.min(max,v));}
      else if(['hidden','locked'].includes(key)&&typeof v==='boolean')clean[key]=v;
      else if(['fill','stroke','textColor'].includes(key)&&typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v))clean[key]=v;
      else if(key==='fontFamily'&&typeof v==='string'&&['Arial','Inter','Trebuchet MS','Verdana','Georgia','Impact','Courier New'].includes(v))clean[key]=v;
    }
    result[id]=clean as ElementEdit;
  }
  return result;
}
export const editable=(id:string,label:string,content:string)=>`<g data-live-id="${id}" data-live-label="${label}">${content}</g>`;
/** Apply edits to the same SVG used by the preview and all export formats. */
export function applyEdits(markup:string,raw:LiveEdits|undefined):string{
  const edits=normalizeEdits(raw);if(!Object.keys(edits).length)return markup;
  const doc=new DOMParser().parseFromString(markup,'image/svg+xml');
  doc.querySelectorAll('[data-live-id]').forEach(node=>{
    const e=edits[node.getAttribute('data-live-id')!];if(!e)return;
    const cx=e.cx??0,cy=e.cy??0;
    node.setAttribute('transform',`translate(${e.x??0} ${e.y??0}) rotate(${e.rotation??0} ${cx} ${cy}) translate(${cx} ${cy}) scale(${e.sx??1} ${e.sy??1}) translate(${-cx} ${-cy})`);
    if(e.opacity!==undefined)node.setAttribute('opacity',String(e.opacity));
    if(e.hidden)node.setAttribute('display','none');
    // Descendant editable blocks keep their independent styles.
    node.querySelectorAll('*').forEach(child=>{
      if(child.closest('[data-live-id]')!==node)return;
      const text=child.tagName==='text'||child.tagName==='tspan';
      if(text){for(const [key,attr] of Object.entries({textColor:'fill',fontSize:'font-size',fontFamily:'font-family',fontWeight:'font-weight',letterSpacing:'letter-spacing'})){const v=e[key as keyof ElementEdit];if(v!==undefined)child.setAttribute(attr,String(v));}}
      else {if(e.fill&&child.hasAttribute('fill')&&child.getAttribute('fill')!=='none')child.setAttribute('fill',e.fill);if(e.stroke&&child.hasAttribute('stroke'))child.setAttribute('stroke',e.stroke);if(e.strokeWidth!==undefined&&child.hasAttribute('stroke'))child.setAttribute('stroke-width',String(e.strokeWidth));if(e.radius!==undefined&&child.tagName==='rect'&&child.hasAttribute('rx'))child.setAttribute('rx',String(e.radius));}
    });
  });
  const parents=new Set(Array.from(doc.querySelectorAll('[data-live-id]')).map(n=>n.parentNode!));
  parents.forEach(parent=>{const nodes=Array.from(parent.childNodes).filter(n=>n.nodeType===1&&(n as Element).hasAttribute('data-live-id'));
    // Replace only editable positions, preserving fixed overlays and definitions.
    const sorted=[...nodes].sort((a,b)=>(edits[(a as Element).getAttribute('data-live-id')!]?.order??0)-(edits[(b as Element).getAttribute('data-live-id')!]?.order??0));
    const placeholders=nodes.map(n=>{const p=doc.createComment('layer');parent.replaceChild(p,n);return p});placeholders.forEach((p,i)=>parent.replaceChild(sorted[i],p));});
  return new XMLSerializer().serializeToString(doc.documentElement);
}

export const EXTRA_KINDS={text:'Testo',shape:'Rettangolo',ellipse:'Cerchio',line:'Linea',triangle:'Triangolo',diamond:'Rombo',hexagon:'Esagono',star:'Stella',image:'Immagine',icon:'Icona'} as const;
export type ExtraKind=keyof typeof EXTRA_KINDS;
/** Line icons drawn in a 28-unit box centred on the origin. */
export const ICONS:Record<string,{label:string;body:string}>={
  sword:{label:'Spada',body:'<path d="M-9 10 6-5M2-9l8-1-1 8M-11 7l4 4M-7 3l4 4"/>'},
  shield:{label:'Scudo',body:'<path d="M0-12 10-8v8c0 8-4.5 13-10 16-5.5-3-10-8-10-16v-8Z"/><path d="m-4 1 3 3 6-7"/>'},
  target:{label:'Mirino',body:'<circle r="9"/><circle r="3"/><path d="M0-14v4M0 10v4M-14 0h4M10 0h4"/>'},
  heart:{label:'Cuore',body:'<path d="M0 11S-11 4-11-4c0-5 6-8 11-2 5-6 11-3 11 2 0 8-11 15-11 15Z"/>'},
  star:{label:'Scintilla',body:'<path d="M0-11 3-3 11 0 3 3 0 11-3 3-11 0-3-3Z"/>'},
  bolt:{label:'Fulmine',body:'<path d="M3-13-8 2h7l-2 11 10-15H3Z"/>'},
  crown:{label:'Corona',body:'<path d="M-11 9h22l2-15-7 6-6-10-6 10-7-6Z"/>'},
  drop:{label:'Goccia',body:'<path d="M0-12c5 7 8 10 8 14a8 8 0 0 1-16 0c0-4 3-7 8-14Z"/>'},
  arrow:{label:'Freccia',body:'<path d="M-11 0h21M3-7l7 7-7 7"/>'},
  gem:{label:'Gemma',body:'<path d="M0-12 12 0 0 12-12 0ZM-12 0h24M0-12-5 0 0 12 5 0Z"/>'}
};
/** A value the card or terrain already owns, offered to text elements so a layout can be drawn once. */
export type DataField={key:string;label:string;value:string};
export const fieldData=(fields:DataField[]):Record<string,string>=>Object.fromEntries(fields.map(f=>[f.key,f.value]));
export type ExtraElement={id:string;kind:ExtraKind;text:string;x:number;y:number;w:number;h:number;src?:string;icon?:string;bind?:string};
const isBind=(v:unknown):v is string=>typeof v==='string'&&/^[a-z][\w.]{0,40}$/i.test(v);
/** Embedded images only: exports stay self-contained and nothing is fetched. */
export const isImageSrc=(v:unknown):v is string=>typeof v==='string'&&v.length<=3_000_000&&/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(v);
export function normalizeExtras(raw:unknown):ExtraElement[]{
  if(!Array.isArray(raw))return[];
  return raw.slice(0,100).filter(v=>v&&/^custom-[\w-]+$/.test(v.id)&&Object.hasOwn(EXTRA_KINDS,v.kind)&&(v.kind!=='image'||isImageSrc(v.src))).map(v=>({id:v.id,kind:v.kind,text:String(v.text??'').slice(0,2000),x:Number.isFinite(v.x)?v.x:100,y:Number.isFinite(v.y)?v.y:100,w:Number.isFinite(v.w)?Math.max(10,Math.min(1600,v.w)):180,h:Number.isFinite(v.h)?Math.max(10,Math.min(920,v.h)):80,...(v.kind==='image'?{src:v.src}:{}),...(v.kind==='icon'?{icon:Object.hasOwn(ICONS,v.icon)?v.icon:'star'}:{}),...(v.kind==='text'&&isBind(v.bind)?{bind:v.bind}:{})}));
}
const escapeText=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const n2=(n:number)=>Math.round(n*100)/100;
const SHAPE='fill="#1d5c6b" stroke="#eee6da" stroke-width="2"';
function extraBody(v:ExtraElement,data?:Record<string,string>):string{
  const {x,y,w,h}=v,poly=(points:[number,number][])=>`<path d="M${points.map(([px,py])=>`${n2(x+px*w)} ${n2(y+py*h)}`).join('L')}Z" ${SHAPE} stroke-linejoin="round"/>`;
  // Invisible hit area: thin strokes stay easy to pick with a finger.
  const hit=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" pointer-events="all"/>`;
  switch(v.kind){
    case'text':{const text=v.bind&&data&&Object.hasOwn(data,v.bind)?data[v.bind]:v.text;return`<text x="${x}" y="${y}" fill="#f4efe5" font-family="Arial" font-size="24">${text.split('\n').map((line,i)=>`<tspan x="${x}" dy="${i?1.3:0}em">${escapeText(line)}</tspan>`).join('')}</text>`;}
    case'ellipse':return`<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" ${SHAPE}/>`;
    case'line':return`${hit}<line x1="${x}" y1="${y+h/2}" x2="${x+w}" y2="${y+h/2}" stroke="#eee6da" stroke-width="4" stroke-linecap="round"/>`;
    case'triangle':return poly([[.5,0],[1,1],[0,1]]);
    case'diamond':return poly([[.5,0],[1,.5],[.5,1],[0,.5]]);
    case'hexagon':return poly([[.25,0],[.75,0],[1,.5],[.75,1],[.25,1],[0,.5]]);
    case'star':return poly(Array.from({length:10},(_,i)=>{const a=(i*36-90)*Math.PI/180,r=i%2?.2:.5;return[.5+r*Math.cos(a),.5+r*Math.sin(a)] as [number,number]}));
    case'image':return`<image href="${v.src}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
    case'icon':return`${hit}<g transform="translate(${x+w/2} ${y+h/2}) scale(${n2(Math.min(w,h)/28)})" fill="none" stroke="#f8f5ef" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round">${ICONS[v.icon??'star'].body}</g>`;
    default:return`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" ${SHAPE}/>`;
  }
}
export function renderExtras(raw:ExtraElement[]|undefined,data?:Record<string,string>){return normalizeExtras(raw).map((v,i)=>editable(v.id,`${v.kind==='text'?'Testo aggiunto':v.kind==='shape'?'Forma aggiunta':EXTRA_KINDS[v.kind]} ${i+1}`,extraBody(v,data))).join('');}

/** Array-backed card fields keep their edits when a preceding field is removed. */
export function removeIndexedEdits(raw:LiveEdits|undefined,prefix:'meta'|'effect'|'stat',index:number):LiveEdits{
  const result:LiveEdits={};
  for(const [id,edit] of Object.entries(normalizeEdits(raw))){const match=id.match(new RegExp(`^(${prefix}-(?:icon-)?)(\\d+)$`));if(!match){result[id]=edit;continue;}const n=Number(match[2]);if(n!==index)result[`${match[1]}${n>index?n-1:n}`]=edit;}
  return result;
}

/** A reusable layout: per-block edits plus free elements, never card or terrain content. */
export type LayoutTemplate={id:string;name:string;kind:'card'|'terrain';liveEdits:LiveEdits;extras:ExtraElement[]};
export const TEMPLATE_LIMIT=50;
export function normalizeTemplates(raw:unknown,kind?:'card'|'terrain'):LayoutTemplate[]{
  if(!Array.isArray(raw))return[];
  const seen=new Set<string>(),result:LayoutTemplate[]=[];
  for(const v of raw){
    if(!v||typeof v!=='object'||!/^tpl-[\w-]+$/.test(v.id)||seen.has(v.id)||(v.kind!=='card'&&v.kind!=='terrain')||(kind&&v.kind!==kind))continue;
    const name=String(v.name??'').trim().slice(0,60);if(!name)continue;
    seen.add(v.id);result.push({id:v.id,name,kind:v.kind,liveEdits:normalizeEdits(v.liveEdits),extras:normalizeExtras(v.extras)});
    if(result.length>=TEMPLATE_LIMIT)break;
  }
  return result;
}
/** Blank canvas: every built-in block hidden (still listed, so it can be restored) and no free elements. */
export function blankEdits(ids:string[],raw:LiveEdits|undefined):LiveEdits{
  const edits=normalizeEdits(raw),result:LiveEdits={};
  for(const id of ids)if(!id.startsWith('custom-'))result[id]={...edits[id],hidden:true};
  return result;
}
