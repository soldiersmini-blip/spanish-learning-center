'use strict';
// Independent implementation of Project Graph's public interaction behavior.
(() => {
 const canvas=$('#canvas'),world=$('#world'),workspace=$('.workspace'),clone=v=>JSON.parse(JSON.stringify(v));
 if(!window.WORKBENCH_GRAPH_INLINE){const css=document.createElement('link');css.rel='stylesheet';css.href='/graph.css';document.head.append(css);}
 let selection=new Set(['dispatch']),edgeSelection=null,gesture=null,editor=null,menu=null,space=false,frame=0;
 const undoStack=[],redoStack=[],isPlan=()=>canvasMode==='plan',editable=id=>isPlan()&&draft.nodes.some(n=>n.id===id);
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 const toWorld=p=>({x:(p.x-view.x)/view.s,y:(p.y-view.y)/view.s}),toScreen=p=>({x:p.x*view.s+view.x,y:p.y*view.s+view.y});
 const overlay=document.createElement('div');overlay.className='graph-overlay';overlay.innerHTML='<svg class="gesture-svg"><path class="gesture-path"/></svg><div class="selection-box" hidden></div>';canvas.append(overlay);
 const preview=overlay.querySelector('path'),box=overlay.querySelector('.selection-box');
 const cutTip=document.createElement('i');cutTip.className='cut-tip';cutTip.hidden=true;overlay.append(cutTip);
 const bar=document.createElement('div');bar.className='graph-actions';bar.innerHTML='<span id="graph-save-status" role="status" aria-live="polite"></span><label class="graph-capacity">生图来源 <select id="graph-provider" aria-label="方案生图来源"><option value="pro">Pro 套餐</option><option value="api">API 额度</option></select></label><button id="graph-undo" class="quiet">↶ 撤销</button><button id="graph-redo" class="quiet">↷</button><button id="graph-fit" class="quiet">⤢ 聚焦</button><button id="graph-focus" class="quiet" aria-pressed="false">展开画布</button><button id="graph-help" class="quiet">操作速查 ?</button>';$('.canvas-toolbar').append(bar);updateGraphSaveStatus();
 const hint=document.createElement('div');hint.className='graph-hint';canvas.append(hint);
 const help=document.createElement('dialog');help.className='graph-help';help.innerHTML='<form method="dialog"><button class="quiet">关闭 ×</button></form><h2>Project Graph 连线操作</h2><dl><dt>框内右键拖到另一框</dt><dd>连接两张卡片，箭头从起点指向终点。中途经过的框不会被砍掉；松在空白处或原框上则取消，不创建新框。</dd><dt>框外右键划线</dt><dd>从空白或连线上起手即为切割，即使松在框内也仍是切割。命中高亮，松开一刀两段，Esc 取消，Ctrl+Z 撤销。</dd><dt>连线按钮</dt><dd>也可点“连线”，依次左键点起点和终点。</dd><dt>双击 / Enter</dt><dd>编辑卡片名称、数量或派单要求；空白双击选择类型再创建。</dd><dt>Tab / 反斜杠</dt><dd>在当前节点下创建子节点 / 按实际父节点创建同级节点。</dd><dt>拖到连线上</dt><dd>左键拖动单张卡片到两框之间的连线上，高亮后松开，自动改成“前框 → 当前框 → 后框”。保留箭头方向及原线文字，Ctrl+Z 一步还原连线和位置。</dd><dt>左键框选 / Shift 点击</dt><dd>多选；拖动选中卡片一起移动。</dd><dt>中键 / 空格＋左键 / F</dt><dd>平移 / 平移 / F 聚焦选中或全部。滚轮缩放。</dd><dt>Ctrl+C / Ctrl+V</dt><dd>复制 / 粘贴选中的草稿卡片，保留数量、要求和选中卡片之间的连线；粘贴后可整体拖动。</dd><dt>Delete / Ctrl+Z</dt><dd>删除选中内容 / 撤销；Ctrl+Shift+Z 重做。</dd><dt>编辑连线</dt><dd>双击连线修改文字；选中后 Delete 删除。</dd></dl><p>把本次要做的分支连接到执行节点；未连接的卡片只是草稿，不参与本次任务。连接不会自动耗费额度，点击右侧“执行此方案”才开始。实际同时生图仍受执行端当前上限约束。</p>';document.body.append(help);
 const vectors={left:{x:-1,y:0},right:{x:1,y:0},top:{x:0,y:-1},bottom:{x:0,y:1}},opposite={left:'right',right:'left',top:'bottom',bottom:'top'};
 function nodePos(id){const d=nodeDefs.find(n=>n[0]===id);return d?pos(id,d[3],d[4]):positions[id]||{x:0,y:0};}
 function rect(id){const p=nodePos(id),dot=draft.nodes.find(n=>n.id===id)?.type==='point';return {...p,w:dot?18:154,h:dot?18:(document.getElementById('node-'+id)?.offsetHeight||84)};}
 function anchor(id,side){const r=rect(id);return {x:r.x+(side==='left'?0:side==='right'?r.w:r.w/2),y:r.y+(side==='top'?0:side==='bottom'?r.h:r.h/2)};}
 function facing(id,p){const r=rect(id),dx=(p.x-r.x-r.w/2)/r.w,dy=(p.y-r.y-r.h/2)/r.h;return Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'top':'bottom';}
 function crosses(a,b,c,d){const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);return Math.max(a.x,b.x)>=Math.min(c.x,d.x)&&Math.max(c.x,d.x)>=Math.min(a.x,b.x)&&Math.max(a.y,b.y)>=Math.min(c.y,d.y)&&Math.max(c.y,d.y)>=Math.min(a.y,b.y)&&cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0;}
 function traceSide(id,points,enter=false){const r=rect(id),inside=p=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h,ps=enter?[...points].reverse():points;
  const borders=[['left',{x:r.x,y:r.y},{x:r.x,y:r.y+r.h}],['right',{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h}],['top',{x:r.x,y:r.y},{x:r.x+r.w,y:r.y}],['bottom',{x:r.x,y:r.y+r.h},{x:r.x+r.w,y:r.y+r.h}]];
  for(let i=1;i<ps.length;i++)if(inside(ps[i-1])&&!inside(ps[i])){const found=borders.find(([,a,b])=>crosses(ps[i-1],ps[i],a,b));if(found)return found[0];}
  return facing(id,ps.at(-1));
 }
 function edgePath(e){const a=anchor(e.from,e.sourceSide),b=anchor(e.to,e.targetSide),u=vectors[e.sourceSide]||vectors.right,v=vectors[e.targetSide]||vectors.left;
  const siblings=draft.edges.filter(x=>(x.from===e.from&&x.to===e.to)||(x.from===e.to&&x.to===e.from)),index=siblings.findIndex(x=>x.id===e.id),offset=(index-(siblings.length-1)/2)*45;
  const distance=Math.max(45,Math.min(160,Math.hypot(b.x-a.x,b.y-a.y)*.4)),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,sign=e.from<e.to?1:-1,nx=-dy/len*offset*sign,ny=dx/len*offset*sign;
  return 'M '+a.x+' '+a.y+' C '+(a.x+u.x*distance+nx)+' '+(a.y+u.y*distance+ny)+', '+(b.x+v.x*distance+nx)+' '+(b.y+v.y*distance+ny)+', '+b.x+' '+b.y;
 }
 function paintEdges(){const svg=$('#edges'),visible=new Set(nodeDefs.map(n=>n[0])),edges=draft.edges.filter(e=>visible.has(e.from)&&visible.has(e.to)),structure=JSON.stringify(edges);
  if(svg.dataset.structure!==structure){svg.innerHTML='<defs><marker id="graph-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="#a6c88b" stroke-width="1.5"/></marker></defs>'+edges.map(e=>'<path class="editable-edge" data-edge-id="'+esc(e.id)+'" data-from="'+esc(e.from)+'" data-to="'+esc(e.to)+'" marker-end="url(#graph-arrow)"/><text class="edge-label" data-edge-id="'+esc(e.id)+'">'+esc(e.label)+'</text>').join('');svg.dataset.structure=structure;}
  for(const el of svg.querySelectorAll('path[data-edge-id]')){const e=draft.edges.find(e=>e.id===el.dataset.edgeId);if(!nodeDefs.some(n=>n[0]===e.from)||!nodeDefs.some(n=>n[0]===e.to))continue;el.setAttribute('d',edgePath(e));const label=el.nextElementSibling,p=el.getPointAtLength(el.getTotalLength()/2);label.setAttribute('x',p.x);label.setAttribute('y',p.y-8);}
 }
 const hitNode=p=>nodeDefs.findLast(n=>{const q=rect(n[0]);return p.x>=q.x&&p.x<=q.x+q.w&&p.y>=q.y&&p.y<=q.y+q.h;})?.[0];
 function hitEdge(p){let best=null,distance=9/view.s;for(const el of $('#edges').querySelectorAll('path.editable-edge')){const len=el.getTotalLength();for(let i=0;i<=80;i++){const q=el.getPointAtLength(len*i/80),d=Math.hypot(p.x-q.x,p.y-q.y);if(d<distance){distance=d;best=el.dataset.edgeId;}}}return best;}
 function snapshot(){return {draft:clone(draft),positions:clone(positions),selection:[...selection],selected,edgeSelection};}
 function persist(){save();decorate();}
 function remember(before){if(JSON.stringify([before.draft,before.positions])!==JSON.stringify([draft,positions])){undoStack.push(before);if(undoStack.length>50)undoStack.shift();redoStack.length=0;}persist();}
 function repaint(){if(!state)return;syncNodes();details();planControls();decorate();}
 function mutate(fn){if(planBusy)return;const before=snapshot();fn();repaint();remember(before);}
 function restore(s){draft=clone(s.draft);positions=clone(s.positions);selection=new Set(s.selection);selected=s.selected;edgeSelection=s.edgeSelection;repaint();persist();}
 function history(redo=false){if(gesture||editor||planBusy)return;const source=redo?redoStack:undoStack,target=redo?undoStack:redoStack;if(!source.length)return;target.push(snapshot());restore(source.pop());}
 function select(id,add=false,animate=false){edgeSelection=null;if(add){selection.has(id)?selection.delete(id):selection.add(id);}else selection=new Set(id?[id]:[]);selected=selection.has(id)?id:([...selection].at(-1)||'dispatch');syncNodes();details(animate);planControls();decorate();}
 function enterPlan(){if(!state)return false;if(!isPlan()){canvasMode='plan';selection.clear();edgeSelection=null;connecting=false;repaint();save();}return true;}
 function decorate(){if(!state)return;const ids=new Set(nodeDefs.map(n=>n[0]));selection=new Set([...selection].filter(id=>ids.has(id)));
  for(const el of $('#nodes').children){const id=el.dataset.id,on=selection.has(id),n=draft.nodes.find(n=>n.id===id);el.classList.toggle('selected',on);el.setAttribute('aria-pressed',String(on));el.classList.toggle('connect-point',isPlan()&&n?.type==='point');el.title=isPlan()?'框内右键拖到另一框＝连接 · 框外右键划线＝切割':'';if(n&&el.querySelector('h3').textContent!==n.label)el.querySelector('h3').textContent=n.label;}
  for(const edge of $('#edges').querySelectorAll('[data-edge-id]'))edge.classList.toggle('edge-selected',edgeSelection===edge.dataset.edgeId);
  $('#graph-undo').disabled=!undoStack.length||!!gesture||!!editor||planBusy;$('#graph-redo').disabled=!redoStack.length||!!gesture||!!editor||planBusy;
  $('#remove-slot').disabled=planBusy||!isPlan()||![...selection].some(editable)&&!edgeSelection;
  $('#disconnect-slot').disabled=planBusy||!isPlan()||!draft.edges.some(e=>selection.has(e.to)||selection.has(e.from)||e.id===edgeSelection);
  $('#graph-provider').disabled=!isPlan()||planBusy;$('#graph-provider').value=draft.imageProvider||'pro';
  canvas.dataset.mode=canvasMode;canvas.classList.toggle('space-pan',space);canvas.classList.toggle('link-mode',connecting);
  $('.canvas-caption span').textContent=isPlan()?'左拖入线插入 · 框内右键连接 · 框外右键切割':'真实记录 · 中键 / 空格拖动 · F 聚焦';
  hint.textContent=isPlan()?(selection.size?'已选 '+selection.size+' 项 · ':'')+'框内右键拖连 · 框外右键切割 · ? 帮助':'查看真实记录 · 双击空白进入规划 · 中键 / 空格平移';
  if(editor)positionEditor();
 }
 function fit(all=false){if(gesture||!nodeDefs.length)return;const defs=!all&&selection.size?nodeDefs.filter(n=>selection.has(n[0])):nodeDefs;if(!defs.length)return;const rs=defs.map(n=>rect(n[0])),left=Math.min(...rs.map(p=>p.x)),top=Math.min(...rs.map(p=>p.y)),right=Math.max(...rs.map(p=>p.x+p.w)),bottom=Math.max(...rs.map(p=>p.y+p.h)),w=canvas.clientWidth,h=canvas.clientHeight;
  view.s=Math.max(.08,Math.min(1.25,(w-100)/(right-left),(h-130)/(bottom-top)));view.x=(w-(right-left)*view.s)/2-left*view.s;view.y=(h-(bottom-top)*view.s)/2-top*view.s;world.classList.toggle('instant',M.reduced);transform();save();
 }
 function createNode(p,type='card'){if(draft.nodes.length>=200){toast('当前画布最多 200 张卡片。');return null;}if(type==='execute'&&draft.nodes.some(n=>n.type==='execute')){toast('一张导图只需一个执行节点。');return null;}let n=1;while(draft.nodes.some(x=>x.id==='plan-'+n))n++;const id='plan-'+n;draft.nodes.push({id,label:type==='point'?'连接点':type==='execute'?'执行':'新节点 '+n,type});positions[id]={x:Math.round(p.x),y:Math.round(p.y)};return id;}
 function appendEdge(a,b,points){if(a===b||draft.edges.length>=500)return false;const pa=nodePos(a),pb=nodePos(b),sourceSide=points?traceSide(a,points):facing(a,{x:pb.x+77,y:pb.y+42}),targetSide=points?traceSide(b,points,true):facing(b,{x:pa.x+77,y:pa.y+42});draft.edges.push({id:'edge-'+crypto.randomUUID(),from:a,to:b,sourceSide,targetSide,label:''});return true;}
 function connectMany(sources,target,points){if(!isPlan()||planBusy)return;if(!sources.some(id=>id!==target)){toast('自环沿用 Project Graph 默认关闭。');return;}if(draft.edges.length+sources.filter(id=>id!==target).length>500){toast('当前画布最多 500 条连线。');return;}mutate(()=>{for(const source of sources)appendEdge(source,target,points);});}
 function grow(sources,p,points,type='card'){if(planBusy)return;if(draft.edges.length+sources.length>500){toast('当前画布最多 500 条连线。');return;}const before=snapshot(),target=createNode(type==='point'?{x:p.x-9,y:p.y-9}:p,type);if(!target)return;for(const source of sources){if(appendEdge(source,target,points)&&points){const e=draft.edges.at(-1);e.targetSide=opposite[e.sourceSide];}}selection=new Set([target]);selected=target;edgeSelection=null;repaint();remember(before);if(type!=='point')edit(target);return target;}
 function addAt(p){if(enterPlan())newNode(p);}
 function spawnChild(id,sibling=false){if(!enterPlan()||planBusy)return;let parent=id;if(sibling){const parents=[...new Set(draft.edges.filter(e=>e.to===id).map(e=>e.from))];if(parents.length!==1){toast(parents.length?'这个节点有多个父节点，无法确定同级关系。':'这个节点没有父节点，不能创建同级节点。');return;}parent=parents[0];}const p=nodePos(id);let q={x:sibling?p.x:p.x+240,y:sibling?p.y+130:p.y};while(nodeDefs.some(n=>{const x=nodePos(n[0]);return Math.abs(x.x-q.x)<170&&Math.abs(x.y-q.y)<100;}))q.y+=130;const next=grow([parent],q);if(next)fit();}
 function disconnect(){if(!isPlan())return;mutate(()=>{draft.edges=draft.edges.filter(e=>!selection.has(e.to)&&!selection.has(e.from)&&e.id!==edgeSelection);edgeSelection=null;});}
 function remove(){if(!isPlan())return;if(edgeSelection){mutate(()=>{draft.edges=draft.edges.filter(e=>e.id!==edgeSelection);edgeSelection=null;});return;}const ids=new Set([...selection].filter(editable));if(!ids.size){toast('正式数据节点不能删除，可自由修改它们在草稿中的连线。');return;}mutate(()=>{draft.nodes=draft.nodes.filter(n=>!ids.has(n.id));draft.edges=draft.edges.filter(e=>!ids.has(e.to)&&!ids.has(e.from));for(const id of ids)delete positions[id];selection.clear();selected='dispatch';});}
 function positionEditor(){if(!editor)return;let r;if(editor.edge){const path=[...$('#edges').querySelectorAll('path[data-edge-id]')].find(e=>e.dataset.edgeId===editor.id);if(!path)return;const p=toScreen(path.getPointAtLength(path.getTotalLength()/2)),c=canvas.getBoundingClientRect();r={left:c.left+p.x,top:c.top+p.y};}else r=document.getElementById('node-'+editor.id)?.getBoundingClientRect();if(!r)return;editor.el.style.left=Math.max(12,Math.min(innerWidth-280,r.left))+'px';editor.el.style.top=Math.max(12,Math.min(innerHeight-90,r.top+22))+'px';}
 function finishEdit(commit){if(!editor)return;const e=editor;editor=null;const name=e.input.value.trim();e.el.remove();if(commit&&(name||e.edge)&&name!==e.old)mutate(()=>{const n=(e.edge?draft.edges:draft.nodes).find(n=>n.id===e.id);if(n)n.label=name.slice(0,80);});canvas.focus({preventScroll:true});decorate();}
 function edit(id,edge=false){if(!edge){editNode(id);return;}if(!isPlan()||planBusy||!edge&&!editable(id))return;finishEdit(true);const n=(edge?draft.edges:draft.nodes).find(n=>n.id===id);if(!n)return;const el=document.createElement('div');el.className='graph-editor';el.innerHTML='<input maxlength="80" aria-label="'+(edge?'连线文字':'卡片名称')+'"><small>Enter 保存 · Esc 取消</small>';document.body.append(el);const input=el.querySelector('input');input.value=n.label;editor={id,edge,el,input,old:n.label};positionEditor();input.focus();input.select();input.addEventListener('keydown',e=>{if(e.isComposing)return;if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();e.stopPropagation();finishEdit(e.key==='Enter');}});input.addEventListener('blur',()=>finishEdit(true));decorate();}
 const nodeDialog=document.createElement('dialog');nodeDialog.className='plan-node-dialog';nodeDialog.innerHTML='<form id="plan-node-form"><h2 id="plan-node-heading">编辑执行槽</h2><label>卡片名称<input id="plan-node-name" required maxlength="80" placeholder="自己命名，例如：厨房用品配图"></label><div id="plan-batch-fields"><label>数量（张）<input id="plan-batch-size" type="number" min="1" max="1000" step="1" placeholder="例如 50"></label><p>只填写本卡的图片数量。连线 A → B 表示 A 完成后开始 B；汇合处等待所有前置卡完成。</p></div><div id="plan-user-fields" hidden><label>派单要求<textarea id="plan-user-request" rows="5" maxlength="4000" placeholder="填写要画的内容、风格、用途及需要避免的问题"></textarea></label><p>连线到批次卡片决定数量和先后顺序；自动取词时，执行前按最新缺图队列冻结名单。</p></div><p id="plan-node-error" role="alert"></p><div class="node-dialog-actions"><button type="button" id="plan-node-cancel" class="quiet">取消</button><button type="submit" class="primary">保存卡片</button></div></form>';document.body.append(nodeDialog);let nodeEditingId=null,nodeNewPosition=null;const vocabulary=window.WorkbenchVocabulary.mount($('#plan-user-fields'));
 function nodeTypeFields(){const type=draft.nodes.find(n=>n.id===nodeEditingId)?.type;nodeDialog.classList.toggle('user-order-dialog',type==='user-order');$('#plan-batch-fields').hidden=type!=='card';$('#plan-user-fields').hidden=type!=='user-order';$('#plan-user-request').required=type==='user-order';}
 function newNode(p){
  if(planBusy||draft.nodes.length>=200){toast('当前画布最多 200 张卡片。');return;}
  closeMenu();const m=document.createElement('div');m.className='graph-menu node-add-menu';m.setAttribute('role','menu');m.setAttribute('aria-label','添加节点');
  const heading=document.createElement('div');heading.className='node-add-heading';heading.textContent='添加节点';m.append(heading);
  const options=[['card','计划执行槽','设置图片数量','▤'],['user-order','用户派单','填写内容与画面要求','↗'],['point','连接点','整理连线走向','◇'],...(!draft.nodes.some(n=>n.type==='execute')?[['execute','执行','只执行连接到这里的分支','▶']]:[])];
  for(const [type,name,description,icon]of options){const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.dataset.nodeType=type;b.innerHTML='<span class="node-type-symbol" aria-hidden="true">'+icon+'</span><span class="node-type-copy"><b>'+name+'</b><small>'+description+'</small></span>';b.onmouseenter=()=>b.focus({preventScroll:true});b.onclick=()=>{closeMenu();if(!isPlan()||planBusy)return;mutate(()=>{const id=createNode(type==='point'?{x:p.x-9,y:p.y-9}:p,type),n=draft.nodes.find(n=>n.id===id);if(!n)return;n.label=name;if(type==='user-order')n.requestText='';selection=new Set([id]);selected=id;edgeSelection=null;});canvas.focus({preventScroll:true});};m.append(b);}
  const foot=document.createElement('div');foot.className='node-add-foot';foot.textContent='↑ ↓ 选择 · Enter 添加 · Esc 取消';m.append(foot);document.body.append(m);menu=m;
  const screen=toScreen(p),r=canvas.getBoundingClientRect();m.style.left=Math.max(8,Math.min(innerWidth-m.offsetWidth-8,r.left+screen.x+4))+'px';m.style.top=Math.max(8,Math.min(innerHeight-m.offsetHeight-8,r.top+screen.y+4))+'px';m.querySelector('button').focus({preventScroll:true});
  m.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();m.querySelector('button:focus')?.click();return;}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeMenu();canvas.focus({preventScroll:true});}if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();const buttons=[...m.querySelectorAll('button')],i=buttons.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length;buttons[next].focus({preventScroll:true});}};
 }

 function editNode(id){const n=draft.nodes.find(n=>n.id===id);if(!n||!isPlan()||planBusy)return;nodeEditingId=id;nodeNewPosition=null;$('#plan-node-heading').textContent='编辑卡片';$('#plan-user-request').value=n.requestText||'';$('#plan-node-name').value=n.label;$('#plan-batch-size').value=n.batchSize||'';if(n.type==='user-order')vocabulary.open(n.vocabularyScope,!n.requestText,window.WorkbenchPlanFlow.derive(draft).vocabularyDemands.find(d=>d.nodeId===id)?.required||0);nodeTypeFields();$('#plan-node-error').textContent='';nodeDialog.showModal();$('#plan-node-name').focus();$('#plan-node-name').select();}
 $('#plan-node-cancel').onclick=()=>nodeDialog.close();
 $('#plan-node-form').onsubmit=e=>{e.preventDefault();const existing=draft.nodes.find(n=>n.id===nodeEditingId),type=existing?.type,name=$('#plan-node-name').value.trim(),requestText=$('#plan-user-request').value.trim();if(planBusy||(!existing&&!nodeNewPosition)){nodeDialog.close();return;}if(!name||type==='user-order'&&!requestText){$('#plan-node-error').textContent='请填写名称和派单要求。';return;}let scope=null;try{if(type==='user-order')scope=vocabulary.read();}catch(err){$('#plan-node-error').textContent=err.message;return;}const size=type==='card'?$('#plan-batch-size').value:'';mutate(()=>{const newId=existing?existing.id:createNode(nodeNewPosition,type);const n=draft.nodes.find(n=>n.id===newId);if(!n)return;n.label=name;n.type=type;delete n.batchOrder;delete n.batchSize;delete n.requestText;delete n.vocabularyScope;if(size)n.batchSize=Number(size);if(type==='user-order'){n.requestText=requestText;if(scope)n.vocabularyScope=scope;}selection=new Set([n.id]);selected=n.id;edgeSelection=null;});nodeDialog.close();};
 nodeDialog.addEventListener('close',()=>{vocabulary.close();canvas.focus({preventScroll:true});});
 document.addEventListener('click',e=>{const button=e.target.closest('[data-edit-plan-node]');if(button)editNode(button.dataset.editPlanNode);});
 function closeMenu(){menu?.remove();menu=null;}
 function context(e,id,p){closeMenu();const m=document.createElement('div');m.className='graph-menu';m.setAttribute('role','menu');const actions=[],add=(text,key,fn,disabled=false)=>actions.push({text,key,fn,disabled});
  if(id&&isPlan()){add('新增子节点','Tab',()=>spawnChild(id));add('新增同级节点','\\',()=>spawnChild(id,true));if(editable(id))add('编辑卡片 / 批次','Enter',()=>edit(id));add('断开选中节点的连线','',disconnect);if(editable(id))add('删除选中草稿卡片','Del',remove);}
  else if(edgeSelection){add('编辑连线文字','Enter',()=>edit(edgeSelection,true));add('反向连线','',()=>mutate(()=>{const x=draft.edges.find(x=>x.id===edgeSelection);if(x){[x.from,x.to]=[x.to,x.from];[x.sourceSide,x.targetSide]=[x.targetSide,x.sourceSide];}}));add('删除这条连线','Del',remove);}
  else if(!id)add('在这里新建卡片','双击',()=>addAt(p));
  add('聚焦选中 / 全部','F',()=>fit());add('撤销','Ctrl+Z',()=>history(),!undoStack.length);add('重做','Ctrl+Shift+Z',()=>history(true),!redoStack.length);
  for(const a of actions){const b=document.createElement('button');b.setAttribute('role','menuitem');b.disabled=a.disabled;b.innerHTML='<span>'+esc(a.text)+'</span><kbd>'+esc(a.key)+'</kbd>';b.onclick=()=>{closeMenu();a.fn();};m.append(b);}document.body.append(m);m.style.left=Math.max(8,Math.min(innerWidth-m.offsetWidth-8,e.clientX))+'px';m.style.top=Math.max(8,Math.min(innerHeight-m.offsetHeight-8,e.clientY))+'px';menu=m;m.querySelector('button:not(:disabled)')?.focus();m.onkeydown=e=>{if(e.key==='Escape'){closeMenu();canvas.focus();}if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const buttons=[...m.querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(document.activeElement);buttons[(i+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length].focus();}};
 }
 let cardClipboard=null,pasteCount=0;
 function copyCards(){
  const nodes=draft.nodes.filter(n=>selection.has(n.id));if(!isPlan()||!nodes.length){toast('请选择自己创建的卡片再复制。');return;}
  const ids=new Set(nodes.map(n=>n.id));cardClipboard=clone({nodes,edges:draft.edges.filter(e=>ids.has(e.from)&&ids.has(e.to)),positions:Object.fromEntries(nodes.map(n=>[n.id,nodePos(n.id)]))});pasteCount=0;toast('已复制 '+nodes.length+' 张卡片，Ctrl+V 粘贴。');
 }
 function pasteCards(){
  if(!cardClipboard||!enterPlan())return;const c=cardClipboard;if(c.nodes.some(n=>n.type==='execute')&&draft.nodes.some(n=>n.type==='execute')){toast('一张导图只需一个执行节点。');return;}if(draft.nodes.length+c.nodes.length>200||draft.edges.length+c.edges.length>500){toast('粘贴后超过画布上限（200 张卡片、500 条连线）。');return;}
  const xs=c.nodes.map(n=>c.positions[n.id].x),ys=c.nodes.map(n=>c.positions[n.id].y),left=Math.min(...xs),top=Math.min(...ys),right=Math.max(...xs)+154,bottom=Math.max(...ys)+92;
  const offset=36*(++pasteCount)/view.s,center=toWorld({x:canvas.clientWidth/2,y:canvas.clientHeight/2});let dx=offset,dy=offset;const target=toScreen({x:left+offset,y:top+offset});if(target.x<0||target.y<0||target.x+154*view.s>canvas.clientWidth||target.y+92*view.s>canvas.clientHeight){dx=center.x-(left+right)/2;dy=center.y-(top+bottom)/2;}
  mutate(()=>{const ids=new Map();for(const source of c.nodes){const p=c.positions[source.id],id=createNode({x:p.x+dx,y:p.y+dy},source.type);ids.set(source.id,id);Object.assign(draft.nodes.find(n=>n.id===id),clone(source),{id});}for(const edge of c.edges)draft.edges.push({...clone(edge),id:'edge-'+crypto.randomUUID(),from:ids.get(edge.from),to:ids.get(edge.to)});selection=new Set(ids.values());selected=[...selection][0];edgeSelection=null;});toast('已粘贴 '+c.nodes.length+' 张卡片。');
 }
 function cutHits(a,b){const edges=new Set(),nodes=new Set();for(const el of $('#edges').querySelectorAll('path.editable-edge')){const len=el.getTotalLength();let prev=el.getPointAtLength(0);for(let i=1;i<=80;i++){const next=el.getPointAtLength(len*i/80);if(crosses(a,b,prev,next))edges.add(el.dataset.edgeId);prev=next;}}for(const n of draft.nodes){const r=rect(n.id),p=[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}];const inside=q=>q.x>=r.x&&q.x<=r.x+r.w&&q.y>=r.y&&q.y<=r.y+r.h;if(inside(a)||inside(b)||p.some((x,i)=>crosses(a,b,x,p[(i+1)%4])))nodes.add(n.id);}for(const e of draft.edges)if(nodes.has(e.from)||nodes.has(e.to))edges.add(e.id);return {edges,nodes};}
 function cutPath(a,b){const hit=cutHits(a,b);if(hit.edges.size||hit.nodes.size){cutEffect(hit,a,b);mutate(()=>{draft.edges=draft.edges.filter(e=>!hit.edges.has(e.id)&&!hit.nodes.has(e.from)&&!hit.nodes.has(e.to));draft.nodes=draft.nodes.filter(n=>!hit.nodes.has(n.id));for(const id of hit.nodes)delete positions[id];edgeSelection=null;selection.clear();selected='dispatch';});}}
 // Clip a rectangle against either side of the actual blade, including diagonal cuts.
 function bladeHalf(w,h,a,b,sign){
  const polygon=[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}],out=[];
  const side=p=>sign*((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x));
  for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length],sp=side(p),sq=side(q);if(sp>=0)out.push(p);if((sp>=0)!==(sq>=0)){const t=sp/(sp-sq);out.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});}}
  return out.length>=3?'polygon('+out.map(p=>p.x+'px '+p.y+'px').join(',')+')':null;
 }
 function cutEffect(hit,a,b){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,p=toScreen(a),q=toScreen(b),length=Math.hypot(q.x-p.x,q.y-p.y)||1,normal={x:-(q.y-p.y)/length,y:(q.x-p.x)/length};
  const layer=document.createElement('div');layer.className='cut-effects';layer.setAttribute('aria-hidden','true');overlay.append(layer);
  const animate=(el,sign,rotate=0)=>{const frames=reduced?[{opacity:1},{opacity:0}]:[{opacity:1,transform:'translate(0,0) rotate(0deg)'},{offset:.55,opacity:.9,transform:'translate('+normal.x*sign*22+'px,'+(normal.y*sign*22+5)+'px) rotate('+rotate+'deg)'},{opacity:0,transform:'translate('+normal.x*sign*38+'px,'+(normal.y*sign*38+14)+'px) rotate('+rotate*1.6+'deg)'}];const animation=el.animate(frames,{duration:reduced?90:480,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});animation.finished.catch(()=>{}).finally(()=>el.remove());};
  for(const id of [...hit.nodes].slice(0,24)){
   const src=document.getElementById('node-'+id);if(!src)continue;const r=rect(id),origin=toScreen(r),w=r.w*view.s,h=r.h*view.s,localA={x:p.x-origin.x,y:p.y-origin.y},localB={x:q.x-origin.x,y:q.y-origin.y};
   for(const sign of [-1,1]){const clip=bladeHalf(w,h,localA,localB,sign);if(!clip)continue;const half=document.createElement('div');half.className='cut-node-half';half.dataset.half=String(sign);Object.assign(half.style,{left:origin.x+'px',top:origin.y+'px',width:w+'px',height:h+'px',clipPath:clip});const content=src.cloneNode(true);content.removeAttribute('id');content.removeAttribute('data-id');content.classList.remove('selected','cut-warning','link-target');content.setAttribute('tabindex','-1');for(const el of content.querySelectorAll('[id]'))el.removeAttribute('id');Object.assign(content.style,{left:'0',top:'0',width:r.w+'px',height:r.h+'px',margin:'0',transform:'scale('+view.s+')',transformOrigin:'0 0',transition:'none'});half.append(content);
    const seam=document.createElementNS('http://www.w3.org/2000/svg','svg');seam.classList.add('cut-seam');const line=document.createElementNS(seam.namespaceURI,'line');const dx=(q.x-p.x)/length*3000,dy=(q.y-p.y)/length*3000;for(const [name,value]of Object.entries({x1:localA.x-dx,y1:localA.y-dy,x2:localA.x+dx,y2:localA.y+dy}))line.setAttribute(name,value);seam.append(line);half.append(seam);layer.append(half);animate(half,sign,sign*4);
   }
  }
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('cut-edge-ghost');const group=document.createElementNS(svg.namespaceURI,'g');group.setAttribute('transform','translate('+view.x+' '+view.y+') scale('+view.s+')');svg.append(group);
  const paths=new Map([...$('#edges').querySelectorAll('path.editable-edge')].map(el=>[el.dataset.edgeId,el]));for(const id of [...hit.edges].slice(0,40)){const src=paths.get(id);if(!src)continue;const line=document.createElementNS(svg.namespaceURI,'path');line.setAttribute('d',src.getAttribute('d'));group.append(line);}
  for(const sign of [-1,1]){const clip=bladeHalf(canvas.clientWidth,canvas.clientHeight,p,q,sign);if(!clip)continue;const half=svg.cloneNode(true);half.style.clipPath=clip;layer.append(half);animate(half,sign);}
  setTimeout(()=>layer.remove(),550);
 }
 // Single-card drag insertion only; preserve other connections and the original arrow direction.
 function insertionEdge(g){
  if(!isPlan()||!g.moved||Object.keys(g.origins).length!==1||draft.edges.length>=500)return null;
  const r=rect(g.id),inset=Math.min(6/view.s,r.w/4,r.h/4),center={x:r.x+r.w/2,y:r.y+r.h/2};let best=null,distance=Infinity;
  for(const el of $('#edges').querySelectorAll('path.editable-edge')){
   const e=draft.edges.find(e=>e.id===el.dataset.edgeId);if(!e||e.from===g.id||e.to===g.id)continue;
   // Dropping over an endpoint is moving a card, not inserting into the wire's middle.
   if([e.from,e.to].some(id=>{const q=rect(id);return r.x<q.x+q.w&&r.x+r.w>q.x&&r.y<q.y+q.h&&r.y+r.h>q.y;}))continue;
   const length=el.getTotalLength();for(let i=1;i<80;i++){const p=el.getPointAtLength(length*i/80);if(p.x<r.x+inset||p.x>r.x+r.w-inset||p.y<r.y+inset||p.y>r.y+r.h-inset)continue;const d=Math.hypot(p.x-center.x,p.y-center.y);if(d<distance){best=e.id;distance=d;}}
  }return best;
 }
 function previewInsertion(g){
  g.insertEdge=insertionEdge(g);for(const el of $('#edges').querySelectorAll('path.editable-edge'))el.classList.toggle('insert-target',el.dataset.edgeId===g.insertEdge);
  for(const el of $('#nodes').children)el.classList.toggle('insert-node',!!g.insertEdge&&el.dataset.id===g.id);
  if(g.insertEdge)hint.textContent='松开插入连线：前框 → 当前框 → 后框 · Esc 取消';
 }
 function commitInsertion(g){
  if(!g.insertEdge||draft.edges.length>=500)return false;const index=draft.edges.findIndex(e=>e.id===g.insertEdge);if(index<0)return false;const edge=draft.edges[index];if(edge.from===g.id||edge.to===g.id)return false;
  const first={...edge,id:'edge-'+crypto.randomUUID(),to:g.id,targetSide:facing(g.id,anchor(edge.from,edge.sourceSide))};
  const second={...edge,id:'edge-'+crypto.randomUUID(),from:g.id,sourceSide:facing(g.id,anchor(edge.to,edge.targetSide)),label:''};
  draft.edges.splice(index,1,first,second);edgeSelection=null;selected=g.id;selection=new Set([g.id]);return true;
 }
 function showGesture(){frame=0;if(!gesture)return;const g=gesture;
  if(g.kind==='move'){paintPositions();previewInsertion(g);}else if(g.kind==='pan')transform();
  else if(g.kind==='box'){const l=Math.min(g.start.x,g.last.x),t=Math.min(g.start.y,g.last.y);box.hidden=false;Object.assign(box.style,{left:l+'px',top:t+'px',width:Math.abs(g.last.x-g.start.x)+'px',height:Math.abs(g.last.y-g.start.y)+'px'});const a=toWorld({x:l,y:t}),b=toWorld({x:Math.max(g.start.x,g.last.x),y:Math.max(g.start.y,g.last.y)});selection=new Set(g.baseSelection);for(const n of nodeDefs){const p=rect(n[0]);if(p.x+p.w>=a.x&&p.x<=b.x&&p.y+p.h>=a.y&&p.y<=b.y)selection.add(n[0]);}decorate();}
  else if(g.kind==='link'){const q=g.last,target=hitNode(toWorld(q));for(const el of $('#nodes').children)el.classList.toggle('link-target',el.dataset.id===target&&!g.sources.includes(target));preview.setAttribute('d',g.sources.map(id=>{const p=toScreen(anchor(id,traceSide(id,g.points)));return 'M'+p.x+','+p.y+' L'+q.x+','+q.y;}).join(' '));preview.classList.remove('cut');hint.textContent=target&&!g.sources.includes(target)?'松开连接到此卡片 · Esc 取消':'从框内拖到另一个框连接 · 松在空白处取消';}
  else if(g.kind==='cut'){preview.setAttribute('d','M'+g.start.x+','+g.start.y+' L'+g.last.x+','+g.last.y);preview.classList.add('cut');cutTip.hidden=false;cutTip.style.transform='translate('+g.last.x+'px,'+g.last.y+'px)';const hit=cutHits(g.worldStart,toWorld(g.last));for(const el of $('#edges').querySelectorAll('path.editable-edge'))el.classList.toggle('cut-warning',hit.edges.has(el.dataset.edgeId));for(const el of $('#nodes').children)el.classList.toggle('cut-warning',hit.nodes.has(el.dataset.id));hint.textContent='松开砍掉 '+hit.edges.size+' 条线、'+hit.nodes.size+' 个框 · Esc 取消 · Ctrl+Z 撤销';}
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(showGesture);}
 function clearGesture(){if(frame)cancelAnimationFrame(frame);frame=0;const g=gesture;gesture=null;drag=null;box.hidden=true;cutTip.hidden=true;preview.setAttribute('d','');canvas.classList.remove('dragging','is-linking');for(const el of canvas.querySelectorAll('.cut-warning,.link-target,.insert-target,.insert-node'))el.classList.remove('cut-warning','link-target','insert-target','insert-node');if(g&&canvas.hasPointerCapture(g.pointerId))canvas.releasePointerCapture(g.pointerId);decorate();return g;}
 function cancel(){const g=clearGesture();if(g?.kind==='move')restore(g.before);else if(g?.kind==='box'){selection=new Set(g.before.selection);repaint();}space=false;connecting=false;linkSource=null;closeMenu();decorate();}
 canvas.addEventListener('pointerdown',e=>{
  if(!state||gesture||e.target.closest('.zoom-controls')||e.button>2||planBusy)return;closeMenu();finishEdit(true);canvas.focus({preventScroll:true});
  const mat=new DOMMatrix(getComputedStyle(world).transform);view={x:mat.e,y:mat.f,s:mat.a};world.classList.add('instant');transform();
  const p=point(e),id=e.target.closest('.node')?.dataset.id,edge=e.target.closest('[data-edge-id]');
  if(e.button===0&&connecting&&!space){e.preventDefault();if(id&&!linkSource){linkSource=id;toast('点击任意目标卡片完成有向连线。');}else if(linkSource&&id){connectMany([linkSource],id);connecting=false;linkSource=null;}planControls();decorate();return;}
  const before=snapshot();let kind;
  if(e.button===1||space&&e.button===0)kind='pan';
  else if(e.button===2){enterPlan();connecting=false;linkSource=null;if(id&&!nodeDefs.some(n=>n[0]===id)){e.preventDefault();return;}kind=id?'link':'cut';}
  else if(edge){selection.clear();edgeSelection=edge.dataset.edgeId;selected='dispatch';repaint();e.preventDefault();return;}
  else if(id){if(e.shiftKey||e.ctrlKey||e.metaKey){select(id,true);e.preventDefault();return;}if(!selection.has(id))select(id,false,true);kind='move';}
  else{kind='box';if(!e.shiftKey){selection.clear();edgeSelection=null;}}
  const origins=Object.fromEntries([...selection].map(n=>[n,{...nodePos(n)}]));
  gesture={kind,id,sources:id?(selection.has(id)?[...selection]:[id]):[],pointerId:e.pointerId,start:p,last:p,worldStart:toWorld(p),moved:false,before,origins,baseSelection:[...selection],points:[toWorld(p)]};drag={id:kind==='move'?id:null};canvas.classList.add('dragging');canvas.classList.toggle('is-linking',kind==='link'||kind==='cut');canvas.setPointerCapture(e.pointerId);e.preventDefault();decorate();
 });
 canvas.addEventListener('pointermove',e=>{const g=gesture;if(!g||g.pointerId!==e.pointerId)return;const p=point(e),dx=p.x-g.last.x,dy=p.y-g.last.y;g.last=p;
  if(Math.hypot(p.x-g.start.x,p.y-g.start.y)>4)g.moved=true;if(!g.moved)return;
  if(g.kind==='move'){const delta={x:(p.x-g.start.x)/view.s,y:(p.y-g.start.y)/view.s};for(const [id,q]of Object.entries(g.origins))positions[id]={x:q.x+delta.x,y:q.y+delta.y};}
  else if(g.kind==='pan'){view.x+=dx;view.y+=dy;}
  else if(g.kind==='link'){const q=toWorld(p),last=g.points.at(-1);if(Math.hypot(q.x-last.x,q.y-last.y)>2)g.points.push(q);if(g.points.length>512)g.points.splice(1,1);}
  schedule();
 });
 canvas.addEventListener('pointerup',e=>{if(!gesture||gesture.pointerId!==e.pointerId)return;showGesture();const g=clearGesture(),p=toWorld(point(e));
  if(g.kind==='move'){if(g.moved){const inserted=commitInsertion(g);if(inserted)repaint();remember(g.before);if(inserted)toast('已插入连线，Ctrl+Z 可一步撤销。');}else{selected=g.id;details(true);}}
  else if(g.kind==='link'&&g.moved){const target=hitNode(p);if(target&&!g.sources.includes(target))connectMany(g.sources,target,g.points);}
  else if(g.kind==='cut'&&g.moved)cutPath(g.worldStart,p);
  else if(g.kind==='box'){selected=[...selection].at(-1)||'dispatch';details(true);}
  if(g.kind==='pan')save();decorate();
 });
 // Gesture kind is fixed at pointerdown: cards connect, outside cuts.
 canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',()=>{if(gesture)cancel();});window.addEventListener('blur',cancel);canvas.addEventListener('contextmenu',e=>e.preventDefault());
 // Chromium retargets double clicks after pointer capture: hit-test world coordinates.
 canvas.addEventListener('dblclick',e=>{if(e.button!==0||space||e.target.closest('.zoom-controls'))return;const p=toWorld(point(e)),id=hitNode(p),edge=isPlan()?hitEdge(p):null;if(id){if(id==='codex')window.WorkbenchConversations?.open(document.getElementById('node-codex'));else if(editable(id))edit(id);}else if(edge){edgeSelection=edge;selection.clear();edit(edge,true);}else addAt(p);});
 let middleAt=0;canvas.addEventListener('auxclick',e=>{if(e.button!==1)return;e.preventDefault();if(Date.now()-middleAt<350)fit();middleAt=Date.now();});
 $('#nodes').onclick=e=>{if(e.detail===0){const id=e.target.closest('.node')?.dataset.id;if(id)select(id,e.shiftKey||e.ctrlKey);}};
 canvas.addEventListener('wheel',e=>{e.preventDefault();if(gesture||editor)return;const p=point(e);if(e.ctrlKey&&!e.metaKey){view.y-=e.deltaY;world.classList.add('instant');transform();save();}else if(e.shiftKey){view.x-=e.deltaY;world.classList.add('instant');transform();save();}else zoom(Math.exp(-Math.max(-100,Math.min(100,e.deltaY))*.002),p.x,p.y);},{passive:false});
 window.addEventListener('resize',closeMenu);
 document.addEventListener('pointerdown',e=>{if(menu&&!menu.contains(e.target)&&!canvas.contains(e.target))closeMenu();},true);
 document.addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea,select,[contenteditable="true"]')||e.isComposing||help.open||menu)return;
  if(!canvas.contains(document.activeElement)&&!workspace.contains(document.activeElement))return;const mod=e.ctrlKey||e.metaKey;
  if(mod&&!e.altKey&&['c','v'].includes(e.key.toLowerCase())){if(gesture||editor||planBusy||document.querySelector('dialog[open]'))return;e.preventDefault();if(e.key.toLowerCase()==='c')copyCards();else pasteCards();return;}
  if(e.key==='Escape'){e.preventDefault();cancel();selection.clear();edgeSelection=null;repaint();return;}
  if(e.code==='Space'){e.preventDefault();space=true;decorate();return;}
  if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();history(e.shiftKey);return;}
  if(mod&&e.key.toLowerCase()==='y'){e.preventDefault();history(true);return;}
  if(mod&&e.key.toLowerCase()==='a'){e.preventDefault();selection=new Set(nodeDefs.map(n=>n[0]));edgeSelection=null;repaint();return;}
  if(e.key.toLowerCase()==='f'&&!mod){e.preventDefault();fit();return;}
  if(e.key==='?'||e.key==='F1'){e.preventDefault();help.showModal();return;}
  if(e.key==='Enter'&&!mod&&edgeSelection){e.preventDefault();edit(edgeSelection,true);return;}
  if(e.key==='Enter'&&!mod&&selection.size===1&&editable(selected)){e.preventDefault();edit(selected);return;}
  if(['Delete','Backspace'].includes(e.key)){e.preventDefault();remove();return;}
  if(e.key==='Tab'&&!e.shiftKey&&selection.size===1&&isPlan()){e.preventDefault();spawnChild([...selection][0]);return;}
  if(e.key==='\\'&&selection.size===1&&isPlan()){e.preventDefault();spawnChild([...selection][0],true);}
 });
 document.addEventListener('keyup',e=>{if(e.code==='Space'){space=false;decorate();}});
 $('#add-slot').onclick=()=>addAt(toWorld({x:canvas.clientWidth/2,y:canvas.clientHeight/2}));
 $('#remove-slot').onclick=remove;$('#disconnect-slot').onclick=disconnect;
 $('#canvas-mode').onchange=e=>{cancel();finishEdit(true);canvasMode=e.target.value;selection=new Set(['dispatch']);selected='dispatch';edgeSelection=null;repaint();save();};
 $('#link-slots').onclick=()=>{connecting=!connecting;linkSource=null;planControls();decorate();canvas.focus({preventScroll:true});};
 $('#graph-provider').onchange=e=>{const provider=e.target.value;if(['pro','api'].includes(provider))mutate(()=>draft.imageProvider=provider);};
 $('#graph-undo').onclick=()=>history();$('#graph-redo').onclick=()=>history(true);$('#graph-fit').onclick=()=>fit();$('#reset-view').onclick=()=>fit(true);$('#reset-view').title='显示全部内容，不重置布局';
 $('#graph-focus').onclick=()=>{const on=workspace.classList.toggle('graph-expanded');document.body.classList.toggle('graph-expanded-page',on);$('#graph-focus').textContent=on?'收起画布':'展开画布';$('#graph-focus').setAttribute('aria-pressed',String(on));requestAnimationFrame(()=>fit(true));};
 $('#graph-help').onclick=()=>help.showModal();help.addEventListener('close',()=>canvas.focus());
 window.WorkbenchGraph={decorate,fit,history,paintEdges,editNode,newNode,assignVocabulary:(scope,targetId)=>{if(planBusy||!enterPlan())return false;let id=targetId||null;if(id&&!draft.nodes.some(n=>n.id===id&&n.type==='user-order'))return false;if(!id&&draft.nodes.length>=200)return false;mutate(()=>{if(!id)id=createNode(toWorld({x:160,y:180}),'user-order');const n=draft.nodes.find(n=>n.id===id);n.vocabularyScope=clone(scope);if(!targetId){n.label='用户派单 · '+scope.selectedCount+' 词';n.requestText='为所选词制作商业矢量插画，细节完整；未准备的词先核对义项、补齐教学语境和画面要求，逐批验收。';}selection=new Set([id]);selected=id;edgeSelection=null;});showTerminalPane('graph');fit(true);editNode(id);return true;},setRecipient:(id,label)=>{if(typeof id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return;if(enterPlan())mutate(()=>{draft.recipientThreadId=id;draft.recipientLabel=String(label||'未命名对话').slice(0,160);});},selection:()=>[...selection]};
 new ResizeObserver(()=>{if(editor)positionEditor();}).observe(canvas);
 if(state)repaint();
})();

