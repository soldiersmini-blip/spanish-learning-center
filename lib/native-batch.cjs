'use strict';
const {MAX_JOBS,AUTHORITY_BYTES}=require('./production-limits.cjs');
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto'),{EventEmitter}=require('node:events');
const {NativePreparation}=require('./native-preparation.cjs'),{NativeExecution}=require('./native-execution.cjs'),{LEAD}=require('./execution-evidence.cjs');
const {NativeHost}=require('./native-host.cjs');
class NativeBatch {
 constructor({runtime,project,commandRuntime=runtime,makePreparation=opts=>new NativePreparation(opts),makeExecution=opts=>new NativeExecution(opts)}){
  Object.assign(this,{runtime,project,commandRuntime,makePreparation,makeExecution});fs.mkdirSync(runtime,{recursive:true});this.host=new NativeHost();this.file=path.join(runtime,'NATIVE-BATCH-CURRENT.json');this.workers=new Map();this.events=new EventEmitter();this.events.setMaxListeners(MAX_JOBS+4);
  if(fs.existsSync(this.file)){if(fs.statSync(this.file).size>AUTHORITY_BYTES)throw Error('NATIVE_BATCH_SIZE');this.receipt=JSON.parse(fs.readFileSync(this.file,'utf8'));if(!['closed','prepare-failed'].includes(this.receipt.state)){this.receipt.state='disconnected';this.receipt.reason='SERVER_RESTART_REQUIRES_RECONCILIATION';this.save();}}
 }
 save(){if(!this.receipt)return;this.receipt.updatedAt=new Date().toISOString();const b=JSON.stringify(this.receipt,null,2);if(Buffer.byteLength(b)>AUTHORITY_BYTES)throw Error('NATIVE_BATCH_SIZE');fs.writeFileSync(this.file+'.tmp',b);fs.renameSync(this.file+'.tmp',this.file);}
 status(){return this.receipt?JSON.parse(JSON.stringify(this.receipt)):{state:'not-prepared',total:0,entries:[]};}
 busy(){return this.preparing||[...this.workers.values()].some(w=>w.native.busyCheck?.());}
 prepare(input){
  if(input?.controllerThreadId!==LEAD||typeof input.requestId!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(input.requestId)||!Array.isArray(input.jobIds)||!input.jobIds.length||input.jobIds.length>MAX_JOBS||input.jobIds.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9._-]{1,180}$/.test(id))||new Set(input.jobIds).size!==input.jobIds.length)throw Error('NATIVE_BATCH_INPUT');
  if(input.model!==undefined&&(typeof input.model!=='string'||!/^[a-zA-Z0-9._-]{1,100}$/.test(input.model)))throw Error('NATIVE_MODEL_INPUT');
  if(this.receipt){if(this.receipt.requestId===input.requestId&&JSON.stringify(this.receipt.jobIds)===JSON.stringify(input.jobIds)&&(this.receipt.requestedModel||null)===(input.model||null))return this.status();if(this.receipt.state!=='closed'||this.busy()||this.receipt.entries.some(e=>['submitted','running','unknown'].includes(e.state)))throw Error('NATIVE_BATCH_REQUIRES_RECONCILIATION');this.workers.clear();this.host=new NativeHost();this.closing=false;}
  this.receipt={schemaVersion:1,batchPrepareId:randomUUID(),requestId:input.requestId,requestedModel:input.model||null,controllerThreadId:LEAD,state:'preparing',jobIds:input.jobIds,total:input.jobIds.length,prepared:0,entries:[],applicationReceiptPath:this.file};this.preparing=true;this.save();
  this.preparationTask=this.prepareWorkers(input).catch(()=>{this.receipt.state='prepare-failed';this.receipt.reason='NATIVE_BATCH_PREPARATION_FAILED';this.save();}).finally(()=>{this.preparing=false;});
  return this.status();
 }
 async prepareWorkers(input){
  let next=0,failed=false;
  const work=async()=>{while(next<input.jobIds.length&&!failed){const index=next++,jobId=input.jobIds[index],runtime=path.join(this.runtime,'native-batch',this.receipt.batchPrepareId,'worker-'+String(index+1).padStart(2,'0'));fs.mkdirSync(runtime,{recursive:true});
   const native=this.makePreparation({runtime,cwd:path.join(runtime,'native-worker'),host:this.host}),execution=this.makeExecution({native,runtime,commandRuntime:this.commandRuntime,project:this.project,allowBatch:true});
   const worker={native,execution,index,jobId};this.workers.set(jobId,worker);execution.onUpdate=()=>this.updateWorker(worker);
   try{const p=await native.prepare({controllerThreadId:LEAD,requestId:input.requestId+'-'+index,durable:true,...(input.model?{model:input.model}:{})});
    this.receipt.entries[index]={jobId,prepareId:p.prepareId,controllerThreadId:LEAD,workerThreadId:p.workerThreadId,model:p.model,transport:p.transport,expiresAt:p.expiresAt,prepareReceiptPath:p.applicationReceiptPath,executionReceiptPath:execution.file,nativeDirectories:p.nativeDirectories,logFiles:p.logFiles,logCoverageVerified:p.logCoverageVerified,state:'prepared'};
    if(!p.logCoverageVerified||!p.logFiles.length||!p.nativeDirectories.length)throw Error('NATIVE_BATCH_LOG_COVERAGE');this.receipt.prepared++;this.save();
   }catch(e){failed=true;this.receipt.reason=/^[A-Z0-9_]+$/.test(e.message)?e.message:'NATIVE_BATCH_PREPARATION_FAILED';this.receipt.entries[index]={jobId,state:'prepare-failed'};this.save();}
  }};
  await Promise.all([work(),work()]);this.receipt.state=failed?'prepare-failed':'prepared';this.save();
  if(failed){for(const w of this.workers.values())if(!w.native.busyCheck?.())w.native.close('BATCH_PREPARATION_FAILED');this.host.close();}
 }
 updateWorker(w){
  const r=w.execution.status(),entry=this.receipt.entries[w.index];if(entry)Object.assign(entry,{state:r.state,attemptId:r.attemptId,turnId:r.turnId,itemId:r.itemId,imageCalls:r.imageCalls||0,modelTurns:r.modelTurns||0,error:r.error});
  if(!this.closing&&!this.preparing){const states=[...this.workers.values()].map(x=>x.execution.status().state);this.receipt.state=states.includes('unknown')?'blocked':states.every(s=>s==='generated')?'generated':states.some(s=>['submitted','running'].includes(s))?'running':'prepared';}
  this.save();this.events.emit(w.jobId,r);
 }
 execute(input){if(this.preparing||!['prepared','running','generated'].includes(this.receipt?.state))throw Error('NATIVE_BATCH_NOT_READY');const w=this.workers.get(input?.jobId);if(!w)throw Error('NATIVE_BATCH_JOB_MISSING');return w.execution.execute(input);}
 result(jobId){const w=this.workers.get(jobId);if(!w)throw Error('NATIVE_BATCH_JOB_MISSING');return w.execution.status();}
 wait(jobId,afterUpdatedAt){const r=this.result(jobId);if(r.updatedAt!==afterUpdatedAt||['generated','unknown'].includes(r.state))return Promise.resolve(r);return new Promise(resolve=>{let timer;const finish=value=>{clearTimeout(timer);this.events.off(jobId,finish);resolve(value);};this.events.once(jobId,finish);timer=setTimeout(()=>finish(this.result(jobId)),30000);timer.unref?.();});}
 close(){if(this.busy()||['blocked','disconnected'].includes(this.receipt?.state)||this.receipt?.entries.some(e=>['running','submitted','unknown'].includes(e.state)))throw Error('NATIVE_BATCH_IN_FLIGHT_OR_UNKNOWN');this.closing=true;for(const w of this.workers.values())w.native.close('BATCH_CLOSED');this.host.close();if(this.receipt){this.receipt.state='closed';this.save();const dir=path.join(this.runtime,'native-batch',this.receipt.batchPrepareId);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'BATCH-RECEIPT.json'),JSON.stringify(this.receipt));}return this.status();}
}
module.exports={NativeBatch};
