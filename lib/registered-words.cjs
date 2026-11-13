'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {MAX_RUN_ATTEMPTS,AUTHORITY_BYTES,RUN_BYTES}=require('./production-limits.cjs');
const workflowStore=require('./workflow-store.cjs'),orders=require('./work-orders.cjs');
const claims=require('./production-claims.cjs');
const PREVIOUS='staff/02-spanish-engineering/storage-tools/IMAGE-FACTORY-RUN-PREVIOUS.json';
const PROJECT=require('./workspace-paths.cjs').PROJECT;
const SOURCES={index:'staff/04-spanish-lexicon/word-registry/incoming/index.json',queue:'staff/04-spanish-lexicon/word-registry/incoming/image-queue.json',delivery:'staff/05-spanish-teaching/word-registry-images/delivery.json',teaching:'staff/05-spanish-teaching/word-registry-images/status.json',attempts:'staff/02-spanish-engineering/storage-tools/IMAGE-FACTORY-RUN-CURRENT.json'};
const keyOf=x=>crypto.createHash('sha256').update(JSON.stringify([x.entryId,x.senseId,x.sourceRevision])).digest('hex');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const labels={available:'可提请配图',context:'先补教学语境',archived:'已收件',recorded:'已有交付或执行记录',reserved:'已派给其他员工',hold:'待修订 / 核验',unavailable:'当前不可选'};
const short=(v,n=240)=>typeof v==='string'?v.slice(0,n):'';
function bounded(file,max){const a=fs.statSync(file);if(!a.isFile()||a.size>max)throw Error('REGISTRY_SOURCE_SIZE');const b=fs.readFileSync(file),z=fs.statSync(file);if(a.mtimeMs!==z.mtimeMs||a.size!==z.size||b.length>max)throw Error('REGISTRY_SOURCE_CHANGED');return JSON.parse(b.toString('utf8').replace(/^\uFEFF/,''));}
function createRegistry({project=PROJECT,runtime=path.join(__dirname,'../runtime')}={}){
 let cache=null;
 const sourceBudget=name=>name==='attempts'?RUN_BYTES:40*1024*1024;
 function signature(){return [...Object.entries(SOURCES).map(([name,p])=>{const s=fs.statSync(path.join(project,p));if(!s.isFile()||s.size>sourceBudget(name))throw Error('REGISTRY_SOURCE_SIZE');return [name,s.size,s.mtimeMs];}),...[path.join(project,PREVIOUS),claims.fileOf(project)].map(p=>{const s=fs.existsSync(p)?fs.statSync(p):null;return [p,s?.size||0,s?.mtimeMs||0];})];}
 function load(){const sig=signature(),stamp=JSON.stringify(sig);if(cache?.stamp===stamp)return cache;
  const docs=Object.fromEntries(Object.entries(SOURCES).map(([name,p])=>[name,bounded(path.join(project,p),sourceBudget(name))]));
  if(JSON.stringify(signature())!==stamp)throw Error('REGISTRY_SOURCE_CHANGED');
  if(docs.index.schemaVersion!==1||docs.queue.schemaVersion!==1||!Array.isArray(docs.index.entries)||!Array.isArray(docs.queue.items)||!Array.isArray(docs.delivery.items)||!Array.isArray(docs.teaching.externalImageReservations?.items)||!Array.isArray(docs.teaching.externalIntakeDecisions?.held)||!Array.isArray(docs.attempts.attempts))throw Error('REGISTRY_SOURCE_SCHEMA');
  if(docs.teaching.claimed!=null&&!Array.isArray(docs.teaching.claimed))throw Error('REGISTRY_SOURCE_SCHEMA');
  if(docs.queue.items.length>30000||docs.index.entries.length>30000||docs.attempts.attempts.length>MAX_RUN_ATTEMPTS)throw Error('REGISTRY_SOURCE_SIZE');
  const registrations=new Map();for(const x of docs.index.entries){if(registrations.has(x.entryId))throw Error('REGISTRY_DUPLICATE_ID');registrations.set(x.entryId,x);}
  const delivered=new Set(docs.delivery.items.map(keyOf)),attempted=new Set(docs.attempts.attempts.map(keyOf)),reserved=new Set(docs.teaching.externalImageReservations.items.map(keyOf)),claimed=new Set((docs.teaching.claimed||[]).map(keyOf)),held=new Map(docs.teaching.externalIntakeDecisions.held.filter(x=>!x.resolvedAt).map(x=>[keyOf(x),x]));
  const previous=fs.existsSync(path.join(project,PREVIOUS))?bounded(path.join(project,PREVIOUS),RUN_BYTES):null;
  if(previous&&!Array.isArray(previous.attempts))throw Error('REGISTRY_SOURCE_SCHEMA');
  const history=new Map([...(previous?.attempts||[]),...docs.attempts.attempts].map(x=>[keyOf(x),x]));
  for(const key of history.keys())attempted.add(key);
  const durable=claims.readClaims(project,docs.queue.items.map(keyOf));for(const key of durable.keys())attempted.add(key);
  const rows=new Map(),details=new Map(),counts=Object.fromEntries(Object.keys(labels).map(k=>[k,0])),sourceCounts={};
  for(const q of docs.queue.items){if(!q.entryId||!q.senseId||!q.sourceRevision)throw Error('REGISTRY_IDENTITY');const key=keyOf(q),reg=registrations.get(q.entryId);if(rows.has(key))throw Error('REGISTRY_DUPLICATE_IDENTITY');
   sourceCounts[q.status]=(sourceCounts[q.status]||0)+1;let status='unavailable',reason='注册或审核状态需要核验。';
   if(q.status==='archived-reviewed'){status='archived';reason='词库已记录收件；不等于用户终审或网站发布。';}
   else if(held.has(key)||q.qualityHold){status='hold';reason=short(held.get(key)?.reason||'当前存在质量保留，不能自动重新生图。',600);}
   else if(delivered.has(key)||attempted.has(key)){status='recorded';reason='此义项版本已有交付或执行记录，先核验原结果，避免重画。';}
   else if(claimed.has(key)){status='reserved';reason='此义项版本已有领取任务，等待原任务处理，不能重复派单。';}
   else if(reserved.has(key)){status='reserved';reason='已有独占派单，不能从此处另派一次。';}
   else if(reg?.stageEligible===true&&q.lexicalReviewStatus==='passed-scoped-lexical-review'){
    if(q.status==='needs-teaching-context'){status='context';reason='可提交补语境工作单，不能直接生图。';}
    else if(q.status==='ready'&&q.imageBrief){status='available';reason='仅可提请配图，仍需内容确认与执行门禁。';}
   }
   const fingerprint=hash({q,registration:{stageEligible:reg?.stageEligible,status:reg?.status},status,reason});
   const row={key,fingerprint,entryId:short(q.entryId),senseId:short(q.senseId),sourceRevision:short(q.sourceRevision),spanish:short(q.spanish,100),meaningZh:short(q.meaningZh,300),partOfSpeech:short(q.partOfSpeech,100),level:q.level||null,queueStatus:q.status,status,statusLabel:labels[status],reason,selectable:['available','context'].includes(status),workType:status==='context'?'prepare-context':'illustration-request'};
   const prior=history.get(key),claim=durable.get(key);
   row.checklistState=prior?.state|| (claim?'claimed':status);
   if(status==='recorded'){row.statusLabel=({unknown:'结果不明 · 禁止重试',submitted:'正在生成 · 勿重复',queued:'已排队 · 勿重复','awaiting-review':'已有图 · 待审核',generated:'已有图 · 待审核',claimed:'已占用 · 先对账'})[row.checklistState]||'已有历史记录 · 先核验';}
   counts[status]++;rows.set(key,row);details.set(key,{...row,priorAttemptId:prior?.attemptId||claim?.attemptId||null,priorSha256:prior?.artifact?.sha256||null,scope:short(q.scope,2000),imageBrief:short(q.imageBrief,6000),context:q.context?{spanish:short(q.context.spanish,2000),zh:short(q.context.zh,2000),usage:short(q.context.usage,2000),formNote:short(q.context.formNote,2000)}:null,lexicalReviewStatus:q.lexicalReviewStatus,contextReviewStatus:q.contextReviewStatus||null,illustrationUse:q.illustrationUse||null,imageOnlyRecallAllowed:q.imageOnlyRecallAllowed===true,registrationStatus:reg?.status||'登记缺失',published:reg?.deployed===true});
  }
  cache={stamp,rows,details,counts,sourceCounts,incomingIds:new Set(docs.index.entries.filter(x=>x.stageEligible===true).map(x=>x.entryId)),registeredEntries:docs.index.entries.length,eligibleEntries:docs.index.entries.filter(x=>x.stageEligible===true).length,loadedAt:new Date().toISOString(),sourceUpdatedAt:new Date(Math.max(...sig.map(x=>x[2]))).toISOString()};return cache;
 }
 function requestFile(){return path.join(runtime,'REGISTRY-REQUEST-CURRENT.json');}
 function current(){return orders.current(runtime);}
 function list({query='',status='all',page=0,limit=20}={}){if(typeof query!=='string'||query.length>100||!['all',...Object.keys(labels)].includes(status)||!Number.isInteger(page)||page<0||page>2000||!Number.isInteger(limit)||limit<1||limit>40)throw Error('REGISTRY_QUERY');const c=load(),needle=query.trim().toLocaleLowerCase(),filtered=[...c.rows.values()].filter(r=>(status==='all'||r.status===status)&&(!needle||[r.spanish,r.meaningZh,r.entryId,r.senseId].some(v=>v.toLocaleLowerCase().includes(needle))));const actualPage=Math.min(page,Math.max(0,Math.ceil(filtered.length/limit)-1));return {schemaVersion:1,checklistVersion:1,source:'local-registered-vocabulary',sourceLabel:'04 本地已注册词库 · 非实时线上库',sourceUpdatedAt:c.sourceUpdatedAt,loadedAt:c.loadedAt,registeredEntries:c.registeredEntries,eligibleEntries:c.eligibleEntries,senses:c.rows.size,counts:c.counts,sourceCounts:c.sourceCounts,query,status,page:actualPage,limit,total:filtered.length,items:filtered.slice(actualPage*limit,(actualPage+1)*limit),currentRequest:current(),directGenerationConnected:false};}
 function scope(input){
  const scope=require('./vocabulary-scope.cjs').normalize(input),c=load(),needle=scope.query.toLocaleLowerCase(),types={noun:'名词',verb:'动词',adjective:'形容词',adverb:'副词'};
  const rows=[...c.rows.values()].filter(r=>r.selectable&&(scope.status==='selectable'||r.status===scope.status)&&(scope.level==='all'||(scope.level==='unlabelled'?!r.level:r.level===scope.level))&&(scope.partOfSpeech==='all'||(scope.partOfSpeech==='other'?!Object.values(types).some(t=>r.partOfSpeech.includes(t)):r.partOfSpeech.includes(types[scope.partOfSpeech])))&&(!needle||[r.spanish,r.meaningZh,r.entryId,r.senseId].some(v=>v.toLocaleLowerCase().includes(needle)))).sort((a,b)=>a.spanish.localeCompare(b.spanish,'es')||a.key.localeCompare(b.key));
  const selected=rows.slice(scope.offset,scope.offset+scope.limit);return {...scope,selectionHash:hash(selected.map(r=>[r.key,r.fingerprint])),selectedCount:selected.length,matchedCount:rows.length,sourceUpdatedAt:c.sourceUpdatedAt,taskCounts:{available:c.counts.available,context:c.counts.context},selectedReady:selected.filter(r=>r.status==='available').length,selectedContext:selected.filter(r=>r.status==='context').length,selection:selected.map(r=>({entryId:r.entryId,senseId:r.senseId,sourceRevision:r.sourceRevision,key:r.key,fingerprint:r.fingerprint,spanish:r.spanish,status:r.status})),preview:selected.slice(0,8).map(r=>({key:r.key,spanish:r.spanish,meaningZh:r.meaningZh,statusLabel:r.statusLabel})),excludedCount:c.rows.size-[...c.rows.values()].filter(r=>r.selectable).length,order:'spanish-ascending',executionAuthorization:false};
 }
 function item(key){if(!/^[a-f0-9]{64}$/.test(key||''))throw Error('REGISTRY_KEY');const r=load().details.get(key);if(!r)throw Error('REGISTRY_ITEM_NOT_FOUND');return r;}
 function propose(input){if(!Array.isArray(input?.items)||input.items.length<1||input.items.length>5||new Set(input.items.map(x=>x.key)).size!==input.items.length)throw Error('REGISTRY_SELECTION');const c=load(),items=input.items.map(x=>{const r=c.rows.get(x.key);if(!r||r.fingerprint!==x.fingerprint)throw Error('REGISTRY_SELECTION_STALE');if(!r.selectable)throw Error('REGISTRY_ITEM_UNAVAILABLE');return {key:r.key,itemFingerprint:r.fingerprint,entryId:r.entryId,senseId:r.senseId,sourceRevision:r.sourceRevision,spanish:r.spanish,workType:r.workType};});
  const selectionHash=hash(items);return workflowStore.locked(runtime,()=>{const old=current();if(old?.selectionHash===selectionHash&&!orders.terminal(old))return old;if(old&&!orders.terminal(old))throw Error('REGISTRY_REQUEST_ACTIVE');const at=new Date().toISOString(),result={schemaVersion:2,id:crypto.randomUUID(),createdAt:at,updatedAt:at,state:'proposed',ownerThreadId:null,source:'local-registered-vocabulary',sourceReferences:SOURCES,sourceUpdatedAt:c.sourceUpdatedAt,selectionHash,items,executionAuthorization:false,automaticWakeup:false,note:'直接从词库选择的工作单；需组长领取并关联正式派单，不自动执行。',supersedes:old?.id||null,previous:orders.previous(old),events:[{at,action:'propose',actor:'local-user',reason:null}]};return workflowStore.write(requestFile(),result);});
 }
 function transition(input){return orders.transition(runtime,input,project,()=>require('./command-center.cjs').dispatch(project));}
 return {list,item,scope,propose,current,transition,taskRows:()=>[...load().rows.values()],hasIncomingEntry:id=>load().incomingIds.has(id)};
}
module.exports={createRegistry,keyOf,SOURCES};
