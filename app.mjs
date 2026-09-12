import {FRAMES,FILTERS,cropRect,localDate,moveSelection} from './core.mjs';
import {renderStrip} from './renderer.mjs';

const $=id=>document.getElementById(id);
const paths={camera:'<path d="M14.5 4h-5L7.8 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.8Z"/><circle cx="12" cy="13.5" r="3.5"/>',image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',check:'<path d="m5 12 4 4L19 6"/>',restart:'<path d="M3 11a9 9 0 1 1 2.5 7M3 4v7h7"/>',timer:'<circle cx="12" cy="14" r="8"/><path d="M12 10v4l2 2M9 2h6m-3 0v4m6 1 2-2"/>',flip:'<path d="m16 3 4 4-4 4M20 7H8a5 5 0 0 0-5 5m5 9-4-4 4-4m-4 4h12a5 5 0 0 0 5-5"/>',mirror:'<path d="M12 3v18M8 5 3 19h5ZM16 5l5 14h-5Z"/>',volume:'<path d="m11 5-6 4H2v6h3l6 4Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',sparkle:'<path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7ZM20 2v4m-2-2h4"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',left:'<path d="m14 6-6 6 6 6"/>',right:'<path d="m10 6 6 6-6 6"/>'};
function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.image}</svg>`;}
document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});
const state={photos:[],selected:[],frame:'milk',filter:'original',caption:'',showDate:true,date:localDate(),source:'camera',facing:'user',mirror:true,sound:true,stream:null,connecting:false,ready:false,capturing:false,importing:false,exporting:false,controller:null,request:0,exportURL:null,sample:null};
let nextId=1,toastTimer,previewQueued=false,audioContext=null;
const busy=()=>state.capturing||state.importing||state.exporting;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3800);}
function cameraError(message){$('camera-error').textContent=message;$('camera-error').hidden=!message;}
function defer(ms,signal){return new Promise((resolve,reject)=>{if(signal?.aborted){reject(new DOMException('촬영 중단','AbortError'));return;}const abort=()=>{clearTimeout(t);signal?.removeEventListener('abort',abort);reject(new DOMException('촬영 중단','AbortError'));};const t=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);signal?.addEventListener('abort',abort,{once:true});});}
function blobFromCanvas(canvas,type='image/png',quality){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('이미지를 만들지 못했어요. 다시 시도해 주세요.')),type,quality));}
function imageFromURL(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('사진을 열지 못했어요. JPG 또는 PNG로 다시 선택해 주세요.'));image.src=url;});}
function snapshot(){return {photos:state.photos.map(p=>({id:p.id,name:p.name})),selected:[...state.selected],frame:state.frame,filter:state.filter,caption:state.caption,showDate:state.showDate,cameraActive:state.ready,capturing:state.capturing,canFinish:state.selected.length===4&&!busy()};}
function renderTray(){
  const tray=$('photo-tray');tray.replaceChildren();
  state.photos.forEach((photo,index)=>{
    const order=state.selected.indexOf(photo.id),slot=document.createElement('div');slot.className='photo-slot filled'+(order>=0?' selected':'');
    const select=document.createElement('button');select.className='select-photo';select.type='button';select.disabled=busy();select.setAttribute('aria-label',`${index+1}번 사진 ${order>=0?'선택 해제':'선택'}`);select.setAttribute('aria-pressed',String(order>=0));
    const img=document.createElement('img');img.src=photo.url;img.alt=`${index+1}번 사진`;img.draggable=false;select.append(img);select.addEventListener('click',()=>togglePhoto(photo.id));slot.append(select);
    if(order>=0){const n=document.createElement('span');n.className='photo-number';n.textContent=String(order+1);slot.append(n);const actions=document.createElement('div');actions.className='reorder';for(const [delta,label,kind] of [[-1,'앞으로','left'],[1,'뒤로','right']]){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`선택 ${order+1}번 사진 ${label} 이동`);b.title=label;b.disabled=busy()||(delta===-1?order===0:order===state.selected.length-1);b.innerHTML=icon(kind);b.addEventListener('click',()=>{state.selected=moveSelection(state.selected,photo.id,delta);render();});actions.append(b);}slot.append(actions);}
    const remove=document.createElement('button');remove.type='button';remove.className='delete-photo';remove.setAttribute('aria-label',`${index+1}번 사진 삭제`);remove.disabled=busy();remove.innerHTML=icon('close');remove.addEventListener('click',()=>removePhoto(photo.id));slot.append(remove);tray.append(slot);
  });
  for(let i=state.photos.length;i<8;i++){const slot=document.createElement('div');slot.className='photo-slot empty';slot.textContent=String(i+1).padStart(2,'0');slot.setAttribute('aria-hidden','true');tray.append(slot);}
}
function render(){
  $('photo-total').textContent=`${state.photos.length} / 8장`;$('selection-count').textContent=`${state.selected.length}/4`;
  $('preview-badge').textContent=state.photos.length?'나의 네 컷':'미리보기 예시';
  $('preview-hint').textContent=state.photos.length?(state.selected.length===4?'이 순간, 저장할 준비 완료.':`${4-state.selected.length}장을 더 골라주세요.`):'사진을 고르면 여기에 담겨요.';
  $('finish-button').disabled=state.selected.length!==4||busy();$('finish-label').textContent=state.exporting?'이미지 만드는 중…':state.selected.length===4?'이미지 완성하기':'사진 네 장을 골라주세요';
  const available=Math.min(Number($('shot-count').value),8-state.photos.length);
  $('capture-label').textContent=state.capturing?'촬영 중지':available>0?`${available}장 연속 촬영`:'사진 8장이 모두 준비됐어요';
  $('capture-button').disabled=!state.capturing&&(!state.ready||busy()||available===0);$('capture-button').classList.toggle('capturing',state.capturing);
  ['timer','shot-count','flip-camera','mirror-camera','choose-photos','add-photos','reset-button','camera-tab','upload-tab'].forEach(id=>$(id).disabled=busy());
  $('add-photos').disabled=busy()||state.photos.length===8;$('choose-photos').disabled=busy()||state.photos.length===8;
  $('enable-camera').disabled=state.connecting||busy();$('enable-camera').innerHTML=state.connecting?'카메라 연결 중…':icon('camera')+'카메라 켜기';
  if(state.connecting)$('enable-camera').textContent='카메라 연결 중…';
  $('camera-options').hidden=!state.ready;$('camera-video').hidden=!state.ready;$('camera-empty').hidden=state.ready;
  $('viewfinder').classList.toggle('live',state.ready);$('camera-video').classList.toggle('mirrored',state.facing==='user'&&state.mirror);
  $('mirror-camera').setAttribute('aria-pressed',String(state.mirror));$('mirror-camera').disabled=busy()||state.facing!=='user';
  $('frame-name').textContent=FRAMES.find(f=>f.id===state.frame).name;
  document.querySelectorAll('.swatch').forEach(b=>{const active=b.dataset.frame===state.frame;b.setAttribute('aria-pressed',String(active));b.innerHTML=active?icon('check'):'';b.disabled=state.exporting;});
  document.querySelectorAll('.filter-button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.filter===state.filter));b.disabled=state.exporting;});
  $('caption-count').textContent=`${state.caption.length}/24`;$('caption').disabled=state.exporting;$('show-date').disabled=state.exporting;
  renderTray();schedulePreview();
}
function togglePhoto(id){if(busy())return;if(state.selected.includes(id))state.selected=state.selected.filter(x=>x!==id);else if(state.selected.length<4)state.selected.push(id);else{toast('네 장을 골랐어요. 바꿀 사진을 먼저 선택 해제해 주세요.');return;}render();}
function removePhoto(id){if(busy())return;const photo=state.photos.find(p=>p.id===id);if(!photo)return;URL.revokeObjectURL(photo.url);state.photos=state.photos.filter(p=>p.id!==id);state.selected=state.selected.filter(x=>x!==id);render();}
function addPhoto(photo){state.photos.push(photo);if(state.selected.length<4)state.selected.push(photo.id);render();}
function setSource(source){if(busy())return;state.source=source;const isCamera=source==='camera';$('camera-tab').setAttribute('aria-selected',String(isCamera));$('upload-tab').setAttribute('aria-selected',String(!isCamera));$('camera-tab').tabIndex=isCamera?0:-1;$('upload-tab').tabIndex=isCamera?-1:0;$('camera-pane').hidden=!isCamera;$('upload-pane').hidden=isCamera;if(!isCamera)stopCamera();render();}
function stopCamera(){state.request++;state.controller?.abort();state.stream?.getTracks().forEach(t=>t.stop());state.stream=null;state.ready=false;state.connecting=false;$('camera-video').srcObject=null;$('camera-status').textContent='PHOTO BOOTH';render();}
async function startCamera(){
  if(state.connecting||busy()||state.ready)return;
  cameraError('');
  if(!window.isSecureContext){cameraError('카메라를 사용하려면 HTTPS 주소로 열어주세요. 앨범 사진은 지금도 불러올 수 있어요.');return;}
  if(!navigator.mediaDevices?.getUserMedia){cameraError('이 브라우저에서는 카메라를 열 수 없어요. Safari 또는 Chrome으로 열거나 앨범에서 사진을 골라주세요.');return;}
  state.connecting=true;const request=++state.request;render();
  let stream;
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:state.facing},width:{ideal:1920},height:{ideal:1440},aspectRatio:{ideal:4/3}},audio:false});
    if(request!==state.request||document.hidden){stream.getTracks().forEach(t=>t.stop());return;}
    state.stream=stream;const video=$('camera-video');video.srcObject=stream;await video.play();
    if(video.readyState<2)await new Promise((resolve,reject)=>{const cleanup=()=>{clearTimeout(timer);video.removeEventListener('loadeddata',loaded);};const loaded=()=>{cleanup();resolve();};const timer=setTimeout(()=>{cleanup();reject(new Error('카메라 연결이 지연되고 있어요. 다시 켜주세요.'));},12000);video.addEventListener('loadeddata',loaded,{once:true});if(video.readyState>=2)loaded();});
    if(request!==state.request){stream.getTracks().forEach(t=>t.stop());return;}
    const settings=stream.getVideoTracks()[0].getSettings();if(['user','environment'].includes(settings.facingMode))state.facing=settings.facingMode;
    state.ready=true;state.connecting=false;$('camera-status').textContent='READY TO POSE';
    stream.getVideoTracks()[0].addEventListener('ended',()=>{if(state.stream===stream){stopCamera();cameraError('카메라 연결이 끊겼어요. 다시 켜면 이어서 촬영할 수 있어요.');}});
  }catch(error){
    stream?.getTracks().forEach(t=>t.stop());if(request!==state.request)return;state.stream=null;state.ready=false;state.connecting=false;
    const messages={NotAllowedError:'카메라 권한이 필요해요. 브라우저의 사이트 설정에서 허용한 뒤 다시 켜주세요. 앨범 사진으로도 만들 수 있어요.',NotFoundError:'사용할 수 있는 카메라가 없어요. 앨범에서 사진을 선택해 주세요.',NotReadableError:'다른 앱에서 카메라를 사용 중일 수 있어요. 카메라를 사용하는 앱을 닫고 다시 켜주세요.',OverconstrainedError:'이 카메라로 연결하지 못했어요. 다른 카메라나 앨범 사진을 이용해 주세요.'};
    cameraError(messages[error.name]||error.message||'카메라 연결에 실패했어요. 다시 시도해 주세요.');
  }finally{if(request===state.request){state.connecting=false;render();}}
}
function beep(final=false){if(!state.sound||!audioContext||audioContext.state!=='running')return;try{const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.frequency.value=final?1100:760;gain.gain.setValueAtTime(.035,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.1);oscillator.start();oscillator.stop(audioContext.currentTime+.11);}catch{}}
function prepareSound(){if(!state.sound)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){audioContext??=new Audio();void audioContext.resume().catch(()=>{});}}catch{}}
async function normalizedPhoto(file,name){
  let inputURL=URL.createObjectURL(file),outputURL;
  try{const image=await imageFromURL(inputURL);if(image.naturalWidth*image.naturalHeight>48000000)throw new Error('사진 해상도가 너무 커요. 48MP 이하 사진을 골라주세요.');
    const scale=Math.min(1,2400/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await blobFromCanvas(canvas,'image/jpeg',.95);outputURL=URL.createObjectURL(blob);const normalized=await imageFromURL(outputURL);canvas.width=canvas.height=1;return {id:`photo-${nextId++}`,name,url:outputURL,image:normalized};
  }catch(error){if(outputURL)URL.revokeObjectURL(outputURL);throw error;}finally{URL.revokeObjectURL(inputURL);}
}
async function importPhotos(files){
  if(busy())return;const all=Array.from(files);if(!all.length)return;
  const remaining=8-state.photos.length;if(remaining<=0){toast('최대 8장까지 담을 수 있어요. 사진을 지운 뒤 추가해 주세요.');return;}
  const items=all.slice(0,remaining);state.importing=true;render();let added=0,failed=[];
  toast('사진을 불러오고 있어요…');
  try{for(const file of items){if((file.type&&!file.type.startsWith('image/'))||file.size>20*1024*1024){failed.push('사진 형식과 20MB 크기 제한을 확인해 주세요.');continue;}try{const photo=await normalizedPhoto(file,file.name);addPhoto(photo);added++;}catch(error){failed.push(error.message);}}}
  finally{state.importing=false;$('file-input').value='';render();}
  if(failed.length)toast(`${added}장을 불러왔어요. ${failed[0]}`);else toast(`${added}장을 담았어요.${all.length>remaining?' 최대 8장까지만 불러왔어요.':' 네 장을 골라주세요.'}`);
}
async function captureFrame(signal){
  const video=$('camera-video');if(!state.ready||video.readyState<2||!video.videoWidth)throw new Error('카메라 화면이 준비되지 않았어요. 다시 켜주세요.');
  const crop=cropRect(video.videoWidth,video.videoHeight,4,3),scale=Math.min(1,1920/crop.w),canvas=document.createElement('canvas');canvas.width=Math.round(crop.w*scale);canvas.height=Math.round(crop.h*scale);const ctx=canvas.getContext('2d');
  if(state.facing==='user'&&state.mirror){ctx.translate(canvas.width,0);ctx.scale(-1,1);}ctx.drawImage(video,crop.x,crop.y,crop.w,crop.h,0,0,canvas.width,canvas.height);
  const blob=await blobFromCanvas(canvas,'image/jpeg',.96);if(signal.aborted)throw new DOMException('촬영 중단','AbortError');const url=URL.createObjectURL(blob);
  try{const image=await imageFromURL(url);if(signal.aborted)throw new DOMException('촬영 중단','AbortError');return {id:`photo-${nextId++}`,name:`촬영 ${state.photos.length+1}`,url,image};}catch(error){URL.revokeObjectURL(url);throw error;}finally{canvas.width=canvas.height=1;}
}
async function startCapture(){
  if(state.capturing){state.controller?.abort();return;}
  if(!state.ready||busy()||state.photos.length>=8)return;prepareSound();cameraError('');
  const count=Math.min(Number($('shot-count').value),8-state.photos.length),seconds=Number($('timer').value);state.capturing=true;const controller=new AbortController();state.controller=controller;render();let taken=0;
  try{for(let shot=0;shot<count;shot++){
    $('camera-status').textContent=`${shot+1} / ${count} · 포즈를 바꿔보세요`;
    for(let left=seconds;left>0;left--){$('countdown').hidden=false;$('countdown').textContent=String(left);beep();await defer(1000,controller.signal);}
    $('countdown').hidden=true;const photo=await captureFrame(controller.signal);beep(true);$('capture-flash').hidden=false;addPhoto(photo);taken++;
    await defer(280,controller.signal);$('capture-flash').hidden=true;
  }toast(`${taken}장 촬영 완료! 마음에 드는 네 장을 골라주세요.`);
  }catch(error){if(error.name==='AbortError')toast('촬영을 멈췄어요. 이미 찍은 사진은 그대로 있어요.');else{cameraError(error.message||'촬영하지 못했어요. 다시 시도해 주세요.');}}
  finally{state.capturing=false;state.controller=null;$('countdown').hidden=true;$('capture-flash').hidden=true;$('camera-status').textContent=state.ready?'READY TO POSE':'PHOTO BOOTH';render();}
}
function drawStrip(canvas,width,{sample=false}={}){
  return renderStrip(canvas,width,{images:state.selected.map(id=>state.photos.find(p=>p.id===id)?.image),frame:state.frame,filter:state.filter,caption:state.caption,showDate:state.showDate,date:state.date,sample:sample?state.sample:null});
}
function schedulePreview(){if(previewQueued)return;previewQueued=true;requestAnimationFrame(()=>{previewQueued=false;try{drawStrip($('strip-preview'),400,{sample:state.photos.length===0});}catch{toast('미리보기를 그리지 못했어요. 사진을 다시 선택해 주세요.');}});}
async function finishImage(){
  if(state.selected.length!==4)throw new Error('사진 네 장을 먼저 골라주세요.');if(busy())throw new Error('현재 작업이 끝난 뒤 다시 시도해 주세요.');
  state.exporting=true;render();
  try{await new Promise(resolve=>requestAnimationFrame(()=>resolve()));const canvas=document.createElement('canvas');drawStrip(canvas,1200);const blob=await blobFromCanvas(canvas);canvas.width=canvas.height=1;
    if(state.exportURL)URL.revokeObjectURL(state.exportURL);state.exportURL=URL.createObjectURL(blob);$('result-image').src=state.exportURL;$('download-image').href=state.exportURL;$('download-image').download=`fourfold-${state.date.replaceAll('.','-')}.png`;
    if(!$('result-dialog').open)$('result-dialog').showModal();return {completed:true,width:1200,height:3600,format:'png',message:'완성 이미지를 표시했습니다. 다운로드 버튼으로 저장할 수 있습니다.'};
  }finally{state.exporting=false;render();}
}
function reset(){
  stopCamera();state.photos.forEach(p=>URL.revokeObjectURL(p.url));state.photos=[];state.selected=[];state.frame='milk';state.filter='original';state.caption='';state.showDate=true;state.date=localDate();state.mirror=true;state.facing='user';$('caption').value='';$('show-date').checked=true;$('timer').value='3';$('shot-count').value='8';$('file-input').value='';cameraError('');
  if(state.exportURL){URL.revokeObjectURL(state.exportURL);state.exportURL=null;}$('result-image').removeAttribute('src');$('download-image').removeAttribute('href');$('reset-dialog').close();setSource('camera');render();window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
for(const frame of FRAMES){const button=document.createElement('button');button.type='button';button.className='swatch';button.style.backgroundColor=frame.color;button.style.color=frame.ink;button.dataset.frame=frame.id;button.setAttribute('aria-label',`${frame.name} 프레임`);button.title=frame.name;button.addEventListener('click',()=>{if(state.exporting)return;state.frame=frame.id;render();});$('frame-swatches').append(button);}
for(const filter of FILTERS){const button=document.createElement('button');button.type='button';button.className='filter-button';button.textContent=filter.name;button.dataset.filter=filter.id;button.addEventListener('click',()=>{if(state.exporting)return;state.filter=filter.id;render();});$('filter-options').append(button);}
$('camera-tab').addEventListener('click',()=>setSource('camera'));$('upload-tab').addEventListener('click',()=>setSource('upload'));
for(const [id,other,source] of [['camera-tab','upload-tab','upload'],['upload-tab','camera-tab','camera']])$(id).addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)&&!busy()){e.preventDefault();setSource(source);$(other).focus();}});
$('enable-camera').addEventListener('click',startCamera);$('capture-button').addEventListener('click',startCapture);$('shot-count').addEventListener('change',render);
$('flip-camera').addEventListener('click',()=>{if(busy())return;state.facing=state.facing==='user'?'environment':'user';stopCamera();void startCamera();});
$('mirror-camera').addEventListener('click',()=>{state.mirror=!state.mirror;render();});
$('sound-button').addEventListener('click',()=>{state.sound=!state.sound;$('sound-button').setAttribute('aria-pressed',String(state.sound));toast(state.sound?'안내음을 켰어요.':'안내음을 껐어요.');});
for(const id of ['choose-photos','add-photos'])$(id).addEventListener('click',()=>{if(!busy())$('file-input').click();});
$('file-input').addEventListener('change',e=>{void importPhotos(e.target.files).catch(error=>toast(error.message));});
const zone=$('drop-zone');for(const event of ['dragenter','dragover'])zone.addEventListener(event,e=>{e.preventDefault();zone.classList.add('dragging');});for(const event of ['dragleave','drop'])zone.addEventListener(event,e=>{e.preventDefault();zone.classList.remove('dragging');});zone.addEventListener('drop',e=>{void importPhotos(e.dataTransfer.files).catch(error=>toast(error.message));});
$('caption').addEventListener('input',e=>{state.caption=e.target.value.slice(0,24);$('caption-count').textContent=`${state.caption.length}/24`;schedulePreview();});$('show-date').addEventListener('change',e=>{state.showDate=e.target.checked;schedulePreview();});
$('finish-button').addEventListener('click',()=>{void finishImage().catch(error=>toast(error.message));});
for(const id of ['close-result','continue-editing'])$(id).addEventListener('click',()=>$('result-dialog').close());
$('result-dialog').addEventListener('click',e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();}});
$('reset-button').addEventListener('click',()=>{if(busy())return;if(state.photos.length)$('reset-dialog').showModal();else reset();});$('cancel-reset').addEventListener('click',()=>$('reset-dialog').close());$('confirm-reset').addEventListener('click',reset);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(state.stream||state.connecting)){const wasCapturing=state.capturing;stopCamera();if(wasCapturing)cameraError('화면을 벗어나 촬영을 멈췄어요. 카메라를 켜면 이어서 촬영할 수 있어요.');}});
window.addEventListener('pagehide',()=>{state.controller?.abort();state.request++;state.stream?.getTracks().forEach(t=>t.stop());state.stream=null;state.ready=false;state.connecting=false;});
window.addEventListener('pageshow',e=>{if(e.persisted){$('camera-video').srcObject=null;render();}});
imageFromURL(new URL('./sample.jpg',import.meta.url).href).then(image=>{state.sample=image;schedulePreview();}).catch(()=>{});
render();

// Optional agent interface. It shares the visible editor's state and never uploads photos.
const modelContext=document.modelContext;
if(modelContext?.registerTool){
  const lifecycle=new AbortController();
  const tools=[
    {name:'read_photobooth_state',title:'네 컷 편집 상태 확인',description:'현재 사진 ID, 선택 순서와 프레임 설정을 확인합니다. 사진 파일 자체는 반환하지 않습니다.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>snapshot()},
    {name:'configure_photo_strip',title:'네 컷 꾸미기',description:'현재 네 컷의 프레임, 필터, 문구와 날짜 표시를 변경합니다. 완성 파일은 별도로 만듭니다.',inputSchema:{type:'object',properties:{frame:{type:'string',enum:FRAMES.map(f=>f.id)},filter:{type:'string',enum:FILTERS.map(f=>f.id)},caption:{type:'string',maxLength:24},showDate:{type:'boolean'}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},async execute(input){if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('설정 객체가 필요합니다.');if(busy())throw new Error('현재 작업이 진행 중입니다.');if(Object.keys(input).some(k=>!['frame','filter','caption','showDate'].includes(k)))throw new Error('알 수 없는 설정입니다.');if(input.frame!==undefined&&!FRAMES.some(f=>f.id===input.frame))throw new Error('유효하지 않은 프레임입니다.');if(input.filter!==undefined&&!FILTERS.some(f=>f.id===input.filter))throw new Error('유효하지 않은 필터입니다.');if(input.caption!==undefined&&(typeof input.caption!=='string'||input.caption.length>24))throw new Error('문구는 24자 이하 문자열이어야 합니다.');if(input.showDate!==undefined&&typeof input.showDate!=='boolean')throw new Error('날짜 설정은 참 또는 거짓이어야 합니다.');Object.assign(state,input);$('caption').value=state.caption;$('show-date').checked=state.showDate;render();await new Promise(resolve=>requestAnimationFrame(resolve));return snapshot();}},
    {name:'select_strip_photos',title:'네 컷 사진 선택',description:'이미 불러온 사진의 ID를 원하는 순서로 최대 네 개 선택합니다.',inputSchema:{type:'object',properties:{photoIds:{type:'array',items:{type:'string'},maxItems:4,uniqueItems:true}},required:['photoIds'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},async execute(input){if(busy())throw new Error('현재 작업이 진행 중입니다.');const ids=input?.photoIds;if(!Array.isArray(ids)||ids.length>4||new Set(ids).size!==ids.length||ids.some(id=>!state.photos.some(p=>p.id===id)))throw new Error('기존 사진 ID를 중복 없이 최대 네 개 선택하세요.');state.selected=[...ids];render();await new Promise(resolve=>requestAnimationFrame(resolve));return snapshot();}},
    {name:'create_strip_image',title:'네 컷 이미지 완성',description:'선택한 네 장을 1200×3600 PNG 이미지로 합성하고 완성 화면에 표시합니다. 파일 다운로드는 사용자가 버튼을 누릅니다.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:finishImage}
  ];
  for(const tool of tools){try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
  window.addEventListener('pagehide',e=>{if(!e.persisted)lifecycle.abort();},{once:true});
}
