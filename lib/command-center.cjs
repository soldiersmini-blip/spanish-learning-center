'use strict';
const {MAX_JOBS,MAX_RUN_ATTEMPTS,AUTHORITY_BYTES,RUN_BYTES,isWave}=require('./production-limits.cjs');
const fs=require('node:fs'),path=require('node:path'),{createHash,randomUUID}=require('node:crypto');
const {readLedger}=require(path.join(require('./workspace-paths.cjs').RESEARCH,'capacity-test/measure.cjs'));
const {readProjection}=require(path.join(require('./workspace-paths.cjs').RESEARCH,'capacity-test/projection.cjs'));
const plans=require('./plans.cjs');
const workflowStore=require('./workflow-store.cjs'),orders=require('./work-orders.cjs'),evidence=require('./execution-evidence.cjs');
const {finalPrompt}=require(path.join(require('./workspace-paths.cjs').PROJECT,'staff/02-spanish-engineering/storage-tools/image-factory-run.cjs'));
const PROJECT=require('./workspace-paths.cjs').PROJECT;
const LEAD='01a13637-abd8-7151-9fdd-cae83f313ba1',OWNER='01a19c24-d45a-7081-bf20-6444b8a976d3';
const DISPATCH='staff/05-spanish-teaching/CONCURRENCY-TEST-DISPATCH-CURRENT.json';
const RUN='staff/02-spanish-engineering/storage-tools/IMAGE-FACTORY-RUN-CURRENT.json';
const REVIEW='staff/05-spanish-teaching/CONCURRENCY-TEST-REVIEW-CURRENT.json';
const fail=m=>{throw new Error(m);};
function optional(p){return fs.existsSync(p)?readLedger(p):null;}
function readRun(project){const run=workflowStore.read(path.join(project,RUN),RUN_BYTES);if(run&&(!Array.isArray(run.attempts)||run.attempts.length>MAX_RUN_ATTEMPTS))fail('RUN_HISTORY_LIMIT');return run;}
function permitsRecovery(item,run){
 const attempts=Array.isArray(run?.attempts)?run.attempts:[],prior=attempts.filter(a=>evidence.identity(a)===evidence.identity(item)),ref=item.recoveryOfAttemptId;
 if(!prior.length)return ref===undefined||ref===null;
 const last=prior.at(-1),hash=s=>createHash('sha256').update(s).digest('hex');
 // A failed text turn may have submittedAt; only reconciled absence of an image call permits recovery.
 const recoverable=a=>!a.artifact&&!a.itemId&&!a.generationId&&!a.toolStartedAt&&!a.toolCompletedAt&&((a.state==='failed'&&a.failureReconciliation?.confirmedNoImageCall===true)||(a.state==='deferred'&&!a.submittedAt&&!a.turnId));
 return run.schemaVersion===1&&run.executorThreadId===LEAD&&typeof ref==='string'&&ref.length>0&&ref.length<=150&&last.attemptId===ref&&last.jobId===item.jobId&&attempts.filter(a=>a.attemptId===ref).length===1&&prior.every(recoverable)&&!prior.some(a=>a.recoveryOfAttemptId===ref)&&typeof item.prompt==='string'&&last.sourcePromptHash===hash(item.prompt)&&last.promptHash===hash(finalPrompt(item));
}
function dispatch(project=PROJECT){
 const p=path.join(project,DISPATCH);if(!fs.existsSync(p))return {ready:false,reasons:['DISPATCH_MISSING'],items:[]};
 if(fs.statSync(p).size>AUTHORITY_BYTES)fail('DISPATCH_SIZE');const bytes=fs.readFileSync(p);if(bytes.length>AUTHORITY_BYTES)fail('DISPATCH_SIZE');const d=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));
 const reasons=[];
 if(d.schemaVersion!==2||d.ownerConversationId!==OWNER||d.executorThreadId!==LEAD)reasons.push('DISPATCH_OWNER_OR_SCHEMA');
 if(d.state!=='confirmed'||d.executionAuthorized!==true)reasons.push('NOT_CONFIRMED');
 if(d.executionLease?.ownerThreadId!==LEAD||!(Date.parse(d.executionLease?.expiresAt)>Date.now()))reasons.push('LEASE_NOT_CURRENT');
 const binding=d.executionLease?.workerBinding;
 const bindings=d.executionLease?.workerBindings;
 if(bindings&&(!Array.isArray(bindings)||bindings.length!==d.items?.length||new Set(bindings.map(b=>b.workerThreadId)).size!==bindings.length||new Set(bindings.flatMap(b=>b.jobIds||[])).size!==bindings.length||bindings.some(b=>b.controllerThreadId!==LEAD||b.transport!=='codex-app-server-stdio'||!b.prepareId||!b.workerThreadId||b.workerThreadId===LEAD||b.jobIds?.length!==1||!d.items?.some(i=>i.jobId===b.jobIds[0])||!(Date.parse(b.expiresAt)>Date.now())||Date.parse(b.expiresAt)>Date.parse(d.executionLease.expiresAt))))reasons.push('WORKER_LEASE_INVALID');
 if(binding&&(binding.controllerThreadId!==LEAD||binding.transport!=='codex-app-server-stdio'||!binding.prepareId||!binding.workerThreadId||binding.workerThreadId===LEAD||!(Date.parse(binding.expiresAt)>Date.now())||Date.parse(binding.expiresAt)>Date.parse(d.executionLease.expiresAt)||!Array.isArray(binding.jobIds)||binding.jobIds.length!==d.items?.length||d.items?.some(i=>!binding.jobIds.includes(i.jobId))))reasons.push('WORKER_LEASE_INVALID');
 const authorization=d.concurrencyTest?.userAuthorization;
 const finiteWave=isWave(d.concurrencyTest?.parallelCalls)&&typeof authorization==='string'&&authorization.trim().length>0&&authorization.length<=2000&&Array.isArray(d.items)&&d.items.length===d.concurrencyTest.parallelCalls;
 if(d.concurrencyTest&&!finiteWave)reasons.push('FINITE_WAVE_INVALID');
 if(!Array.isArray(d.items)||d.items.length<1||d.items.length>(finiteWave?MAX_JOBS:5))reasons.push('BATCH_SIZE');
 const items=Array.isArray(d.items)?d.items.slice(0,finiteWave?MAX_JOBS:5):[];
 if(items.some(i=>!i.jobId||!i.entryId||!i.senseId||!i.sourceRevision||i.qualityHold!==false||i.contextReviewStatus!=='reviewed-for-local-illustration'))reasons.push('CONTENT_NOT_READY');
 if(!d.dispatchId||new Set(items.map(i=>i.jobId)).size!==items.length||new Set(items.map(evidence.identity)).size!==items.length)reasons.push('DISPATCH_IDENTITY');
 const prior=readRun(project);if(items.some(i=>!permitsRecovery(i,prior)))reasons.push('BATCH_HAS_ATTEMPTS');
 return {ready:!reasons.length,reasons,finiteWave,requestedWaveConcurrency:finiteWave?d.concurrencyTest.parallelCalls:null,workerBindings:bindings?bindings.map(b=>Object.fromEntries(['prepareId','controllerThreadId','workerThreadId','transport','jobIds','expiresAt'].map(k=>[k,b[k]]))):null,workerBinding:binding?Object.fromEntries(['prepareId','controllerThreadId','workerThreadId','transport','jobIds','expiresAt'].map(k=>[k,binding[k]])):null,dispatchId:d.dispatchId,state:d.state,sha256:createHash('sha256').update(bytes).digest('hex'),items:items.map(i=>({jobId:i.jobId,entryId:i.entryId,senseId:i.senseId,sourceRevision:i.sourceRevision,sourcePromptHash:typeof i.prompt==='string'?createHash('sha256').update(i.prompt).digest('hex'):null,recoveryOfAttemptId:i.recoveryOfAttemptId??null,word:i.word||i.lemma||i.meaningZh||i.jobId,summary:String(i.prompt||i.promptText||'').slice(0,400)}))};
}
function commandFile(runtime){return path.join(runtime,'COMMAND-CURRENT.json');}
function writeLocked(runtime,fn){
 return workflowStore.locked(runtime,()=>workflowStore.write(commandFile(runtime),fn(optional(commandFile(runtime)))));
}
function request(runtime,input,project=PROJECT){
 if(!['run-current','pause'].includes(input.action))fail('INVALID_COMMAND');
 const concurrency=Number(input.concurrency??2);if(!([1,2].includes(concurrency)||isWave(concurrency)))fail('CONCURRENCY_RANGE');
 return writeLocked(runtime,old=>{
  const d=dispatch(project),order=orders.current(runtime);
  if(concurrency>2&&(input.action!=='run-current'||!d.finiteWave||!d.ready||concurrency!==d.requestedWaveConcurrency))fail('CONCURRENCY_RANGE');
  if(input.action==='run-current'&&!d.ready)fail('DISPATCH_NOT_READY');
  if(input.planId){const plan=plans.read(runtime);if(plan?.id!==input.planId||!plans.eligible(plan,concurrency,d.requestedWaveConcurrency||plans.CURRENT_LIMIT))fail('PLAN_NOT_SUPPORTED');if(plan.recipientThreadId&&plan.recipientThreadId!==LEAD)fail('PLAN_RECIPIENT_REQUIRES_HANDOFF');if(plan.nodes.some(n=>n.batchSize!==undefined||n.type==='user-order'))fail('PLAN_CONTENT_REQUIRES_FORMAL_DISPATCH');}
  const workOrderId=input.action==='run-current'?(input.workOrderId||(order?.state==='linked'?order.id:null)):null;
  if(workOrderId){orders.verifyLink(order,d,workOrderId);}
  if(old&&['pending','accepted','generated-complete'].includes(old.state)){
   if(old.action===input.action&&old.dispatchSha256===(input.action==='pause'?null:d.sha256)&&old.requestedConcurrency===concurrency&&(old.planId||null)===(input.planId||null)&&(old.workOrderId||null)===workOrderId)return old;
   if(input.action!=='pause'&&!(old.state==='generated-complete'&&old.dispatchId!==d.dispatchId&&require('./command-receipts.cjs').settled(runtime,old,project)))fail('COMMAND_ALREADY_ACTIVE');
  }
  if(input.action==='run-current'&&!d.ready)fail('DISPATCH_NOT_READY');
  const id=randomUUID(),at=new Date().toISOString();
  const interrupted=input.action==='pause'?(old?.action==='run-current'?old:old?.interruptedCommand):null;
  return {schemaVersion:2,id,requestId:id,action:input.action,state:'pending',createdAt:at,requestedAt:at,requestedConcurrency:concurrency,planId:input.planId||null,workOrderId,dispatchId:d.dispatchId||null,dispatchSha256:input.action==='run-current'?d.sha256:null,workerBinding:input.action==='run-current'?d.workerBinding:null,workerBindings:input.action==='run-current'?d.workerBindings:null,expectedItems:input.action==='run-current'?d.items.map(({jobId,entryId,senseId,sourceRevision,sourcePromptHash,recoveryOfAttemptId})=>({jobId,entryId,senseId,sourceRevision,sourcePromptHash,recoveryOfAttemptId})):[],executorThreadId:LEAD,supersedes:old?.id||null,...(interrupted?{interruptedCommand:{...interrupted,interruptedCommand:undefined}}:{}),executionAuthorization:false,note:'Request only; executor must validate current dispatch, lease and shared gate. No automatic thread wakeup.'};
 });
}
function ack(runtime,input,project=PROJECT){
 if(!['accepted','generated-complete','completed','partial-failed','blocked'].includes(input.state)||input.executorThreadId!==LEAD)fail('INVALID_ACK');
 return writeLocked(runtime,old=>{
  if(!old||old.id!==input.id)fail('STALE_COMMAND');
  if(!['pending','accepted','generated-complete','partial-failed'].includes(old.state))fail('COMMAND_TERMINAL');
  const at=new Date().toISOString(),ref=String(input.runId||old.runId||''),batchId=String(input.batchId||old.batchId||''),reason=String(input.reason||'');
  if(ref.length>150||batchId.length>150||reason.length>500)fail('ACK_LIMIT');
  if(input.state==='accepted'&&old.action==='run-current'){
   if(old.state!=='pending')fail('COMMAND_TRANSITION');
   const d=dispatch(project);if(!d.ready||d.sha256!==old.dispatchSha256||d.dispatchId!==old.dispatchId)fail('DISPATCH_CHANGED');
   if(old.workOrderId)orders.verifyLink(orders.current(runtime),d,old.workOrderId);
  }
  let completion=old.completion;
  if(['generated-complete','completed','partial-failed'].includes(input.state)&&old.action==='run-current'){
   if(!old.acceptedAt)fail('REAL_RUN_ACCEPTANCE_REQUIRED');
   if(!ref||!batchId)fail('REAL_RUN_EVIDENCE_REQUIRED');
   const check=evidence.assess(old,project,{runId:ref,batchId,checkFiles:true});
   if(!check.valid)fail('REAL_RUN_'+check.code);
   if(input.state==='generated-complete'&&!check.allGenerated)fail('REAL_RUN_ITEMS_INCOMPLETE');
   if(input.state==='completed'&&(!check.allGenerated||!check.allPassed))fail(check.allGenerated?'INDEPENDENT_REVIEW_REQUIRED':'REAL_RUN_ITEMS_INCOMPLETE');
   if(input.state==='partial-failed'&&(!check.failed||!check.settled))fail('REAL_RUN_PARTIAL_FAILURE_UNPROVEN');
   completion={generation:check.generation,review:check.review,total:check.total,generated:check.generated,qualified:check.qualified,failed:check.failed,items:check.items};
  }
  if(old.action==='pause'&&!['accepted','completed','blocked'].includes(input.state))fail('COMMAND_TRANSITION');
  if(input.state==='generated-complete'&&old.state==='generated-complete'&&old.runId===ref&&old.batchId===batchId){require('./command-receipts.cjs').save(runtime,old);return old;}const next={...old,state:input.state,...(input.state==='accepted'?{acceptedAt:old.acceptedAt||at}:{}),acknowledgedAt:at,runId:ref||null,batchId:batchId||null,reason,completion,acknowledgedBy:LEAD};if(input.state==='generated-complete')require('./command-receipts.cjs').save(runtime,next);return next;
 });
}
function reconcile(runtime,input,project=PROJECT){
 if(input.executorThreadId!==LEAD||!['generated-complete','completed','partial-failed'].includes(input.state))fail('INVALID_ACK');
 return writeLocked(runtime,old=>{
  const target=old?.interruptedCommand;
  if(old?.id!==input.id||old.action!=='pause'||old.state!=='completed'||target?.id!==input.interruptedCommandId||!target.acceptedAt)fail('INTERRUPTED_COMMAND_NOT_RECONCILABLE');
  if(typeof input.runId!=='string'||typeof input.batchId!=='string'||input.runId.length>150||input.batchId.length>150)fail('ACK_LIMIT');
  const check=evidence.assess(target,project,{runId:input.runId,batchId:input.batchId,checkFiles:true});
  if(!check.valid)fail('REAL_RUN_'+check.code);
  if(input.state==='completed'&&!check.allPassed)fail('INDEPENDENT_REVIEW_REQUIRED');
  if(input.state==='generated-complete'&&!check.allGenerated||input.state==='partial-failed'&&(!check.failed||!check.settled))fail('REAL_RUN_ITEMS_INCOMPLETE');
  return {...old,interruptedCommand:{...target,state:input.state,runId:check.runId,batchId:check.batchId,acknowledgedAt:new Date().toISOString(),acknowledgedBy:LEAD,completion:{generation:check.generation,review:check.review,total:check.total,generated:check.generated,qualified:check.qualified,failed:check.failed,items:check.items}},reconciledAt:new Date().toISOString()};
 });
}
function snapshot(runtime,project=PROJECT){
 const production=readProjection(project),d=dispatch(project),run=readRun(project),review=optional(path.join(project,REVIEW));
 const items=(run?.attempts||[]).map(a=>{
  const r=(review?.items||[]).filter(r=>r.jobId===a.jobId&&r.sha256===a.artifact?.sha256).sort((a,b)=>Date.parse(b.reviewedAt)-Date.parse(a.reviewedAt))[0];
  const provenance=!production.errorCode&&review?.reviewerConversationId===OWNER&&r&&r.finalPromptHash===a.promptHash&&r.sourcePromptHash===a.sourcePromptHash&&['attemptId','entryId','senseId','sourceRevision'].every(k=>r[k]===undefined||r[k]===a[k]);
  return {jobId:a.jobId,attemptId:a.attemptId,batchId:a.batchId,entryId:a.entryId,senseId:a.senseId,sourceRevision:a.sourceRevision,word:d.items.find(i=>i.jobId===a.jobId)?.word||a.jobId,summary:String(a.finalPrompt||'').slice(0,260),state:a.state,slotId:a.slotId,startedAt:a.toolStartedAt,finishedAt:a.toolCompletedAt,seconds:a.toolStartedAt&&a.toolCompletedAt?(Date.parse(a.toolCompletedAt)-Date.parse(a.toolStartedAt))/1000:null,sha256:a.artifact?.sha256,hasImage:!!a.artifact?.casPath,review:provenance?r.decision:(r?'provenance-mismatch':'pending'),reviewedAt:provenance?r.reviewedAt:null,reviewReason:r?.reviewReason||'',refillFromAttemptId:a.refillFromAttemptId||null};
 });
 const batches=[...new Set(items.map(i=>i.batchId))].map(id=>{const group=items.filter(i=>i.batchId===id),starts=group.filter(i=>i.startedAt).map(i=>Date.parse(i.startedAt)),start=starts.length?Math.min(...starts):null;
  const complete=group.every(i=>i.finishedAt)&&run?.batchId!==id,reviewed=complete&&group.every(i=>i.reviewedAt),passed=group.filter(i=>['passed','pass'].includes(i.review)).length;
  const generationSeconds=complete&&start!==null?(Math.max(...group.map(i=>Date.parse(i.finishedAt)))-start)/1000:null;
  const qualitySeconds=reviewed&&start!==null?(Math.max(...group.map(i=>Date.parse(i.reviewedAt)))-start)/1000:null;
  return {batchId:id,count:group.length,qualified:passed,generationSeconds,qualitySeconds,sampleQualifiedPerHour:qualitySeconds>0?Number((passed*3600/qualitySeconds).toFixed(2)):null,rateMeaning:'short-batch-normalization-not-sustained-capacity'};
 });
 const command=optional(commandFile(runtime)),workflow=require('./workflow-status.cjs').read(runtime,project,d,command);
 return {mode:'command-center',automaticWakeup:false,directModelConnection:false,executorThreadId:LEAD,currentExecutionLimit:d.finiteWave?d.requestedWaveConcurrency:plans.CURRENT_LIMIT,plan:plans.read(runtime),recordedPeakInFlight:run?.peakInFlight||0,dispatch:d,command,workflow,production,items,batches};
}
function imagePath(attemptId,project=PROJECT){
 const run=readRun(project),a=run?.attempts?.find(a=>a.attemptId===attemptId),sha=a?.artifact?.sha256;
 if(!sha||!/^[a-f0-9]{64}$/.test(sha))fail('IMAGE_NOT_REGISTERED');
 const expected=path.resolve(project,'staff/02-spanish-engineering/image-asset-store/sha256',sha.slice(0,2),sha+'.png');
 if(!a.artifact.casPath||path.resolve(a.artifact.casPath)!==expected)fail('CAS_PATH_MISMATCH');
 const real=fs.realpathSync(expected);if(real.toLowerCase()!==expected.toLowerCase())fail('CAS_REDIRECT');
 const stat=fs.statSync(real);if(!stat.isFile()||stat.size>33554432)fail('IMAGE_SIZE');return real;
}
module.exports={dispatch,request,ack,reconcile,snapshot,imagePath,LEAD,PROJECT};
