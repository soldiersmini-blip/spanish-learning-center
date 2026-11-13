'use strict';
const path=require('node:path'),store=require('./workflow-store.cjs'),evidence=require('./execution-evidence.cjs');
const file=r=>path.join(r,'REGISTRY-REQUEST-CURRENT.json'),terminal=r=>!!r&&['completed','cancelled'].includes(r.state);
const current=r=>store.read(file(r));
function event(old,action,actor,reason){return [...(old.events||[]),{at:new Date().toISOString(),action,actor,reason:reason||null}].slice(-20);}
function previous(old){return [...(old?.previous||[]),...(old?[{id:old.id,state:old.state,itemKeys:old.items.map(x=>x.key),closedAt:old.closedAt||null,reason:old.reason||null}]:[])].slice(-10);}
function commandFor(order,command){if(!order||!command)return null;if(command.workOrderId===order.id&&command.action==='run-current')return command;if(command.interruptedCommand?.workOrderId===order.id)return command.interruptedCommand;return null;}
function matches(order,dispatch){return order.items.length===dispatch.items.length&&order.items.every(x=>dispatch.items.filter(y=>evidence.identity(x)===evidence.identity(y)).length===1);}
function verifyLink(order,dispatch,id){if(!order||order.id!==id)throw Error('REGISTRY_REQUEST_STALE');if(order.state!=='linked'||order.dispatch?.id!==dispatch.dispatchId||order.dispatch?.sha256!==dispatch.sha256||!matches(order,dispatch))throw Error('REGISTRY_DISPATCH_MISMATCH');}
function transition(runtime,input,project,getDispatch){
 return store.locked(runtime,()=>{
  const old=current(runtime);if(!old||old.id!==input.id)throw Error('REGISTRY_REQUEST_STALE');
  if(!['claim','cancel','block','link-dispatch','complete'].includes(input.action))throw Error('REGISTRY_ACTION');
  const actor=input.actorThreadId||'local-user';if(input.action!=='cancel'&&actor!==evidence.LEAD)throw Error('REGISTRY_ACTOR');
  const reason=typeof input.reason==='string'?input.reason.trim():'';if(reason.length>500)throw Error('REGISTRY_REASON');
  if(terminal(old)){if(input.action==='complete'&&old.state==='completed'||input.action==='cancel'&&old.state==='cancelled')return old;throw Error('REGISTRY_REQUEST_TERMINAL');}
  const cmd=store.read(path.join(runtime,'COMMAND-CURRENT.json')),bound=commandFor(old,cmd);let next={...old,schemaVersion:2,updatedAt:new Date().toISOString(),executionAuthorization:false};
  if(input.action==='claim'){if(!['proposed','claimed','blocked'].includes(old.state)||old.dispatch)throw Error('REGISTRY_TRANSITION');next.state='claimed';next.ownerThreadId=evidence.LEAD;next.claimedAt=old.claimedAt||next.updatedAt;next.reason=null;}
  if(input.action==='block'){if(!reason)throw Error('REGISTRY_REASON_REQUIRED');if(old.dispatch)throw Error('REGISTRY_ALREADY_LINKED');next.state='blocked';next.ownerThreadId=evidence.LEAD;next.reason=reason;}
  if(input.action==='cancel'){
   if(!reason)throw Error('REGISTRY_REASON_REQUIRED');
   if(bound&&['pending','accepted','generated-complete'].includes(bound.state)||cmd?.action==='pause'&&cmd.interruptedCommand?.workOrderId===old.id&&cmd.state!=='completed')throw Error('REGISTRY_EXECUTION_UNSETTLED');
   if(bound?.acceptedAt){const check=evidence.assess(bound,project);if(!check.valid||!check.settled)throw Error('REGISTRY_EXECUTION_UNSETTLED');}
   if(!bound){const run=store.read(path.join(project,evidence.RUN));if(run?.attempts?.some(a=>old.items.some(x=>evidence.identity(x)===evidence.identity(a))))throw Error('REGISTRY_EXECUTION_UNSETTLED');}
   next.state='cancelled';next.reason=reason;next.closedAt=next.updatedAt;
  }
  if(input.action==='link-dispatch'){
   if(!['claimed','linked'].includes(old.state))throw Error('REGISTRY_CLAIM_REQUIRED');
   const d=getDispatch();if(!d.ready||d.dispatchId!==input.dispatchId||d.sha256!==input.dispatchSha256||!matches(old,d))throw Error('REGISTRY_DISPATCH_MISMATCH');
   if(old.dispatch){if(old.dispatch.id===d.dispatchId&&old.dispatch.sha256===d.sha256)return old;throw Error('REGISTRY_ALREADY_LINKED');}
   next.state='linked';next.dispatch={id:d.dispatchId,sha256:d.sha256,items:d.items.map(({jobId,entryId,senseId,sourceRevision,sourcePromptHash})=>({jobId,entryId,senseId,sourceRevision,sourcePromptHash}))};next.ownerThreadId=evidence.LEAD;next.reason=null;
  }
  if(input.action==='complete'){
   if(!bound||bound.state!=='completed')throw Error('REGISTRY_COMPLETION_EVIDENCE_REQUIRED');
   const check=evidence.assess(bound,project,{checkFiles:true});if(!check.valid||!check.allPassed)throw Error('REGISTRY_COMPLETION_EVIDENCE_REQUIRED');
   next.state='completed';next.closedAt=next.updatedAt;next.commandId=bound.id;next.completion={runId:check.runId,batchId:check.batchId,generated:check.generated,qualified:check.qualified,items:check.items.map(({jobId,attemptId,sha256,reviewRef})=>({jobId,attemptId,sha256,reviewRef}))};next.reason=null;
  }
  next.events=event(old,input.action,actor,reason);return store.write(file(runtime),next);
 });
}
module.exports={file,current,terminal,event,previous,transition,matches,verifyLink,commandFor};
