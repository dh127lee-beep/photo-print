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
export function filmLayout(width){const u=width/1200;return {width,height:width*3,u,slots:Array.from({length:4},(_,i)=>({x:72*u,y:(75+i*797)*u,w:1056*u,h:750*u}))};}
