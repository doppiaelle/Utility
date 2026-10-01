import {useCallback,useRef,useState} from 'react';
import type {SetStateAction} from 'react';
/** Coalesce a pointer gesture or a short typing burst into one undo step. */
export function useHistory<T>(initial:T|(()=>T)){
  const [value,render]=useState(initial),current=useRef(value),past=useRef<T[]>([]),future=useRef<T[]>([]),last=useRef(0),gesture=useRef(false);
  const set=useCallback((action:SetStateAction<T>)=>{const next=typeof action==='function'?(action as (v:T)=>T)(current.current):action;if(JSON.stringify(next)===JSON.stringify(current.current))return;
    const now=Date.now();if(!gesture.current&&now-last.current>450){past.current.push(current.current);if(past.current.length>100)past.current.shift();}future.current=[];last.current=now;current.current=next;render(next);},[]);
  const begin=()=>{gesture.current=true;past.current.push(current.current);future.current=[];};
  const end=()=>{gesture.current=false;last.current=0;if(JSON.stringify(past.current.at(-1))===JSON.stringify(current.current))past.current.pop();};
  const undo=()=>{const next=past.current.pop();if(next!==undefined){future.current.push(current.current);current.current=next;last.current=0;render(next);}};
  const redo=()=>{const next=future.current.pop();if(next!==undefined){past.current.push(current.current);current.current=next;last.current=0;render(next);}};
  return {value,set,undo,redo,begin,end,canUndo:past.current.length>0,canRedo:future.current.length>0};
}
