'use strict';
const path=require('node:path'),store=require('./workflow-store.cjs'),orders=require('./work-orders.cjs'),evidence=require('./execution-evidence.cjs');
function read(runtime,project,dispatch,command){
 const order=orders.current(runtime),bound=orders.commandFor(order,command);
 if(!order)return {state:'no-work-order',owner:'用户 / 组长',reason:'从词库选择最多 5 项后保存工作单。',items:[],automaticWakeup:false};
 const result={workOrderId:order.id,state:order.state,owner:order.ownerThreadId?'02 西语组长':'用户 / 02 西语组长',reason:null,dispatch:order.dispatch?{id:order.dispatch.id,sha256:order.dispatch.sha256}:null,commandId:bound?.id||null,commandState:bound?.state||null,runId:bound?.runId||null,batchId:bound?.batchId||null,pauseRequested:command?.action==='pause'&&!!bound,pauseState:command?.action==='pause'?command.state:null,items:order.items.map(x=>({...x,generation:'not-started',review:'pending'})),automaticWakeup:false};
 if(order.state==='completed')return {...result,owner:'04 词库岗（归档另行处理）',reason:'本批生成和独审均已核验；归档、用户终审和发布未由工作台执行。',items:order.items.map(x=>{const job=order.dispatch?.items.find(i=>evidence.identity(i)===evidence.identity(x)),receipt=order.completion?.items.find(i=>i.jobId===job?.jobId);return {...x,...job,...receipt,generation:receipt?'generated':'unverified',review:receipt?'passed':'unverified'};}),receipt:order.completion};
 if(order.state==='cancelled')return {...result,owner:'用户 / 组长',reason:order.reason||'已取消'};
 if(order.state==='proposed')return {...result,reason:'等待组长运行 registry.cjs transition 领取工单。'};
 if(order.state==='blocked')return {...result,reason:order.reason};
 if(!order.dispatch)return {...result,state:'awaiting-dispatch',owner:'05 教学岗 / 02 组长',reason:'05 准备正式派单，组长核对全批身份及版本后关联；不会自动签发。'};
 if(order.dispatch.id!==dispatch.dispatchId||order.dispatch.sha256!==dispatch.sha256){
  // Completion of an already accepted immutable dispatch may be read from its own run evidence.
  if(!bound?.acceptedAt)return {...result,state:'blocked',reason:'DISPATCH_CHANGED：正式派单已变更，旧关联不能执行。'};
 }
 if(!bound)return {...result,state:'awaiting-command',reason:'等待组长请求并领取这份已关联的正式派单。'};
 if(bound.state==='pending')return {...result,state:'awaiting-claim',reason:'指令已保存，等待组长人工领取并核对租约、存储门禁。'};
 const check=evidence.assess(bound,project);
 if(!check.valid)return {...result,state:bound.state==='blocked'?'blocked':'awaiting-evidence',reason:bound.reason||check.code};
 result.runId=check.runId;result.batchId=check.batchId;result.items=check.items.map(x=>({...x,spanish:order.items.find(i=>evidence.identity(i)===evidence.identity(x))?.spanish||x.jobId}));
 result.generation={state:check.generation,completed:check.generated,total:check.total};result.review={state:check.review,qualified:check.qualified,total:check.total};
 if(result.pauseRequested&&command.state!=='completed')return {...result,state:'pause-pending',reason:'暂停请求待组长回执；在途结果仍须核对，页面不是即时停止开关。'};
 if(check.allPassed)return {...result,state:bound.state==='completed'?'ready-to-close':'awaiting-completion-ack',owner:'02 西语组长',reason:bound.state==='completed'?'执行及独审已通过，等待组长完成工单。':'证据齐全，等待组长回执 completed。'};
 if(check.failed||check.items.some(x=>x.generation==='unknown'||x.review==='mismatch'||x.reason&&!['ATTEMPT_MISSING','EXECUTION_PENDING','AWAITING_INDEPENDENT_REVIEW'].includes(x.reason)))return {...result,state:'blocked',owner:check.items.some(x=>x.review==='held'||x.review==='mismatch')?'05 教学岗':'02 西语组长',reason:check.items.find(x=>x.reason&&x.reason!=='AWAITING_INDEPENDENT_REVIEW')?.reason||'需要人工核验'};
 if(check.allGenerated)return {...result,state:'awaiting-review',owner:'05 教学岗',reason:'图片生成完成，独审尚未全部通过；不能记作合格完成。'};
 return {...result,state:'executing',owner:'02 西语组长',reason:'等待组长调用工具并登记逐项结果；工作台不自动唤醒或调用模型。'};
}
module.exports={read};
