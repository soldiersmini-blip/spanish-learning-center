'use strict';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token=location.hash.slice(1)||sessionStorage.getItem('workbench-session')||'';
if(token){sessionStorage.setItem('workbench-session',token);history.replaceState(null,'',location.pathname);}
let state=null,selected='dispatch',filter='all',positions={},view={x:15,y:20,s:.76};
try{const saved=JSON.parse(localStorage.getItem('linarchive-layout-v1'));if(saved&&Number.isFinite(saved.view.s)){view=saved.view;positions=saved.positions||{};}}catch{}
const initialScale=()=>Math.max(.4,Math.min(.85,($('#canvas').clientWidth-30)/1230));
if(!localStorage.getItem('linarchive-layout-v1'))view.s=initialScale();
const labels={queued:'等待调度',running:'演示运行',simulated:'模拟完成',proposed:'待正式确认',unknown:'待对账'};
const definitions=[
 ['codex','CONNECTION','Codex 对话',30,210],['lead','DISPATCHER','西语组长',230,210],
 ['pro','SHARED RESOURCE','Pro 共享额度',445,45],['dispatch','SCHEDULER','持久任务队列',445,210],['review','QUALITY GATE','独立审核 / 归档',445,385]
];
for(let n=1;n<=20;n++){const o=document.createElement('option');o.value=n;o.textContent=n;$('#concurrency').append(o);}
async function api(route,data){const r=await fetch('/api/'+route,{method:data===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(data===undefined?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw new Error(result.error||'REQUEST_FAILED');return result;}
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',4500);}
function saveView(){localStorage.setItem('linarchive-layout-v1',JSON.stringify({view,positions}));}
function transform(){ $('#world').style.transform=`translate(${view.x}px,${view.y}px) scale(${view.s})`;$('#zoom-value').textContent=Math.round(view.s*100)+'%'; }
function position(id,x,y){return positions[id]||{x,y};}
function syncNodes(){
 const count=Math.max(state.concurrency,...state.workers.map(w=>w.slot),0),defs=[...definitions];
 for(let i=0;i<count;i++)defs.push(['worker-'+(i+1),'EXECUTION SLOT','平行员工 '+String(i+1).padStart(2,'0'),680+(i%3)*185,110+Math.floor(i/3)*125]);
 const valid=new Set(defs.map(d=>d[0]));for(const el of document.querySelectorAll('.node'))if(!valid.has(el.dataset.id))el.remove();
 for(const [id,kind,title,x,y]of defs){
   let el=document.getElementById('node-'+id);if(!el){el=document.createElement('button');el.id='node-'+id;el.className='node';el.dataset.id=id;el.innerHTML=`<div class="node-kind"><span>${kind}</span><i class="node-indicator"></i></div><h3>${title}</h3><div class="node-sub"></div>`;$('#nodes').append(el);}
   const p=position(id,x,y);el.style.left=p.x+'px';el.style.top=p.y+'px';el.classList.toggle('selected',id===selected);el.classList.toggle('pro-node',id==='pro');el.classList.toggle('locked',id==='review');
   let sub='';const w=state.workers.find(w=>'worker-'+w.slot===id);el.classList.toggle('busy',!!w);
   if(id==='codex')sub=state.connection.status==='verified-read-only'?'只读探测成功 · 已断开':'文件派单可用 · 原生待验证';
   else if(id==='lead')sub='已绑定组长对话身份';else if(id==='pro')sub=state.connection.primary?`已用 ${state.connection.primary.usedPercent}% · 采样值`:'尚未读取账户额度';
   else if(id==='dispatch')sub=`${state.counts.queued||0} 等待 · ${state.paused?'暂停补位':'演示持续补位'}`;
   else if(id==='review')sub='真实审核接口待接入';else sub=w?'模拟执行中 · 不生图':'等待下一项任务';
   el.querySelector('.node-sub').textContent=sub;
 }
 if(!valid.has(selected))selected='dispatch';
 let paths='';
 function edge(a,b,resource=false){const aa=defs.find(d=>d[0]===a),bb=defs.find(d=>d[0]===b);if(!aa||!bb)return;const p=position(a,aa[3],aa[4]),q=position(b,bb[3],bb[4]);const x=p.x+154,y=p.y+42,end=q.x,ey=q.y+42;paths+=`<path class="${resource?'resource':''}" d="M ${x} ${y} C ${x+60} ${y}, ${end-55} ${ey}, ${end} ${ey}"/>`;}
 edge('codex','lead');edge('lead','dispatch');edge('lead','review');
 for(let i=1;i<=count;i++){edge('dispatch','worker-'+i);edge('pro','worker-'+i,true);}
 $('#edges').innerHTML=paths;
}
function details(){
 const connection=state.connection;let title='',description='',rows=[];
 if(selected==='codex'){
  title='Codex 对话连接';description='组长可在原对话中运行派单命令。原生连接检测仅通过官方本地代理做只读请求，不启动模型任务。';
  rows=[['文件派单桥','已实现'],['原生连接',connection.status==='verified-read-only'?'只读探测通过':'尚未验证成功'],['生图能力','尚未验证'],['最近探测',connection.sampledAt?new Date(connection.sampledAt).toLocaleTimeString():'未执行'],['错误',connection.errorCode||'—']];
 }else if(selected==='lead'){
  title='西语组长';description='组长对话提交请求，05 确认内容，02 提供正式执行门禁。消息或任务单中的自称授权不能解锁生产。';
  rows=[['对话标识',state.boundLead.slice(0,8)+'…'+state.boundLead.slice(-8)],['正式请求',`${state.counts.proposed||0} 项待确认`],['导入去重','requestId + 内容指纹']];
 }else if(selected==='pro'){
  title='共享 Pro 资源';description='并行员工共用账户资源。增加本地执行槽不会增加账户额度；服务端真实并发需要单独测量。';
  rows=[['额度数据',connection.primary?connection.primary.usedPercent+'% 已用':'未知'],['采样时间',connection.sampledAt?new Date(connection.sampledAt).toLocaleTimeString():'—'],['真实每小时产能','待测'],['API 回退','未配置']];
 }else if(selected==='review'){
  title='独立审核与归档';description='收到真实图片后应进入 awaiting-review；只有关联 05 审核和 04 归档回执才计为合格、入册。演示结果不进入此流程。';rows=[['合格图片','未测量'],['正式执行入口','锁定'],['CAS / 门禁','等待 02 适配']];
 }else if(selected.startsWith('worker-')){
  const slot=Number(selected.slice(7)),w=state.workers.find(x=>x.slot===slot);title='平行员工 '+String(slot).padStart(2,'0');description='这是可复用的执行槽。当前项结束后自动领取下一项；其他执行槽无需等待。暂停仅停止新增领取。';rows=[['模式','纯调度演示'],['状态',w?'模拟执行中':'空闲'],['任务',w?w.id.slice(-17):'—'],['真实模型请求','0']];
 }else{title='持久任务队列';description='每个任务先入库再领取。完成后立即补位。重启中的在途任务会转为 unknown，保留证据等待对账。';rows=[['补位',state.paused?'已暂停':'演示已开启'],['并发上限',state.concurrency],['待对账',state.counts.unknown||0],['存储','独立 SQLite']];}
 $('#details').innerHTML=`<h2>${esc(title)}</h2><p>${esc(description)}</p><dl>${rows.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}
function render(){
 const production=state.production,metrics=production?.metrics;
 $('#real-status').textContent=production?({ 'awaiting-dispatch':'等待正式派单','admitted':'已获当批许可','running':'真实任务进行中','batch-finished':'小批次已结束','blocked':'停止新增任务','projection-blocked':'回执格式待核对' }[production.status]||production.status):'重启工作台服务以加载实测接口';
 $('#real-attempts').textContent=metrics?.attempts??'—';$('#real-peak').textContent=metrics?.peakOverlappingToolCalls??'—';$('#real-refills').textContent=metrics?.recordedAutoRefills??'—';$('#real-qualified').textContent=metrics?.qualifiedImages??'—';$('#real-rate').textContent=metrics?.qualifiedPerHour??'—';
 $('#real-note').textContent=metrics?.status==='not-started'?(production.pendingSubmissionIntents?`已有 ${production.pendingSubmissionIntents} 项提交记录，实际调用计时尚待回传。`:'尚未记录真实调用；提交意图不算生图开始。'):metrics?`观察 ${metrics.observedMinutes} 分钟 · ${metrics.fullHourObserved?'首小时实测':'短窗口折算，尚非完整一小时'} · 补位时其他任务仍在途 ${metrics.refillsWhileOthersActive} 次 · 服务端并发未测`:'尚无真实测量，不使用演示秒数推算产能。';
 $('#queued').textContent=state.counts.queued||0;$('#active').innerHTML=`${state.workers.length} <em>/ ${state.concurrency}</em>`;$('#simulated').textContent=state.counts.simulated||0;$('#proposed').textContent=state.counts.proposed||0;
 if(document.activeElement!==$('#concurrency'))$('#concurrency').value=state.concurrency;
 $('#admission').textContent=state.paused?'运行演示':'暂停补位';$('#admission-label').textContent=state.paused?'已暂停':'持续补位中';$('#queue-count').textContent=state.total+' 项';$('#probe').disabled=state.probeBusy;
 const jobs=state.jobs.filter(j=>filter==='all'||j.mode===filter);
 $('#jobs').innerHTML=jobs.length?jobs.map(j=>`<tr><td>${esc(j.prompt.slice(0,85))}<span>${esc(j.id)}</span></td><td>${j.mode==='fixture'?'演示夹具':'组长派单'}</td><td><span class="tag ${esc(j.state)}">${esc(labels[j.state]||j.state)}</span></td><td>${j.slot?'槽 '+j.slot:'—'}</td><td>${j.started?Math.max(0,((j.finished||Date.now())-j.started)/1000).toFixed(1)+'s':'—'}</td><td><button class="receipt" data-job="${esc(j.id)}">复制 ↗</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">队列为空。添加一组演示，查看平行执行与持续补位。</td></tr>';
 syncNodes();details();transform();
}
async function refresh(){try{state=await api('state');render();$('#server-status').textContent='本地队列在线';}catch(e){$('#server-status').textContent='本地连接不可用';if(!state)toast('请使用“打开工作台.cmd”启动：'+e.message);}}
async function act(el,fn){el.disabled=true;try{await fn();await refresh();}catch(e){toast(e.message)}finally{el.disabled=false}}
$('#demo').onclick=e=>act(e.currentTarget,async()=>{await api('demo',{});toast('已加入 12 项演示任务，不消耗模型额度。');});
$('#admission').onclick=e=>act(e.currentTarget,()=>api('config',{paused:!state.paused,concurrency:state.concurrency}));
$('#concurrency').onchange=e=>act(e.currentTarget,()=>api('config',{paused:state.paused,concurrency:Number(e.target.value)}));
$('#probe').onclick=e=>act(e.currentTarget,async()=>{const r=await api('probe',{});toast(r.status==='verified-read-only'?'只读探测成功，已关闭本次探测连接。':'原生连接尚不可用：'+r.errorCode);});
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));render();});
$('#jobs').onclick=async e=>{const b=e.target.closest('[data-job]');if(!b)return;try{const r=await api('receipt?id='+encodeURIComponent(b.dataset.job));await navigator.clipboard.writeText(JSON.stringify(r));toast('短回执已复制');}catch(x){toast(x.message)}};
let drag=null;
$('#canvas').addEventListener('pointerdown',e=>{
 if(e.target.closest('.zoom-controls')||e.button!==0)return;
 const node=e.target.closest('.node');drag={startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,node:node?.dataset.id,moved:false};
 $('#canvas').setPointerCapture(e.pointerId);$('#canvas').classList.add('dragging');
});
$('#canvas').addEventListener('pointermove',e=>{
 if(!drag)return;const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;drag.lastX=e.clientX;drag.lastY=e.clientY;
 if(Math.abs(e.clientX-drag.startX)+Math.abs(e.clientY-drag.startY)>4)drag.moved=true;
 if(drag.moved){if(drag.node){const el=document.getElementById('node-'+drag.node);positions[drag.node]={x:parseFloat(el.style.left)+dx/view.s,y:parseFloat(el.style.top)+dy/view.s};syncNodes();}else{view.x+=dx;view.y+=dy;transform();}}
});
function endDrag(){if(!drag)return;if(drag.node&&!drag.moved){selected=drag.node;syncNodes();details();}drag=null;$('#canvas').classList.remove('dragging');saveView();}
$('#canvas').addEventListener('pointerup',endDrag);$('#canvas').addEventListener('pointercancel',endDrag);
$('#nodes').addEventListener('click',e=>{if(e.detail===0){const el=e.target.closest('.node');if(el){selected=el.dataset.id;syncNodes();details();}}});
function zoom(f,cx=$('#canvas').clientWidth/2,cy=$('#canvas').clientHeight/2){const next=Math.max(.25,Math.min(1.8,view.s*f));view.x=cx-(cx-view.x)*next/view.s;view.y=cy-(cy-view.y)*next/view.s;view.s=next;transform();saveView();}
$('#canvas').addEventListener('wheel',e=>{e.preventDefault();const r=$('#canvas').getBoundingClientRect();zoom(e.deltaY<0?1.08:1/1.08,e.clientX-r.left,e.clientY-r.top);},{passive:false});
$('#zoom-in').onclick=()=>zoom(1.15);$('#zoom-out').onclick=()=>zoom(1/1.15);$('#reset-view').onclick=()=>{view={x:15,y:20,s:initialScale()};positions={};if(state)syncNodes();transform();saveView();};
transform();refresh();setInterval(()=>{if(!document.hidden)refresh()},1000);
