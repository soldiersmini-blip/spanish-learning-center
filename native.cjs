'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
async function main(){const mode=process.argv[2];
 if(mode==='batch-diagnose'){
  const root=require('./lib/batch-runtime.cjs').batchRuntime(path.join(__dirname,'runtime')),batch=JSON.parse(fs.readFileSync(path.join(root,'NATIVE-BATCH-CURRENT.json'),'utf8')),e=batch.entries.find(e=>e.jobId===process.argv[3]);if(!e)throw Error('NATIVE_BATCH_JOB_MISSING');
  const read=file=>{if(fs.statSync(file).size>8192)throw Error('NATIVE_DIAGNOSTIC_RECEIPT_LIMIT');return JSON.parse(fs.readFileSync(file,'utf8'));};
  const r=require('./lib/native-failure-evidence.cjs').diagnose({receipt:read(e.executionReceiptPath),prepared:read(e.prepareReceiptPath)}),file=path.join(root,'NATIVE-FAILURE-DIAGNOSTIC-CURRENT.json');fs.writeFileSync(file,JSON.stringify(r,null,2));console.log(JSON.stringify({jobId:r.jobId,attemptId:r.attemptId,terminalStatus:r.terminalStatus,error:r.error,confirmedNoImageCall:r.confirmedNoImageCall,automaticRetryAuthorized:false,receiptPath:file}));return;
 }
 if(mode?.startsWith('batch-')){const client=require('./lib/native-batch-client.cjs').createClient();let r;
  if(['batch-prepare','batch-execute'].includes(mode)){const file=process.argv[3];if(!file||fs.statSync(file).size>8192)throw Error('NATIVE_BATCH_INPUT_SIZE');const input=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));r=await client[mode==='batch-prepare'?'prepare':'execute'](input);}
  else if(mode==='batch-status')r=await client.status();else if(mode==='batch-result')r=await client.result(process.argv[3]);else if(mode==='batch-close')r=await client.close();else throw Error('NATIVE_BATCH_MODE');
  const out=JSON.stringify({state:r.state,batchPrepareId:r.batchPrepareId,total:r.total,prepared:r.prepared,receiptPath:r.applicationReceiptPath,jobId:r.jobId,attemptId:r.attemptId,turnId:r.turnId,itemId:r.itemId,artifact:r.artifact,error:r.error,reason:r.reason,states:r.entries?.reduce((a,e)=>(a[e.state]=(a[e.state]||0)+1,a),{})});if(Buffer.byteLength(out)>2048)throw Error('NATIVE_OUTPUT_LIMIT');console.log(out);return;
 }
 if(!['prepare','status','close','execute','result'].includes(mode))throw Error('USAGE_NATIVE_PREPARE_STATUS_CLOSE_EXECUTE_RESULT');
 const c=JSON.parse(fs.readFileSync(path.join(__dirname,'runtime/connection.json'),'utf8')),u=new URL(c.url);if(u.hostname!=='127.0.0.1'||u.protocol!=='http:')throw Error('LOCAL_ENDPOINT_REQUIRED');
 let data=mode==='prepare'?{controllerThreadId:'01a13637-abd8-7151-9fdd-cae83f313ba1',requestId:process.argv[3]||randomUUID(),durable:process.argv.includes('--durable')}:{};
 if(mode==='execute'){const file=process.argv[3];if(!file||fs.statSync(file).size>4096)throw Error('NATIVE_EXECUTE_FILE_LIMIT');data=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}
 const get=['status','result'].includes(mode);
 const r=await fetch(c.url+'/api/native/'+mode,{method:get?'GET':'POST',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'},...(get?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(120000)}),v=await r.json();if(!r.ok)throw Error(v.error||'NATIVE_REQUEST_FAILED');
 const result={state:v.state,prepareId:v.prepareId,controllerThreadId:v.controllerThreadId,workerThreadId:v.workerThreadId,transport:v.transport,connectionAlive:v.connectionAlive,ephemeral:v.ephemeral,modelTurns:v.modelTurns,imageCalls:v.imageCalls,executionEnabled:v.executionEnabled,expiresAt:v.expiresAt,nativeDirectories:v.nativeDirectories,logFiles:v.logFiles,logCoverageVerified:v.logCoverageVerified,receiptPath:v.applicationReceiptPath,reason:v.reason,jobId:v.jobId,attemptId:v.attemptId,inputHash:v.inputHash,turnId:v.turnId,itemId:v.itemId,nativePath:v.nativePath,artifact:v.artifact,toolStartedAt:v.toolStartedAt,toolCompletedAt:v.toolCompletedAt,error:v.error};
 const out=JSON.stringify(result);if(Buffer.byteLength(out)>2048)throw Error('NATIVE_OUTPUT_LIMIT');console.log(out);
}
main().catch(e=>{console.error(JSON.stringify({error:/^[A-Z0-9_]+$/.test(e.message)?e.message:'NATIVE_REQUEST_FAILED'}));process.exitCode=1;});
