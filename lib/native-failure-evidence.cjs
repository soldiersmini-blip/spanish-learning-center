'use strict';
const fs=require('node:fs'),{createHash}=require('node:crypto');
const MAX=524288;
const READ_ONLY_TAIL=`const r=await Promise.allSettled(paths.map(p=>tools.exec_command({cmd:"Get-Content -LiteralPath '"+p.replaceAll("'","''")+"'",shell:"powershell",max_output_tokens:4000})));
r.forEach((x,i)=>text(JSON.stringify({path:paths[i],result:x.status==="fulfilled"?x.value.output:String(x.reason)})));`;
function onlyVerifiedReads(call){
 if(call.type!=='custom_tool_call'||call.name!=='exec'||typeof call.input!=='string')return false;
 const prefix='const paths = ',end=call.input.indexOf('];');if(!call.input.startsWith(prefix)||end<0)return false;
 try{const paths=JSON.parse(call.input.slice(prefix.length,end+1));return paths.length>0&&paths.length<=8&&paths.every(p=>typeof p==='string'&&p.length<2048)&&call.input.slice(end+2).trim()===READ_ONLY_TAIL;}catch{return false;}
}
function diagnose({receipt,prepared}){
 const fields=['prepareId','controllerThreadId','workerThreadId'];if(fields.some(k=>receipt[k]!==prepared[k])||!receipt.turnId||prepared.logFiles?.length!==1)throw Error('NATIVE_DIAGNOSTIC_BINDING');
 const file=prepared.logFiles[0],before=fs.statSync(file);if(!before.isFile()||before.size>MAX)throw Error('NATIVE_DIAGNOSTIC_LOG_LIMIT');
 const bytes=fs.readFileSync(file),after=fs.statSync(file);if(before.size!==after.size||before.mtimeMs!==after.mtimeMs||bytes.length>MAX)throw Error('NATIVE_DIAGNOSTIC_LOG_CHANGED');
 const records=bytes.toString('utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line));
 const session=records.find(r=>r.type==='session_meta'),starts=records.filter(r=>r.type==='event_msg'&&r.payload?.type==='task_started'),terminals=records.filter(r=>r.type==='event_msg'&&r.payload?.type==='task_complete');
 const terminal=terminals.find(r=>r.payload.turn_id===receipt.turnId),raw=terminal?.payload?.error;
 const error={code:typeof raw?.codex_error_info==='string'?raw.codex_error_info:'unclassified',message:raw?.codex_error_info==='server_overloaded'?'Selected model is at capacity. Please try a different model.':'See bounded native terminal error'};
 const calls=records.filter(r=>r.type==='response_item'&&['custom_tool_call','function_call','image_generation_call'].includes(r.payload?.type)).map(r=>r.payload);
 const imageEvents=records.filter(r=>/image.?generation/i.test(r.payload?.type||''));
 const verifiedReads=calls.length>0&&calls.every(onlyVerifiedReads);
 const sameSession=session?.payload?.id===receipt.workerThreadId&&starts.length===1&&starts[0].payload.turn_id===receipt.turnId&&terminals.length===1;
 const confirmed=!!terminal&&sameSession&&error.code==='server_overloaded'&&receipt.imageCalls===0&&!receipt.nativePath&&!receipt.itemId&&imageEvents.length===0&&verifiedReads;
 return {schemaVersion:1,...Object.fromEntries(['jobId','attemptId','inputHash','prepareId','controllerThreadId','workerThreadId','turnId'].map(k=>[k,receipt[k]])),recordedState:receipt.state,terminalStatus:terminal?.payload?.error?'failed':'unverified',error,confirmedNoImageCall:confirmed,imageToolCallsObserved:receipt.imageCalls,imageGenerationRecords:imageEvents.length,readOnlyCallsVerified:verifiedReads,toolCalls:calls.length,automaticRetryAuthorized:false,sourceLog:{path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),mtimeMs:after.mtimeMs},checkedAt:new Date().toISOString()};
}
module.exports={diagnose,onlyVerifiedReads,READ_ONLY_TAIL};
