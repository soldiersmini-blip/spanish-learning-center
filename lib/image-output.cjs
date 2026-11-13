'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
function createImageOutput({runtime,project=require('./workspace-paths.cjs').PROJECT,legacyDirectory=path.join(runtime,'api-image-trial','by-sha')}={}){
 const file=path.join(runtime,'IMAGE-OUTPUT-SETTINGS.json');
 const native=path.resolve(project,'../../CodexGlobalData/generated_images'),cas=path.join(project,'staff/02-spanish-engineering/image-asset-store/sha256');
 const same=(a,b)=>path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase();
 function read(){if(!fs.existsSync(file))return {directory:path.resolve(legacyDirectory),history:[]};if(fs.statSync(file).size>32768)throw Error('OUTPUT_SETTINGS_SIZE');const s=JSON.parse(fs.readFileSync(file,'utf8'));if(!path.isAbsolute(s.directory)||!Array.isArray(s.history)||s.history.length>32||s.history.some(p=>typeof p!=='string'||!path.isAbsolute(p)))throw Error('OUTPUT_SETTINGS_INVALID');return s;}
 function allowed(dir){const s=read();return [legacyDirectory,s.directory,...s.history].some(p=>same(p,dir));}
 function snapshot(){const s=read();return {apiDirectory:s.directory,proDirectory:native,casDirectory:cas};}
 function save(directory){
  if(typeof directory!=='string'||directory.length>1000||!path.isAbsolute(directory)||/^[\\/]{2}|[\0\r\n]/.test(directory))throw Error('OUTPUT_DIRECTORY_ABSOLUTE_LOCAL_REQUIRED');
  const dir=path.resolve(directory.trim());if(dir===path.parse(dir).root)throw Error('OUTPUT_DIRECTORY_ROOT_REJECTED');
  if([native,cas].some(p=>same(dir,p)||dir.toLowerCase().startsWith(path.resolve(p).toLowerCase()+path.sep)))throw Error('OUTPUT_DIRECTORY_MANAGED_STORE');
  const old=read(),history=[...new Set([legacyDirectory,...old.history,old.directory].map(p=>path.resolve(p)))].filter(p=>!same(p,dir));if(history.length>32)throw Error('OUTPUT_DIRECTORY_HISTORY_LIMIT');
  fs.mkdirSync(dir,{recursive:true});const real=fs.realpathSync(dir).toLowerCase();
  if([native,cas].filter(p=>fs.existsSync(p)).some(p=>{const r=fs.realpathSync(p).toLowerCase();return real===r||real.startsWith(r+path.sep);}))throw Error('OUTPUT_DIRECTORY_MANAGED_STORE');
  const probe=path.join(dir,'.linarchive-write-'+randomUUID());fs.writeFileSync(probe,'',{flag:'wx'});fs.unlinkSync(probe);
  fs.mkdirSync(runtime,{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify({directory:dir,history}));fs.renameSync(file+'.tmp',file);return snapshot();
 }
 return {read,save,snapshot,allowed};
}
module.exports={createImageOutput};
