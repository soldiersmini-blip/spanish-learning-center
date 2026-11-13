'use strict';
const {parentPort,workerData}=require('node:worker_threads'),path=require('node:path');
const {project,runtime,imageProvider,adapterFile}=workerData,controllers=new Map();let adapter;
function runner(){if(!adapter)adapter=adapterFile?require(adapterFile).createRunner({project,runtime}):imageProvider==='api'?require('./api-plan-runner.cjs').createApiPlanRunner({project,runtime}):require(path.join(project,'staff/02-spanish-engineering/storage-tools/plan-runner.cjs')).createPlanRunner({project,runtime,executionDir:path.join(project,'staff/02-spanish-engineering/storage-tools/plan-runner-runtime')});return adapter;}
parentPort.on('message',async m=>{
 if(m.type==='abort'){controllers.get(m.id)?.abort();return;}
 if(m.type!=='call'||!['prepare','runStep','diagnose'].includes(m.method))return;
 const controller=new AbortController();controllers.set(m.id,controller);
 try{const target=m.method==='diagnose'&&!adapterFile?(imageProvider==='api'?require('./api-generation-content.cjs').createGenerationContent({project}):require(path.join(project,'staff/05-spanish-teaching/plan-dispatch-adapter.cjs')).createDispatchAdapter({project})):runner();const value=await target[m.method]({...m.data,signal:controller.signal,onProgress:value=>parentPort.postMessage({type:'progress',id:m.id,value})});parentPort.postMessage({type:'result',id:m.id,value});}
 catch(e){parentPort.postMessage({type:'result',id:m.id,error:/^[A-Z0-9_]+$/.test(e.message)?e.message:'PLAN_WORKER_OPERATION_FAILED'});}
 finally{controllers.delete(m.id);}
});
