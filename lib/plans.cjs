'use strict';
const {MAX_JOBS}=require('./production-limits.cjs');
const flow=require('../ui/plan-flow.js');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const LEAD='01a13637-abd8-7151-9fdd-cae83f313ba1',CURRENT_LIMIT=2;
const file=r=>path.join(r,'PLAN-CURRENT.json');
function batchFields(n){if(n.batchSize===undefined)return {};if(n.type!=='card'||!Number.isInteger(n.batchSize)||n.batchSize<1||n.batchSize>1000)throw Error('PLAN_BATCH_FIELDS');return {batchSize:n.batchSize};}
function orderFields(n){if(n.type!=='user-order'){if(n.requestText!==undefined||n.vocabularyScope!==undefined)throw Error('PLAN_USER_ORDER');return {};}if(typeof n.requestText!=='string'||!n.requestText.trim()||n.requestText.length>4000)throw Error('PLAN_USER_ORDER');return {requestText:n.requestText.trim(),...(n.vocabularyScope?{vocabularyScope:require('./vocabulary-scope.cjs').saved(n.vocabularyScope)}:{})};}
function read(runtime){if(!fs.existsSync(file(runtime)))return null;const b=fs.readFileSync(file(runtime));if(b.length>262144)throw Error('PLAN_SIZE');return JSON.parse(b);}
function validate(input){
 if([2,3].includes(input?.schemaVersion))return validateFreeGraph(input);
 if(input?.schemaVersion!==1||!Array.isArray(input.nodes)||input.nodes.length<1||input.nodes.length>MAX_JOBS||!Array.isArray(input.edges)||input.edges.length>MAX_JOBS)throw Error('PLAN_SCHEMA');
 const ids=new Set();const nodes=input.nodes.map(n=>{if(!/^plan-[1-9]\d?$/.test(n.id)||ids.has(n.id)||typeof n.label!=='string'||!n.label.trim()||n.label.length>32)throw Error('PLAN_NODE');ids.add(n.id);return {id:n.id,label:n.label.trim()};});
 const connected=new Set();const edges=input.edges.map(e=>{if(e.from!=='dispatch'||!ids.has(e.to)||connected.has(e.to))throw Error('PLAN_EDGE');connected.add(e.to);return {from:'dispatch',to:e.to};});
 if(!edges.length)throw Error('PLAN_CONNECT_AT_LEAST_ONE');
 return {nodes,edges,requestedConcurrency:edges.length,unconnectedNodes:nodes.length-edges.length};
}
function validateFreeGraph(input){
 const imageProvider=input.imageProvider===undefined?'pro':input.imageProvider;
 if(!['pro','api'].includes(imageProvider))throw Error('PLAN_IMAGE_PROVIDER');
 const styleReference=input.styleReference===undefined?{}:{styleReference:require('./image-style-reference.cjs').selector(input.styleReference)};
 if(input.styleReference!==undefined&&imageProvider!=='api')throw Error('STYLE_REFERENCE_REQUIRES_API');
 const recipient=input.recipientThreadId===undefined?{}:{recipientThreadId:require('./conversations.cjs').target(input.recipientThreadId).threadId,...(typeof input.recipientLabel==='string'&&input.recipientLabel.trim()?{recipientLabel:input.recipientLabel.trim().slice(0,160)}:{})};
 if(!Array.isArray(input.nodes)||input.nodes.length>200||!Array.isArray(input.edges)||input.edges.length>500)throw Error('PLAN_SCHEMA');
 const ids=new Set(['codex','lead','pro','dispatch','review']),edgeIds=new Set(),sides=['left','right','top','bottom'];
 const basics=input.nodes.map(n=>{if(!/^plan-[1-9]\d{0,5}$/.test(n.id)||ids.has(n.id)||typeof n.label!=='string'||!n.label.trim()||n.label.length>80||!['card','point','user-order','execute'].includes(n.type))throw Error('PLAN_NODE');ids.add(n.id);return {id:n.id,label:n.label.trim(),type:n.type,raw:n};});
 const executeNodes=basics.filter(n=>n.type==='execute');if(executeNodes.length>1||input.schemaVersion===3&&!executeNodes.length)throw Error('PLAN_EXECUTION_NODE_REQUIRED');
 const legacyNodes=input.schemaVersion===2?basics.map(({raw,...base})=>({...base,...batchFields(raw),...orderFields(raw)})):null;
 const edges=input.edges.map(e=>{if(!/^edge-[a-zA-Z0-9-]{1,80}$/.test(e.id)||edgeIds.has(e.id)||!ids.has(e.from)||!ids.has(e.to)||e.from===e.to||!sides.includes(e.sourceSide)||!sides.includes(e.targetSide)||typeof e.label!=='string'||e.label.length>80)throw Error('PLAN_EDGE');edgeIds.add(e.id);return {id:e.id,from:e.from,to:e.to,sourceSide:e.sourceSide,targetSide:e.targetSide,label:e.label};});
 let active=null;if(input.schemaVersion===3){const parents=new Map();for(const e of edges){if(!parents.has(e.to))parents.set(e.to,new Set());parents.get(e.to).add(e.from);}active=new Set([executeNodes[0].id]);const pending=[...active];while(pending.length){for(const from of parents.get(pending.pop())||[]){if(!active.has(from)){active.add(from);pending.push(from);}}}}
 const nodes=legacyNodes||basics.filter(n=>active.has(n.id)).map(({raw,...base})=>({...base,...batchFields(raw),...orderFields(raw)})),selectedEdges=active?edges.filter(e=>active.has(e.from)&&active.has(e.to)):edges;
 const connected=new Set(selectedEdges.flatMap(e=>[e.from,e.to]));
 const executionFlow=flow.derive({nodes,edges:selectedEdges});if(executionFlow.enabled&&!executionFlow.valid)throw Error(executionFlow.errors[0].code);
 const requestedConcurrency=executionFlow.requestedConcurrency;if(requestedConcurrency>MAX_JOBS)throw Error('PLAN_CONCURRENCY_LIMIT');
 return {schemaVersion:input.schemaVersion,nodes,edges:selectedEdges,requestedConcurrency,imageProvider,...recipient,...styleReference,unconnectedNodes:nodes.filter(n=>!connected.has(n.id)).length,...(executionFlow.enabled?{executionFlow}:{})};
}
function locked(runtime,fn){fs.mkdirSync(runtime,{recursive:true});const lock=path.join(runtime,'plan.lock');let fd;try{fd=fs.openSync(lock,'wx');}catch{throw Error('PLAN_BUSY');}try{const next=fn(read(runtime)),tmp=file(runtime)+'.tmp';fs.writeFileSync(tmp,JSON.stringify(next,null,2)+'\n');fs.renameSync(tmp,file(runtime));return next;}finally{fs.closeSync(fd);fs.unlinkSync(lock);}}
function submit(runtime,input){const graph=validate(input),hash=crypto.createHash('sha256').update(JSON.stringify(graph)).digest('hex');return locked(runtime,old=>{if(old?.graphHash===hash)return old;return {schemaVersion:1,id:crypto.randomUUID(),createdAt:new Date().toISOString(),state:'proposed',graphHash:hash,...graph,executionAuthorization:false,currentExecutionLimit:CURRENT_LIMIT,requiresCapacityChange:graph.requestedConcurrency>CURRENT_LIMIT,supersedes:old?.id||null,review:null};});}
function review(runtime,input){if(input.reviewerThreadId!==LEAD||!['supported','needs-changes'].includes(input.decision)||!Number.isInteger(input.supportedConcurrency)||input.supportedConcurrency<1||input.supportedConcurrency>MAX_JOBS||typeof input.reason!=='string'||input.reason.length>500)throw Error('PLAN_REVIEW');return locked(runtime,old=>{if(!old||old.id!==input.id)throw Error('PLAN_STALE');if(input.decision==='supported'&&old.requestedConcurrency!==input.supportedConcurrency)throw Error('PLAN_CAPACITY_NOT_SUPPORTED');return {...old,state:'reviewed',review:{decision:input.decision,supportedConcurrency:input.supportedConcurrency,reason:input.reason,reviewerThreadId:LEAD,reviewedAt:new Date().toISOString()},executionAuthorization:false};});}
function eligible(plan,concurrency,executionLimit=CURRENT_LIMIT){return !!plan&&plan.state==='reviewed'&&plan.review?.decision==='supported'&&plan.requestedConcurrency===concurrency&&concurrency<=executionLimit;}
module.exports={read,submit,review,validate,eligible,CURRENT_LIMIT};
