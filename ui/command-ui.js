'use strict';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token=location.hash.slice(1)||sessionStorage.getItem('workbench-session')||'';
if(token){sessionStorage.setItem('workbench-session',token);history.replaceState(null,'',location.pathname);}
const M=window.WorkbenchMotion;
let state=null,selected='dispatch',positions={},view={x:15,y:20,s:.7},drag=null,jobFingerprint='',busy=false,nodeDefs=[],paintFrame=0,lastCommandStamp=null;
const cards=new Map(),cardVersions=new Map();
const artUrls=new Map(),artPending=new Set();
const GRAPH_STORAGE_KEY='linarchive-graph-state-v1';
let restoredGraph=null,restoredDraft=false,graphSaveState='ready';
try{const saved=JSON.parse(localStorage.getItem(GRAPH_STORAGE_KEY));if(saved?.schemaVersion===1&&saved.draft)restoredGraph=saved;}catch{}
let canvasMode='actual',connecting=false,linkSource=null,planBusy=false;
let draft={schemaVersion:1,nodes:[{id:'plan-1',label:'计划执行槽 1'},{id:'plan-2',label:'计划执行槽 2'}],edges:[{from:'dispatch',to:'plan-1'},{from:'dispatch',to:'plan-2'}]};
try{const d=restoredGraph?.draft||JSON.parse(localStorage.getItem('linarchive-plan-draft'));const ids=new Set(['codex','lead','pro','dispatch','review',...(d?.nodes||[]).map(n=>n.id)]);if([1,2,3].includes(d?.schemaVersion)&&Array.isArray(d.nodes)&&d.nodes.length<=200&&d.nodes.every(n=>/^plan-[1-9]\d{0,5}$/.test(n.id)&&typeof n.label==='string'&&n.label.length<=80)&&Array.isArray(d.edges)&&d.edges.length<=500&&d.edges.every(e=>ids.has(e.from)&&ids.has(e.to))){draft=d;restoredDraft=true;}}catch{}
if(restoredDraft){canvasMode=['plan','actual'].includes(restoredGraph?.canvasMode)?restoredGraph.canvasMode:'plan';graphSaveState='restored';}else restoredGraph=null;
if(draft.schemaVersion===1){draft={schemaVersion:2,nodes:draft.nodes.map(n=>({...n,type:'card'})),edges:[{from:'codex',to:'lead'},{from:'lead',to:'review'},...draft.edges].map((e,i)=>({id:'edge-migrated-'+i,...e,sourceSide:'right',targetSide:'left',label:''}))};}
draft.schemaVersion=3;
for(const node of draft.nodes)delete node.batchOrder;
delete draft.requestedConcurrency;
if(!draft.edges.some(e=>e.from==='dispatch'&&draft.nodes.some(n=>n.id===e.to)))draft.edges=draft.edges.filter(e=>e.from!=='dispatch'&&e.to!=='dispatch');
function planFlow(){return window.WorkbenchPlanFlow?.derive(draft);}
function orderScopeLabel(id){const scope=draft.nodes.find(n=>n.id===id)?.vocabularyScope;if(!scope)return '用户派单 · ';if(scope.mode==='auto-missing'){const count=planFlow()?.vocabularyDemands.find(d=>d.nodeId===id)?.required||0;return '自动取 '+count+' 词 · ';}return '词库 '+scope.selectedCount+' 项 · ';}
function flowError(flow){const error=flow?.errors?.[0];if(!error)return '';if(error.code==='PLAN_AUTO_SCOPE_LIMIT')return '同一派单节点自动取词最多 1000 项，请拆分派单节点。';if(error.code==='PLAN_SCOPE_SHORTAGE')return '本次执行共需 '+error.required+' 张，词库只选了 '+error.selected+' 项，还差 '+error.shortage+' 项。请扩大范围或减少执行槽数量。';if(error.code==='PLAN_FLOW_CONCURRENCY_LIMIT')return '同一层最多规划 50 条分支，请减少并行分叉。';const names=error.nodeIds.map(id=>draft.nodes.find(n=>n.id===id)?.label||id).join('、');return ({PLAN_FLOW_CYCLE:'执行路径形成循环，请断开回路',PLAN_FLOW_DISCONNECTED:'执行节点上游有卡片未接到用户派单',PLAN_FLOW_QUANTITY_REQUIRED:'请填写执行路径上的执行槽数量',PLAN_EXECUTE_NODE_MULTIPLE:'只保留一个执行节点'}[error.code]||'请检查执行路径')+'：'+names;}
draft.recipientThreadId ||= '01a13637-abd8-7151-9fdd-cae83f313ba1';
draft.imageProvider ||= 'pro';
function recipientName(){return draft.recipientLabel||(draft.recipientThreadId==='01a1ac0a-d293-7df3-bcb0-5dd9a74510f9'?'产图部':draft.recipientThreadId==='01a13637-abd8-7151-9fdd-cae83f313ba1'?'组长':draft.recipientThreadId?'对话 '+draft.recipientThreadId.slice(0,8):'组长');}
function graphKey(p){return JSON.stringify({nodes:p.nodes,edges:p.edges,imageProvider:p.imageProvider||'pro',recipientThreadId:p.recipientThreadId||'01a13637-abd8-7151-9fdd-cae83f313ba1'});}
function updateGraphSaveStatus(){const el=document.getElementById('graph-save-status');if(!el)return;el.textContent=({ready:'自动保存已开启',restored:'已恢复上次导图',saved:'已自动保存',failed:'自动保存失败，请勿关闭'})[graphSaveState];el.dataset.state=graphSaveState;}
function saveGraph(){
 try{localStorage.setItem(GRAPH_STORAGE_KEY,JSON.stringify({schemaVersion:1,draft,positions,view,canvasMode,updatedAt:Date.now()}));graphSaveState='saved';
  // Fixed legacy keys remain compatible with older clients; the combined snapshot is authoritative.
  try{localStorage.setItem('linarchive-plan-draft',JSON.stringify(draft));localStorage.setItem('linarchive-command-layout',JSON.stringify({view,positions}));}catch{}
 }catch{graphSaveState='failed';}updateGraphSaveStatus();return graphSaveState==='saved';
}
function saveDraft(){return saveGraph();}
window.addEventListener('beforeunload',e=>{if(graphSaveState==='failed'){e.preventDefault();e.returnValue='';}});
function graphExecution(){
 const run=state?.planExecution;if(!state)return {reason:'正在读取执行状态…'};
 if(run?.qualityPaused)return {reason:run.message||'已暂停新增生成，等待质量核对。'};
 if(busy||planBusy)return {reason:'正在提交…'};
 if(['preparing','running','unknown'].includes(run?.state))return {reason:run.message};
 if(state.planGraphConcurrency!=='execute-node-v1')return {reason:'执行服务仍是旧版本。请完全退出客户端后重新打开，再执行导图方案。'};
 const flow=planFlow();if(!flow?.hasExecute)return {reason:'添加“执行”节点，把本次要做的分支连到它；未连的卡片会保留但不参与。'};
 if(!flow.enabled)return {reason:'把用户派单和至少一个执行槽连到“执行”节点。'};
 if(!flow.valid)return {reason:flowError(flow)};
 if(!flow.steps.length)return {reason:'执行节点上游还没有可执行的批次。'};
 const activeOrders=new Set(flow.vocabularyDemands.map(d=>d.nodeId));
 if(!activeOrders.size||draft.nodes.some(n=>activeOrders.has(n.id)&&!n.vocabularyScope))return {reason:'请在本次执行路径的用户派单卡中选择词库范围。'};
 if(draft.nodes.some(n=>activeOrders.has(n.id)&&(!n.requestText?.trim()||!n.vocabularyScope)))return {reason:'请填写本次执行路径上派单卡的要求和词库范围。'};
 if(draft.imageProvider==='api'&&!state.apiImage?.configured)return {reason:'API 来源未配置。请先在软件的 API 生图页保存项目 Key。'};
 if((state.nativeBridge?.activeWorkers||0)>0)return {reason:'另有任务执行中，请等待完成。'};
 return {ready:true,reason:'共 '+flow.totalQuantity+' 张 · 同级分支 '+flow.requestedConcurrency+' 路（规划）· '+(draft.imageProvider==='api'?'API 额度':'Pro 套餐')+(draft.imageProvider==='api'?' · 分支并行，共享最多 2 张在途；串联按顺序':' · Pro 共用执行账本，批次串行，每批最多 2 张在途')};
}
const pausePlanButton=document.createElement('button');pausePlanButton.id='pause-plan';pausePlanButton.className='quiet graph-execute';pausePlanButton.type='button';pausePlanButton.textContent='⏸ 暂停生成';pausePlanButton.hidden=true;$('#apply-plan').after(pausePlanButton);
pausePlanButton.onclick=async()=>{const run=state?.planExecution;if(!run?.id)return;pausePlanButton.disabled=true;try{await api('plan/pause',{executionId:run.id});toast('已停止新增请求，正在收齐在途结果。');await refresh();}catch(e){toast(e.message,'error');}finally{updateGraphExecution();}};
function updateGraphExecution(){const x=graphExecution(),run=state?.planExecution;$('#apply-plan').disabled=!x.ready;$('#apply-plan').textContent=busy?'提交中…':'▶ 执行此方案';$('#apply-plan').setAttribute('aria-busy',String(busy));$('#graph-execution-status').textContent=x.reason;pausePlanButton.hidden=!['preparing','running'].includes(run?.state);pausePlanButton.disabled=!!run?.qualityPaused;pausePlanButton.textContent=run?.qualityPaused?'正在收齐在途结果…':'⏸ 暂停生成';}
function planControls(){if(!state)return;const p=state.control.plan,isPlan=canvasMode==='plan',isNode=draft.nodes.some(n=>n.id===selected),same=p&&graphKey(p)===graphKey(draft);
 const demand=planFlow();$('#plan-quantity-summary').textContent=isPlan&&demand?.totalQuantity?'执行槽合计 '+demand.totalQuantity+' 张 · 最多 '+demand.branchWidth+' 条同级分支'+(demand.errors.some(e=>e.code==='PLAN_SCOPE_SHORTAGE')?' · '+flowError(demand):''):'';$('#canvas-mode').value=canvasMode;$('#add-slot').disabled=planBusy||draft.nodes.length>=200;$('#link-slots').disabled=!isPlan||planBusy;$('#link-slots').setAttribute('aria-pressed',String(connecting));$('#disconnect-slot').disabled=!isPlan||!isNode||draft.nodes.length<=1||planBusy;$('#remove-slot').disabled=!isPlan||!isNode||draft.nodes.length<=1||planBusy;updateGraphExecution();
 $('#plan-status').textContent=connecting?(linkSource?'再点目标卡片完成连线。':'先点起点，再点目标卡片。'):'方案自动保存 · 箭头决定批次顺序 · 点击右侧执行此方案';
 $('.canvas-toolbar b').textContent=isPlan?'调度方案':'真实产线';$('.inspector-head span').textContent='执行控制';$('#canvas').setAttribute('aria-label',isPlan?'调度方案画布':'真实产线画布');$('.canvas-caption span').textContent=isPlan?'拖动布局 · 滚轮缩放 · 用连线连接批次与计划卡片':'拖动平移 · 滚轮缩放 · 点击查看真实节点';window.WorkbenchGraph?.decorate();
}
$('#apply-plan').onclick=async()=>{if(!graphExecution().ready)return;if(!saveGraph()){toast('自动保存失败，请先释放本机存储空间。','error');return;}busy=true;updateGraphExecution();try{const run=await api('plan/execute',draft);toast(run.message||'正在准备任务。');await refresh();}catch(e){toast(({VOCABULARY_SCOPE_STALE:'词库已变化，请刷新用户派单卡的范围。',LIVE_VOCABULARY_STALE:'实时词库同步暂未完成，请等状态恢复后再执行。',LIVE_VOCABULARY_UNAVAILABLE:'实时词库暂不可用，请检查本机同步。',PLAN_SLOT_ORDER_REQUIRED:'请把每个执行槽连到用户派单卡。',PLAN_SLOT_MULTIPLE_ORDERS:'同一执行槽不能同时接收两张派单卡。',PLAN_DUPLICATE_ITEM:'派单范围有重复词条，请调整。',PLAN_SCOPE_SHORTAGE:'当前缺图队列不够覆盖后续批次数量，请减少批次或等待词库补齐。',PLAN_OTHER_EXECUTION_ACTIVE:'已有其他执行任务，请等待完成。'})[e.message]||e.message,'error');}finally{busy=false;updateGraphExecution();}};
try{const s=restoredGraph||JSON.parse(localStorage.getItem('linarchive-command-layout'));if(s&&s.view&&[s.view.x,s.view.y,s.view.s].every(Number.isFinite)&&s.view.s>0){view=s.view;positions=s.positions||{};}}catch{}
const names={'review-complete-awaiting-04-archive':'独审完成，待词库归档','observation-ended':'本轮实测已结束','generated-complete':'生成完成，待独审', 'partial-failed':'部分失败，需处理',pending:'待组长领取',accepted:'组长已领取',completed:'执行已回执',blocked:'已阻塞',confirmed:'已签发',running:'批次进行中','batch-finished':'小批次已结束','awaiting-dispatch':'等待正式派单','awaiting-review':'待独审',passed:'独审通过',pass:'独审通过',hold:'待修订',unknown:'结果待对账','provenance-mismatch':'来源记录待核对'};
const label=v=>names[v]||v||'—';
const localTime=v=>new Date(v).toLocaleTimeString('zh-CN',{timeZone:'Europe/Paris',hour12:false});
function nativeBridgeStatus(){const b=state?.nativeBridge,verified=b?.realImageVerified===true,active=Number.isInteger(b?.activeWorkers)&&b.activeWorkers>0?b.activeWorkers:0,states={'not-prepared':'尚未启动批次',preparing:'正在准备批次',prepared:'批次已准备，等待执行',running:'批次执行中',generated:'本批已生成，等待审核',blocked:'批次待处理',disconnected:'连接中断，等待核对',closed:'当前空闲','prepare-failed':'批次准备失败'},activity=active?`${active} 个执行任务运行中`:b?(states[b.batchState]||'当前空闲'):'尚未取得执行状态',connection=verified?'本机生图通道已实测':b?.implemented?'本机执行桥已配置，生图待验证':'本机生图通道待验证';return {verified,activity,connection,summary:connection+' · '+activity,model:b?.model||'未选择'};}
const reasons={BATCH_HAS_ATTEMPTS:'当前批次已有执行记录，不重复派发',NOT_CONFIRMED:'05 尚未签发当前批次',LEASE_NOT_CURRENT:'执行租约未生效或已到期',BATCH_SIZE:'当批须有 1–5 项',CONTENT_NOT_READY:'内容审核条件尚未齐全',DISPATCH_OWNER_OR_SCHEMA:'派单来源或格式待核验',DISPATCH_MISSING:'尚无正式派单文件'};
async function api(route,data){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),data===undefined?10000:60000);try{const r=await fetch('/api/'+route,{method:data===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(data===undefined?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:JSON.stringify(data),signal:controller.signal});const v=await r.json();if(!r.ok)throw Error(v.error||'REQUEST_FAILED');return v;}catch(e){if(controller.signal.aborted)throw Error(data===undefined?'连接超时，正在自动重试':'请求等待超时，请先查看任务状态，勿重复执行');throw e;}finally{clearTimeout(timer);}}
let toastTimer;function toast(s,tone='info'){const el=$('#toast');el.textContent=s;el.dataset.tone=tone;el.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('is-visible'),5500);}
function save(){return saveGraph();}
function transform(){$('#world').style.transform=`translate(${view.x}px,${view.y}px) scale(${view.s})`;$('#zoom-value').textContent=Math.round(view.s*100)+'%';}
function pos(id,x,y){return positions[id]||{x,y};}
function paintPositions(){for(const [id,,,x,y]of nodeDefs){const p=pos(id,x,y),el=document.getElementById('node-'+id);el.style.transform=`translate(${p.x}px,${p.y}px)`;}paintEdges();window.WorkbenchGraph?.decorate();}
function paintEdges(){if(canvasMode==='plan'&&window.WorkbenchGraph)return window.WorkbenchGraph.paintEdges();for(const edge of $('#edges').children){const aa=nodeDefs.find(x=>x[0]===edge.dataset.from),bb=nodeDefs.find(x=>x[0]===edge.dataset.to);if(!aa||!bb)continue;const p=pos(aa[0],aa[3],aa[4]),q=pos(bb[0],bb[3],bb[4]),d=`M ${p.x+154} ${p.y+42} C ${p.x+210} ${p.y+42}, ${q.x-55} ${q.y+42}, ${q.x} ${q.y+42}`;if(edge.getAttribute('d')!==d)edge.setAttribute('d',d);}}
function schedulePaint(){if(!paintFrame)paintFrame=requestAnimationFrame(()=>{paintFrame=0;if(drag?.id)paintPositions();else transform();});}
function slots(){return Math.max(2,...state.control.items.map(a=>Number(a.slotId)||0));}
function planSubtitle(node,linked,flow){if(node.type==='execute')return flow?.enabled&&flow.valid?flow.totalQuantity+' 张 · 点击右侧执行此方案':'连接本次要执行的分支';if(node.type==='user-order')return orderScopeLabel(node.id)+(!node.requestText?.trim()?'待填写要求':linked?'已连接':'暂不参与');if(node.type==='point')return linked?'连接点':'暂不参与';return node.batchSize?node.batchSize+' 张 · '+(flow?.activeNodeIds.includes(node.id)?'参与本次执行':'暂不参与'):linked?'双击填写数量':'暂不参与';}
function syncNodes(){
 const c=state.control,m=c.production.currentMetrics||c.production.metrics||{};
 const defs=[['codex','CODEX CHAT',esc('Codex '+recipientName()+'会话'),25,190],['lead','COMMAND','组长派单',225,190],['pro','RESOURCE',draft.imageProvider==='api'?'API 生图能力':'Pro 生图能力',430,30],['review','QUALITY','教学独立审核',430,350]];
 if(canvasMode==='actual'||draft.edges.some(e=>e.from==='dispatch'&&draft.nodes.some(n=>n.id===e.to)))defs.splice(3,0,['dispatch','CONFIRMED','正式任务批次',430,190]);
 if(canvasMode==='plan')draft.nodes.forEach((n,i)=>defs.push([n.id,n.type==='user-order'?'USER ORDER':n.type==='execute'?'EXECUTE':n.type==='point'?'POINT':'PLAN NODE',esc(n.label),660+i%3*190,110+Math.floor(i/3)*150]));else for(let i=1;i<=slots();i++)defs.push(['worker-'+i,'ACTUAL SLOT','执行槽 '+i,660+(i-1)%3*190,110+Math.floor((i-1)/3)*150]);
 nodeDefs=defs;
 const valid=new Set(defs.map(x=>x[0]));for(const e of $('#nodes').querySelectorAll('.node'))if(!valid.has(e.dataset.id))e.remove();
 for(const [id,kind,title]of defs){let e=document.getElementById('node-'+id);if(!e){e=document.createElement('button');e.id='node-'+id;e.className='node';e.dataset.id=id;e.innerHTML=`<div class="node-kind"><span>${kind}</span><i class="node-indicator"></i></div><h3>${title}</h3><div class="node-sub"></div>`;$('#nodes').append(e);}e.classList.toggle('selected',selected===id);e.setAttribute('aria-pressed',String(selected===id));e.classList.toggle('pro-node',id==='pro');
  e.querySelector('.node-kind span').textContent=kind;if(id==='codex')e.querySelector('h3').textContent='Codex '+recipientName()+'会话';if(id==='pro')e.querySelector('h3').textContent=title;
  const planned=id.startsWith('plan-'),linked=draft.edges.some(x=>x.to===id||x.from===id);e.classList.toggle('plan-node',planned);e.classList.remove('unlinked');e.classList.toggle('execute-node',planned&&draft.nodes.find(n=>n.id===id)?.type==='execute');
  const entries=c.items.filter(a=>'worker-'+a.slotId===id),active=entries.find(a=>a.state==='submitted'||(a.startedAt&&!a.finishedAt)),last=entries.at(-1);e.classList.toggle('busy',!!active);e.classList.toggle('complete',!!last?.finishedAt);
  e.classList.toggle('working',!!active?.startedAt&&!active.finishedAt);
  let sub=planned?planSubtitle(draft.nodes.find(n=>n.id===id),linked,planFlow()):id==='dispatch'&&canvasMode==='plan'?'旧方案入口 · 请改接用户派单':id==='codex'?'接收对话 · 双击选择':id==='lead'?(c.command?label(c.command.state):'尚无执行指令'):id==='pro'?'登录由 Codex 管理':id==='dispatch'?`${c.dispatch.items.length} 项 · ${c.dispatch.ready?'可请求执行':c.command?.state==='completed'?'当批已结束':'等待签发'}`:id==='review'?`${m.qualifiedImages||0} 张合格`:active?(active.startedAt?'真实调用进行中':'已提交 · 等待调用回执'):last?'空闲 · 上项已完成':'尚无真实调用';const subEl=e.querySelector('.node-sub');if(subEl.textContent!==sub){const had=!!subEl.textContent;subEl.textContent=sub;if(had)M.reveal(subEl,{duration:140,distance:2});}
 }
 if(canvasMode==='plan'&&window.WorkbenchGraph){paintPositions();return;}
 let paths='';function edge(a,b,dashed=false){paths+='<path class="'+(dashed?'resource':'')+'" data-from="'+a+'" data-to="'+b+'"/>';}
 edge('codex','lead');edge('lead','dispatch');edge('lead','review');for(let i=1;i<=slots();i++){edge('dispatch','worker-'+i);edge('pro','worker-'+i,true);}if($('#edges').dataset.structure!==paths){$('#edges').innerHTML=paths;$('#edges').dataset.structure=paths;}paintPositions();
}
function details(gesture=false){
 const title=document.getElementById('node-'+selected)?.querySelector('h3')?.textContent||'';
 const controls=selected==='codex'?'<button class="quiet" data-choose-conversation>选择 Codex 对话</button>':'';
 M.swap($('#details'),controls?'<div class="selected-node-controls"><small>'+esc(title)+'</small>'+controls+'</div>':'',{gesture:false,animate:false});
}
const readableTitles=new Map(),titlePending=new Set();
function pictureTitle(a){return readableTitles.get(a.attemptId)||((a.word&&a.word!==a.jobId)?a.word:'配图 · 待核对词名');}
async function resolvePictureTitle(a){if(!a.entryId||readableTitles.has(a.attemptId)||titlePending.has(a.attemptId))return;titlePending.add(a.attemptId);try{const d=await api('registry?'+new URLSearchParams({query:a.entryId,status:'all',page:'0',limit:'40'}));const row=d.items.find(x=>x.entryId===a.entryId&&x.senseId===a.senseId&&x.sourceRevision===a.sourceRevision);if(row){readableTitles.set(a.attemptId,row.spanish+' · '+row.meaningZh);cardVersions.delete(a.jobId);jobFingerprint='';jobs();}}catch{} }
let pictureDialog;
function openPicture(a,url){if(!pictureDialog){pictureDialog=document.createElement('dialog');pictureDialog.className='picture-preview';pictureDialog.innerHTML='<form method="dialog"><button class="quiet">关闭原图</button></form><img alt="">';document.body.append(pictureDialog);}const image=pictureDialog.querySelector('img');image.src=url;image.alt=pictureTitle(a);pictureDialog.showModal();}
function showArt(el,a,url){if(el.querySelector('img')?.getAttribute('src')===url)return;const button=document.createElement('button');button.className='art-preview';button.type='button';button.setAttribute('aria-label','查看原图：'+pictureTitle(a));const img=document.createElement('img');img.alt=pictureTitle(a)+' 的图片';img.onload=()=>{if(img.isConnected)M.reveal(img,{duration:160,distance:3});};img.src=url;button.append(img);button.onclick=()=>openPicture(a,url);el.replaceChildren(button);}

async function loadArt(a){if(artUrls.has(a.attemptId)||artPending.has(a.attemptId))return;artPending.add(a.attemptId);try{const r=await fetch('/api/image?attemptId='+encodeURIComponent(a.attemptId),{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error();const blob=await r.blob(),u=URL.createObjectURL(blob);artUrls.set(a.attemptId,u);const el=document.getElementById('art-'+a.attemptId);if(el)showArt(el,a,u);}catch{const el=document.getElementById('art-'+a.attemptId);if(el)el.textContent='原图暂不可读';}finally{artPending.delete(a.attemptId);}}
function jobs(){window.WorkbenchGallery?.sync();}

function renderResearchCapacity(){const runs=state?.researchCapacity?.runs||[],live=runs.find(r=>['preparing','running','draining-after-stop'].includes(r.state)&&Date.now()-Date.parse(r.updatedAt||0)<120000),latest=live||runs[0],labels={'waiting-memory':'等待可用内存达到6GB','memory-not-ready':'内存尚不足，未提交生图','prompts-ready':'提示词已准备，尚未启动',generated:'生成已结束，审核另查','paused-awaiting-quality-review':'已暂停，等待独审','partial-capacity-blocked':'空间/内存门槛已停止','aborted-resource-exhaustion':'资源压力中止','receipt-unavailable':'回执暂不可读',preparing:'准备执行环境',running:'正在执行','draining-after-stop':'停止派发，收集在途'};$('#research-latest').textContent=latest?`${live?'正在运行':'最近实测'}：${latest.title} · ${latest.generated||0}/${latest.requested||0} 图`:'没有科研压力测试记录';$('#research-tests').innerHTML=runs.length?runs.slice(0,5).map(r=>`<div class="research-test" data-state="${esc(r.state)}"><b>${esc(r.title)}</b><span>${esc(labels[r.state]||r.state)} · 已提交 ${r.submitted??'—'} · 原图 ${r.generated||0}</span><small>真实生图重叠峰 ${r.actualImageOverlap??'未测'} · 此处不统计独审</small></div>`).join(''):'<div class="research-test">暂无记录</div>';}function render(){renderResearchCapacity();window.WorkbenchWorkflow?.render(state.control.workflow);const c=state.control,m=c.production.currentMetrics||c.production.metrics||{},hour=c.production.metrics||{},cmd=c.command;
 $('#connection-note').textContent=`本机已连接 · ${nativeBridgeStatus().activity} · 保存工作单后，由组长安排执行。`;
 const wave=c.dispatch.finiteWave===true,limit=c.dispatch.requestedWaveConcurrency,selector=$('#concurrency');for(const o of [...selector.options])if(Number(o.value)>2&&(!wave||Number(o.value)!==limit))o.remove();if(wave&&![...selector.options].some(o=>Number(o.value)===limit))selector.add(new Option(limit+' · 本批请求',String(limit)));if(!selector.value)selector.value='2';$('#wave-note').textContent=wave?'本批已签发'+limit+'项，可请求'+limit+'路；实际并发以图片工具事件为准。':'支持规划至50路；正式并发取决于已签发批次、预算和实际执行能力。';
 $('#ready-count').textContent=c.dispatch.items.length;$('#dispatch-state').textContent=c.dispatch.ready?'已签发，可请求':label(c.dispatch.state);
 $('#active-count').textContent=c.items.filter(a=>a.state==='submitted'||(a.startedAt&&!a.finishedAt)).length;$('#generated-count').textContent=m.generatedUniqueImages||0;$('#qualified-count').textContent=m.qualifiedImages||0;$('#peak-count').textContent=m.peakOverlappingToolCalls||0;
 $('#command-state').textContent=cmd?`${cmd.action==='pause'?'暂停补位请求':'执行当前批次'} · ${label(cmd.state)}${cmd.state==='completed'?' · 本批已处理，合格数量见独审结果。':cmd.reason?' · '+cmd.reason:''}`:'尚无指令。组长也可通过命令派单。';
 $('#dispatch-reasons').textContent=cmd?.state==='completed'?'当前批次已有执行记录，不重复派发；等待下一批正式任务。':c.dispatch.reasons.map(r=>reasons[r]||r).join('；');$('#dispatch').disabled=busy||!c.dispatch.ready||['pending','accepted','generated-complete'].includes(cmd?.state);$('#pause').disabled=busy||cmd?.action==='pause'&&cmd?.state==='pending';
 $('.command-bar').dataset.outcome=cmd?.state||'';for(const el of [$('#dispatch'),$('#pause')])el.setAttribute('aria-busy',String(busy));
 const commandStamp=cmd?cmd.id+':'+cmd.state:null;if(lastCommandStamp!==null&&commandStamp!==lastCommandStamp){M.reveal($('#command-state'),{duration:180,distance:3});if(cmd?.state==='completed')toast('组长已回执：本次指令处理完成。');if(cmd?.state==='blocked')toast('执行已阻塞：'+(cmd.reason||'请查看组长回执。'),'error');}lastCommandStamp=commandStamp;
 $('#run-state').textContent=label(c.production.status);$('#minutes').textContent=m.observedMinutes??'—';$('#refills').textContent=m.recordedAutoRefills??0;$('#parallel-refills').textContent=m.refillsWhileOthersActive??0;$('#hour-qualified').textContent=hour.fullHourObserved?hour.firstHourQualifiedImages:'尚未形成完整首小时';
 $('#window-state').textContent=m.startedAt?'首次调用 '+localTime(m.startedAt)+'（巴黎时间）':'没有真实调用';
 $('#efficiency-note').textContent=hour.fullHourObserved?`首次调用后的首个小时内，共有 ${hour.firstHourQualifiedImages} 张完成独审；累计已通过 ${m.qualifiedImages||0} 张。包含供单、审核和空闲间隔，不代表模型满负荷时产能；不据此承诺日产量。`:`已生成 ${m.generatedUniqueImages||0} 张、独审通过 ${m.qualifiedImages||0} 张。尚不显示小时外推；正式并行与补位以实际记录为准。`;
 const batch=c.batches?.at(-1);$('#batch-name').textContent=batch?`${batch.count} 项 · ${batch.qualified} 张独审通过`:'等待批次';$('#batch-efficiency').textContent=batch?.qualitySeconds!=null?`生成阶段 ${batch.generationSeconds.toFixed(1)} 秒，含独审 ${batch.qualitySeconds.toFixed(1)} 秒。短批次折算 ${batch.sampleQualifiedPerHour} 张合格图/小时，不是持续一小时实测；不推算日产量。`:'等待本批生成、文件核验及独立审核全部结束。';
 jobs();syncNodes();details();planControls();transform();renderTerminalSummary();$('#last-sync').textContent='最近同步 '+localTime(Date.now())+'（巴黎时间）';
}
let refreshPending=null,connectionErrorShown=false;
function refresh(){if(refreshPending)return refreshPending;refreshPending=(async()=>{try{const next=await api('state');if(!next.control)throw Error('SERVER_UPDATE_REQUIRED');state=next;render();$('#server-status').textContent='已连接';connectionErrorShown=false;}catch(e){$('#server-status').textContent=e.message==='SERVER_UPDATE_REQUIRED'?'服务待更新':'本地连接暂不可用 · 正在重试';if(!state&&!connectionErrorShown){connectionErrorShown=true;toast('本地服务暂不可用，客户端会自动重连。');}}finally{refreshPending=null;}})();return refreshPending;}
async function command(action,planId,requestedConcurrency=Number($('#concurrency').value)){if(busy)return;busy=true;render();try{await api('command',{action,concurrency:action==='pause'?1:requestedConcurrency,...(planId?{planId}:{})});toast('指令已写入，等待组长领取。');await refresh();}catch(e){toast(e.message,'error')}finally{busy=false;if(state)render();}}
$('#dispatch').onclick=()=>command('run-current');$('#pause').onclick=()=>command('pause');
function zoom(f,cx=$('#canvas').clientWidth/2,cy=$('#canvas').clientHeight/2,instant=false){if(drag)return;$('#world').classList.toggle('instant',instant||M.reduced);const n=Math.max(.25,Math.min(1.8,view.s*f));view.x=cx-(cx-view.x)*n/view.s;view.y=cy-(cy-view.y)*n/view.s;view.s=n;transform();save();}
$('#zoom-in').onclick=e=>zoom(1.15,undefined,undefined,e.detail===0);$('#zoom-out').onclick=e=>zoom(1/1.15,undefined,undefined,e.detail===0);
transform();refresh();setInterval(()=>{if(!document.hidden)refresh()},2000);
function promptSubjects(){return $('#prompt-subjects').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);}
function promptPreview(){const template=$('#prompt-template').value,subjects=promptSubjects();$('#prompt-count').textContent=`${subjects.length} 项 · 最多 200 项`;$('#prompt-preview-output').textContent=subjects.slice(0,3).map((subject,index)=>`${index+1}. ${template.replaceAll('{subject}',subject).replaceAll('{index}',String(index+1)).replaceAll('{total}',String(subjects.length))}`).join('\n\n')||'先填写对象清单。';}
async function promptLoad(){try{const d=await api('research/prompt');$('#prompt-template').value=d.template;$('#prompt-subjects').value=d.subjects.join('\n');$('#prompt-purpose').value=d.purpose||'';$('#prompt-source').value=d.sourceReference||'';$('#prompt-digest').textContent=`研究清单 ${d.subjects.length} 项 · ${d.requiresPurpose?'缺少目的/来源，禁止直接冻结':'仅研究用途'} · 历史题材重合 ${d.repetition?.matchingItems??'—'}/${d.subjects.length} · 正式新增覆盖 0`;promptPreview();}catch(e){$('#prompt-digest').textContent='提示词暂不可用';}}
$('#prompt-preview').onclick=promptPreview;
$('#prompt-save').onclick=async()=>{const button=$('#prompt-save');button.disabled=true;try{const d=await api('research/prompt',{template:$('#prompt-template').value,subjects:promptSubjects(),scope:'research-only',purpose:$('#prompt-purpose').value,sourceReference:$('#prompt-source').value});$('#prompt-digest').textContent=`研究清单 ${d.subjects.length} 项 · 历史题材重合 ${d.repetition?.matchingItems??'—'}/${d.subjects.length} · 正式新增覆盖 0`;promptPreview();toast('研究草稿已保存；不会派单或启动生图。');}catch(e){toast(e.message,'error');}finally{button.disabled=false;}};
// Research editor is retired from the user interface; no automatic draft load.

// Daily navigation changes presentation only; production admission remains unchanged.
function showTerminalPane(name){const focusProgress=name==='progress';if(focusProgress)name='graph';if(!['stats','graph','results','gpt'].includes(name))return;document.querySelectorAll('.terminal-pane').forEach(p=>p.hidden=p.id!=='pane-'+name);document.querySelectorAll('[data-pane]').forEach(b=>{b.classList.toggle('active',b.dataset.pane===name);if(b.dataset.pane===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});window.scrollTo(0,0);if(name==='stats')window.WorkbenchStats?.refresh();if(name==='graph')requestAnimationFrame(()=>{window.dispatchEvent(new Event('resize'));transform();if(focusProgress){$('#workflow-anchor').scrollIntoView({block:'nearest'});$('#workflow-anchor').focus({preventScroll:true});}});}
function renderTerminalSummary(){if(!state)return;}
document.addEventListener('click',e=>{const b=e.target.closest('[data-pane]');if(b)showTerminalPane(b.dataset.pane);});
document.addEventListener('DOMContentLoaded',()=>{$('#refresh-workbench').onclick=async()=>{const b=$('#refresh-workbench');b.disabled=true;try{await refresh();if(!$('#pane-stats').hidden)await window.WorkbenchStats?.refresh(true);}finally{b.disabled=false;}};const effects=$('#crt-effects');const setEffects=enabled=>{document.body.classList.toggle('crt-clean',!enabled);effects.setAttribute('aria-pressed',String(enabled));effects.textContent='CRT 纹理：'+(enabled?'开':'关');};setEffects(localStorage.getItem('linarchive-crt-effects')!=='off');effects.onclick=()=>{const on=effects.getAttribute('aria-pressed')!=='true';setEffects(on);localStorage.setItem('linarchive-crt-effects',on?'on':'off');};showTerminalPane('graph');if(state)renderTerminalSummary();});



