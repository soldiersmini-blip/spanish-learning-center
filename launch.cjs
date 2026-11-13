'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const file=path.join(__dirname,'runtime','connection.json');
async function current(){
 try{const c=JSON.parse(fs.readFileSync(file,'utf8'));const url=new URL(c.url);if(url.hostname!=='127.0.0.1'||url.protocol!=='http:')return null;
 const r=await fetch(c.url+'/api/state',{headers:{Authorization:'Bearer '+c.token},signal:AbortSignal.timeout(1000)});return r.ok?c:null;}catch{return null;}
}
async function main(){
 let connection=await current();
 if(!connection){
  const child=spawn(process.execPath,[path.join(__dirname,'server.cjs')],{cwd:__dirname,detached:true,windowsHide:true,stdio:'ignore'});
  let failed=false;child.on('error',()=>{failed=true});child.unref();
  for(let i=0;i<40&&!connection&&!failed;i++){await new Promise(r=>setTimeout(r,250));connection=await current();}
  if(!connection)throw new Error('SERVER_START_FAILED');
 }
 const edge=path.join(process.env['ProgramFiles(x86)']||'C:\\Program Files (x86)','Microsoft','Edge','Application','msedge.exe');
 if(!fs.existsSync(edge))throw new Error('EDGE_NOT_FOUND: use node server.cjs and a local browser');
 const browser=spawn(edge,['--app='+connection.url+'/#'+connection.token,'--new-window'],{detached:true,stdio:'ignore',windowsHide:false});
 browser.on('error',()=>{console.error('BROWSER_START_FAILED');process.exitCode=1});browser.unref();
 console.log('Command center opened. Real generation is performed by the authorized Codex executor.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
