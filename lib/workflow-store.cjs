'use strict';
const {AUTHORITY_BYTES}=require('./production-limits.cjs');
const fs=require('node:fs'),path=require('node:path');
function read(file,max=AUTHORITY_BYTES){if(!fs.existsSync(file))return null;const s=fs.statSync(file);if(!s.isFile()||s.size>max)throw Error('WORKFLOW_FILE_SIZE');const b=fs.readFileSync(file);if(b.length>max)throw Error('WORKFLOW_FILE_SIZE');return JSON.parse(b.toString('utf8').replace(/^\uFEFF/,''));}
function write(file,data){const b=JSON.stringify(data,null,2)+'\n';if(Buffer.byteLength(b)>AUTHORITY_BYTES)throw Error('WORKFLOW_FILE_SIZE');const tmp=file+'.tmp';fs.writeFileSync(tmp,b);fs.renameSync(tmp,file);return data;}
function locked(runtime,fn){fs.mkdirSync(runtime,{recursive:true});const file=path.join(runtime,'workflow.lock');let fd;try{fd=fs.openSync(file,'wx');}catch{throw Error('WORKFLOW_BUSY');}try{return fn();}finally{fs.closeSync(fd);fs.unlinkSync(file);}}
module.exports={read,write,locked};
