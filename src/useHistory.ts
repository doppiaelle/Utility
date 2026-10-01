import {useCallback,useRef,useState} from 'react';
import type {SetStateAction} from 'react';
function changedPaths(a:unknown,b:unknown,prefix=''):string[]{
  if(a===b)return[];
  if(a&&b&&typeof a==='object'&&typeof b==='object')return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(key=>changedPaths((a as Record<string,unknown>)[key],(b as Record<string,unknown>)[key],`${prefix}.${key}`));
  return [prefix];
}
/** Coalesce one pointer gesture or a typing burst in the same field into one step. */
export function useHistory<T>(initial:T|(()=>T)){
  const [value,render]=useState(initial),[,refresh]=useState(0),current=useRef(value),past=useRef<T[]>([]),future=useRef<T[]>([]),last=useRef(0),group=useRef(''),gesture=useRef(false);
  const remember=()=>{past.current.push(current.current);if(past.current.length>100)past.current.shift();};
  const set=useCallback((action:SetStateAction<T>)=>{const next=typeof action==='function'?(action as (v:T)=>T)(current.current):action;const fields=changedPaths(current.current,next).join('|');if(!fields)return;
    const now=Date.now();if(!gesture.current&&(now-last.current>450||fields!==group.current))remember();future.current=[];last.current=now;group.current=fields;current.current=next;render(next);},[]);
  const begin=()=>{gesture.current=true;remember();future.current=[];refresh(v=>v+1);};
  const end=()=>{gesture.current=false;last.current=0;group.current='';if(JSON.stringify(past.current.at(-1))===JSON.stringify(current.current))past.current.pop();refresh(v=>v+1);};
  const undo=()=>{const next=past.current.pop();if(next!==undefined){future.current.push(current.current);current.current=next;last.current=0;render(next);}};
  const redo=()=>{const next=future.current.pop();if(next!==undefined){remember();current.current=next;last.current=0;render(next);}};
  return {value,set,undo,redo,begin,end,canUndo:past.current.length>0,canRedo:future.current.length>0};
}
