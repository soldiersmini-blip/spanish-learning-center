'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRegistry}=require('./lib/registered-words.cjs');
function summary(r){return r&&{id:r.id,state:r.state,ownerThreadId:r.ownerThreadId,items:r.items.length,dispatch:r.dispatch&&{id:r.dispatch.id,sha256:r.dispatch.sha256},commandId:r.commandId,reason:r.reason,executionAuthorization:false};}
try{
 const registry=createRegistry(),[op,arg]=process.argv.slice(2);let result;
 if(op==='status'){const s=registry.list({limit:1});result={source:s.source,registeredEntries:s.registeredEntries,senses:s.senses,counts:s.counts,sourceUpdatedAt:s.sourceUpdatedAt,currentRequest:summary(s.currentRequest),directGenerationConnected:false};}
 else if(op==='request-status')result=summary(registry.current());
 else if(op==='transition'){if(!arg)throw Error('REGISTRY_RECEIPT_REQUIRED');const file=path.resolve(arg);if(fs.statSync(file).size>8192)throw Error('REGISTRY_OUTPUT_LIMIT');result=summary(registry.transition(JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''))));}
 else if(op==='resolve-request'){const r=registry.current();if(!r)throw Error('REGISTRY_NO_REQUEST');if(['cancelled','completed'].includes(r.state))throw Error('REGISTRY_REQUEST_TERMINAL');const items=r.items.map(x=>{const current=registry.item(x.key);if(!current.selectable||current.fingerprint!==x.itemFingerprint)throw Error('REGISTRY_SELECTION_STALE');return {entryId:current.entryId,senseId:current.senseId,sourceRevision:current.sourceRevision,spanish:current.spanish,workType:current.workType,meaningZh:current.meaningZh,scope:current.scope,imageBrief:current.imageBrief,context:current.context,illustrationUse:current.illustrationUse,imageOnlyRecallAllowed:current.imageOnlyRecallAllowed};});result={id:r.id,executionAuthorization:false,items};}
 else throw Error('USAGE_REGISTRY_STATUS_REQUEST_STATUS_RESOLVE_REQUEST_TRANSITION');
 const out=JSON.stringify(result);if(Buffer.byteLength(out)>(op==='resolve-request'?24000:2048))throw Error('REGISTRY_OUTPUT_LIMIT');console.log(out);
}catch(e){console.error(JSON.stringify({error:/^[A-Z0-9_]+$/.test(e.message)?e.message:'REGISTRY_READ_FAILED'}));process.exitCode=1;}
