'use strict';
// Static PNG pixel-stream validation, following W3C PNG critical-chunk and filtering rules.
// Ancillary metadata is CRC-checked but not decompressed/interpreted. No native image library.
const {inflateSync,crc32}=require('node:zlib');
const LIMITS=Object.freeze({fileBytes:32*1024*1024,dimension:8192,pixels:16*1024*1024,decodedBytes:128*1024*1024,chunks:4096});
const SIGNATURE=Buffer.from('89504e470d0a1a0a','hex');
const DEPTHS={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]},CHANNELS={0:1,2:3,3:1,4:2,6:4};
const ADAM7=[[0,0,8,8],[4,0,8,8],[0,4,4,8],[2,0,4,4],[0,2,2,4],[1,0,2,2],[0,1,1,2]];
const fail=code=>{throw Error('PNG_'+code);};
function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
function validatePNG(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<57||bytes.length>LIMITS.fileBytes||!bytes.subarray(0,8).equals(SIGNATURE))fail('SIZE_OR_SIGNATURE');
 let offset=8,count=0,header=null,palette=0,seenData=false,endedData=false,ended=false,transparency=false;const parts=[];
 while(offset<bytes.length){
  if(++count>LIMITS.chunks)fail('CHUNK_LIMIT');
  if(bytes.length-offset<12)fail('TRUNCATED_CHUNK');
  const length=bytes.readUInt32BE(offset),end=offset+12+length;if(length>0x7fffffff||end>bytes.length)fail('TRUNCATED_CHUNK');
  const type=bytes.toString('ascii',offset+4,offset+8),rawType=bytes.subarray(offset+4,offset+8);
  if(!rawType.every(c=>c>=65&&c<=90||c>=97&&c<=122)||rawType[2]&32)fail('CHUNK_TYPE');
  if(crc32(bytes.subarray(offset+4,end-4))!==bytes.readUInt32BE(end-4))fail('CRC');
  const data=bytes.subarray(offset+8,end-4);
  if(!header&&type!=='IHDR')fail('IHDR_FIRST');
  if(type==='IHDR'){
   if(header||length!==13)fail('IHDR');
   const width=data.readUInt32BE(0),height=data.readUInt32BE(4),depth=data[8],color=data[9],interlace=data[12];
   if(!width||!height||width>LIMITS.dimension||height>LIMITS.dimension||width*height>LIMITS.pixels)fail('DIMENSIONS');
   if(!DEPTHS[color]?.includes(depth)||data[10]!==0||data[11]!==0||interlace>1)fail('IHDR_FORMAT');
   header={width,height,depth,color,interlace};
  }else if(type==='PLTE'){
   if(palette||seenData||transparency||[0,4].includes(header.color)||!length||length%3||length>768||header.color===3&&length/3>2**header.depth)fail('PALETTE');
   palette=length/3;
  }else if(type==='IDAT'){
   if(endedData||header.color===3&&!palette)fail('IDAT_ORDER');
   seenData=true;parts.push(data);
  }else if(type==='IEND'){
   if(length||!seenData)fail('IEND');
   ended=true;offset=end;break;
  }else{
   if(type==='tRNS'){
    if(transparency||seenData||header.color===0&&length!==2||header.color===2&&length!==6||header.color===3&&(!palette||!length||length>palette)||[4,6].includes(header.color))fail('TRANSPARENCY');
    transparency=true;
   }
   if(['acTL','fcTL','fdAT'].includes(type))fail('ANIMATION_UNSUPPORTED');
   if(!(rawType[0]&32))fail('UNKNOWN_CRITICAL_CHUNK');
  }
  if(seenData&&type!=='IDAT')endedData=true;
  offset=end;
 }
 if(!ended||offset!==bytes.length||!parts.length)fail('INCOMPLETE_STREAM');
 const {width,height,depth,color,interlace}=header,bits=CHANNELS[color]*depth,bpp=Math.max(1,Math.ceil(bits/8));
 const passes=(interlace?ADAM7:[[0,0,1,1]]).map(([x,y,dx,dy])=>{
  const columns=Math.max(0,Math.ceil((width-x)/dx)),rows=Math.max(0,Math.ceil((height-y)/dy));
  return {columns,rows:columns?rows:0,rowBytes:Math.ceil(columns*bits/8)};
 });
 const expected=passes.reduce((n,p)=>n+p.rows*(p.rowBytes+1),0);if(!expected||expected>LIMITS.decodedBytes)fail('DECODE_LIMIT');
 let pixels;try{pixels=inflateSync(Buffer.concat(parts),{maxOutputLength:expected});}catch{fail('DEFLATE');}
 // No Z_SYNC_FLUSH: require a complete zlib stream including its Adler-32.
 if(pixels.length!==expected)fail('PIXEL_LENGTH');
 let cursor=0;
 for(const pass of passes){
  let previous=null;
  for(let y=0;y<pass.rows;y++){
   const filter=pixels[cursor++];if(filter>4)fail('FILTER');
   const row=pixels.subarray(cursor,cursor+pass.rowBytes);cursor+=pass.rowBytes;
   if(filter)for(let x=0;x<row.length;x++){
    const left=x>=bpp?row[x-bpp]:0,up=previous?previous[x]:0,upperLeft=previous&&x>=bpp?previous[x-bpp]:0;
    row[x]=(row[x]+(filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):paeth(left,up,upperLeft)))&255;
   }
   if(color===3){const mask=(1<<depth)-1;for(let x=0;x<pass.columns;x++){const bit=x*depth,index=(row[bit>>3]>>(8-depth-(bit&7)))&mask;if(index>=palette)fail('PALETTE_INDEX');}}
   previous=row;
  }
 }
 return {...header,decodedBytes:expected,fileBytes:bytes.length};
}
module.exports={validatePNG,LIMITS};
