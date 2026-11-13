'use strict';
// Dedicated held-image repair lane. Never weakens normal missing-image admission.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {SOURCES,currentSource}=require('./production-checklist.cjs');
const OWNER='01a13637-abd8-7151-9fdd-cae83f313ba1',REVIEWER='01a19c24-d45a-7081-bf20-6444b8a976d3';
const ORDER='staff/05-spanish-teaching/API-CODEX-REWORK-49-CURRENT.json';
const sha=x=>createHash('sha256').update(x).digest('hex'),digest=x=>sha(JSON.stringify(x));
const hex=x=>/^[a-f0-9]{64}$/.test(x||'');
const identity=x=>['entryId','senseId','sourceRevision'].every(k=>typeof x?.[k]==='string'&&x[k]&&x[k].length<=300)&&hex(x.sourceRevision);
const same=(a,b)=>['entryId','senseId','sourceRevision'].every(k=>a[k]===b[k]);
function json(file,limit=40*1024**2){const s=fs.statSync(file);if(!s.isFile()||s.size>limit)throw Error('REWORK_SOURCE_SIZE');const bytes=fs.readFileSync(file),z=fs.statSync(file);if(s.size!==z.size||s.mtimeMs!==z.mtimeMs)throw Error('REWORK_SOURCE_CHANGED');return JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));}
function atomic(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const pending=file+'.pending';const fd=fs.openSync(pending,'wx');try{fs.writeFileSync(fd,JSON.stringify(value));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(pending,file);}
function fail(code){throw Error(code);}
function createReworkRunner({project,runtime,getKey,request,gate,statePath,storageCheck,now=()=>Date.now()}={}){
 const root=path.join(runtime,'api-rework'),gatePath=statePath||path.join(project,'staff/02-spanish-engineering/storage-tools/production-gate-state.json');
 const productionGate=()=>gate||require(path.join(project,'staff/02-spanish-engineering/storage-tools/production-gate.cjs')).createGate();
 const image=()=>require('./research-image.cjs').createResearchImage({runtime,getKey:getKey||(()=>require('./openai-key.cjs').createKeyStore().get()),request,allowTargetedEdit:true});
 const output=()=>require('./image-output.cjs').createImageOutput({runtime,project}).read().directory;
 const pauseHash=()=>{const f=path.join(runtime,'QUALITY-PAUSE.json');return fs.existsSync(f)?sha(fs.readFileSync(f)):null;};
 const claimFile=x=>path.join(root,'entry-claims',sha(x.entryId)+'.json');
 const eventFile=hash=>path.join(root,hash,'events.jsonl');
 const readOptional=file=>fs.existsSync(file)?json(file):null;
 function inspect({jobIds,orderPath=ORDER}={}){
  if(typeof orderPath!=='string'||!/^staff\/05-spanish-teaching\/API-[A-Z0-9-]+\.json$/.test(orderPath))fail('REWORK_ORDER_PATH_INVALID');
  const order=json(path.join(project,orderPath)),dispatch=order.programDispatch;
  if(orderPath!==ORDER&&(order.schemaVersion!==1||order.purpose!=='targeted-image-rework'||!/^[-a-f0-9]{36}$/.test(order.sourceExecutionId||'')))fail('REWORK_ORDER_SCOPE_REQUIRED');
  if(order.preparedByConversationId!==REVIEWER||dispatch?.preparedByConversationId!==REVIEWER||dispatch.recipient!=='15-controlled-program-route')fail('REWORK_PROMPT_APPROVAL_REQUIRED');
  const candidates=order.firstBatch?.items;
  if(!Array.isArray(candidates)||candidates.length>50)fail('REWORK_ORDER_SCHEMA');
  const ids=jobIds??candidates.map(x=>x.oldJobId);
  if(!Array.isArray(ids)||ids.length<1||ids.length>5||new Set(ids).size!==ids.length||ids.some(x=>!/^api-[a-f0-9]{32}$/.test(x)))fail('REWORK_BATCH_REQUIRES_1_TO_5');
  const index=json(path.join(project,SOURCES.index)),delivery=json(path.join(project,SOURCES.delivery)),teaching=json(path.join(project,SOURCES.teaching));
  if(!Array.isArray(index.entries)||!Array.isArray(delivery.items)||!Array.isArray(teaching.externalImageReservations?.items)||!Array.isArray(teaching.externalIntakeDecisions?.held))fail('REWORK_REGISTRY_SCHEMA');
  const items=[],blockers=[];
  for(const oldJobId of ids){try{
   const matches=candidates.filter(x=>x.oldJobId===oldJobId);
   if(matches.length!==1)fail('REWORK_ITEM_NOT_APPROVED');
   const x=matches[0],p=x.programRework,a=dispatch.items?.filter(y=>y.oldJobId===oldJobId);
   if(!identity(x)||!hex(x.oldSha256)||x.preserveOldImage!==true||x.attemptLimit!==1||!p||a?.length!==1)fail('REWORK_ITEM_NOT_APPROVED');
   if(!same(x,p.boundIdentity)||p.boundIdentity.oldJobId!==oldJobId||p.boundIdentity.oldSha256!==x.oldSha256||!same(x,a[0])||a[0].oldSha256!==x.oldSha256)fail('REWORK_BOUND_IDENTITY_CHANGED');
   if(typeof p.finalPrompt!=='string'||!p.finalPrompt.trim()||p.finalPrompt.trim()!==p.finalPrompt||p.finalPrompt.length>2000||sha(p.finalPrompt)!==p.finalPromptSha256||a[0].finalPromptSha256!==p.finalPromptSha256)fail('REWORK_APPROVED_PROMPT_CHANGED');
   if(p.contentDependency?.requiresFresh04Review!==false||!['existing-frozen-sentence','04-current-sentence-reviewed'].includes(p.contentDependency.decision)||!p.contentDependency.spanishSentence)fail('REWORK_CONTEXT_REVIEW_REQUIRED');
   const reg=index.entries.find(y=>y.entryId===x.entryId);
   if(!reg?.stageEligible||!currentSource(project,reg,x))fail('REWORK_CURRENT_SENSE_CHANGED');
   if(delivery.items.some(y=>y.entryId===x.entryId))fail('REWORK_ALREADY_DELIVERED');
   if(teaching.externalIntakeDecisions.held.some(y=>y.entryId===x.entryId&&!y.resolvedAt&&y.sha256&&y.sha256!==x.oldSha256))fail('REWORK_OTHER_RESULT_HELD');
   if([...teaching.externalImageReservations.items,...(teaching.claimed||[])].some(y=>y.entryId===x.entryId&&y.jobId!==oldJobId))fail('REWORK_OTHER_RESERVATION');
   const match=/^([a-f0-9-]{36})[\\/]REVIEW\.json$/.exec(x.sourceReviewPath||'');
   if(!match)fail('REWORK_REVIEW_PATH_INVALID');
   const executionId=match[1],dir=path.join(runtime,'api-plan',executionId),review=json(path.join(dir,'REVIEW.json')),v=review.items?.filter(y=>y.jobId===oldJobId);
   if(order.sourceExecutionId&&order.sourceExecutionId!==executionId)fail('REWORK_ORDER_SCOPE_MISMATCH');
   if(v?.length!==1||v[0].decision!=='hold'||x.sourceReviewDecision!=='hold')fail('REWORK_SOURCE_NOT_HELD');
   if(!same(v[0],x)||v[0].sha256!==x.oldSha256||!hex(v[0].finalPromptHash))fail('REWORK_REVIEW_IDENTITY_CHANGED');
   const frozen=json(path.join(dir,'PREPARED.json')),steps=frozen.steps?.filter(s=>s.items?.some(y=>y.jobId===oldJobId));
   if(frozen.executionId!==executionId||steps?.length!==1||!/^[a-zA-Z0-9-]{1,40}$/.test(steps[0].nodeId))fail('REWORK_ORIGINAL_PLAN_CHANGED');
   const receipt=json(path.join(dir,steps[0].nodeId+'.json')),rs=receipt.items?.filter(y=>y.jobId===oldJobId),r=rs?.[0];
   if(receipt.executionId!==executionId||rs?.length!==1||r.state!=='awaiting-review'||!same(r,x)||r.artifact?.sha256!==x.oldSha256||r.promptHash!==v[0].finalPromptHash)fail('REWORK_ORIGINAL_RECEIPT_CHANGED');
   const nativePath=image().read(r.imageId);
   if(!nativePath||fs.statSync(nativePath).size>20000000||sha(fs.readFileSync(nativePath))!==x.oldSha256)fail('REWORK_ORIGINAL_IMAGE_CHANGED');
   // The old normal-production claims stay untouched; another attempt must not be displaced.
   for(const f of [path.join(runtime,'api-plan','claims',require('./production-checklist.cjs').keyOf(x)+'.json'),path.join(runtime,'api-plan','entry-claims',sha(x.entryId)+'.json')]){
    const c=readOptional(f);if(c&&(c.jobId!==oldJobId||c.executionId!==executionId))fail('REWORK_OTHER_PRODUCTION_CLAIM');
   }
   if(fs.existsSync(claimFile(x)))fail('REWORK_ATTEMPT_ALREADY_RECORDED');
   items.push({jobId:'rework-'+digest([oldJobId,x.oldSha256,p.finalPromptSha256]).slice(0,32),word:x.word,entryId:x.entryId,senseId:x.senseId,sourceRevision:x.sourceRevision,
    finalPrompt:p.finalPrompt,finalPromptSha256:p.finalPromptSha256,meaningZh:x.frozenMeaning||null,meaningScope:x.frozenScope||null,approvedContext:p.contentDependency,attemptLimit:1,
    repairOf:{executionId,nodeId:steps[0].nodeId,jobId:oldJobId,sha256:x.oldSha256,imageId:r.imageId,nativePath,promptHash:r.promptHash,reviewPath:path.join(dir,'REVIEW.json'),reviewReason:v[0].reviewReason||v[0].reason||'',decision:'hold'},
    approval:{path:path.join(project,orderPath),reviewer:REVIEWER,revision:p.revision,promptSha256:p.finalPromptSha256}});
  }catch(e){blockers.push({oldJobId,reason:/^REWORK_[A-Z0-9_]+$/.test(e.message)?e.message:'REWORK_SOURCE_UNAVAILABLE'});}}
  if(new Set(items.map(x=>x.entryId)).size!==items.length)blockers.push({reason:'REWORK_DUPLICATE_WORD'});
  const manifest={schemaVersion:1,purpose:'targeted-image-rework',sourceOrderPath:orderPath,sourceExecutionId:order.sourceExecutionId||null,owner:OWNER,imageProvider:'api',model:'gpt-image-2.5-flare',quality:'high',size:'1024x1024',maximumInFlight:1,items};
  return {ready:blockers.length===0,selected:ids.length,readyCount:items.length,blockers,manifest,manifestHash:digest(manifest),actualImageCalls:0};
 }
 function prepare(input){
  const result=inspect(input);if(!result.ready)return result;
  const dir=path.join(root,result.manifestHash),f=path.join(dir,'PREPARED.json'),saved=readOptional(f);
  if(saved&&digest(saved)!==result.manifestHash)fail('REWORK_FROZEN_MANIFEST_CHANGED');
  if(!saved)atomic(f,result.manifest);
  fs.closeSync(fs.openSync(eventFile(result.manifestHash),'a'));
  return {...result,preparedPath:f,admissionRequirements:{ownerThreadId:OWNER,manifestHash:result.manifestHash,maxAttempts:1,qualityPauseSha256:pauseHash(),
   nativeDirectories:[output()],logFiles:[eventFile(result.manifestHash)],identities:result.manifest.items.map(x=>x.jobId),
   plannedBytes:{native:result.selected*20000000,asset:result.selected*20000000,chat:2*1024**2},growthLimitBytes:256*1024**2}};
 }
 function checkAdmission(manifest,hash){
  const admission=readOptional(path.join(root,'ADMISSION.json'));
  if(!admission||admission.schemaVersion!==1||admission.purpose!=='targeted-image-rework'||admission.ownerThreadId!==OWNER||admission.authorized!==true||admission.manifestHash!==hash||admission.maxAttempts!==1||typeof admission.userAuthorization!=='string'||!admission.userAuthorization.trim())fail('REWORK_02_ADMISSION_REQUIRED');
  if(!Number.isFinite(Date.parse(admission.expiresAt))||Date.parse(admission.expiresAt)<=now()||Date.parse(admission.expiresAt)>now()+24*3600*1000)fail('REWORK_ADMISSION_EXPIRED');
  if(admission.qualityPauseSha256!==pauseHash())fail('REWORK_QUALITY_PAUSE_CHANGED');
  if(process.env.LINARCHIVE_IMAGE_BATCH!==admission.batchId||!admission.batchId)fail('REWORK_BATCH_ENV_REQUIRED');
  const s=json(gatePath,128*1024),b=s.active?.find(x=>x.batchId===admission.batchId);
  if(s.paused||s.blocked||!b||b.owner!==OWNER)fail('REWORK_STORAGE_ADMISSION_REQUIRED');
  const real=x=>fs.realpathSync(x).toLowerCase();
  if(digest([...(b.identities||[])].sort())!==digest(manifest.items.map(x=>x.jobId).sort())||!b.nativeDirectories?.some(x=>real(x)===real(output()))||!b.logFiles?.some(x=>real(x)===real(eventFile(hash))))fail('REWORK_STORAGE_SCOPE_MISMATCH');
  const required=manifest.items.length*20000000;
  if(!['native','asset','chat'].every(k=>Number.isSafeInteger(b.plannedBytes?.[k]))||!Number.isSafeInteger(b.growthLimitBytes)||b.plannedBytes.native<required||b.plannedBytes.asset<required||b.plannedBytes.chat<2*1024**2||b.growthLimitBytes>256*1024**2||b.growthLimitBytes<b.plannedBytes.native+b.plannedBytes.asset+b.plannedBytes.chat)fail('REWORK_STORAGE_BUDGET_REQUIRED');
  if(!productionGate().check(b.batchId).ok)fail('REWORK_STORAGE_GATE_BLOCKED');
  if(storageCheck)storageCheck();else require(path.join(project,'staff/02-spanish-engineering/storage-tools/image-store.cjs')).diskGuard(output(),20000000);
  return admission;
 }
 async function run({manifestHash,signal}={}){
  if(!hex(manifestHash))fail('REWORK_MANIFEST_INVALID');
  const dir=path.join(root,manifestHash),manifest=json(path.join(dir,'PREPARED.json')),receiptPath=path.join(dir,'RESULT.json');
  if(digest(manifest)!==manifestHash||manifest.items.length<1||manifest.items.length>5)fail('REWORK_FROZEN_MANIFEST_CHANGED');
  const prior=readOptional(receiptPath);
  if(prior)return {...prior,state:prior.state==='running'?'needs-reconciliation':prior.state,replayed:true}; // Never resubmit partial/unknown requests.
  const fresh=inspect({jobIds:manifest.items.map(x=>x.repairOf.jobId),orderPath:manifest.sourceOrderPath});
  if(!fresh.ready||fresh.manifestHash!==manifestHash)fail('REWORK_INPUT_CHANGED');
  checkAdmission(manifest,manifestHash);if(!String(getKey?getKey():require('./openai-key.cjs').createKeyStore().get()||'').trim())fail('REWORK_API_KEY_MISSING');
  const lock=path.join(dir,'RUN.lock'),fd=fs.openSync(lock,'wx');
  const result={schemaVersion:1,purpose:manifest.purpose,manifestHash,state:'running',generated:0,items:[],startedAt:new Date(now()).toISOString(),published:false};
  const persist=()=>atomic(receiptPath,result),event=value=>fs.appendFileSync(eventFile(manifestHash),JSON.stringify({at:new Date(now()).toISOString(),...value})+'\n');
  try{
   persist();
   for(const x of manifest.items){
    if(signal?.aborted){result.state='stopped';break;}
    checkAdmission(manifest,manifestHash);
    // Recheck source identity/review/bytes immediately before consuming this one attempt.
    const check=inspect({jobIds:[x.repairOf.jobId],orderPath:manifest.sourceOrderPath});
    if(!check.ready||digest(check.manifest.items[0])!==digest(x))fail('REWORK_INPUT_CHANGED');
    fs.mkdirSync(path.dirname(claimFile(x)),{recursive:true});
    const claimFd=fs.openSync(claimFile(x),'wx');try{fs.writeFileSync(claimFd,JSON.stringify({manifestHash,jobId:x.jobId,oldJobId:x.repairOf.jobId,oldSha256:x.repairOf.sha256,promptSha256:x.finalPromptSha256}));fs.fsyncSync(claimFd);}finally{fs.closeSync(claimFd);}
    const row={...x,promptHash:digest(x.finalPrompt),source:'api-targeted-rework',state:'submitted',review:'pending',submittedAt:new Date(now()).toISOString()};
    result.items.push(row);persist();event({jobId:x.jobId,state:'submitted'});
    const response=await image().generate({prompt:x.finalPrompt,editSource:{imageId:x.repairOf.imageId,sha256:x.repairOf.sha256},beforeRequest:()=>{if(signal?.aborted)fail('REWORK_STOPPED');checkAdmission(manifest,manifestHash);}});
    if(response.status!==200){row.state='unknown';row.error=response.value?.error||'REWORK_API_ERROR';result.state='needs-reconciliation';persist();event({jobId:x.jobId,state:row.state});break;}
    row.imageId=response.value.id;row.nativePath=image().read(row.imageId);
    const bytes=fs.readFileSync(row.nativePath),newSha=sha(bytes);
    row.artifact={sha256:newSha,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
    row.model=response.value.model;row.usage=response.value.usage;row.completedAt=new Date(now()).toISOString();
    row.state=newSha===x.repairOf.sha256?'unchanged-held':row.artifact.width!==1024||row.artifact.height!==1024?'invalid-dimensions-held':'awaiting-review';
    row.casStatus='pending-independent-review-and-02-intake';result.generated++;persist();event({jobId:x.jobId,state:row.state,sha256:newSha});
    if(row.state!=='awaiting-review'){result.state='held';break;}
   }
   if(result.state==='running')result.state=result.generated===manifest.items.length?'generated-awaiting-review':'stopped';
  }catch(e){result.state='needs-reconciliation';result.reason=/^REWORK_[A-Z0-9_]+$/.test(e.message)?e.message:'REWORK_EXECUTION_INTERRUPTED';}
  finally{result.completedAt=new Date(now()).toISOString();persist();fs.closeSync(fd);fs.unlinkSync(lock);}
  return result;
 }
 return {inspect,prepare,run};
}
module.exports={createReworkRunner,ORDER,OWNER,REVIEWER};

