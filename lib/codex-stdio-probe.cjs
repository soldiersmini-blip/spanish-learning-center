'use strict';
const {spawn}=require('node:child_process');
// Task-owned stdio, read-only RPC. No thread starts, turns, token files or raw logs.
const READ_METHODS=new Set(['initialize','account/read','modelProvider/capabilities/read','model/list']);
async function probe({executable=process.env.WORKBENCH_CODEX||'codex',timeoutMs=15000,spawnProcess=spawn,includeModels=false}={}){
 const result={status:'unavailable',sampledAt:new Date().toISOString(),transport:'stdio',connectionClosed:false,realImageVerified:false,inferenceVerified:false,threadStarts:0,imageCalls:0};
 let child,buffer='',seq=0,closed=false,timer;const pending=new Map();
 function abort(code){closed=true;for(const p of pending.values())p.reject(Error(code));pending.clear();}
 const rpc=(method,params)=>new Promise((resolve,reject)=>{
  if(!READ_METHODS.has(method)||closed)return reject(Error('CONNECTION_CLOSED'));
  const id=++seq;pending.set(id,{resolve,reject});child.stdin.write(JSON.stringify({id,method,params})+'\n');
 });
 try{
  child=spawnProcess(executable,['app-server','--listen','stdio://'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  child.on('error',e=>abort(e.code==='ENOENT'?'CODEX_NOT_FOUND':e.code==='EPERM'?'PROCESS_START_DENIED':'PROCESS_START_FAILED'));
  child.on('close',()=>abort('TRANSPORT_CLOSED'));child.stderr.on('data',()=>{});child.stdin.on('error',()=>abort('PIPE_CLOSED'));
  child.stdout.on('data',chunk=>{
   buffer+=chunk.toString();if(Buffer.byteLength(buffer)>1048576){abort('PROTOCOL_FRAME_LIMIT');child.kill();return;}
   for(let i;(i=buffer.indexOf('\n'))>=0;){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);let m;try{m=JSON.parse(line);}catch{continue;}
    if(m.method){if(m.id!==undefined)child.stdin.write(JSON.stringify({id:m.id,error:{code:-32601,message:'Read-only client does not handle server requests'}})+'\n');continue;}
    const p=pending.get(m.id);if(!p)continue;pending.delete(m.id);m.error?p.reject(Error('RPC_REJECTED')):p.resolve(m.result);
   }
  });
  timer=setTimeout(()=>{abort('PROBE_TIMEOUT');child.kill();},timeoutMs);
  await rpc('initialize',{clientInfo:{name:'linarchive_workbench_probe',title:'LinArchive Workbench',version:'0.2.0'},capabilities:{experimentalApi:true}});
  child.stdin.write(JSON.stringify({method:'initialized',params:{}})+'\n');result.status='connected-read-only';
  const account=await rpc('account/read',{refreshToken:false});result.accountType=account?.account?.type||'unknown';result.planType=account?.account?.planType||'unknown';result.accountPresent=!!account?.account;
  try{const c=await rpc('modelProvider/capabilities/read',{});result.providerCapabilities={imageGeneration:c?.imageGeneration===true,webSearch:c?.webSearch===true};}catch(e){result.capabilityError=e.message;}
  if(includeModels){const list=await rpc('model/list',{includeHidden:false,limit:30});result.models=(list.data||[]).slice(0,30).map(m=>({id:m.id,model:m.model,displayName:m.displayName,isDefault:m.isDefault}));result.catalogOnly=true;result.liveCapacityVerified=false;result.hasMoreModels=!!list.nextCursor;}
 }catch(e){result.status='unavailable';result.errorCode=/^[A-Z0-9_]+$/.test(e.message)?e.message:'PROBE_FAILED';}
 finally{clearTimeout(timer);abort('PROBE_FINISHED');child?.stdin.end();child?.kill();result.connectionClosed=true;}
 return result;
}
module.exports={probe};
