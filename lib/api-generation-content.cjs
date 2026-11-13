'use strict';
// API production consumes registered meaning + draft, never a pre-generation
// approval. The exact input remains frozen for employees reviewing the output.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const checklist=require('./production-checklist.cjs');
const quality=require('./image-quality-contract.cjs');
const POLICY='api-generate-then-review-v1';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const clean=(x,n)=>typeof x==='string'?x.trim().slice(0,n):'';
function read(file,max=40*1024*1024){const a=fs.statSync(file);if(!a.isFile()||a.size>max)throw Error('GENERATION_SOURCE_SIZE');const raw=fs.readFileSync(file),b=fs.statSync(file);if(a.mtimeMs!==b.mtimeMs||a.size!==b.size)throw Error('GENERATION_SOURCE_CHANGED');return JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,''));}
function revision(entry,sense){const s=sense.illustrationContext?{...sense,illustrationContext:{context:sense.illustrationContext.context,illustrationPlan:sense.illustrationContext.illustrationPlan}}:sense;return hash({entryId:entry.id,spanish:entry.spanish,partOfSpeech:sense.partOfSpeech,gender:sense.gender,forms:entry.forms,sense:s});}
function promptFor(item){const s=item.contentSnapshot,p=s.scenePlan,scene=p?.sceneZh||s.illustrationPlan?.sceneZh||s.imageBrief;
 const text=x=>typeof x==='string'?x.trim():'';
 const prompt=['绘制一张1024×1024西语词卡插画。'+quality.STYLE,
  '构图：'+quality.COMPOSITION,
  '目标词：'+text(s.spanish)+'；本图限定词义：'+text(p?.meaningExcerpt||s.meaningZh)+'。',
  !p&&s.scope?'词义限定：'+text(s.scope):'',
  scene?'具体画面：'+text(scene):'围绕限定词义设计一个可见瞬间，明确主角、动作对象及环境关系。',
  p?.mustShow?.length?'必须清楚呈现：'+p.mustShow.join('；'):'',
  p?.sourceConstraints?.length?'必须保留的原登记限制：'+p.sourceConstraints.join('；'):!p&&s.imageBrief?'原登记画面限制：'+text(s.imageBrief):'',
  p?.contextEs||s.context?.spanish?'配句仅供理解，文字不入图：'+text(p?.contextEs||s.context.spanish):'',
  !p&&s.illustrationPlan?.ambiguityAndAvoid?'原场景限制：'+text(s.illustrationPlan.ambiguityAndAvoid):'',
  p?.avoid?.length?'本词易错点：'+p.avoid.join('；'):'',
  s.requestText?'用户画面要求：'+text(s.requestText):'',
  '细节：手指数量和关节自然，手与工具真实接触；物体结构、尺寸、数量和遮挡合理。'+quality.MARKS+'变化过程、抽象关系由配句辅助，不用象征拼图补充第二场景。',quality.STYLE_FINISH].filter(Boolean).join('\n');
 if(prompt.length>2000)throw Error('API_PLAN_PROMPT_TOO_LONG');return prompt;
}
function createGenerationContent({project,promptTools}={}){
 function prepare({executionId,selection}){
  const selected=Array.isArray(selection)?selection:selection.items||selection.steps?.flatMap(s=>s.items);
  if(!Array.isArray(selected)||!selected.length||selected.length>1000||new Set(selected.map(x=>x.entryId)).size!==selected.length)throw Error('API_PLAN_SELECTION_INVALID');
  const base=path.join(project,path.dirname(checklist.SOURCES.index)),index=read(path.join(project,checklist.SOURCES.index));
  const proposalPath=path.join(project,'staff/05-spanish-teaching/word-registry-images/context-proposals.json');
  const proposals=fs.existsSync(proposalPath)?read(proposalPath):{},drafts=[...(proposals.items||[]),...(proposals.contextReviewRequests||[])];
  const promptGate=promptTools||require(path.join(project,'staff/02-spanish-engineering/storage-tools/word-card-image-prompts.cjs'));
  const promptRegistry=promptGate.load(project);
  const requests=new Map((selection.steps||[]).flatMap(s=>s.items.map(x=>[x.entryId,s.requestText||'']))),items=[],blockers=[];
  for(const chosen of selected){try{
   const reg=index.entries.find(x=>x.entryId===chosen.entryId);if(!reg?.stageEligible||!/^words\/[a-f0-9]{24}$/.test(reg.directory||''))throw Error('GENERATION_MEANING_MISSING');
   const sourceFile=path.join(base,reg.directory,'entry.json'),entry=read(sourceFile,1024*1024);
   if(entry.id!==chosen.entryId||hash(entry)!==reg.sourceRevision)throw Error('SOURCE_REVISION_MISMATCH');
   const senses=entry.registrationReview?.senses||[],sense=chosen.senseId?senses.find(x=>x.id===chosen.senseId):senses[0];
   if(!sense?.id||!clean(sense.zh||entry.meanings?.[0],300))throw Error('GENERATION_MEANING_MISSING');
   const sourceRevision=revision(entry,sense);if(chosen.sourceRevision&&sourceRevision!==chosen.sourceRevision)throw Error('SOURCE_REVISION_MISMATCH');
   if(entry.registrationReview?.existingImage?.status&&entry.registrationReview.existingImage.status!=='none-linked')throw Error('EXISTING_IMAGE_LINK_REQUIRES_RECONCILIATION');
   const draft=drafts.filter(x=>x.entryId===entry.id&&x.senseId===sense.id&&x.sourceRevision===sourceRevision&&!['rejected','reject','hold','needs-revision','failed'].includes(x.review05?.status)).sort((a,b)=>Date.parse(b.review05?.reviewedAt||b.sourceVerifiedAt||0)-Date.parse(a.review05?.reviewedAt||a.sourceVerifiedAt||0))[0];
   const source=draft||sense.illustrationContext||{},contentSnapshot={spanish:entry.spanish,meaningZh:sense.zh||entry.meanings[0],scope:sense.scope||'',imageBrief:sense.imageBrief||'',context:source.context||null,illustrationPlan:source.illustrationPlan||null,requestText:requests.get(entry.id)||'',sourceFile,sourceRecordHash:reg.sourceRevision,draftFingerprint:draft?hash(draft):null,draftReviewStatus:draft?.review05||null,independentReview:sense.illustrationContext?.review04||null,qualityHold:source.qualityHold??sense.illustrationContext?.qualityHold??null,selectedSensePolicy:chosen.senseId?'explicit-sense':'first-registered-sense',registeredSenseCount:senses.length};
   if(requests.get(entry.id))throw Error('IMAGE_PROMPT_REQUEST_REVIEW_REQUIRED');
   const approved=promptGate.resolve(promptRegistry,{entryId:entry.id,senseId:sense.id,sourceRevision,spanish:entry.spanish,meaningZh:sense.zh||entry.meanings[0],scope:sense.scope||''});
   contentSnapshot.context={spanish:approved.contextEs,chinese:approved.contextZh};
   contentSnapshot.illustrationPlan={sceneZh:approved.sceneZh,ambiguityAndAvoid:approved.avoid.join('；')};
   contentSnapshot.scenePlan={meaningExcerpt:contentSnapshot.meaningZh,contextEs:approved.contextEs,sceneZh:approved.sceneZh,mustShow:approved.mustShow,avoid:approved.avoid,sourceConstraints:[contentSnapshot.scope,contentSnapshot.imageBrief].filter(Boolean)};
   contentSnapshot.approvedPrompt={promptRevision:approved.promptRevision,promptSha256:approved.promptSha256};
   const item={entryId:entry.id,senseId:sense.id,sourceRevision,spanish:entry.spanish,jobId:'api-'+hash([executionId,entry.id,sense.id]).slice(0,32),generationPolicy:POLICY,promptPolicy:'approved-word-card-v1',promptRevision:approved.promptRevision,promptSha256:approved.promptSha256,review:'pending',contentSnapshot};item.finalPrompt=approved.promptText;item.finalPromptHash=approved.promptSha256;items.push(item);
  }catch(e){blockers.push({entryId:chosen.entryId,spanish:chosen.spanish,problems:[/^[A-Z0-9_]+$/.test(e.message)?e.message:'GENERATION_SOURCE_UNAVAILABLE']});}}
  for(let i=0;i<items.length;i+=50){const rows=checklist.inspect(project,items.slice(i,i+50),{reviewAfterGeneration:true});for(const r of rows.filter(x=>!x.allowed))blockers.push({entryId:r.entryId,spanish:items.find(x=>x.entryId===r.entryId)?.spanish,problems:['GENERATION_'+r.status.toUpperCase().replaceAll('-','_')]});}
  return {ready:!blockers.length,reason:blockers.length?'GENERATION_INPUT_REQUIRED':null,items,blockers,summary:{selected:selected.length,blocked:blockers.length,ready:selected.length-blockers.length},generationPolicy:POLICY};
 }
 return {prepare,diagnose:prepare};
}
module.exports={POLICY,createGenerationContent,promptFor};
