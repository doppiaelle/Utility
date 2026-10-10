import {isImageSrc} from './liveModel';

/** Downscale uploads (2000 px at most, less if needed) so drafts keep fitting in browser storage. */
export function readImage(file:File,done:(src:string,w:number,h:number)=>void,fail:()=>void,maxSide=2000){
  const url=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{URL.revokeObjectURL(url);if(!im.naturalWidth||!im.naturalHeight){fail();return;}
    let k=Math.min(1,maxSide/Math.max(im.naturalWidth,im.naturalHeight));
    for(let attempt=0;attempt<7;attempt++){
      const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*k));c.height=Math.max(1,Math.round(im.naturalHeight*k));c.getContext('2d')!.drawImage(im,0,0,c.width,c.height);
      let src=c.toDataURL('image/webp',.88);if(!src.startsWith('data:image/webp'))src=c.toDataURL('image/png');
      if(isImageSrc(src)){done(src,c.width,c.height);return;}k*=.75;}
    fail();};
  im.onerror=()=>{URL.revokeObjectURL(url);fail();};im.src=url;
}
