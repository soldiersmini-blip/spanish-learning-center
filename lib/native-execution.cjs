'use strict';
// The application submits one already-authorized attempt; 02 remains the ledger/CAS writer.
const {MAX_JOBS,MAX_RUN_ATTEMPTS,AUTHORITY_BYTES,RUN_BYTES,isWave}=require('./production-limits.cjs');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {validatePNG}=require('./png-integrity.cjs');
const {LEAD,OWNER,RUN,identity}=require('./execution-evidence.cjs');
const DISPATCH='staff/05-spanish-teaching/CONCURRENCY-TEST-DISPATCH-CURRENT.json';
const GATE='staff/02-spanish-engineering/storage-tools/production-gate-state.json';
const fields=['prepareId','controllerThreadId','workerThreadId','jobId','attemptId','inputHash'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=code=>{throw Error(code);};
function read(file,max=AUTHORITY_BYTES){if(fs.statSync(file).size>max)fail('NATIVE_AUTHORITY_SIZE');const bytes=fs.readFileSync(file);if(bytes.length>max)fail('NATIVE_AUTHORITY_SIZE');return {bytes,value:JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''))};}
function samePath(a,b){return typeof a==='string'&&typeof b==='string'&&path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase();}
function current(t,now){return Number.isFinite(Date.parse(t))&&Date.parse(t)>now;}
function validateExecution({input,prepared,project,runtime,allowBatch=false,now=Date.now()}){
 if(!input||fields.some(k=>typeof input[k]!=='string'||!input[k]||input[k].length>200||/[\r\n\0]/.test(input[k]))||Object.keys(input).some(k=>!fields.includes(k)&&!['state','slotId','submittedAt','promptHash'].includes(k)))fail('NATIVE_EXECUTE_INPUT');
 if(!prepared||prepared.state!=='prepared'||!prepared.connectionAlive||prepared.ephemeral!==false||!prepared.logCoverageVerified||!current(prepared.expiresAt,now))fail('NATIVE_PREPARATION_UNAVAILABLE');
 if(['prepareId','controllerThreadId','workerThreadId'].some(k=>input[k]!==prepared[k])||input.controllerThreadId!==LEAD||prepared.transport!=='codex-app-server-stdio')fail('NATIVE_WORKER_MISMATCH');
 const {bytes,value:d}=read(path.join(project,DISPATCH)),{value:run}=read(path.join(project,RUN),RUN_BYTES),{value:gate}=read(path.join(project,GATE));
 const {value:command}=read(path.join(runtime,'COMMAND-CURRENT.json'));
 if(d.schemaVersion!==2||d.ownerConversationId!==OWNER||d.executorThreadId!==LEAD||d.state!=='confirmed'||d.executionAuthorized!==true||d.executionLease?.ownerThreadId!==LEAD||!current(d.executionLease.expiresAt,now))fail('NATIVE_DISPATCH_UNAUTHORIZED');
 const delegated=allowBatch&&Array.isArray(d.executionLease.workerBindings);
 const bindings=delegated?d.executionLease.workerBindings:[d.executionLease.workerBinding];
 const binding=bindings.find(b=>b?.jobIds?.length===1&&b.jobIds[0]===input.jobId);
 if(!binding||['prepareId','controllerThreadId','workerThreadId','transport'].some(k=>binding[k]!==prepared[k])||!current(binding.expiresAt,now)||Date.parse(binding.expiresAt)>Date.parse(prepared.expiresAt)||Date.parse(binding.expiresAt)>Date.parse(d.executionLease.expiresAt)||binding.jobIds?.length!==1||binding.jobIds[0]!==input.jobId)fail('NATIVE_WORKER_LEASE_MISMATCH');
 if(!Array.isArray(d.items)||d.items.length<1||d.items.length>(delegated?MAX_JOBS:1))fail('NATIVE_SINGLE_JOB_REQUIRED');
 if(delegated&&(bindings.length!==d.items.length||new Set(bindings.map(b=>b.workerThreadId)).size!==bindings.length||bindings.some(b=>b.jobIds?.length!==1)||new Set(bindings.map(b=>b.jobIds[0])).size!==bindings.length||d.items.some(j=>!bindings.some(b=>b.jobIds[0]===j.jobId))))fail('NATIVE_BATCH_WORKER_SCOPE');
 const job=d.items.find(j=>j.jobId===input.jobId);if(!job||job.qualityHold!==false||job.contextReviewStatus!=='reviewed-for-local-illustration'||typeof job.prompt!=='string')fail('NATIVE_JOB_NOT_READY');
 const sha=hash(bytes);
 if(run.schemaVersion!==1||run.executorThreadId!==LEAD||run.status!=='running'||!Array.isArray(run.attempts)||run.attempts.length>MAX_RUN_ATTEMPTS||run.dispatchRef?.dispatchId!==d.dispatchId||run.dispatchRef?.sha256!==sha||!Number.isInteger(run.authorizedConcurrency)||run.authorizedConcurrency<1||run.authorizedConcurrency>(delegated?MAX_JOBS:1)||!Array.isArray(run.batchJobIds)||run.batchJobIds.length!==d.items.length||!run.batchJobIds.includes(input.jobId))fail('NATIVE_RUN_MISMATCH');
 if(d.items.length>5&&(!isWave(d.concurrencyTest?.parallelCalls)||d.items.length!==d.concurrencyTest.parallelCalls||typeof d.concurrencyTest.userAuthorization!=='string'||!d.concurrencyTest.userAuthorization.trim()))fail('NATIVE_WAVE_UNAUTHORIZED');
 const expected=command.expectedItems?.find(i=>i.jobId===input.jobId);
 if(command.action!=='run-current'||command.state!=='accepted'||command.executorThreadId!==LEAD||command.dispatchId!==d.dispatchId||command.dispatchSha256!==sha||command.expectedItems?.length!==d.items.length||!expected||identity(expected)!==identity(job)||command.requestedConcurrency<run.authorizedConcurrency)fail('NATIVE_COMMAND_NOT_ACCEPTED');
 const matches=run.attempts?.filter(a=>a.jobId===input.jobId&&a.batchId===run.batchId)||[];if(matches.length!==1)fail('NATIVE_ATTEMPT_MISMATCH');
 const a=matches[0],context=a.executionContext;
 if(a.state!=='submitted'||a.attemptId!==input.attemptId||a.executorThreadId!==input.workerThreadId||a.workerThreadId!==input.workerThreadId||a.controllerThreadId!==LEAD||identity(a)!==identity(job)||!Number.isFinite(Date.parse(a.submittedAt))||Date.parse(a.submittedAt)>now+5000||Date.parse(a.submittedAt)<Date.parse(command.acceptedAt)||!Number.isFinite(Date.parse(command.acceptedAt)))fail('NATIVE_ATTEMPT_MISMATCH');
 const runContext=delegated?run.executionContexts?.find(c=>c.jobId===input.jobId):run.executionContext;
 if(!context||['prepareId','controllerThreadId','workerThreadId','transport'].some(k=>context[k]!==prepared[k]||runContext?.[k]!==prepared[k])||context.expiresAt!==binding.expiresAt||!samePath(context.prepareReceiptPath,prepared.applicationReceiptPath))fail('NATIVE_CONTEXT_MISMATCH');
 if(typeof a.finalPrompt!=='string'||Buffer.byteLength(a.finalPrompt)>16384||a.sourcePromptHash!==hash(job.prompt)||a.promptHash!==input.inputHash||hash(a.finalPrompt)!==input.inputHash||expected.sourcePromptHash!==a.sourcePromptHash)fail('NATIVE_INPUT_HASH_MISMATCH');
 const reserved=gate.active?.find(b=>b.batchId===run.batchId);
 if(gate.schema!==1||gate.paused!==false||gate.blocked||!reserved||reserved.owner!==LEAD||reserved.identities?.length!==d.items.length||!reserved.identities.includes([job.entryId,job.senseId,job.sourceRevision].join('|')))fail('NATIVE_GATE_NOT_ADMITTED');
 if(!prepared.logFiles?.length||prepared.logFiles.some(f=>!reserved.logFiles?.some(g=>samePath(f,g)))||!prepared.nativeDirectories?.length||prepared.nativeDirectories.some(f=>!reserved.nativeDirectories?.some(g=>samePath(f,g)))||run.nativeDirectories?.some(f=>!prepared.nativeDirectories.some(g=>samePath(f,g))))fail('NATIVE_GATE_PATH_MISMATCH');
 for(const file of prepared.logFiles)if(!fs.statSync(file).isFile())fail('NATIVE_LOG_MISSING');
 const checklist=require('./production-checklist.cjs');
 checklist.assertEligible(project,[job],{ownAttemptId:a.attemptId,dispatchId:d.dispatchId});
 return {identity:checklist.keyOf(job),prompt:a.finalPrompt,submittedAt:a.submittedAt,batchId:run.batchId,runId:run.runId,nativeDirectories:prepared.nativeDirectories};
}
class NativeExecution {
 constructor({native,runtime,project,commandRuntime=runtime,allowBatch=false,timeoutMs=15*60*1000,authorize=validateExecution}){
  Object.assign(this,{native,runtime,project,commandRuntime,allowBatch,timeoutMs,authorize});this.file=path.join(runtime,'NATIVE-EXECUTION-CURRENT.json');this.imageItems=new Set();
  if(fs.existsSync(this.file)){this.receipt=read(this.file,8192).value;if(['submitted','running'].includes(this.receipt.state))this.finishUnknown('NATIVE_SERVER_RESTART_RESULT_UNKNOWN');}
  native.onNotification=(method,params)=>this.notification(method,params);
  native.onDisconnect=code=>{if(this.busy())this.finishUnknown(code);};
  native.onInteractive=()=>{if(this.busy())this.finishUnknown('NATIVE_INTERACTIVE_APPROVAL_REQUIRED');};
  native.busyCheck=()=>this.busy()||this.receipt?.state==='unknown';
 }
 busy(){return ['submitted','running'].includes(this.receipt?.state);}
 save(){this.receipt.updatedAt=new Date().toISOString();const b=JSON.stringify(this.receipt,null,2);if(Buffer.byteLength(b)>8192)fail('NATIVE_EXECUTION_RECEIPT_SIZE');fs.writeFileSync(this.file+'.tmp',b);fs.renameSync(this.file+'.tmp',this.file);this.onUpdate?.(this.status());}
 status(){return this.receipt?{...this.receipt}:{state:'not-submitted',modelTurns:0,imageCalls:0};}
 finishUnknown(error){if(!this.receipt)return;clearTimeout(this.timer);this.receipt={...this.receipt,state:'unknown',error,completedAt:new Date().toISOString()};this.save();}
 async execute(input){
  // Retrying an HTTP request only returns its existing receipt. Never send a second model turn.
  if(this.receipt){if(fields.every(k=>input?.[k]===this.receipt[k]))return this.status();fail('NATIVE_PREVIOUS_ATTEMPT_REQUIRES_RECONCILIATION');}
  const authorized=this.authorize({input,prepared:this.native.status(),project:this.project,runtime:this.commandRuntime,allowBatch:this.allowBatch});
  if(!this.native.active)fail('NATIVE_DISCONNECTED');
  // Commit identity before turn/start; races and missing receipts must fail closed.
  if(authorized.identity)require('./production-claims.cjs').claim(this.project,{identity:authorized.identity,attemptId:input.attemptId,runId:authorized.runId,inputHash:input.inputHash,receiptPath:this.file});
  this.roots=authorized.nativeDirectories;this.submittedAt=authorized.submittedAt;
  this.receipt={schemaVersion:1,...Object.fromEntries(fields.map(k=>[k,input[k]])),runId:authorized.runId,batchId:authorized.batchId,state:'submitted',transport:'codex-app-server-stdio',modelTurns:0,imageCalls:0,submittedAt:new Date().toISOString(),applicationReceiptPath:this.file};this.save();
  clearTimeout(this.native.idleTimer);this.native.executionArmed=true;
  this.timer=setTimeout(()=>this.finishUnknown('NATIVE_RESULT_TIMEOUT_NO_RETRY'),this.timeoutMs);this.timer.unref?.();
  try{
   this.receipt.modelTurns=1;this.save();this.native.receipt={...this.native.receipt,state:'executing',modelTurns:1,executionEnabled:true,jobId:input.jobId,attemptId:input.attemptId,inputHash:input.inputHash};this.native.save();
   const result=await this.native.rpc('turn/start',{threadId:input.workerThreadId,input:[{type:'text',text:authorized.prompt}]});
   if(!result?.turn?.id)fail('NATIVE_TURN_ID_MISSING');
   this.bindTurn(result.turn.id);
   if(this.busy()){this.receipt.state='running';this.save();}
  }catch(e){this.finishUnknown(/^[A-Z0-9_]+$/.test(e.message)?e.message:'NATIVE_TURN_START_FAILED');}
  finally{this.native.executionArmed=false;}
  return this.status();
 }
 bindTurn(id){if(typeof id!=='string'||!id||id.length>200)fail('NATIVE_TURN_ID_INVALID');if(this.receipt.turnId&&this.receipt.turnId!==id)fail('NATIVE_TURN_ID_MISMATCH');this.receipt.turnId=id;}
 notification(method,p){
  if(!this.busy()||p?.threadId!==this.receipt.workerThreadId)return;
  try{
   if(!['turn/started','turn/completed','item/started','item/completed'].includes(method))return;
   const id=p.turnId||p.turn?.id;this.bindTurn(id);
   if((method==='item/started'||method==='item/completed')&&p.item?.type==='imageGeneration'){
    const item=p.item;if(typeof item.id!=='string'||!item.id||item.id.length>200)fail('NATIVE_IMAGE_ID_INVALID');
    this.imageItems.add(item.id);this.receipt.imageCalls=this.imageItems.size;this.native.receipt.imageCalls=this.imageItems.size;this.native.save();if(this.imageItems.size>1)fail('NATIVE_MULTIPLE_IMAGE_CALLS');
    this.receipt.itemId=item.id;
    if(method==='item/started'){
     if(this.imageStarted===undefined){this.imageStarted=p.startedAtMs;if(Number.isSafeInteger(p.startedAtMs))this.receipt.imageEventStartedAt=new Date(p.startedAtMs).toISOString();}
    }else{
     if(item.failure||item.status!=='completed')fail('NATIVE_IMAGE_TOOL_FAILED');
     if(this.imageCompleted!==undefined)return;
     this.imageCompleted=p.completedAtMs;
     if(typeof item.generationId==='string'&&item.generationId.length<=200)this.receipt.generationId=item.generationId;
     if(typeof item.fileId==='string'&&item.fileId.length<=200)this.receipt.fileId=item.fileId;
     // Only the native tool's returned file is accepted. Never infer a path or retain base64 frames.
     if(typeof item.savedPath!=='string'||!path.isAbsolute(item.savedPath))fail('NATIVE_ARTIFACT_PATH_UNRESOLVED');
     const nativePath=fs.realpathSync(item.savedPath);
     if(!this.roots.some(root=>{const rel=path.relative(root,nativePath);return rel&&!rel.startsWith('..')&&!path.isAbsolute(rel);}))fail('NATIVE_ARTIFACT_OUTSIDE_WATCH');
     const stat=fs.statSync(nativePath);if(!stat.isFile()||stat.size>32*1024**2)fail('NATIVE_ARTIFACT_SIZE');
     const bytes=fs.readFileSync(nativePath),info=validatePNG(bytes);this.receipt.nativePath=nativePath;
     this.receipt.artifact={sha256:hash(bytes),bytes:bytes.length,width:info.width,height:info.height};
    }
    if(Number.isSafeInteger(this.imageStarted)&&Number.isSafeInteger(this.imageCompleted)&&this.imageStarted>=Date.parse(this.submittedAt)&&this.imageCompleted>=this.imageStarted&&this.imageCompleted<=Date.now()+5000){this.receipt.toolStartedAt=new Date(this.imageStarted).toISOString();this.receipt.toolCompletedAt=new Date(this.imageCompleted).toISOString();this.receipt.toolTimingSource='codex-image-item-events';}
    this.save();
   }
   if(method==='turn/completed'){
    if(p.turn.status!=='completed'){
     const error=p.turn.error,info=error?.codexErrorInfo||error?.codex_error_info;
     const code=typeof info==='string'?info:info&&typeof info==='object'?Object.keys(info)[0]:null;
     this.receipt.terminalTurnStatus=p.turn.status;
     this.receipt.nativeErrorCode=typeof code==='string'&&/^[a-zA-Z0-9_]{1,100}$/.test(code)?code:'unclassified';
     if(['server_overloaded','serverOverloaded'].includes(code))this.receipt.nativeErrorMessage='Selected model is at capacity. Please try a different model.';
     fail('NATIVE_TURN_FAILED');
    }
    if(!this.receipt.artifact||!this.receipt.itemId)fail('NATIVE_TURN_WITHOUT_IMAGE');
    clearTimeout(this.timer);this.receipt.state='generated';this.receipt.completedAt=new Date().toISOString();this.save();
   }
  }catch(e){this.finishUnknown(/^[A-Z0-9_]+$/.test(e.message)?e.message:'NATIVE_EVENT_VALIDATION_FAILED');}
 }
}
module.exports={NativeExecution,validateExecution,hash,fields};
