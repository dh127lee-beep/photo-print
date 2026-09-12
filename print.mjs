// Canvas PNGs default to screen density. Store the selected print density in pHYs.
function crc32(bytes){
  let crc=0xffffffff;
  for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
export async function withPrintDensity(blob,dpi=300){
  const input=new Uint8Array(await blob.arrayBuffer()),view=new DataView(input.buffer);
  const signature=[137,80,78,71,13,10,26,10];
  if(!signature.every((byte,i)=>input[i]===byte))throw new Error('PNG 파일이 올바르지 않습니다.');
  const chunk=new Uint8Array(21),data=new DataView(chunk.buffer);
  data.setUint32(0,9);chunk.set([112,72,89,115],4);
  const pixelsPerMeter=Math.round(dpi/.0254);
  data.setUint32(8,pixelsPerMeter);data.setUint32(12,pixelsPerMeter);chunk[16]=1;
  data.setUint32(17,crc32(chunk.subarray(4,17)));
  const parts=[input.subarray(0,8)];let inserted=false;
  for(let offset=8;offset<input.length;){
    if(offset+12>input.length)throw new Error('PNG 청크가 올바르지 않습니다.');
    const end=offset+view.getUint32(offset)+12;
    if(end>input.length)throw new Error('PNG 청크가 올바르지 않습니다.');
    const type=String.fromCharCode(...input.subarray(offset+4,offset+8));
    if(type!=='pHYs')parts.push(input.subarray(offset,end));
    if(type==='IHDR'&&!inserted){parts.push(chunk);inserted=true;}
    offset=end;
  }
  return new Blob(parts,{type:'image/png'});
}
