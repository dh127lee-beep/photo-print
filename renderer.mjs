import {FRAMES,templateLayout,cropRect,applyFilter,mix,printSize,DEFAULT_TEMPLATE} from './core.mjs?v=4';
import {drawArtworkBackdrop,drawArtworkPhotoBorder,drawBirthdayTitle} from './artwork.mjs?v=4';

function slotPath(ctx,{x,y,w,h,r},shape){
  ctx.beginPath();
  if(shape==='arch'){const rr=Math.min(w/2,h*.5);ctx.moveTo(x,y+h);ctx.lineTo(x,y+rr);ctx.ellipse(x+w/2,y+rr,w/2,rr,0,Math.PI,Math.PI*2);ctx.lineTo(x+w,y+h);ctx.closePath();return;}
  const radius=Math.min(r||0,w/2,h/2);
  if(!radius){ctx.rect(x,y,w,h);return;}
  ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);ctx.closePath();
}
function roundRect(ctx,x,y,w,h,r){slotPath(ctx,{x,y,w,h,r},'rect');}
function backdrop(ctx,layout,frame){
  const {template:t,width:W,height:H}=layout,deco=t.deco||[],band=t.footer*W;
  if(deco.includes('band')){ctx.fillStyle=mix(frame.color,frame.ink,.09);ctx.fillRect(0,H-band,W,band);}
  if(deco.includes('stripes')){
    ctx.save();ctx.beginPath();ctx.rect(0,H-band,W,band);ctx.clip();ctx.strokeStyle=mix(frame.color,frame.ink,.13);ctx.lineWidth=.011*W;
    for(let i=-1;i<2.4;i+=.07){ctx.beginPath();ctx.moveTo(i*W,H);ctx.lineTo((i+.5)*W,H-band);ctx.stroke();}ctx.restore();
  }
  if(deco.includes('dots')){
    ctx.fillStyle=mix(frame.color,frame.ink,.12);const step=.055*W,radius=.007*W;
    for(let y=step/2;y<H;y+=step)for(let x=step/2;x<W;x+=step){ctx.beginPath();ctx.arc(x+(Math.round(y/step)%2?step/2:0),y,radius,0,Math.PI*2);ctx.fill();}
  }
}
function overlay(ctx,layout,frame){
  const {template:t,width:W,height:H}=layout,deco=t.deco||[],inset=Math.max(.02,t.pad*.45)*W;
  if(deco.includes('outline')){ctx.strokeStyle=mix(frame.color,frame.ink,.34);ctx.lineWidth=.0035*W;roundRect(ctx,inset,inset,W-inset*2,H-inset*2,.012*W);ctx.stroke();}
  if(deco.includes('dashes')){
    const y=H-t.footer*W*.92;ctx.save();ctx.strokeStyle=mix(frame.color,frame.ink,.32);ctx.lineWidth=.0035*W;ctx.setLineDash([.018*W,.014*W]);
    ctx.beginPath();ctx.moveTo(t.pad*W*.5,y);ctx.lineTo(W-t.pad*W*.5,y);ctx.stroke();ctx.restore();
  }
  if(deco.includes('corners')){
    ctx.strokeStyle=mix(frame.color,frame.ink,.3);ctx.lineWidth=.004*W;const m=.028*W,len=.045*W;
    for(const [cx,cy,dx,dy] of [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]]){
      ctx.beginPath();ctx.moveTo(cx+dx*len,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+dy*len);ctx.stroke();
    }
  }
  if(deco.includes('sprockets')){
    ctx.fillStyle=mix(frame.color,frame.ink,.16);const hw=.032*W,hh=.024*W,step=.062*W;
    for(let y=step*.7;y<H-step*.5;y+=step)for(const x of [t.pad*W/2-hw/2,W-t.pad*W/2-hw/2]){roundRect(ctx,x,y,hw,hh,hh*.35);ctx.fill();}
  }
}
function drawPhoto(ctx,slot,index,layout,frame,config,makeCanvas){
  const {template:t,width:W}=layout,image=config.images[index]||config.sample,shape=t.shape||'rect';
  ctx.save();
  if(slot.rot){const cx=slot.x+slot.w/2,cy=slot.y+slot.h/2;ctx.translate(cx,cy);ctx.rotate(slot.rot*Math.PI/180);ctx.translate(-cx,-cy);}
  if(t.matte||t.shadow){
    ctx.save();
    if(t.shadow){ctx.shadowColor='rgba(22,28,52,.24)';ctx.shadowBlur=.02*W;ctx.shadowOffsetY=.008*W;}
    const m=(t.matte||0)*W;
    ctx.fillStyle=t.matte?'#ffffff':mix(frame.color,frame.ink,.1);
    if(t.matte)roundRect(ctx,slot.x-m,slot.y-m,slot.w+m*2,slot.h+m*3.4,.008*W);else slotPath(ctx,slot,shape);
    ctx.fill();ctx.restore();
  }
  ctx.save();slotPath(ctx,slot,shape);ctx.clip();
  if(image){
    const temp=makeCanvas();temp.width=Math.max(1,Math.round(slot.w));temp.height=Math.max(1,Math.round(slot.h));
    const tc=temp.getContext('2d',{willReadFrequently:config.filter!=='original'});
    const c=cropRect(image.naturalWidth||image.width,image.naturalHeight||image.height,temp.width,temp.height);
    if(!config.images[index]&&config.sample&&(index===1||index===3)){tc.translate(temp.width,0);tc.scale(-1,1);}
    tc.drawImage(image,c.x,c.y,c.w,c.h,0,0,temp.width,temp.height);
    if(config.filter!=='original'){const data=tc.getImageData(0,0,temp.width,temp.height);applyFilter(data.data,config.filter);tc.putImageData(data,0,0);}
    ctx.drawImage(temp,slot.x,slot.y,slot.w,slot.h);temp.width=temp.height=1;
  }else{
    ctx.fillStyle=frame.id==='ink'?'#373a43':'#e9edf4';ctx.fillRect(slot.x,slot.y,slot.w,slot.h);
    ctx.fillStyle='#a4aebf';ctx.font=`500 ${Math.min(slot.h*.34,.067*W)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(String(index+1).padStart(2,'0'),slot.x+slot.w/2,slot.y+slot.h/2);
  }
  ctx.restore();
  drawArtworkPhotoBorder(ctx,slot,layout,frame,index);
  if((t.deco||[]).includes('numbers')){
    const tw=.052*W,th=.03*W,tx=slot.x+.018*W,ty=slot.y+slot.h-th-.018*W;
    ctx.fillStyle=frame.color;roundRect(ctx,tx,ty,tw,th,th*.32);ctx.fill();
    ctx.fillStyle=frame.ink;ctx.font=`600 ${.019*W}px ui-monospace, monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(String(index+1).padStart(2,'0'),tx+tw/2,ty+th/2);
  }
  ctx.restore();
}
function drawText(ctx,layout,frame,config){
  const {template:t,width:W,u}=layout,text=t.text||{},align=text.align||'center';
  const scale=text.size??Math.max(.5,Math.min(1.15,t.footer/.32));
  ctx.fillStyle=frame.ink;ctx.textAlign=align;ctx.textBaseline='middle';
  const x=(text.x??.5)*W,caption=config.caption.trim();
  drawBirthdayTitle(ctx,config.artwork,{
    x,y:(text.brand??t.ratio-t.footer*.7)*W,align,
    maxWidth:(text.max??(t.art ? .46 : 1-t.pad*2))*W,maxHeight:90*u*scale,
    light:frame.ink==='#ffffff'
  });
  if(caption){
    const max=(text.max??(t.art ? .46 : 1-t.pad*2))*W,min=22*u*scale;let size=39*u*scale;
    const font=s=>`500 ${s}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.font=font(size);
    while(size>min&&ctx.measureText(caption).width>max){size-=u*scale;ctx.font=font(size);}
    ctx.fillText(caption,x,(text.caption??t.ratio-t.footer*.44)*W,max);
  }
  if(config.showDate){
    ctx.globalAlpha=.78;ctx.font=`500 ${30*u*scale}px ui-monospace, monospace`;
    ctx.fillText(config.date,x,(caption?text.dateAlt??t.ratio-t.footer*.23:text.date??t.ratio-t.footer*.39)*W);
    ctx.globalAlpha=1;
  }
}
/** Render from original images at the requested size; preview and export share this path. */
export function renderStrip(canvas,width,config,makeCanvas=()=>document.createElement('canvas')){
  const layout=templateLayout(config.template||DEFAULT_TEMPLATE,width),frame=FRAMES.find(f=>f.id===config.frame);
  if(!frame)throw new Error('알 수 없는 프레임입니다.');
  canvas.width=Math.round(layout.width);canvas.height=Math.round(layout.height);
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=frame.color;ctx.fillRect(0,0,canvas.width,canvas.height);
  backdrop(ctx,layout,frame);
  drawArtworkBackdrop(ctx,layout,frame,config.artwork);
  layout.slots.forEach((slot,i)=>drawPhoto(ctx,slot,i,layout,frame,config,makeCanvas));
  overlay(ctx,layout,frame);
  drawText(ctx,layout,frame,config);
  return canvas;
}

/** Fit the entire design inside a print sheet, with a 3.5% trim-safe margin. */
export function renderPrint(canvas,width,config,makeCanvas=()=>document.createElement('canvas')){
  const size=printSize(config.printSize),layout=templateLayout(config.template||DEFAULT_TEMPLATE,width);
  const height=Math.round(width*size.height/size.width),margin=width*.035;
  const scale=Math.min((width-2*margin)/width,(height-2*margin)/layout.height);
  const design=makeCanvas();renderStrip(design,Math.max(1,Math.round(width*scale)),config,makeCanvas);
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.fillStyle=FRAMES.find(f=>f.id===config.frame).color;
  ctx.fillRect(0,0,width,height);
  ctx.drawImage(design,(width-design.width)/2,(height-design.height)/2);
  design.width=design.height=1;
  return canvas;
}
