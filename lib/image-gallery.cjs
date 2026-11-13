'use strict';
// Read-only, bounded receipt index. Images stay at their authoritative/original paths.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {catalog}=require('./research-capacity.cjs');
const extra=['capacity50-20261103','capacity100-20261103','capacity100-20261103-r1','capacity100-20261103-r2','capacity75-overlap-20261104','light10-20261104','direct-tool-proof-20261104','multi-image-proof-20261104'];
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,24);
function createGallery({root,project,runtime=path.join(root,'runtime'),readPlanExecution=()=>null,nativeRoots=[path.resolve(project,'../../CodexGlobalData/generated_images'),path.join(require('node:os').homedir(),'.codex/generated_images')]}={}){
 const cache=new Map();let indexCache,indexAt=0;
 function read(file){try{const st=fs.statSync(file);if(st.size>(/^IMAGE-FACTORY-RUN-/.test(path.basename(file))?require('./production-limits.cjs').RUN_BYTES:2*1024*1024))throw Error('RECEIPT_SIZE');const old=cache.get(file);if(old?.stamp===st.mtimeMs&&old.size===st.size)return old.value;const value=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));cache.set(file,{stamp:st.mtimeMs,size:st.size,value});return value;}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 function safeImage(a){
  if(a.source==='api'&&/^[a-f0-9]{64}$/.test(a.imageId||'')){
   const file=require('./research-image.cjs').createResearchImage({runtime,getKey:()=>''}).read(a.imageId);
   if(!file)return null;
   try{const b=fs.readFileSync(file);return b.length<=32*1024*1024&&createHash('sha256').update(b).digest('hex')===a.artifact?.sha256?file:null;}catch{return null;}
  }
  const sha=a.artifact?.sha256;if(!/^[a-f0-9]{64}$/.test(sha||''))return null;
  const cas=path.resolve(project,'staff/02-spanish-engineering/image-asset-store/sha256',sha.slice(0,2),sha+'.png');
  const candidate=a.artifact?.casPath||a.nativePath;if(typeof candidate!=='string'||!path.isAbsolute(candidate))return null;
  const resolved=path.resolve(candidate),roots=a.artifact?.casPath?[path.dirname(cas)]:nativeRoots;
  if(a.artifact?.casPath&&resolved.toLowerCase()!==cas.toLowerCase())return null;
  if(path.extname(resolved).toLowerCase()!=='.png')return null;
  const inside=(p,r)=>p.toLowerCase().startsWith(path.resolve(r).toLowerCase()+path.sep);
  if(!roots.some(r=>inside(resolved,r)))return null;
  try{const real=fs.realpathSync(resolved);if((a.artifact?.casPath&&real.toLowerCase()!==resolved.toLowerCase())||!roots.some(r=>inside(real,r)))return null;const st=fs.statSync(real);if(!st.isFile()||st.size>32*1024*1024)return null;return real;}catch{return null;}
 }
 function batches(){
  if(indexCache&&Date.now()-indexAt<5000)return indexCache;
  const result=[],warnings=[],reviewPath=path.join(project,'staff/05-spanish-teaching/CONCURRENCY-TEST-REVIEW-CURRENT.json');let review;
  try{review=read(reviewPath);}catch{warnings.push('正式审核回执暂不可读，图片暂按待核对显示。');}
  const add=(key,title,scope,rows,recordedAt,expected,reviewDocument=review)=>{
   if(!Array.isArray(rows)||rows.length>1000)throw Error('RECEIPT_ITEMS_LIMIT');
   const items=rows.map((a,index)=>{
    const r=['formal','api'].includes(scope)&&reviewDocument?.reviewerConversationId==='01a19c24-d45a-7081-bf20-6444b8a976d3'?(reviewDocument.items||[]).find(r=>r.jobId===a.jobId&&r.sha256===a.artifact?.sha256&&r.finalPromptHash===a.promptHash&&r.sourcePromptHash===a.sourcePromptHash&&['attemptId','entryId','senseId','sourceRevision'].every(k=>scope!=='api'&&r[k]===undefined||r[k]===a[k])):null;
    const file=safeImage(a),hasReceipt=!!(a.nativePath||a.artifact?.casPath||a.imageId),decision=r?.decision;
    const status=!file?(hasReceipt?'missing':'no-image'):['pass','passed'].includes(decision)?'passed':['reject','rejected','fail','failed','hold','revision','revise','needs-revision'].includes(decision)?'issues':'pending';
    return {id:hash(key+'|'+(a.attemptId||a.jobId||index)+'|'+index),number:index+1,attemptId:a.attemptId,jobId:a.jobId,entryId:a.entryId,senseId:a.senseId,sourceRevision:a.sourceRevision,title:a.subject||a.word||a.lemma||a.contentSnapshot?.spanish||'',state:a.state,status,review:r?.decision||'pending',reviewReason:r?.reviewReason||'',teachingTarget:a.qualityContract||require('./image-quality-contract.cjs').reviewTarget(a),summary:String(a.finalPrompt||a.prompt||'').slice(0,6000),sha256:a.artifact?.sha256||null,width:a.artifact?.width,height:a.artifact?.height,hasImage:!!file,_file:file};
   });
   const total=Math.max(items.length,Number(expected)||0);if(total>1000)throw Error('RECEIPT_ITEMS_LIMIT');
   // Keep unsubmitted / absent receipt positions visible, never silently declare the batch complete.
   while(items.length<total)items.push({id:hash(key+'|absent|'+items.length),number:items.length+1,title:'任务回执缺失',state:'unrecorded',status:'no-image',review:'pending',hasImage:false});
   result.push({id:hash(key),title,scope,recordedAt,total,images:items.filter(i=>i.hasImage).length,passed:items.filter(i=>i.status==='passed').length,pending:items.filter(i=>i.status==='pending').length,issues:items.filter(i=>['issues','missing','no-image'].includes(i.status)).length,items});
  };
  const seen=new Set(),formalRows=[];
  for(const suffix of ['CURRENT','PREVIOUS'])try{
   const run=read(path.join(project,'staff/02-spanish-engineering/storage-tools/IMAGE-FACTORY-RUN-'+suffix+'.json'));if(!run)continue;formalRows.push(...(run.attempts||[]));
   for(const batchId of new Set((run.attempts||[]).map(a=>a.batchId))){const key='formal|'+run.runId+'|'+batchId;if(seen.has(key))continue;seen.add(key);add(key,'正式批次 · '+(batchId||run.runId),'formal',run.attempts.filter(a=>a.batchId===batchId),run.updatedAt||run.startedAt);}
  }catch{warnings.push('一份正式批次回执暂不可读。');}
  try{const plan=readPlanExecution();if(plan?.prepared?.steps?.length){const all=[],api=plan.plan.imageProvider==='api',planReview=api?read(path.join(runtime,'api-plan',plan.id,'REVIEW.json')):review;for(const step of plan.prepared.steps){const jobs=new Set(step.items.map(x=>x.jobId)),result=plan.steps.find(s=>s.nodeId===step.nodeId)?.result,rows=api?((read(path.join(runtime,'api-plan',plan.id,step.nodeId+'.json'))||result)?.items||[]).map(a=>({...a,word:step.items.find(x=>x.jobId===a.jobId)?.word||step.items.find(x=>x.jobId===a.jobId)?.spanish||''})):formalRows.filter(a=>jobs.has(a.jobId));all.push(...rows);const label=plan.plan.nodes.find(n=>n.id===step.nodeId)?.label||step.nodeId;add('plan-slot|'+plan.id+'|'+step.nodeId,'方案批次 · '+label,api?'api':'formal',rows,plan.updatedAt,step.quantity,planReview);}add('plan|'+plan.id,'当前方案 · '+plan.total+' 张',api?'api':'formal',all,plan.updatedAt,plan.total,planReview);}}catch{warnings.push('当前方案图片进度暂不可读。');}
  const entries=new Map([...catalog,...extra.map(id=>[id,id])]);
  for(const [dir,title]of entries){if(dir.includes('/wave-'))continue;try{
   const r=read(path.join(root,'runtime',dir,'RESULT-CURRENT.json'));if(!r)continue;
   let rows=r.items;
   if(Array.isArray(r.waves)){
    rows=[];for(const wave of r.waves){const n=Number(wave.number);if(!Number.isInteger(n)||n<1||n>50)throw Error('WAVE_RANGE');const child=read(path.join(root,'runtime',dir,'wave-'+String(n).padStart(2,'0'),'RESULT-CURRENT.json'));if(child?.items)rows.push(...child.items);else warnings.push(title+'：第 '+n+' 波回执不可读。');}
   }
   if(!Array.isArray(rows)){if(!r.generated)continue;warnings.push(title+'：回执没有逐图清单。');continue;}
   rows=rows.map((a,index)=>({...a,subject:a.subject||(typeof r.objects?.[index]==='string'?r.objects[index]:''),artifact:a.artifact||{sha256:a.sha256,width:a.width,height:a.height,bytes:a.bytes}}));
   add('research|'+dir,title,'research',rows,r.finishedAt||r.updatedAt||r.startedAt||r.completedAt,r.total||rows.length);
  }catch{warnings.push(title+'：回执读取失败。');}}
  result.sort((a,b)=>Date.parse(b.recordedAt||0)-Date.parse(a.recordedAt||0));indexAt=Date.now();return indexCache={result,warnings};
 }
 function list(){const {result,warnings}=batches();return {batches:result.map(({items,...b})=>b),warnings,readOnly:true};}
 function page({batchId,page=0,limit=24,status='all',query=''}={}){
  if(!Number.isInteger(page)||page<0||![12,24,48,'all'].includes(limit)||!['all','pending','passed','issues'].includes(status)||query.length>160)throw Error('GALLERY_QUERY');
  const batch=batches().result.find(b=>b.id===batchId);if(!batch)throw Error('GALLERY_BATCH_NOT_FOUND');
  const text=query.trim().toLowerCase(),rows=batch.items.filter(i=>(status==='all'||(status==='issues'?['issues','missing','no-image'].includes(i.status):i.status===status))&&(!text||[i.title,i.jobId,i.entryId,i.senseId,i.number].some(x=>String(x||'').toLowerCase().includes(text))));
  const showAll=limit==='all';if(showAll)limit=Math.max(1,rows.length);const pages=Math.ceil(rows.length/limit),actualPage=Math.min(page,Math.max(0,pages-1));
  return {batchId,total:rows.length,batchTotal:batch.total,page:actualPage,pages,limit,showAll,items:rows.slice(actualPage*limit,(actualPage+1)*limit).map(({_file,...i})=>i)};
 }
 function image(batchId,id){const a=batches().result.find(b=>b.id===batchId)?.items.find(i=>i.id===id);if(!a?._file)throw Error('GALLERY_IMAGE_UNAVAILABLE');const fd=fs.openSync(a._file,'r');try{const head=Buffer.alloc(8);fs.readSync(fd,head,0,8,0);if(head.toString('hex')!=='89504e470d0a1a0a')throw Error('GALLERY_NOT_PNG');}finally{fs.closeSync(fd);}return a._file;}
 return {list,page,image};
}
module.exports={createGallery};
