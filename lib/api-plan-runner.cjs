'use strict';
// API source for the same frozen graph plan. Outputs are pending independent review.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {createResearchImage}=require('./research-image.cjs');
const {createKeyStore}=require('./openai-key.cjs');
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
function atomic(file,value){const data=JSON.stringify(value);if(Buffer.byteLength(data)>4*1024*1024)throw Error('API_PLAN_RECEIPT_LIMIT');fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.pending';const fd=fs.openSync(temp,'wx');try{fs.writeFileSync(fd,data);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,file);}
function createApiPlanRunner({project,runtime,keyStore=createKeyStore(),prepareContent,planScenes,assertEligible,request,makePrompt,checkStorage,promptTools}={}){
 const root=path.join(runtime,'api-plan'),imageRoot=path.join(runtime,'api-image-trial');
 const outputSettings=require('./image-output.cjs').createImageOutput({runtime,project});
 const image=()=>createResearchImage({runtime,root:imageRoot,getKey:keyStore.get,request});
 const content=prepareContent||((input)=>require('./api-generation-content.cjs').createGenerationContent({project}).prepare(input));
 const scenePlanner=planScenes||((items,options)=>require('./api-scene-plan.cjs').createScenePlanner({runtime,getKey:keyStore.get}).plan(items,options));
 const eligible=assertEligible||((items)=>require('./production-checklist.cjs').assertEligible(project,items,{reviewAfterGeneration:true}));
 const finalPrompt=makePrompt||((x)=>x.generationPolicy===require('./api-generation-content.cjs').POLICY?x.finalPrompt:require(path.join(project,'staff/02-spanish-engineering/storage-tools/image-factory-run.cjs')).finalPrompt(x));
 const file=id=>path.join(root,id,'PREPARED.json');
 const stepFile=(id,nodeId)=>path.join(root,id,nodeId+'.json');
 // All graph branches share one API budget; pending siblings never multiply it.
 let occupied=0;const waiting=[];
 async function acquire(){if(occupied>=2)await new Promise(resolve=>waiting.push(resolve));else occupied++;return ()=>{const next=waiting.shift();if(next)next();else occupied--;};}
 function disk(){if(checkStorage)return checkStorage();const targetVolume=path.parse(outputSettings.read().directory).root;const volumes=[['F:/',12*1024**3],['C:/',5*1024**3]];if(!volumes.some(([v])=>path.resolve(v).toLowerCase()===path.resolve(targetVolume).toLowerCase()))volumes.push([targetVolume,8*1024**3]);for(const [volume,reserve] of volumes){if(!fs.existsSync(volume))continue;const s=fs.statfsSync(volume),free=Number(s.bavail)*Number(s.bsize);if(free<reserve+256*1024**2)throw Error('API_PLAN_STORAGE_RESERVE');}}
 async function prepare({executionId,plan,selection,signal,onProgress}){
  if(plan.imageProvider!=='api'||!/^[a-f0-9-]{36}$/.test(executionId))throw Error('API_PLAN_INPUT');
  if(!keyStore.get())return {state:'waiting-content',reason:'API_KEY_MISSING',message:'请先在软件内配置 API Key。'};
  disk();
  const inputHash=digest({plan,selection}),prior=file(executionId);
  if(fs.existsSync(prior)){const saved=read(prior);if(saved.inputHash!==inputHash)throw Error('API_PLAN_FROZEN_INPUT_CHANGED');return saved;}
  if(plan.styleReference)return {state:'blocked',reason:'IMAGE_PROMPT_STYLE_REVIEW_REQUIRED',message:'画风引用须由05写入并审核新提示词版本；当前未生图。'};
  const styleReference=null;
  const items=selection.steps.flatMap(s=>s.items),total=selection.steps.reduce((n,s)=>n+s.quantity,0);
  if(!total||total>1000||items.length!==total||new Set(items.map(x=>x.entryId+'|'+(x.senseId||''))).size!==total)throw Error('API_PLAN_SELECTION_INVALID');
  let result=await content({executionId,plan,selection:{...selection,items},signal,onProgress});
  if(result.ready===false)return {state:'blocked',reason:result.reason||'GENERATION_INPUT_REQUIRED',blockers:result.blockers||[],summary:result.summary,message:'本次 '+total+' 词中 '+(result.blockers?.length??total)+' 词缺少登记词义或已有图片/占用；当前未生图。修正输入后可继续原订单。'};
  if(!Array.isArray(result.items)||result.items.length!==total||result.items.some((x,i)=>x.entryId!==items[i].entryId||(items[i].senseId&&x.senseId!==items[i].senseId)||!x.senseId||!x.sourceRevision)||new Set(result.items.map(x=>x.entryId)).size!==total)throw Error('API_PLAN_CONTENT_MISMATCH');
  for(let n=0;n<result.items.length;n+=2)eligible(result.items.slice(n,n+2));
  const planned=result.items.every(x=>x.promptPolicy==='approved-word-card-v1')?{ready:true,items:result.items,scenePlanning:{policy:'approved-word-card-v1',skipped:true}}:await scenePlanner(result.items,{signal,onProgress});
  if(!planned.ready)return {state:'blocked',reason:'GENERATION_INPUT_REQUIRED',blockers:planned.blockers,message:'有词暂不适合单帧配图，正在按自动缺图顺序寻找替补。'};
  if(!Array.isArray(planned.items)||planned.items.length!==items.length||planned.items.some((x,i)=>x.entryId!==result.items[i].entryId||x.senseId!==result.items[i].senseId||x.sourceRevision!==result.items[i].sourceRevision))throw Error('API_PLAN_CONTENT_MISMATCH');
  result={...result,items:planned.items,scenePlanning:planned.scenePlanning};
  const prepared={schemaVersion:1,imageProvider:'api',executionId,inputHash,actualConcurrency:Math.min(plan.requestedConcurrency,2),parallelSteps:true,...(styleReference?{styleReference}:{}),steps:[]};let at=0;
  for(const s of selection.steps){prepared.steps.push({nodeId:s.nodeId,quantity:s.quantity,after:s.after,items:result.items.slice(at,at+=s.quantity)});}
  prepared.generationPolicy=result.generationPolicy||null;prepared.scenePlanning=result.scenePlanning||null;atomic(prior,prepared);onProgress?.({actualConcurrency:prepared.actualConcurrency,phase:'prompts-ready',message:'画面要求已准备，直接生成；图片完成后交员工审核。'});return prepared;
 }
 async function runStep({executionId,step,prepared,onProgress,signal}){
  if(prepared.imageProvider!=='api'||prepared.executionId!==executionId)throw Error('API_PLAN_EXECUTION_MISMATCH');
  const saved=read(file(executionId));if(saved.inputHash!==prepared.inputHash)throw Error('API_PLAN_FROZEN_INPUT_CHANGED');
  if(saved.styleReference){const checked=require('./image-style-reference.cjs').resolve(runtime,saved.styleReference,id=>image().read(id));if(digest(checked)!==digest(saved.styleReference))throw Error('STYLE_REFERENCE_CHANGED');}
  const target=saved.steps.find(s=>s.nodeId===step.nodeId);if(!target||target.quantity!==step.quantity||target.items.some((x,i)=>x.jobId!==step.items[i]?.jobId))throw Error('API_PLAN_STEP_MISMATCH');
  const receipt=stepFile(executionId,step.nodeId);let state=fs.existsSync(receipt)?read(receipt):{schemaVersion:1,executionId,nodeId:step.nodeId,state:'running',items:[]};
  if(state.state==='generated-awaiting-review')return {...state,generated:state.items.filter(x=>x.state==='awaiting-review').length};
  if(fs.existsSync(receipt)&&state.state!=='reconciled-ready')return {state:'unknown',reason:'API_PLAN_RECONCILIATION_REQUIRED',generated:state.items.filter(x=>x.state==='awaiting-review').length,items:state.items};
  if(state.state==='reconciled-ready'&&state.items.some(x=>x.state!=='awaiting-review'||!target.items.some(y=>y.jobId===x.jobId)||!x.nativePath||!fs.existsSync(x.nativePath)))return {state:'unknown',reason:'API_PLAN_RECONCILIATION_REQUIRED',generated:state.items.filter(x=>x.state==='awaiting-review').length,items:state.items};
  state.state='running';
  atomic(receipt,state);
  let cursor=0,stopped=false;const limit=Math.min(saved.actualConcurrency,target.items.length),done=new Set(state.items.map(x=>x.jobId)),ids=new Set(state.items.map(x=>x.entryId+'|'+x.senseId+'|'+x.sourceRevision));
  const persist=()=>atomic(receipt,state);
  const runOne=async()=>{while(cursor<target.items.length&&!stopped){if(signal?.aborted){stopped=true;break;}
    const release=await acquire();try{
    if(stopped||signal?.aborted){stopped=true;break;}if(cursor>=target.items.length)break;
    const item=target.items[cursor++];if(done.has(item.jobId))continue;eligible([item]);disk();
    if(item.promptPolicy==='approved-word-card-v1'&&(saved.styleReference||item.finalPrompt!==finalPrompt(item)||!Number.isInteger(item.promptRevision)||(promptTools||require(path.join(project,'staff/02-spanish-engineering/storage-tools/word-card-image-prompts.cjs'))).sha256(item.finalPrompt)!==item.promptSha256))throw Error('IMAGE_PROMPT_FROZEN_MISMATCH');
    const prompt=item.promptPolicy==='approved-word-card-v1'?item.finalPrompt:require('./image-style-reference.cjs').promptWithReference(finalPrompt(item),saved.styleReference);
    if(prompt.length>2000){stopped=true;state.reason='API_PLAN_PROMPT_TOO_LONG';break;}
    const promptHash=digest(prompt),identity=item.entryId+'|'+item.senseId+'|'+item.sourceRevision;
    if(ids.has(identity)){stopped=true;state.reason='API_PLAN_DUPLICATE_IDENTITY';break;}ids.add(identity);
    const claim=path.join(root,'claims',require('./production-checklist.cjs').keyOf(item)+'.json');fs.mkdirSync(path.dirname(claim),{recursive:true});
    try{fs.writeFileSync(claim,JSON.stringify({executionId,nodeId:step.nodeId,jobId:item.jobId,identity,promptHash,claimedAt:new Date().toISOString()}),{flag:'wx'});}catch{stopped=true;state.reason='API_PLAN_IDENTITY_ALREADY_CLAIMED';break;}
    const entryClaim=path.join(root,'entry-claims',createHash('sha256').update(item.entryId).digest('hex')+'.json');fs.mkdirSync(path.dirname(entryClaim),{recursive:true});
    try{fs.writeFileSync(entryClaim,JSON.stringify({executionId,nodeId:step.nodeId,jobId:item.jobId,entryId:item.entryId,claimedAt:new Date().toISOString()}),{flag:'wx'});}catch{stopped=true;state.reason='API_PLAN_ENTRY_ALREADY_CLAIMED';break;}
    const promptClaim=path.join(root,'prompt-claims',promptHash+'.json');fs.mkdirSync(path.dirname(promptClaim),{recursive:true});
    try{fs.writeFileSync(promptClaim,JSON.stringify({executionId,nodeId:step.nodeId,jobId:item.jobId,identity,claimedAt:new Date().toISOString()}),{flag:'wx'});}catch{stopped=true;state.reason='API_PLAN_PROMPT_ALREADY_CLAIMED';break;}
    const record={jobId:item.jobId,entryId:item.entryId,senseId:item.senseId,sourceRevision:item.sourceRevision,promptHash,finalPrompt:prompt,contentSnapshot:item.contentSnapshot||null,generationPolicy:item.generationPolicy||null,promptPolicy:item.promptPolicy||null,promptRevision:item.promptRevision||null,promptSha256:item.promptSha256||null,qualityContract:require('./image-style-reference.cjs').contractWithReference(item.qualityContract||require('./image-quality-contract.cjs').reviewTarget(item),saved.styleReference),...(saved.styleReference?{styleReference:saved.styleReference}:{}),review:'pending',state:'submitted',submittedAt:new Date().toISOString(),source:'api'};
    state.items.push(record);persist();onProgress?.({phase:'generating',generated:state.items.filter(x=>x.state==='awaiting-review').length,actualConcurrency:limit});
    const output=await image().generate({prompt,...(saved.styleReference?{styleReference:saved.styleReference}:{})});
    if(output.status!==200){record.state='unknown';record.error=output.value?.error||'API_IMAGE_FAILED';stopped=true;}
    else{const meta=read(path.join(imageRoot,output.value.id+'.json'));record.imageId=output.value.id;record.nativePath=image().read(output.value.id);const bytes=fs.readFileSync(record.nativePath);record.artifact={sha256:meta.sha,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};record.model=output.value.model;record.usage=output.value.usage;record.state='awaiting-review';record.completedAt=new Date().toISOString();}
    persist();onProgress?.({phase:'received-awaiting-review',generated:state.items.filter(x=>x.state==='awaiting-review').length,actualConcurrency:limit});
    }catch(e){stopped=true;throw e;}finally{release();}
  }};
  const workers=await Promise.allSettled(Array.from({length:limit},async()=>{try{await runOne();}catch(e){stopped=true;throw e;}}));
  const failure=workers.find(x=>x.status==='rejected');
  if(failure){stopped=true;state.reason=/^[A-Z0-9_]+$/.test(failure.reason?.message)?failure.reason.message:'API_PLAN_WORKER_FAILED';}
  state.generated=state.items.filter(x=>x.state==='awaiting-review').length;
  state.state=!stopped&&state.generated===target.quantity?'generated-awaiting-review':signal?.aborted&&!state.reason&&state.items.every(x=>x.state==='awaiting-review')?'paused':'unknown';
  if(state.state==='unknown')state.reason||='API_PLAN_RECONCILIATION_REQUIRED';persist();return state;
 }
 return {prepare,runStep};
}
module.exports={createApiPlanRunner};
