'use strict';
// Finite controller-side orchestration only. Not wired to HTTP/production yet.
// 02 supplies the sole-writer ledger callbacks; 15 never writes the formal ledger.
const {MAX_JOBS}=require('./production-limits.cjs');
async function runSlots({jobs,concurrency=2,isPaused,beforeSubmit,runAndWait,persistResult}){
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>MAX_JOBS||!Array.isArray(jobs)||!jobs.length||jobs.length>MAX_JOBS||concurrency>jobs.length||jobs.some(j=>!j.jobId||!j.workerThreadId||!j.prepareId)||new Set(jobs.map(j=>j.jobId)).size!==jobs.length||new Set(jobs.map(j=>j.workerThreadId)).size!==jobs.length)throw Error('NATIVE_SLOT_SCOPE');
 if([isPaused,beforeSubmit,runAndWait,persistResult].some(f=>typeof f!=='function'))throw Error('NATIVE_SLOT_CALLBACKS');
 let next=0,stopReason=null,inFlight=0,peakRequests=0,writer=Promise.resolve();const rows=new Map();
 const write=fn=>{const promise=writer.then(fn);writer=promise.catch(()=>{});return promise;};
 const blocked=()=>{if(stopReason)return true;try{if(isPaused()){stopReason='PAUSED';return true;}}catch{stopReason='PAUSE_STATE_UNKNOWN';return true;}return false;};
 async function slot(slotId){
  while(next<jobs.length&&!blocked()){
   const job=jobs[next++];let binding;
   try{
    binding=await write(()=>blocked()?null:beforeSubmit(job,slotId));
    if(!binding)return;
    if(['jobId','workerThreadId','prepareId'].some(k=>binding[k]!==job[k])||!binding.attemptId||!binding.inputHash)throw Error('NATIVE_SLOT_BINDING');
   }catch{stopReason='SUBMISSION_BINDING_FAILED';rows.set(job.jobId,{jobId:job.jobId,slotId,state:'blocked'});return;}
   const row={jobId:job.jobId,attemptId:binding.attemptId,workerThreadId:binding.workerThreadId,slotId,state:'submitted'};rows.set(job.jobId,row);
   let result;
   if(blocked())result={...binding,state:'unknown',error:'PAUSED_OR_BLOCKED_AFTER_SUBMISSION_INTENT'};
   else{
    inFlight++;peakRequests=Math.max(peakRequests,inFlight);
    try{
     result=await runAndWait(binding);
     if(['jobId','attemptId','workerThreadId','prepareId','inputHash'].some(k=>result?.[k]!==binding[k])||!['generated','unknown'].includes(result.state))throw Error('NATIVE_SLOT_RESULT');
    }catch(e){result={...binding,state:'unknown',error:/^[A-Z0-9_]{1,120}$/.test(e.message)?e.message:'RESULT_UNKNOWN_NO_RETRY'};}
    finally{inFlight--;}
   }
   if(result.state==='unknown')stopReason='RESULT_UNKNOWN';
   row.state='awaiting-persistence';
   try{
    const receipt=await write(()=>persistResult(result));
    if(!receipt||receipt.durable!==true||receipt.jobId!==binding.jobId||receipt.attemptId!==binding.attemptId||!['awaiting-review','unknown'].includes(receipt.state)||result.state==='unknown'&&receipt.state!=='unknown')throw Error('NATIVE_SLOT_PERSISTENCE');
    row.state=receipt.state;
    if(receipt.state==='unknown')stopReason='RESULT_UNKNOWN';
   }catch{row.state='persistence-unresolved';stopReason='PERSISTENCE_UNRESOLVED';}
   // Free this slot only after the result is durably recorded. Other slots keep running.
  }
 }
 await Promise.all(Array.from({length:Math.min(concurrency,jobs.length)},(_,i)=>slot(i+1)));
 return {stopReason,peakRequests,actualImageOverlap:null,items:[...rows.values()],pendingJobIds:jobs.filter(j=>!rows.has(j.jobId)).map(j=>j.jobId)};
}
module.exports={runSlots};
