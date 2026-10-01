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

export type ExtraElement={id:string;kind:'text'|'shape';text:string;x:number;y:number;w:number;h:number};
export function normalizeExtras(raw:unknown):ExtraElement[]{return Array.isArray(raw)?raw.slice(0,100).filter(v=>v&&/^custom-[\w-]+$/.test(v.id)&&['text','shape'].includes(v.kind)).map(v=>({id:v.id,kind:v.kind,text:String(v.text??'').slice(0,2000),x:Number.isFinite(v.x)?v.x:100,y:Number.isFinite(v.y)?v.y:100,w:Number.isFinite(v.w)?Math.max(10,Math.min(1600,v.w)):180,h:Number.isFinite(v.h)?Math.max(10,Math.min(920,v.h)):80})):[];}
const escapeText=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export function renderExtras(raw:ExtraElement[]|undefined){return normalizeExtras(raw).map(v=>editable(v.id,v.kind==='text'?'Testo aggiunto':'Forma aggiunta',v.kind==='text'?`<text x="${v.x}" y="${v.y}" fill="#f4efe5" font-family="Arial" font-size="24">${v.text.split('\n').map((line,i)=>`<tspan x="${v.x}" dy="${i?1.3:0}em">${escapeText(line)}</tspan>`).join('')}</text>`:`<rect x="${v.x}" y="${v.y}" width="${v.w}" height="${v.h}" rx="12" fill="#1d5c6b" stroke="#eee6da" stroke-width="2"/>`)).join('');}
