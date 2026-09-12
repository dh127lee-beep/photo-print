import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINT_SIZES,DEFAULT_PRINT_SIZE,DEFAULT_TEMPLATE,DEFAULT_SHOT_COUNT,printSize,TEMPLATES,templateLayout} from '../core.mjs';
import {withPrintDensity} from '../print.mjs';

test('default is four photos on a 4 × 6 inch sheet at 300dpi',()=>{
  assert.equal(DEFAULT_SHOT_COUNT,4);
  assert.equal(DEFAULT_PRINT_SIZE,'4x6');
  const size=printSize();
  assert.deepEqual([size.width,size.height,size.dpi],[1200,1800,300]);
  assert.equal(templateLayout(DEFAULT_TEMPLATE,1200).slots.length,4);
  for(const size of PRINT_SIZES){
    const [w,h]=size.id.split('x').map(Number);
    assert.equal(size.width/size.dpi,w);assert.equal(size.height/size.dpi,h);
  }
  assert.throws(()=>printSize('invalid'),/인화 규격/);
});

test('every print design retains four finite photo windows at preview and print sizes',()=>{
  for(const template of TEMPLATES){
    for(const width of [600,...PRINT_SIZES.map(size=>size.width)]){
      const layout=templateLayout(template.id,width);
      assert.equal(layout.slots.length,4,template.id);
      for(const slot of layout.slots){
        assert.ok([slot.x,slot.y,slot.w,slot.h,slot.rot].every(Number.isFinite));
        assert.ok(slot.w>0&&slot.h>0);
        assert.ok(slot.x>=0&&slot.y>=0);
        assert.ok(slot.x+slot.w<=layout.width+.001);
        assert.ok(slot.y+slot.h<=layout.height);
      }
    }
  }
});

const fixture=new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1cAAAAASUVORK5CYII=','base64')],{type:'image/png'});
function chunks(bytes){
  const list=[];
  for(let at=8;at<bytes.length;){
    const length=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8);
    list.push({type,data:bytes.subarray(at+8,at+8+length),raw:bytes.subarray(at,at+length+12)});at+=length+12;
  }
  return list;
}

test('PNG stores 300dpi without changing image data and replaces existing density',async()=>{
  const source=Buffer.from(await fixture.arrayBuffer());
  const once=await withPrintDensity(fixture,96),output=await withPrintDensity(once,300);
  assert.equal(output.type,'image/png');
  const result=chunks(Buffer.from(await output.arrayBuffer()));
  const density=result.filter(c=>c.type==='pHYs');assert.equal(density.length,1);
  assert.equal(result[0].type,'IHDR');assert.equal(result[1].type,'pHYs');
  assert.equal(density[0].data.readUInt32BE(0),11811);
  assert.equal(density[0].data.readUInt32BE(4),11811);
  assert.equal(density[0].data[8],1);
  // Known CRC for pHYs: 11811 pixels per meter on both axes, meter units.
  assert.equal(density[0].raw.readUInt32BE(17),0x78a53f76);
  assert.deepEqual(result.filter(c=>c.type!=='pHYs').map(c=>c.raw),chunks(source).map(c=>c.raw));
});

test('invalid or truncated PNGs fail instead of producing a corrupt download',async()=>{
  await assert.rejects(withPrintDensity(new Blob(['not a png'])),/PNG/);
  const bytes=new Uint8Array(await fixture.arrayBuffer());
  await assert.rejects(withPrintDensity(new Blob([bytes.subarray(0,20)])),/PNG/);
});
