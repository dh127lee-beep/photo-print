// Source rectangles refer to the original, unmodified reference sheet.
// Keep the drawings local so exported photos never depend on an external service.
const SOURCE=new URL('./img-ref/IMG_6795.png',import.meta.url).href;
const LETTERING_SOURCE=new URL('./img-ref/IMG_6793.png',import.meta.url).href;
const MOTIFS={
  bow:[126,275,143,124],balloons:[447,255,160,155],cake:[773,265,165,139],
  gift:[135,594,141,145],heart:[470,606,112,119],hat:[468,919,110,132],
  glasses:[449,1244,161,89]
};
let artworkPromise;
function loadReference(source){
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('템플릿 장식을 불러오지 못했어요. 다시 시도해 주세요.'));
    image.src=source;
  });
}
function referenceCutout(image,[x,y,w,h],lightLettering=false){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,x,y,w,h,0,0,w,h);
  const pixels=ctx.getImageData(0,0,w,h),data=pixels.data;
  // Remove the pale paper around the original pencil marks.
  for(let i=0;i<data.length;i+=4){
    const low=Math.min(data[i],data[i+1],data[i+2]),high=Math.max(data[i],data[i+1],data[i+2]);
    const coverage=Math.max((222-low)/55,(high-low-25)/40);
    data[i+3]=Math.round(255*Math.max(0,Math.min(1,coverage)));
    // Keep the pink word; lighten only the name on dark paper for legibility.
    if(lightLettering&&high-low<45)data[i]=data[i+1]=data[i+2]=250;
  }
  ctx.putImageData(pixels,0,0);return canvas;
}
export function loadArtwork(){
  if(!artworkPromise)artworkPromise=Promise.all([loadReference(SOURCE),loadReference(LETTERING_SOURCE)]).then(([image,lettering])=>{
    const artwork={};
    for(const [name,rect] of Object.entries(MOTIFS))artwork[name]=referenceCutout(image,rect);
    // Exact "다인이의 생일" handwriting and pink ink from the reference heading.
    const titleRect=[170,65,344,78];
    artwork.birthdayTitle=referenceCutout(lettering,titleRect);
    artwork.birthdayTitleLight=referenceCutout(lettering,titleRect,true);
    return artwork;
  }).catch(error=>{artworkPromise=null;throw error;});
  return artworkPromise;
}

export function drawBirthdayTitle(ctx,artwork,{x,y,maxWidth,maxHeight,align='center',light=false}){
  const title=artwork?.[light?'birthdayTitleLight':'birthdayTitle'];if(!title)return;
  const width=Math.min(maxWidth,maxHeight*title.width/title.height),height=width*title.height/title.width;
  const left=align==='left'?x:align==='right'?x-width:x-width/2;
  ctx.drawImage(title,left,y-height/2,width,height);
}

function motif(ctx,artwork,name,x,y,w,rotation=0){
  const image=artwork?.[name];if(!image)return;
  const h=w*image.height/image.width;
  ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(rotation*Math.PI/180);
  ctx.drawImage(image,-w/2,-h/2,w,h);ctx.restore();
}
function pencilLine(ctx,x1,y1,x2,y2,color,width=.0018){
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();
  const length=Math.hypot(x2-x1,y2-y1),steps=Math.max(3,Math.ceil(length/.016));
  for(let i=0;i<=steps;i++){
    const t=i/steps,noise=Math.sin(i*2.4+x1*23+y1*31)*.00075;
    const x=x1+(x2-x1)*t+(y1===y2?0:noise),y=y1+(y2-y1)*t+(x1===x2?0:noise);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.stroke();
}
function border(ctx,x,y,w,h,color){
  pencilLine(ctx,x,y,x+w,y,color);pencilLine(ctx,x+w,y,x+w,y+h,color);
  pencilLine(ctx,x+w,y+h,x,y+h,color);pencilLine(ctx,x,y+h,x,y,color);
}
function heart(ctx,x,y,size,color){
  ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.strokeStyle=color;ctx.lineWidth=.075;
  ctx.beginPath();ctx.moveTo(0,.3);ctx.bezierCurveTo(-.85,-.2,-.45,-.8,0,-.35);ctx.bezierCurveTo(.45,-.8,.85,-.2,0,.3);ctx.stroke();ctx.restore();
}

/** All illustrations are behind the photo layer, so faces remain unobstructed. */
export function drawArtworkBackdrop(ctx,layout,frame,artwork){
  const {template:t,width:W}=layout;if(!t.art)return;
  const H=t.ratio,pink='#d85583',ink=frame.ink,light=['ink','cobalt','cherry'].includes(frame.id);
  const accent=light?'#ffd4e3':pink;
  ctx.save();ctx.scale(W,W);
  // Deterministic paper grain: identical in preview and at print resolution.
  ctx.fillStyle=ink;ctx.globalAlpha=.035;
  for(let i=0;i<1600;i++){
    const x=((i*73)%997)/997,y=((i*137)%991)/991*H;
    ctx.fillRect(x,y,.0011,.0011);
  }
  ctx.globalAlpha=1;
  border(ctx,.018,.018,.964,H-.036,accent);
  border(ctx,.029,.029,.942,H-.058,ink);
  const art=(name,x,y,w,r=0)=>motif(ctx,artwork,name,x,y,w,r);
  if(t.art==='ribbon'){
    art('bow',.05,.075,.20,-12);art('balloons',.78,.073,.17,9);
    art('gift',.09,H-.31,.18,-9);art('cake',.74,H-.29,.19,7);
    art('heart',.015,.66,.08,-18);art('heart',.91,.86,.07,16);
  }else if(t.art==='birthday'){
    art('hat',.075,.07,.13,-13);art('bow',.77,.085,.16,12);
    art('balloons',.03,.65,.12,-10);art('glasses',.86,.69,.12,12);
    art('cake',.06,H-.30,.21);art('gift',.75,H-.29,.16,-8);art('heart',.47,H-.37,.06,12);
  }else if(t.art==='love'){
    art('bow',.405,.055,.19);art('heart',.04,.61,.14,-17);art('heart',.83,1.16,.12,16);
    art('bow',.025,1.68,.16,-17);art('heart',.81,2.12,.14,12);
    art('gift',.07,H-.28,.18,-8);art('heart',.78,H-.23,.12,12);
  }else if(t.art==='ticket'){
    art('bow',.075,.075,.17,-14);art('hat',.80,.065,.115,14);
    art('balloons',.017,.48,.13,-10);art('gift',.86,1.04,.13,7);
    art('glasses',.01,1.60,.14,-15);art('heart',.86,2.04,.10,12);
    art('cake',.07,H-.28,.19);art('bow',.76,H-.25,.17,8);
    ctx.setLineDash([.013,.009]);ctx.lineWidth=.0018;ctx.strokeStyle=accent;
    ctx.strokeRect(.045,.045,.91,H-.09);ctx.setLineDash([]);
  }else{
    art('bow',.045,.08,.19,-17);art('heart',.82,.10,.11,15);
    art('glasses',.025,.68,.13,-15);art('hat',.89,.65,.10,17);
    art('gift',.08,H-.30,.18,-12);art('balloons',.75,H-.31,.19,10);
  }
  for(const [x,y] of [[.07,.38],[.94,.43],[.06,H-.42],[.94,H-.37]]){
    heart(ctx,x,y,.022,accent);
    pencilLine(ctx,x-.009,y+.07,x+.008,y+.058,accent,.002);
    pencilLine(ctx,x+.01,y+.10,x+.014,y+.11,accent,.002);
  }
  // Reserved heading and footer zones never intersect photo windows.
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=accent;
  const titles={ribbon:'a little party',birthday:'happy birthday!',love:'with love',ticket:'PARTY CLUB',scrapbook:'our happy days'};
  ctx.font=`italic 600 ${t.art==='love'?.040:.049}px Georgia, serif`;
  ctx.fillText(titles[t.art],.5,t.art==='love'?.250:.16,.53);
  if(t.art!=='love'){
    ctx.font='.015px ui-monospace, monospace';ctx.fillStyle=ink;
    ctx.fillText('FOUR PHOTOS · ONE SWEET MEMORY',.5,.218,.52);
  }
  pencilLine(ctx,.35,H-.12,.46,H-.12,accent,.0013);
  pencilLine(ctx,.54,H-.12,.65,H-.12,accent,.0013);
  heart(ctx,.5,H-.12,.021,accent);
  ctx.restore();
}

export function drawArtworkPhotoBorder(ctx,slot,layout,frame,index){
  if(!layout.template.art)return;
  const W=layout.width;
  ctx.save();ctx.strokeStyle=frame.ink;ctx.lineWidth=.0018*W;
  ctx.strokeRect(slot.x-.005*W,slot.y-.005*W,slot.w+.010*W,slot.h+.010*W);
  ctx.strokeStyle='#d85583';ctx.lineWidth=.0015*W;
  ctx.strokeRect(slot.x-.009*W,slot.y-.009*W,slot.w+.018*W,slot.h+.018*W);
  if(layout.template.art==='scrapbook'){
    ctx.globalAlpha=.8;ctx.fillStyle='#f2b7c9';
    ctx.fillRect(slot.x+slot.w*.33,slot.y-.027*W,slot.w*.34,.035*W);
  }
  ctx.globalAlpha=1;ctx.fillStyle=frame.ink;ctx.font=`${.013*W}px ui-monospace, monospace`;
  ctx.textAlign='right';ctx.textBaseline='top';ctx.fillText(`0${index+1}`,slot.x+slot.w,slot.y+slot.h+.012*W);
  ctx.restore();
}
