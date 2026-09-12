export const FRAMES = [
  {id:'milk',name:'밀크',color:'#ffffff',ink:'#273049'},
  {id:'ink',name:'블랙',color:'#23252c',ink:'#ffffff'},
  {id:'cobalt',name:'코발트',color:'#3154ed',ink:'#ffffff'},
  {id:'rose',name:'로즈',color:'#f2bbcc',ink:'#713c51'},
  {id:'butter',name:'버터',color:'#f8df87',ink:'#6c5421'},
  {id:'mint',name:'민트',color:'#b9e0cf',ink:'#325e50'},
  {id:'lilac',name:'라일락',color:'#cbbbf0',ink:'#4d3a72'},
  {id:'sky',name:'스카이',color:'#b6d8f8',ink:'#355b7e'},
  {id:'cherry',name:'체리',color:'#cb4056',ink:'#ffffff'},
  {id:'silver',name:'실버',color:'#d7dce6',ink:'#485064'}
];
export const FILTERS = [{id:'original',name:'오리지널'},{id:'mono',name:'흑백'},{id:'warm',name:'웜'},{id:'cool',name:'쿨'},{id:'film',name:'필름'}];

/* 템플릿 좌표는 모두 "가로 폭 = 1" 기준의 비율입니다. 세로 값도 같은 단위라 어떤 해상도로도 그대로 확대됩니다. */
function gridSlots({cols,rows,pad=.06,gap=.028,top,cell=.75}){
  const first=top??pad,w=(1-pad*2-gap*(cols-1))/cols,h=w*cell,slots=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)slots.push({x:pad+c*(w+gap),y:first+r*(h+gap),w,h});
  return {slots,bottom:first+rows*h+(rows-1)*gap};
}
function fromGrid(id,name,{footer=.2,...options},extra={}){
  const {slots,bottom}=gridSlots(options);
  return finish({id,name,slots,bottom,footer,pad:options.pad??.06,...extra});
}
function fromSlots(id,name,slots,{footer=.2,pad=.06,...extra}={}){
  return finish({id,name,slots,bottom:Math.max(...slots.map(s=>s.y+s.h)),footer,pad,...extra});
}
function finish({bottom,tilt,...template}){
  const slots=template.slots.map((slot,i)=>({...slot,rot:slot.rot??tilt?.[i]??0}));
  /* 폴라로이드 흰 테두리는 아래쪽이 더 넓어서 그만큼 세로를 늘려줍니다. */
  return {...template,slots,ratio:Number((bottom+(template.matte||0)*3.4+template.footer).toFixed(4))};
}

export const TEMPLATES = [
  fromGrid('classic','클래식',{cols:1,rows:4,pad:.06,gap:.0391667,top:.0625,cell:.710227,footer:.32}),
  fromGrid('round','라운드',{cols:1,rows:4,pad:.075,gap:.035,top:.075,cell:.72,footer:.3},{radius:.05}),
  fromGrid('filmroll','필름롤',{cols:1,rows:4,pad:.135,gap:.03,top:.07,cell:.72,footer:.3},{deco:['sprockets','numbers']}),
  fromGrid('ticket','티켓',{cols:1,rows:4,pad:.085,gap:.026,top:.075,cell:.70,footer:.33},{deco:['dashes','corners'],radius:.008}),
  fromGrid('minimal','미니멀',{cols:1,rows:4,pad:.105,gap:.016,top:.075,cell:.70,footer:.45}),
  fromGrid('dot','도트',{cols:1,rows:4,pad:.07,gap:.032,top:.085,cell:.72,footer:.3},{deco:['dots'],radius:.022}),
  fromGrid('stripe','스트라이프',{cols:1,rows:4,pad:.065,gap:.03,top:.09,cell:.715,footer:.33},{deco:['stripes','outline']}),
  fromSlots('diagonal','다이애고널',[0,1,2,3].map(i=>({x:i%2?.20:.06,y:.06+i*.585,w:.74,h:.555})),{footer:.28,pad:.06,radius:.012,shadow:true}),
  fromGrid('grid','그리드',{cols:2,rows:2,pad:.06,gap:.028,cell:.75,footer:.22}),
  fromGrid('edge','보더리스',{cols:2,rows:2,pad:0,gap:0,top:0,cell:.75,footer:.17},{deco:['band'],pad:.055}),
  fromGrid('window','윈도우',{cols:2,rows:2,pad:.095,gap:.052,cell:.8,footer:.23},{deco:['outline']}),
  fromGrid('polaroid','폴라로이드',{cols:2,rows:2,pad:.055,gap:.05,cell:.82,footer:.2},{matte:.02,shadow:true,radius:.006,tilt:[-2,1.6,1.5,-1.9]}),
  fromSlots('tilt','오버랩',[{x:.045,y:.06,w:.45,h:.3375,rot:-3.5},{x:.505,y:.09,w:.45,h:.3375,rot:2.8},{x:.045,y:.44,w:.45,h:.3375,rot:2.2},{x:.505,y:.47,w:.45,h:.3375,rot:-3}],{footer:.2,pad:.05,radius:.01,shadow:true}),
  fromGrid('arch','아치',{cols:2,rows:2,pad:.07,gap:.04,cell:1.05,footer:.22},{shape:'arch'}),
  fromGrid('duo','더블',{cols:2,rows:2,pad:.055,gap:.03,cell:1.22,footer:.2}),
  fromSlots('mosaic','모자이크',[{x:.055,y:.055,w:.89,h:.62},...[0,1,2].map(i=>({x:.055+i*.305,y:.7,w:.28,h:.322}))],{footer:.2,pad:.055,radius:.008}),
  fromSlots('magazine','매거진',[{x:.055,y:.055,w:.89,h:.6},...[0,1,2].map(i=>({x:.055+i*.305,y:.68,w:.28,h:.294}))],{footer:.26,pad:.055,text:{align:'left',x:.055}}),
  fromSlots('half','하프',[{x:.05,y:.05,w:.54,h:.74},...[0,1,2].map(i=>({x:.612,y:.05+i*.254,w:.338,h:.232}))],{footer:.19,pad:.05,radius:.008}),
  fromSlots('postcard','포스트카드',[0,1,2,3].map(i=>({x:.045+(i%2)*.311,y:.055+Math.floor(i/2)*.2474,w:.289,h:.2254})),{footer:.07,pad:.045,radius:.008,text:{align:'left',x:.675,brand:.165,caption:.3,date:.3,dateAlt:.375,max:.285,size:.82}}),
  fromGrid('banner','가로배너',{cols:4,rows:1,pad:.04,gap:.018,cell:1.3,footer:.13},{radius:.008})
];

export function templateLayout(id,width){
  const template=TEMPLATES.find(t=>t.id===id);
  if(!template)throw new Error('알 수 없는 템플릿입니다.');
  if(!Number.isFinite(width)||width<=0)throw new Error('이미지 크기가 올바르지 않습니다.');
  return {template,width,height:width*template.ratio,u:width/1200,
    slots:template.slots.map(s=>({x:s.x*width,y:s.y*width,w:s.w*width,h:s.h*width,r:(s.r??template.radius??0)*width,rot:s.rot||0}))};
}
/** 어떤 비율이든 1200×3600과 비슷한 화소 수로 내보냅니다. */
export function exportWidth(id){
  const template=TEMPLATES.find(t=>t.id===id);
  if(!template)throw new Error('알 수 없는 템플릿입니다.');
  return Math.min(3000,Math.max(1200,Math.round(Math.sqrt(4320000/template.ratio)/4)*4));
}
export function mix(from,to,amount){
  const parse=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),a=parse(from),b=parse(to);
  return `#${a.map((v,i)=>Math.round(v+(b[i]-v)*amount).toString(16).padStart(2,'0')).join('')}`;
}
export function cropRect(sw,sh,dw,dh){
  if(![sw,sh,dw,dh].every(v=>Number.isFinite(v)&&v>0))throw new Error('사진 크기가 올바르지 않습니다.');
  const scale=Math.max(dw/sw,dh/sh),w=dw/scale,h=dh/scale;
  return {x:(sw-w)/2,y:(sh-h)/2,w,h};
}
export function applyFilter(data,filter){
  if(!FILTERS.some(f=>f.id===filter))throw new Error('알 수 없는 필터입니다.');
  if(filter==='original')return data;
  const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
  for(let i=0;i<data.length;i+=4){const r=data[i],g=data[i+1],b=data[i+2];
    if(filter==='mono'){const l=clamp(.2126*r+.7152*g+.0722*b);data[i]=data[i+1]=data[i+2]=l;}
    else if(filter==='warm'){data[i]=clamp(r*1.04+7);data[i+1]=clamp(g*1.01+2);data[i+2]=clamp(b*.94);}
    else if(filter==='cool'){data[i]=clamp(r*.96);data[i+1]=clamp(g*1.01+2);data[i+2]=clamp(b*1.05+5);}
    else{data[i]=clamp(r*.91+16);data[i+1]=clamp(g*.89+16);data[i+2]=clamp(b*.85+19);}
  }return data;
}
export function localDate(date=new Date()){return `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;}
export function moveSelection(ids,id,delta){const at=ids.indexOf(id),to=at+delta;if(at<0||to<0||to>=ids.length)return [...ids];const next=[...ids];[next[at],next[to]]=[next[to],next[at]];return next;}
