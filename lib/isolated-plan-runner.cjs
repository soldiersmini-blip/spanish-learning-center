'use strict';
const {Worker}=require('node:worker_threads'),path=require('node:path');
// One worker per finite plan, not one process per image. CPU-heavy vocabulary,
// DPAPI and admission work must not block the HTTP/UI heartbeat thread.
function createIsolatedPlanRunner({project,runtime,imageProvider,adapterFile}={}){
 let worker=null,seq=0,closed=false;const pending=new Map();
 function fail(code){for(const p of pending.values()){p.cleanup();p.reject(Error(code));}pending.clear();}
 function start(){if(worker)return;if(closed)throw Error('PLAN_WORKER_CLOSED');worker=new Worker(path.join(__dirname,'plan-runner-worker.cjs'),{workerData:{project,runtime,imageProvider,adapterFile}});
  worker.on('error',()=>fail('PLAN_WORKER_FAILED'));worker.on('exit',()=>{closed=true;fail('PLAN_WORKER_EXITED');});
  worker.on('message',m=>{const p=pending.get(m.id);if(!p)return;if(m.type==='progress'){try{p.onProgress?.(m.value);}catch{p.progressError=true;worker.postMessage({type:'abort',id:m.id});}return;}pending.delete(m.id);p.cleanup();if(p.progressError)p.reject(Error('PLAN_PROGRESS_PERSIST_FAILED'));else if(m.error)p.reject(Error(m.error));else p.resolve(m.value);});
 }
 function call(method,input){start();const {signal,onProgress,...data}=input;const id=++seq;return new Promise((resolve,reject)=>{const abort=()=>worker.postMessage({type:'abort',id});pending.set(id,{resolve,reject,onProgress,cleanup:()=>signal?.removeEventListener('abort',abort)});signal?.addEventListener('abort',abort,{once:true});try{worker.postMessage({type:'call',id,method,data});if(signal?.aborted)abort();}catch{pending.get(id).cleanup();pending.delete(id);reject(Error('PLAN_WORKER_INPUT_INVALID'));}});}
 return {prepare:x=>call('prepare',x),runStep:x=>call('runStep',x),diagnose:x=>call('diagnose',x),async close(){if(pending.size)throw Error('PLAN_WORKER_ACTIVE');closed=true;if(worker)await worker.terminate();}};
}
module.exports={createIsolatedPlanRunner};
