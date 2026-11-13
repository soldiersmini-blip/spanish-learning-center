'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{randomUUID}=require('node:crypto');
const {StringDecoder}=require('node:string_decoder');
const LEAD='01a13637-abd8-7151-9fdd-cae83f313ba1';
// Preparation creates an application-owned context. Only the verified execution adapter can arm turn/start.
class NativePreparation {
 constructor({runtime,cwd,spawnProcess=spawn,requestTimeoutMs=30000,idleMs=30*60*1000,host=null,threadConfig=null}){
  Object.assign(this,{runtime,cwd,spawnProcess,requestTimeoutMs,idleMs,host,threadConfig});this.file=path.join(runtime,'NATIVE-PREPARE-CURRENT.json');this.pending=new Map();this.seq=0;this.active=false;
  if(fs.existsSync(this.file)){if(fs.statSync(this.file).size>8192)throw Error('NATIVE_RECEIPT_SIZE');this.receipt=JSON.parse(fs.readFileSync(this.file,'utf8'));if(['preparing','prepared','executing'].includes(this.receipt.state)){this.receipt={...this.receipt,state:'disconnected',connectionAlive:false,reason:'SERVER_RESTART_REQUIRES_NEW_PREPARATION'};this.save();}}
 }
 save(){this.receipt.updatedAt=new Date().toISOString();const b=JSON.stringify(this.receipt,null,2);if(Buffer.byteLength(b)>8192)throw Error('NATIVE_RECEIPT_SIZE');fs.writeFileSync(this.file+'.tmp',b);fs.renameSync(this.file+'.tmp',this.file);}
 status(){return this.receipt?{...this.receipt}:{state:'not-prepared',connectionAlive:false,modelTurns:0,imageCalls:0};}
 rpc(method,params){
  if(!['initialize','account/read','modelProvider/capabilities/read','model/list','thread/start','thread/inject_items','thread/read'].includes(method)&&!(method==='turn/start'&&this.executionArmed))throw Error('NATIVE_METHOD_NOT_ALLOWED');
  if(this.host){if(!this.active)return Promise.reject(Error('NATIVE_DISCONNECTED'));return this.host.rpc(method,params);}
  return new Promise((resolve,reject)=>{if(!this.active)return reject(Error('NATIVE_DISCONNECTED'));const id=++this.seq,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('NATIVE_RPC_TIMEOUT'));},this.requestTimeoutMs);this.pending.set(id,{resolve,reject,timer});this.child.stdin.write(JSON.stringify({id,method,params})+'\n');});
 }
 disconnect(code){this.active=false;clearTimeout(this.idleTimer);for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error(code));}this.pending.clear();
  if(this.receipt&&['preparing','prepared','executing'].includes(this.receipt.state)){this.receipt={...this.receipt,state:'disconnected',connectionAlive:false,reason:code};this.save();}this.onDisconnect?.(code);
 }
 async prepare(input){
  if(input.controllerThreadId!==LEAD||typeof input.requestId!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(input.requestId))throw Error('NATIVE_PREPARE_INPUT');
  if(input.durable!==undefined&&typeof input.durable!=='boolean')throw Error('NATIVE_PREPARE_INPUT');
  if(input.model!==undefined&&(typeof input.model!=='string'||!/^[a-zA-Z0-9._-]{1,100}$/.test(input.model)))throw Error('NATIVE_MODEL_INPUT');
  if(this.busyCheck?.())throw Error('NATIVE_EXECUTION_REQUIRES_RECONCILIATION');
  if(this.active){if(this.receipt.requestId===input.requestId&&this.receipt.ephemeral===(input.durable!==true)&&this.receipt.state==='prepared'&&(!input.model||this.receipt.model===input.model))return this.status();throw Error('NATIVE_PREPARATION_ACTIVE');}
  fs.mkdirSync(this.cwd,{recursive:true});fs.mkdirSync(this.runtime,{recursive:true});
  const ephemeral=input.durable!==true;
  this.receipt={schemaVersion:1,prepareId:randomUUID(),requestId:input.requestId,controllerThreadId:LEAD,workerThreadId:null,state:'preparing',transport:'codex-app-server-stdio',ephemeral,connectionAlive:false,executionEnabled:false,modelTurns:0,imageCalls:0,preparedAt:null,expiresAt:null,nativeDirectories:[],logFiles:[],logCoverageVerified:false,applicationReceiptPath:this.file,jobId:null,attemptId:null,inputHash:null,turnId:null,itemId:null};this.save();
  let buffer='',init;const decoder=new StringDecoder('utf8');this.stage='spawn';try{
   if(this.host){
    init=await this.host.open();this.active=true;
    this.releaseHost=this.host.subscribe({notification:(method,p)=>{if(p?.threadId===this.receipt?.workerThreadId)this.onNotification?.(method,p);},disconnect:code=>this.disconnect(code),interactive:(method,p)=>{if(!p?.threadId||p.threadId===this.receipt?.workerThreadId)this.onInteractive?.(method);}});
   }else{
   this.child=this.spawnProcess(process.env.WORKBENCH_CODEX||'codex',['app-server','--listen','stdio://'],{stdio:['pipe','pipe','pipe'],windowsHide:true});this.active=true;
   const owned=this.child,onLost=code=>{if(this.child===owned)this.disconnect(code);};
   owned.on('error',()=>onLost('NATIVE_PROCESS_ERROR'));owned.on('close',()=>onLost('NATIVE_PROCESS_CLOSED'));owned.stderr.on('data',()=>{});owned.stdin.on('error',()=>onLost('NATIVE_PIPE_CLOSED'));
   owned.stdout.on('data',chunk=>{if(this.child!==owned)return;buffer+=decoder.write(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));if(Buffer.byteLength(buffer)>48*1024**2){buffer='';this.disconnect('NATIVE_FRAME_LIMIT');return;}for(let i;(i=buffer.indexOf('\n'))>=0;){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);let m;try{m=JSON.parse(line);}catch{continue;}
    // Server request IDs and client request IDs occupy independent namespaces.
    if(m.method){if(m.id!==undefined){this.onInteractive?.(m.method);owned.stdin.write(JSON.stringify({id:m.id,error:{code:-32601,message:'Interactive approval is not implemented by this client'}})+'\n');}else this.onNotification?.(m.method,m.params);continue;}
    const p=this.pending.get(m.id);if(p){clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(Error('NATIVE_RPC_REJECTED')):p.resolve(m.result);}
   }});
   this.stage='initialize';init=await this.rpc('initialize',{clientInfo:{name:'linarchive_native_prepare',version:'0.1.0'},capabilities:{experimentalApi:true}});this.child.stdin.write(JSON.stringify({method:'initialized',params:{}})+'\n');
   }
   this.stage='account';const account=await this.rpc('account/read',{refreshToken:false});if(account?.account?.type!=='chatgpt')throw Error('NATIVE_CHATGPT_LOGIN_REQUIRED');
   this.stage='capabilities';const caps=await this.rpc('modelProvider/capabilities/read',{});if(caps?.imageGeneration!==true)throw Error('NATIVE_IMAGE_CAPABILITY_UNDECLARED');
   if(input.model){this.stage='model-catalog';const catalog=await this.rpc('model/list',{includeHidden:false,limit:100});if(!catalog?.data?.some(m=>m.model===input.model))throw Error('NATIVE_MODEL_NOT_LISTED');}
   this.stage='thread-start';const started=await this.rpc('thread/start',{cwd:this.cwd,ephemeral,experimentalRawEvents:false,...(this.threadConfig?{config:this.threadConfig}:{}),...(input.model?{model:input.model}:{})});
   if(!started.thread?.id||started.thread.ephemeral!==ephemeral)throw Error('NATIVE_CONTEXT_MODE_MISMATCH');
   this.receipt.workerThreadId=started.thread.id;this.save();
   let threadMetadata=started.thread;
   if(!ephemeral){
    this.stage='preparation-checkpoint';
    await this.rpc('thread/inject_items',{threadId:started.thread.id,items:[{type:'message',role:'developer',content:[{type:'input_text',text:'LinArchive application preparation, worker contract v1. No model turn or image task has started. Await the next authorized task and retain all existing policies. You are a single-asset worker delegated by the Spanish lead, not the research department controller. When the controller submits the frozen drawing requirements, generate exactly one image using the built-in image generation tool and the current logged-in Codex subscription. No API-key fallback, shell-generated illustration, second generation or automatic retry. Leave the original in its native location; the controller imports it once into CAS and the existing teaching reviewer performs independent review. Return only the native output path and a short completion message. Read and obey applicable repository and image-generation instructions; preserve existing permissions and policies.'}]}]});
    const read=await this.rpc('thread/read',{threadId:started.thread.id,includeTurns:false});
    if(read?.thread?.id!==started.thread.id)throw Error('NATIVE_METADATA_IDENTITY');threadMetadata=read.thread;
   }
   this.stage='paths';const native=typeof init.codexHome==='string'?path.join(init.codexHome,'generated_images'):null;
   const dirs=native&&fs.existsSync(native)&&fs.statSync(native).isDirectory()?[fs.realpathSync(native)]:[];
   const log=threadMetadata.path;
   const logFiles=typeof log==='string'&&fs.existsSync(log)&&fs.statSync(log).isFile()?[fs.realpathSync(log)]:[];
   const workerLogVerified=!ephemeral&&logFiles.length===1&&path.basename(logFiles[0]).includes(started.thread.id)&&path.extname(logFiles[0])==='.jsonl';
   this.receipt={...this.receipt,state:'prepared',workerThreadId:started.thread.id,connectionAlive:true,preparedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+this.idleMs).toISOString(),model:started.model,modelProvider:started.modelProvider,providerDeclaresImageGeneration:true,nativeDirectories:dirs,nativeDirectoryBasis:'Existing CODEX_HOME/generated_images only; actual output not yet observed',logFiles,workerLogVerified,logSizes:logFiles.map(p=>({path:p,bytes:fs.statSync(p).size})),logCoverageScope:'Current worker rollout returned by thread/read, not all host diagnostics or global databases',logCoverageVerified:workerLogVerified,rawStdioPersisted:false,rawStderrPersisted:false};this.save();
   this.idleTimer=setTimeout(()=>this.close('PREPARATION_EXPIRED'),this.idleMs);this.idleTimer.unref?.();return this.status();
  }catch(e){this.receipt={...this.receipt,state:'prepare-failed',connectionAlive:false,failureStage:this.stage,errorClass:e.name,errorCode:e.code||null,reason:/^[A-Z0-9_]+$/.test(e.message)?e.message:'NATIVE_PREPARE_FAILED'};this.save();this.disconnect('NATIVE_PREPARE_FAILED');this.releaseHost?.();this.child?.kill();throw Error(this.receipt.reason);}
 }
 close(reason='PREPARATION_CLOSED'){if(this.busyCheck?.())throw Error('NATIVE_EXECUTION_REQUIRES_RECONCILIATION');if(this.receipt){this.receipt={...this.receipt,state:'closed',connectionAlive:false,reason};this.save();}this.releaseHost?.();this.disconnect(reason);this.child?.stdin.end();this.child?.kill();return this.status();}
}
module.exports={NativePreparation};
