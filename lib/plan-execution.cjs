'use strict';
const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite'),{randomUUID,createHash}=require('node:crypto');
const plans=require('./plans.cjs');
const problems=require('./preparation-problems.cjs');
const {contentEvidenceStamp}=require('./content-evidence-stamp.cjs');
const untouched=r=>r.generated===0&&r.steps?.length>0&&r.steps.every(s=>s.state==='waiting'&&!s.generated);
const preparationErrors=new Set(['SCENE_PLAN_INVALID','SCENE_PLAN_UPSTREAM_ERROR','SCENE_PLAN_RATE_LIMIT','SCENE_PLAN_CONNECTION_FAILED','GENERATION_INPUT_REQUIRED','API_PLAN_STORAGE_RESERVE','WHOLE_CARD_NO_CURRENT_SENSE','WHOLE_CARD_MULTIPLE_SENSES','WHOLE_CARD_SELECTION_CHANGED','VOCABULARY_SELECTION_STALE','LIVE_VOCABULARY_STALE','LIVE_VOCABULARY_UNAVAILABLE','CONTENT_REVIEW_REQUIRED','PLAN_PREPARATION_RECHECK_REQUIRED']);
const active=s=>['preparing','running'].includes(s);
const phaseNames={preparing:'正在核对选词与准备画面内容','independent-context-review':'正在独立审核画面语境','independent-context-review-complete':'语境审核完成，正在准备派单','preparing-workers':'正在连接生图执行端','confirming-dispatch':'正在确认本批画面任务',generating:'正在生图','received-awaiting-review':'图片已收齐，正在接续下一批'};
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function graphIdentity(plan){const normalized=JSON.parse(JSON.stringify(plan));delete normalized.requestedConcurrency;if(normalized.executionFlow){for(const key of ['requestedConcurrency','branchWidth','hasExecute','executeNodeId','activeNodeIds'])delete normalized.executionFlow[key];}if(!normalized.edges.some(e=>e.from==='dispatch'&&normalized.nodes.some(n=>n.id===e.to)))normalized.edges=normalized.edges.filter(e=>e.from!=='dispatch'&&e.to!=='dispatch');return digest(normalized);}
function resolveSelection(plan,resolveScope){
 const flow=plan.executionFlow;if(!flow?.enabled||!flow.valid||!flow.steps.length)throw Error('PLAN_EXECUTION_SLOTS_REQUIRED');
 const activeOrders=new Set(flow.vocabularyDemands.map(d=>d.nodeId)),orders=plan.nodes.filter(n=>n.type==='user-order'&&(!flow.hasExecute||activeOrders.has(n.id))),owners=new Map(),adj=new Map();
 for(const e of plan.edges){if(!adj.has(e.from))adj.set(e.from,[]);adj.get(e.from).push(e.to);}
 const result={orders:[],steps:[]},used=new Set();
 for(const n of orders){
  if(!n.vocabularyScope)throw Error('PLAN_VOCABULARY_REQUIRED');
  const automatic=n.vocabularyScope.mode==='auto-missing',required=flow.vocabularyDemands.find(d=>d.nodeId===n.id)?.required||0;
  if(automatic&&(required<1||required>1000))throw Error('PLAN_AUTO_SCOPE_LIMIT');
  const current=resolveScope(automatic?{...n.vocabularyScope,limit:required}:n.vocabularyScope);
  if(!automatic&&(current.selectionHash!==n.vocabularyScope.selectionHash||current.selectedCount!==n.vocabularyScope.selectedCount))throw Error('VOCABULARY_SCOPE_STALE');
  if(automatic&&current.selectedCount<required)throw Error('PLAN_SCOPE_SHORTAGE');
  if(!Array.isArray(current.selection))throw Error('PLAN_SELECTION_UNRESOLVED');
  const order={nodeId:n.id,requestText:n.requestText,items:current.selection,selectionHash:current.selectionHash};result.orders.push(order);
  const seen=new Set(),todo=[...(adj.get(n.id)||[])];while(todo.length){const id=todo.pop();if(seen.has(id)||orders.some(o=>o.id===id))continue;seen.add(id);for(const next of adj.get(id)||[])todo.push(next);}
  for(const s of flow.steps.filter(s=>seen.has(s.nodeId))){if(owners.has(s.nodeId))throw Error('PLAN_SLOT_MULTIPLE_ORDERS');owners.set(s.nodeId,order);}
 }
 const offsets=new Map();
 for(const s of flow.steps){const o=owners.get(s.nodeId);if(!o)throw Error('PLAN_SLOT_ORDER_REQUIRED');const offset=offsets.get(o.nodeId)||0,items=o.items.slice(offset,offset+s.quantity);if(items.length!==s.quantity)throw Error('PLAN_SCOPE_SHORTAGE');for(const item of items){const key=item.entryId+'|'+(item.senseId||'');if(used.has(key))throw Error('PLAN_DUPLICATE_ITEM');used.add(key);}offsets.set(o.nodeId,offset+s.quantity);result.steps.push({...s,orderNodeId:o.nodeId,requestText:o.requestText,items});}
 return result;
}
function createPlanExecution({runtime,project,resolveScope,makeRunner,canStart=()=>true,promptCandidate}){
 fs.mkdirSync(runtime,{recursive:true});const db=new DatabaseSync(path.join(runtime,'plan-execution.sqlite'));
 db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS executions(id TEXT PRIMARY KEY, graph_hash TEXT UNIQUE NOT NULL, updated_at TEXT NOT NULL, payload TEXT NOT NULL)');
 const get=id=>{const r=db.prepare('SELECT payload FROM executions WHERE id=?').get(id);return r?JSON.parse(r.payload):null;};
 const put=r=>{r.updatedAt=new Date().toISOString();const json=JSON.stringify(r);if(Buffer.byteLength(json)>8*1024*1024)throw Error('PLAN_EXECUTION_SIZE');db.prepare('INSERT INTO executions VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at,payload=excluded.payload').run(r.id,r.graphHash,r.updatedAt,json);return r;};
 for(const row of db.prepare('SELECT payload FROM executions').all()){const r=JSON.parse(row.payload);if(active(r.state)){const safe=r.state==='preparing'&&untouched(r);r.state=safe?'blocked':'unknown';r.message=safe?'准备阶段曾中断，尚未提交图片；点击执行可重新核对。':'执行端曾中断，需要核对已有结果；不会自动重画。';r.error=safe?'PLAN_PREPARATION_RECHECK_REQUIRED':'PLAN_RESTART_RECONCILIATION_REQUIRED';put(r);}}
 let task=null,activeRun=null;
 function approvedPromptCandidate(){
  if(promptCandidate)return promptCandidate;
  const gate=require(path.join(project,'staff/02-spanish-engineering/storage-tools/word-card-image-prompts.cjs'));
  const registry=gate.load(project);
  return item=>{
   if(registry.missing||!item?.entryId||!item.senseId||!item.sourceRevision)return false;
   const key=[item.entryId,item.senseId,item.sourceRevision].join('|'),row=registry.records.get(key);
   if(!row||registry.duplicates.has(key))return false;
   try{gate.resolve(registry,{entryId:item.entryId,senseId:item.senseId,sourceRevision:item.sourceRevision,spanish:item.spanish,meaningZh:row.meaningZh,scope:row.scope});return true;}
   catch{return false;}
  };
 }
 const pauseFile=path.join(runtime,'QUALITY-PAUSE.json');
 function pause(executionId){const r=activeRun?.record||current();if(!r||r.id!==executionId)throw Error('PLAN_EXECUTION_MISMATCH');fs.writeFileSync(pauseFile,JSON.stringify({executionId,reason:'暂停新增生成，等待质量核对',at:new Date().toISOString()}));if(activeRun){r.pauseRequested=true;r.message='正在暂停新增请求，收齐在途结果。';put(r);activeRun.controller.abort();}return summary(r);}
 function current(){const row=db.prepare('SELECT payload FROM executions ORDER BY updated_at DESC LIMIT 1').get();return row?JSON.parse(row.payload):null;}
 function storageRetrySafe(r){return r.state==='blocked'&&preparationErrors.has(r.error)&&untouched(r);}
 function reconcileModeration(){
  const r=current();if(task||!r||r.state!=='unknown'||r.plan.imageProvider!=='api'||r.error!=='API_PLAN_RECONCILIATION_REQUIRED'||!r.prepared?.steps?.length||r.generated<1)throw Error('PLAN_RECONCILIATION_NOT_SAFE');
  const dir=path.join(runtime,'api-plan',r.id),preparedFile=path.join(dir,'PREPARED.json');
  const saved=JSON.parse(fs.readFileSync(preparedFile,'utf8'));if(saved.inputHash!==r.prepared.inputHash||digest({plan:r.plan,selection:r.selection})!==saved.inputHash)throw Error('API_PLAN_FROZEN_INPUT_CHANGED');
  const revisions=[],failed=[];for(const step of r.steps.filter(x=>x.state==='unknown')){
   const file=path.join(dir,step.nodeId+'.json');if(!fs.existsSync(file))throw Error('PLAN_RECONCILIATION_RECEIPT_MISSING');const receipt=JSON.parse(fs.readFileSync(file,'utf8')),prepared=saved.steps.find(x=>x.nodeId===step.nodeId),jobs=new Set(prepared?.items.map(x=>x.jobId));
   if(receipt.state!=='unknown'||!prepared||!Array.isArray(receipt.items)||receipt.items.length>step.quantity+20||new Set(receipt.items.map(x=>x.jobId)).size!==receipt.items.length)throw Error('PLAN_RECONCILIATION_RECEIPT_INVALID');
   const done=receipt.items.filter(x=>x.state==='awaiting-review');if(done.length!==step.generated||done.some(x=>!jobs.has(x.jobId)||!x.nativePath||!fs.existsSync(x.nativePath)||x.artifact?.sha256?.length!==64))throw Error('PLAN_RECONCILIATION_RECEIPT_INVALID');
   for(const item of receipt.items.filter(x=>x.state!=='awaiting-review')){if(item.state!=='unknown'||item.error!=='IMAGE_UPSTREAM_ERROR'||!jobs.has(item.jobId))throw Error('PLAN_RECONCILIATION_AMBIGUOUS');const id=digest({model:'gpt-image-2.5-flare',size:'1024x1024',quality:'high',prompt:item.finalPrompt}),meta=JSON.parse(fs.readFileSync(path.join(runtime,'api-image-trial',id+'.json'),'utf8'));if(meta.state!=='blocked'||meta.code!=='moderation_blocked')throw Error('PLAN_RECONCILIATION_AMBIGUOUS');failed.push({stepId:step.nodeId,item});}
   revisions.push({step,file,receipt,done});
  }
  if(failed.length!==1||r.selection.orders?.length!==1||r.plan.nodes.find(x=>x.id===r.selection.orders[0].nodeId)?.vocabularyScope?.mode!=='auto-missing')throw Error('PLAN_RECONCILIATION_SCOPE');
  const used=new Set();for(const row of db.prepare('SELECT payload FROM executions').iterate())for(const step of JSON.parse(row.payload).selection?.steps||[])for(const item of step.items||[])used.add(item.entryId);
  let candidate=null,preparedCandidate=null,offset=0;const content=require('./api-generation-content.cjs').createGenerationContent({project});
  while(!candidate&&offset<30000){const page=resolveScope({source:'live-registered',status:'selectable',partOfSpeech:'all',level:'all',query:'',offset,limit:1000});for(const item of page.selection||[]){if(used.has(item.entryId))continue;const sourceStep=r.selection.steps.find(x=>x.nodeId===failed[0].stepId),attempt=content.prepare({executionId:r.id,selection:{steps:[{items:[item],requestText:sourceStep.requestText}]}});if(attempt.ready&&attempt.items?.length===1){candidate=item;preparedCandidate=attempt.items[0];break;}}offset+=page.selection?.length||0;if((page.selection?.length||0)<1000)break;}
  if(!candidate)throw Error('PLAN_RECONCILIATION_NO_REPLACEMENT');
  const before=failed[0].item.entryId,swap=items=>items.map(x=>x.entryId===before?candidate:x),replacePrepared=items=>items.map(x=>x.entryId===before?preparedCandidate:x);
  for(const order of r.selection.orders)order.items=swap(order.items);for(const step of r.selection.steps)step.items=swap(step.items);for(const step of r.steps)step.items=swap(step.items);
  for(const step of saved.steps)step.items=replacePrepared(step.items);for(const step of r.prepared.steps)step.items=replacePrepared(step.items);
  if(new Set(r.selection.steps.flatMap(x=>x.items.map(y=>y.entryId))).size!==r.total)throw Error('PLAN_RECONCILIATION_DUPLICATE');
  saved.inputHash=r.prepared.inputHash=digest({plan:r.plan,selection:r.selection});
  const atomic=(file,value)=>{const data=JSON.stringify(value),tmp=file+'.recovery-'+process.pid;const fd=fs.openSync(tmp,'wx');try{fs.writeFileSync(fd,data);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(tmp,file);};
  for(const x of revisions){x.receipt.skipped=[...(x.receipt.skipped||[]),...x.receipt.items.filter(y=>y.state!=='awaiting-review')];x.receipt.items=x.done;x.receipt.state='reconciled-ready';x.receipt.reason=null;x.receipt.generated=x.done.length;atomic(x.file,x.receipt);x.step.state='waiting';x.step.result=x.receipt;}
  atomic(preparedFile,saved);
  r.selectionCorrections=[...(r.selectionCorrections||[]),{at:new Date().toISOString(),reason:'moderation-blocked-before-image',items:[{before,after:candidate.entryId,spanishBefore:failed[0].item.contentSnapshot?.spanish||failed[0].item.entryId,spanishAfter:candidate.spanish}]}];
  r.reconciledReady=true;r.state='blocked';r.error='PLAN_RECONCILED_READY';r.phase='reconciled-ready';r.message='已核对 '+r.generated+' 张原图，绕过 1 个被接口拒绝的词，接续时不会重画已有结果。';put(r);return summary(r);
 }
 function bypassMissingAutoCards(r,blockers){
  const replaceable=new Set(['GENERATION_MEANING_MISSING','GENERATION_SCENE_UNSUITABLE','GENERATION_SCENE_INVALID','SOURCE_REVISION_MISMATCH','EXISTING_IMAGE_LINK_REQUIRES_RECONCILIATION','IMAGE_PROMPT_MISSING_OR_STALE','IMAGE_PROMPT_NOT_APPROVED','IMAGE_PROMPT_LEXICAL_STALE','IMAGE_PROMPT_REVIEW_MISSING','IMAGE_PROMPT_MEANING_MISMATCH','IMAGE_PROMPT_CONTEXT_MISSING','IMAGE_PROMPT_VISIBLE_DETAIL_MISSING','IMAGE_PROMPT_AVOID_INVALID','IMAGE_PROMPT_TEXT_INVALID','IMAGE_PROMPT_REVISION_INVALID','IMAGE_PROMPT_HASH_MISMATCH','IMAGE_PROMPT_DUPLICATE']);
  if(r.plan.imageProvider!=='api'||!untouched(r)||r.selection.orders?.length!==1||!blockers.length||(r.selectionCorrections||[]).flatMap(x=>x.items||[]).length+blockers.length>100||blockers.some(x=>x.problems?.length!==1||!replaceable.has(x.problems[0])))return false;
  const order=r.selection.orders[0],node=r.plan.nodes.find(x=>x.id===order.nodeId&&x.type==='user-order');if(node?.vocabularyScope?.mode!=='auto-missing')return false;
  const bad=new Set(blockers.map(x=>x.entryId)),currentIds=new Set(order.items.map(x=>x.entryId));if(bad.size!==blockers.length||[...bad].some(id=>!currentIds.has(id)))return false;
  const excluded=new Set([...currentIds,...(r.selectionCorrections||[]).flatMap(x=>x.items.map(y=>y.before))]);
  for(const row of db.prepare('SELECT id,payload FROM executions WHERE id<>?').iterate(r.id))for(const step of JSON.parse(row.payload).selection?.steps||[])for(const item of step.items||[])excluded.add(item.entryId);
  const hasPrompt=approvedPromptCandidate(),candidates=[];let offset=0;while(candidates.length<bad.size&&offset<30000){const page=resolveScope({source:'live-registered',status:'selectable',partOfSpeech:'all',level:'all',query:'',offset,limit:1000});for(const item of page.selection||[])if(!excluded.has(item.entryId)&&hasPrompt(item)){excluded.add(item.entryId);candidates.push(item);if(candidates.length===bad.size)break;}offset+=page.selection?.length||0;if((page.selection?.length||0)<1000)break;}
  if(candidates.length!==bad.size)return false;
  const changes=new Map(),audit=[];let next=0;for(const item of order.items)if(bad.has(item.entryId)){const candidate=candidates[next++];changes.set(item.entryId,candidate);audit.push({before:item.entryId,after:candidate.entryId,spanishBefore:item.spanish,spanishAfter:candidate.spanish});}
  const swap=items=>items.map(x=>changes.get(x.entryId)||x);order.items=swap(order.items);for(const step of r.selection.steps)step.items=swap(step.items);for(const step of r.steps)step.items=swap(step.items);
  if(new Set(r.selection.steps.flatMap(s=>s.items.map(x=>x.entryId))).size!==r.total)throw Error('PLAN_REPLACEMENT_DUPLICATE');
  r.selectionCorrections=[...(r.selectionCorrections||[]),{at:new Date().toISOString(),reason:'auto-skip-generation-input',problems:blockers.map(x=>({entryId:x.entryId,codes:x.problems,detail:x.detail||null})),items:audit}];r.prepared=null;r.blockers=[];r.message='自动绕过 '+audit.length+' 个缺少输入或暂不适合单帧配图的词，补入后续缺图词；正在重新核对，尚未提交图片请求。';put(r);return true;
 }
 function replaceMissingCards(executionId){
  const r=current();if(task||!r||r.id!==executionId||r.plan.imageProvider!=='api'||!untouched(r)||!['blocked','waiting-content'].includes(r.state)||r.error!=='GENERATION_INPUT_REQUIRED'||r.prepared?.steps?.length)throw Error('PLAN_REPLACEMENT_NOT_SAFE');
  const orderNode=r.plan.nodes.find(x=>x.type==='user-order'&&x.id===r.selection.orders?.[0]?.nodeId);
  if(r.selection.orders.length!==1||orderNode?.vocabularyScope?.mode!=='auto-missing')throw Error('PLAN_REPLACEMENT_NOT_AUTO');
  const blocked=r.blockers||[];if(!blocked.length||blocked.some(x=>x.problems?.length!==1||x.problems[0]!=='GENERATION_MEANING_MISSING'))throw Error('PLAN_REPLACEMENT_SCOPE');
  const missing=new Set(blocked.map(x=>x.entryId)),original=r.selection.orders[0].items,originalIds=new Set(original.map(x=>x.entryId));if(missing.size!==blocked.length||original.some(x=>!x.entryId)||[...missing].some(id=>!originalIds.has(id)))throw Error('PLAN_REPLACEMENT_IDENTITY');
  const scope=resolveScope({mode:'auto-missing',source:'live-registered',limit:r.total});if(scope.selectedCount!==r.total)throw Error('PLAN_SCOPE_SHORTAGE');
  const candidates=scope.selection.filter(x=>!originalIds.has(x.entryId)),retained=new Set(scope.selection.map(x=>x.entryId));if(candidates.length!==missing.size||original.some(x=>!missing.has(x.entryId)&&!retained.has(x.entryId)))throw Error('PLAN_REPLACEMENT_CHANGED');
  const replacements=new Map(),audit=[];let i=0;for(const item of original)if(missing.has(item.entryId)){const next=candidates[i++];replacements.set(item.entryId,next);audit.push({before:item.entryId,after:next.entryId,spanishBefore:item.spanish,spanishAfter:next.spanish});}
  const substitute=items=>items.map(item=>replacements.get(item.entryId)||item);for(const order of r.selection.orders)order.items=substitute(order.items);for(const step of r.selection.steps)step.items=substitute(step.items);for(const step of r.steps)step.items=substitute(step.items);
  if(new Set(r.selection.steps.flatMap(s=>s.items.map(x=>x.entryId))).size!==r.total)throw Error('PLAN_REPLACEMENT_DUPLICATE');
  r.selectionCorrections=[...(r.selectionCorrections||[]),{at:new Date().toISOString(),reason:'not-in-local-image-registry',items:audit}];r.prepared=null;r.blockers=[];r.error='PLAN_PREPARATION_RECHECK_REQUIRED';r.preparationStamp=null;r.state='blocked';r.phase='selection-corrected';r.message='已保留原有 '+(r.total-audit.length)+' 词，按自动缺图顺序替换 '+audit.length+' 个不适合本地生图的词卡。点击执行继续原订单。';put(r);return {execution:summary(r),replacements:audit};
 }
 function refreshSelection(r){
  if(!untouched(r)||r.prepared?.steps?.some(s=>s.items?.some(x=>x.jobId)))return;
  const replacement=new Map();
  for(const o of r.selection.orders){const cards=o.items.filter(x=>!x.senseId);if(!cards.length)continue;
   const fresh=resolveScope({source:'live-registered',status:'selectable',partOfSpeech:'all',level:'all',query:'',offset:0,limit:cards.length,entryIds:cards.map(x=>x.entryId)});
   const byId=new Map(fresh.selection.map(x=>[x.entryId,x]));if(byId.size!==cards.length||cards.some(x=>!byId.has(x.entryId)))throw Error('VOCABULARY_SELECTION_STALE');
   for(const x of cards)replacement.set(x.entryId,byId.get(x.entryId));
  }
  for(const o of r.selection.orders)o.items=o.items.map(x=>replacement.get(x.entryId)||x);
  for(const s of r.selection.steps)s.items=s.items.map(x=>replacement.get(x.entryId)||x);
  for(const s of r.steps)s.items=s.items.map(x=>replacement.get(x.entryId)||x);
 }
 function summary(r=current()){if(!r)return null;return {id:r.id,graphHash:r.graphHash,imageProvider:r.plan.imageProvider||'pro',state:r.state,qualityPaused:qualityPaused(r),qualitySample:!!r.qualitySample,phase:r.phase,message:qualityPaused(r)?(activeRun?'正在停止新增请求，收齐在途结果。':r.state==='unknown'?'已暂停新增生成；已有提交结果待核对。':'已暂停生成，等待质量核对。'):r.error==="API_PLAN_STORAGE_RESERVE"?"磁盘空间不足：C 盘至少需 5.25 GiB 空闲，F 盘至少需 12.25 GiB。腾出空间后可手动执行原方案。":r.message,error:r.error,errorMessage:problems.describe(r.error),blockers:problems.blockers(r.blockers||r.prepared?.blockers),selectionCorrections:(r.selectionCorrections||[]).flatMap(x=>x.items||[]).slice(0,40).map(x=>({spanishBefore:x.spanishBefore||x.before,spanishAfter:x.spanishAfter||x.after})),retrySafe:untouched(r)&&(r.state==='waiting-content'||storageRetrySafe(r)),total:r.total,generated:r.generated,createdAt:r.createdAt,updatedAt:r.updatedAt,requestedConcurrency:r.plan.requestedConcurrency,actualConcurrency:r.actualConcurrency||null,steps:r.steps.map(s=>({nodeId:s.nodeId,label:s.label,quantity:s.quantity,after:s.after,state:s.state,generated:s.generated||0,message:s.message||'',startedAt:s.startedAt||s.result?.items?.find(x=>x.submittedAt)?.submittedAt||null,finishedAt:s.finishedAt||s.result?.items?.at(-1)?.completedAt||null})),review:'pending',readyForGeneration:!!r.readyForGeneration};}
 function orders(){return db.prepare('SELECT payload FROM executions ORDER BY updated_at DESC LIMIT 30').all().map(row=>{const r=JSON.parse(row.payload),s=summary(r);return {id:s.id,createdAt:s.createdAt,updatedAt:s.updatedAt,imageProvider:s.imageProvider,state:s.state,total:s.total,generated:s.generated,steps:s.steps};});}
 function runner(plan){return makeRunner?makeRunner(plan):require('./isolated-plan-runner.cjs').createIsolatedPlanRunner({project,runtime,imageProvider:plan.imageProvider});}
 function qualityPaused(r){return fs.existsSync(pauseFile)&&!(r?.qualitySample&&active(r.state)&&!r.pauseRequested);}
 function executeQualitySample(input){
  const permitPath=path.join(runtime,'QUALITY-SAMPLE-PERMIT.json'),permit=JSON.parse(fs.readFileSync(permitPath,'utf8')),plan=plans.validate(input);
  if(plan.imageProvider!=='api'||plan.executionFlow?.totalQuantity!==10||permit.count!==10||permit.graphHash!==digest(plan)||permit.policyVersion!==require('./api-scene-plan.cjs').VERSION||!Number.isFinite(Date.parse(permit.expiresAt))||Date.parse(permit.expiresAt)<=Date.now())throw Error('QUALITY_SAMPLE_NOT_AUTHORIZED');
  if(permit.executionId){const prior=get(permit.executionId);if(!prior||prior.graphHash!==permit.graphHash||!prior.qualitySample)throw Error('QUALITY_SAMPLE_PERMIT_MISMATCH');return summary(prior);}
  const result=execute(input,true);fs.writeFileSync(permitPath,JSON.stringify({...permit,executionId:result.id,startedAt:new Date().toISOString()}));return result;
 }
 function execute(input,qualitySample=false){
  if(fs.existsSync(pauseFile)&&!qualitySample)throw Error('PLAN_QUALITY_PAUSED');
  const plan=plans.validate(input),graphHash=digest(plan),reuse=prior=>{const evidence=contentEvidenceStamp(project);if(['waiting-content','blocked'].includes(prior.state)&&(prior.error==='CONTENT_REVIEW_REQUIRED'&&prior.plan.imageProvider!=='api'||prior.error==='GENERATION_INPUT_REQUIRED')&&untouched(prior)&&evidence.newest>0&&(prior.preparationStamp===evidence.stamp||!prior.preparationStamp&&evidence.newest<=Date.parse(prior.updatedAt)))return {...summary(prior),message:'内容尚未更新，仍有 '+(prior.blockers||prior.prepared?.blockers||[]).length+' 词需准备或审核；没有重新启动审核或生图。',unchanged:true};if(prior.state==='blocked'&&prior.reconciledReady&&!task&&canStart()){const adapter=runner(prior.plan);prior.reconciledReady=false;prior.state='preparing';prior.message='从已核对回执接续，不重画已完成图片。';prior.error=null;put(prior);task=Promise.resolve().then(()=>run(prior,adapter)).finally(async()=>{try{await adapter.close?.();}finally{task=null;}});return summary(prior);}if((prior.state==='waiting-content'||prior.state==='blocked'&&(prior.retrySafe===true||storageRetrySafe(prior)))&&!task&&canStart()){const adapter=runner(prior.plan);refreshSelection(prior);prior.readyForGeneration=false;prior.state='preparing';prior.message='重新核对原来选定的词条，不重复生成图片。';prior.error=null;prior.blockers=[];put(prior);task=Promise.resolve().then(()=>run(prior,adapter)).finally(async()=>{try{await adapter.close?.();}finally{task=null;}});}return summary(prior);},existing=db.prepare('SELECT id FROM executions WHERE graph_hash=?').get(graphHash);if(existing)return reuse(get(existing.id));
  // Older saved plans contained a manually entered concurrency field. The same graph must not redraw after this field becomes derived.
  const identity=graphIdentity(plan);let sameGraph=null;for(const row of db.prepare('SELECT payload FROM executions ORDER BY updated_at DESC').iterate()){const prior=JSON.parse(row.payload);if(graphIdentity(prior.plan)===identity){sameGraph=prior;break;}}if(sameGraph)return reuse(sameGraph);
  if(task||active(current()?.state))throw Error('PLAN_EXECUTION_ACTIVE');
  if(current()?.state==='unknown'&&!qualitySample)throw Error('PLAN_RESTART_RECONCILIATION_REQUIRED');
  if(!canStart())throw Error('PLAN_OTHER_EXECUTION_ACTIVE');
  // Reserve the whole card as soon as an order exists, including preparation
  // and blocked orders that have not yet created an image-request claim.
  const ordered=new Set();for(const row of db.prepare('SELECT payload FROM executions').iterate())for(const step of JSON.parse(row.payload).selection?.steps||[])for(const item of step.items||[])ordered.add(item.entryId);
  const hasPrompt=plan.imageProvider==='api'?approvedPromptCandidate():null;
  const selectScope=s=>{if(s.mode!=='auto-missing'||!ordered.size&&!hasPrompt)return resolveScope(s);const selected=[];let offset=0;while(selected.length<s.limit&&offset<=30000){const page=resolveScope({source:'live-registered',status:'selectable',partOfSpeech:'all',level:'all',query:'',offset,limit:Math.min(1000,Math.max(s.limit,100))});for(const item of page.selection||[])if(!ordered.has(item.entryId)&&(!hasPrompt||hasPrompt(item)))selected.push(item);offset+=(page.selection||[]).length;if((page.selection||[]).length<Math.min(1000,Math.max(s.limit,100)))break;}return {selectedCount:Math.min(s.limit,selected.length),selection:selected.slice(0,s.limit)};};
  const selection=resolveSelection(plan,selectScope);if(selection.steps.some(s=>s.items.some(item=>ordered.has(item.entryId))))throw Error('PLAN_DUPLICATE_ITEM');const adapter=runner(plan);
  if(typeof adapter.prepare!=='function'||typeof adapter.runStep!=='function')throw Error('PLAN_RUNNER_UNAVAILABLE');
  const r=put({id:randomUUID(),graphHash,qualitySample,plan,selection,createdAt:new Date().toISOString(),state:'preparing',phase:'preparing',message:'正在核对词条、准备画面要求与任务。',total:selection.steps.reduce((n,s)=>n+s.quantity,0),generated:0,steps:selection.steps.map(s=>({...s,label:plan.nodes.find(n=>n.id===s.nodeId).label,state:'waiting',generated:0}))});
  task=Promise.resolve().then(()=>run(r,adapter)).finally(async()=>{try{await adapter.close?.();}finally{task=null;}});return summary(r);
 }
 async function run(r,runner){
  const controller=new AbortController();activeRun={controller,record:r};
  const progress=(nodeId,p={})=>{if(!active(r.state))return;const step=r.steps.find(s=>s.nodeId===(nodeId||p.nodeId));if(step){if(Number.isInteger(p.generated)&&p.generated>=step.generated&&p.generated<=step.quantity)step.generated=p.generated;if(typeof p.message==='string')step.message=p.message.slice(0,500);}if(typeof p.message==='string'&&p.message.trim())r.message=p.message.slice(0,500);if(typeof p.phase==='string'){r.phase=p.phase.slice(0,80);if(phaseNames[r.phase])r.message=phaseNames[r.phase];if(Number.isInteger(p.reviewed)&&Number.isInteger(p.total))r.message+=' '+p.reviewed+' / '+p.total;} if(Number.isInteger(p.actualConcurrency))r.actualConcurrency=p.actualConcurrency;r.generated=r.steps.reduce((n,s)=>n+s.generated,0);put(r);};
  try{
   if(fs.existsSync(pauseFile)&&(!r.qualitySample||r.pauseRequested)){r.pauseRequested=true;r.state='paused';r.error='PLAN_QUALITY_PAUSED';r.message='已暂停，尚未开始准备或生图。';put(r);return;}
   const evidenceBefore=contentEvidenceStamp(project);
   for(let attempt=0;attempt<5;attempt++){
    r.prepared=await runner.prepare({executionId:r.id,plan:r.plan,selection:r.selection,signal:controller.signal,onProgress:p=>progress(null,p)});
    if(r.pauseRequested)break;
    if(attempt===4||r.prepared?.state!=='blocked'||r.prepared.reason!=='GENERATION_INPUT_REQUIRED'||!bypassMissingAutoCards(r,r.prepared.blockers||[]))break;
   }
   if(r.pauseRequested){r.state='paused';r.phase='paused';r.error='PLAN_QUALITY_PAUSED';r.message='已暂停，未提交新的图片请求。';put(r);return;}
   if(['blocked','unknown','waiting-content','preparation-required'].includes(r.prepared?.state)){r.state=r.prepared.state;r.error=r.prepared.reason||r.prepared.error;r.blockers=r.prepared.blockers||[];if(['CONTENT_REVIEW_REQUIRED','GENERATION_INPUT_REQUIRED'].includes(r.error))r.preparationStamp=evidenceBefore.stamp;r.message=r.prepared.message||problems.describe(r.error)||'任务准备尚未完成。';put(r);return;}
   if(!Array.isArray(r.prepared?.steps))throw Error('PLAN_PREPARED_STEPS_MISSING');
   for(const step of r.steps){const p=r.prepared.steps.find(s=>s.nodeId===step.nodeId);if(!p||p.quantity!==step.quantity||p.items?.length!==step.quantity||p.items.some((x,i)=>x.entryId!==step.items[i].entryId))throw Error('PLAN_PREPARED_STEP_MISMATCH');}
   r.state='running';r.phase='generating';put(r);
   const runStep=async step=>{
    if(step.after.some(id=>r.steps.find(s=>s.nodeId===id)?.state!=='generated-awaiting-review'))throw Error('PLAN_DEPENDENCY_NOT_COMPLETE');
    const preparedStep=r.prepared.steps.find(s=>s.nodeId===step.nodeId);if(!preparedStep||preparedStep.quantity!==step.quantity)throw Error('PLAN_PREPARED_STEP_MISMATCH');
    step.state='running';step.startedAt||=new Date().toISOString();r.message='正在生成：'+step.label;put(r);
    const result=await runner.runStep({executionId:r.id,step:preparedStep,prepared:r.prepared,signal:controller.signal,onProgress:p=>progress(step.nodeId,p)});
    step.result=result;
    if(Number.isInteger(result?.generated)&&result.generated>=step.generated&&result.generated<=step.quantity)step.generated=result.generated;
    if(r.pauseRequested&&result?.state==='paused'){step.state='paused';r.generated=r.steps.reduce((n,s)=>n+s.generated,0);put(r);return;}
    if(result?.state!=='generated-awaiting-review'||result.generated!==step.quantity){step.state=result?.state==='unknown'?'unknown':'blocked';r.state=step.state;r.retrySafe=result?.state==='blocked-before-start'&&result?.retrySafe===true;r.error=result?.reason||result?.error||'PLAN_STEP_NOT_COMPLETE';r.message=result?.message||'本批未完成，后续批次未启动。';r.generated=r.steps.reduce((n,s)=>n+s.generated,0);controller.abort();put(r);return;}
    step.state='generated-awaiting-review';step.finishedAt=new Date().toISOString();step.generated=result.generated;r.generated=r.steps.reduce((n,s)=>n+s.generated,0);put(r);
   };
   // Ready graph branches are independent from the shared image-request cap.
   // Start all ready branches; the API runner limits actual image calls to two.
   const inFlight=new Set(),limit=r.prepared.parallelSteps?r.steps.length:1;
   while(true){
    if(!controller.signal.aborted){for(const step of r.steps){if(inFlight.size>=limit)break;if(step.state==='generated-awaiting-review')continue;if(step.state!=='waiting'&&!(step.state==='blocked'&&r.retrySafe))continue;if(step.after.some(id=>r.steps.find(s=>s.nodeId===id)?.state!=='generated-awaiting-review'))continue;
      let job;job=runStep(step).catch(e=>{step.state='unknown';r.state='unknown';r.error=/^[A-Z0-9_]+$/.test(e.message)?e.message:'PLAN_RUNNER_FAILED';r.message='执行异常，停止新增任务；在途结果收齐后待核对。';controller.abort();put(r);}).finally(()=>inFlight.delete(job));inFlight.add(job);
    }}
    if(!inFlight.size)break;
    await Promise.race(inFlight);
   }
   if(controller.signal.aborted){r.generated=r.steps.reduce((n,s)=>n+s.generated,0);if(r.pauseRequested&&r.state!=='unknown'){r.state='paused';r.phase='paused';r.error='PLAN_QUALITY_PAUSED';r.message='已暂停新增请求，在途结果已收齐。';}put(r);return;}
   if(r.steps.some(s=>s.state!=='generated-awaiting-review'))throw Error('PLAN_DEPENDENCY_NOT_COMPLETE');
   r.state='generated-awaiting-review';r.phase='review';r.message='已生成 '+r.generated+' 张，等待独立质检。';put(r);
  }catch(e){if(r.pauseRequested&&r.state==='preparing'){r.state='paused';r.error='PLAN_QUALITY_PAUSED';r.message='已暂停准备，已完成方案已保留。';put(r);return;}r.state=r.state==='running'?'unknown':'blocked';r.error=/^[A-Z0-9_]+$/.test(e.message)?e.message:'PLAN_RUNNER_FAILED';r.message=r.state==='unknown'?'执行异常，已停止后续批次；已有结果需要核对，不自动重试。':'任务准备未通过：'+problems.describe(r.error);put(r);}finally{activeRun=null;}
 }
 function checkCurrent(){const r=current();if(!r)return null;if(task||!untouched(r)||!['blocked','waiting-content'].includes(r.state))throw Error('PLAN_CHECK_NOT_IDLE');task=Promise.resolve().then(async()=>{const fresh=JSON.parse(JSON.stringify(r));refreshSelection(fresh);const adapter=require('./isolated-plan-runner.cjs').createIsolatedPlanRunner({project,runtime,imageProvider:r.plan.imageProvider});let result;try{result=await adapter.diagnose({executionId:r.id,selection:fresh.selection});}finally{await adapter.close();}r.readyForGeneration=result.ready;r.blockers=result.blockers;r.error=result.ready?'PLAN_PREPARATION_RECHECK_REQUIRED':(result.reason||'CONTENT_REVIEW_REQUIRED');if(r.plan.imageProvider==='api'&&!result.ready){r.state='blocked';r.phase='input-blocked';}r.message=result.ready?(r.plan.imageProvider==='api'?'生成输入已齐；点击执行直接生图，完成后交员工审核。':'原选定词条的内容条件已齐；点击执行后冻结任务并开始生成。'):'本次 '+result.summary.selected+' 词中 '+result.summary.blocked+(r.plan.imageProvider==='api'?' 词缺少登记词义或已被占用；当前未生图，修正输入后可继续原订单。':' 词仍需准备或审核；未提交图片请求。');put(r);return summary(r);}).finally(()=>{task=null;});return task;}
 return {execute,executeQualitySample,pause,summary,current,orders,checkCurrent,replaceMissingCards,reconcileModeration,busy:()=>!!task,settled:()=>task||Promise.resolve(),close(){if(task)throw Error('PLAN_EXECUTION_ACTIVE');db.close();}};
}
module.exports={createPlanExecution,resolveSelection};
