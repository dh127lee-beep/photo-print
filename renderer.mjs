import {FRAMES,cropRect,applyFilter,filmLayout} from './core.mjs';

/** Render from original images at the requested size; preview and export share this path. */
export function renderStrip(canvas,width,config,makeCanvas=()=>document.createElement('canvas')){
  const {height,u,slots}=filmLayout(width);
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d'),frame=FRAMES.find(f=>f.id===config.frame);
  if(!frame)throw new Error('알 수 없는 프레임입니다.');
  ctx.fillStyle=frame.color;ctx.fillRect(0,0,width,height);
  for(let i=0;i<4;i++){
    const rect=slots[i],image=config.images[i]||config.sample;
    if(image){
      const temp=makeCanvas();temp.width=Math.max(1,Math.round(rect.w));temp.height=Math.max(1,Math.round(rect.h));
      const tc=temp.getContext('2d',{willReadFrequently:config.filter!=='original'});
      const c=cropRect(image.naturalWidth||image.width,image.naturalHeight||image.height,temp.width,temp.height);
      if(!config.images[i]&&config.sample&&(i===1||i===3)){tc.translate(temp.width,0);tc.scale(-1,1);}
      tc.drawImage(image,c.x,c.y,c.w,c.h,0,0,temp.width,temp.height);
      if(config.filter!=='original'){const data=tc.getImageData(0,0,temp.width,temp.height);applyFilter(data.data,config.filter);tc.putImageData(data,0,0);}
      ctx.drawImage(temp,rect.x,rect.y,rect.w,rect.h);temp.width=temp.height=1;
    }else{
      ctx.fillStyle=frame.id==='ink'?'#373a43':'#e9edf4';ctx.fillRect(rect.x,rect.y,rect.w,rect.h);ctx.fillStyle='#a4aebf';ctx.font=`500 ${80*u}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1).padStart(2,'0'),width/2,rect.y+rect.h/2);
    }
  }
  ctx.fillStyle=frame.ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`italic 600 ${72*u}px Georgia, serif`;ctx.fillText('fourfold.',width/2,3330*u);
  const caption=config.caption.trim();
  if(caption){let size=39;ctx.font=`500 ${size*u}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;while(size>22&&ctx.measureText(caption).width>1040*u){size--;ctx.font=`500 ${size*u}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;}ctx.fillText(caption,width/2,3430*u);}
  if(config.showDate){ctx.globalAlpha=.78;ctx.font=`500 ${30*u}px ui-monospace, monospace`;ctx.fillText(config.date,width/2,(caption?3512:3450)*u);ctx.globalAlpha=1;}
  return canvas;
}
