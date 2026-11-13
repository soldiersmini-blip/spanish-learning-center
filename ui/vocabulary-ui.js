'use strict';
window.WorkbenchVocabulary={mount(container){
 const block=document.createElement('section');block.className='vocabulary-scope';
 block.innerHTML=`<label class="auto-missing-choice"><input id="order-vocabulary-auto" type="checkbox">按照缺图顺序自动向后选择 <small>取词数量由后续批次卡片的数量相加决定</small></label>
 <label id="order-vocabulary-source-label">词库范围<select id="order-vocabulary-source"><option value="live-registered">实时登记词库 · 全库缺图</option><option value="registered">已注册配图任务 · core6000</option><option value="custom">不选词库，自定义派单</option></select></label>
 <div id="order-vocabulary-filters"><button id="order-vocabulary-unpin" class="quiet" type="button" hidden>改为按范围筛选</button><div class="scope-grid"><label>任务范围<select id="order-vocabulary-status"><option value="available">已有画面草案</option><option value="context">需要补充教学语境的词</option><option value="selectable">全部待准备及配图</option></select></label><label>词性<select id="order-vocabulary-pos"><option value="all">全部词性</option><option value="noun">名词</option><option value="verb">动词</option><option value="adjective">形容词</option><option value="adverb">副词</option><option value="other">其他词性</option></select></label><label>等级<select id="order-vocabulary-level"><option value="all">全部等级</option><option value="unlabelled">未标注等级</option><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option><option>C2</option></select></label><label>关键词<input id="order-vocabulary-query" maxlength="100" placeholder="西语、中文或词条编号"></label><label>从第几项开始<input id="order-vocabulary-start" type="number" min="1" max="30001" value="1"></label><label>选取多少项<input id="order-vocabulary-limit" type="number" min="1" max="1000" value="50"></label></div><p id="order-vocabulary-demand"></p><p id="order-vocabulary-queue"></p><p id="order-vocabulary-summary" role="status"></p><ul id="order-vocabulary-preview"></ul><button id="order-vocabulary-refresh" type="button" class="quiet">刷新范围</button><small id="order-vocabulary-note">按西语词头排序；已有图、已领取和待核验项自动排除。</small></div>`;
 container.prepend(block);
 const el=id=>block.querySelector('#order-vocabulary-'+id),source=el('source'),filters=el('filters'),auto=el('auto');
 let result=null,seq=0,timer=null,loadedKey='',savedHash='',required=0,pinnedIds=null;
 function options(){
  if(auto.checked)return {mode:'auto-missing',source:'live-registered',status:'selectable',partOfSpeech:'all',level:'all',query:'',offset:0,limit:Math.min(1000,Math.max(1,required))};
  return {...(pinnedIds?{entryIds:pinnedIds}:{}),source:source.value,status:el('status').value,partOfSpeech:el('pos').value,level:el('level').value,query:el('query').value.trim(),offset:Number(el('start').value)-1,limit:Number(el('limit').value)};
 }
 async function preview(){
  clearTimeout(timer);const id=++seq;result=null;loadedKey='';
  const automatic=auto.checked;source.disabled=automatic;block.querySelector('#order-vocabulary-source-label').hidden=automatic;
  filters.hidden=!automatic&&source.value==='custom';block.querySelector('.scope-grid').hidden=automatic;
  el('unpin').hidden=automatic||!pinnedIds;
  for(const input of block.querySelectorAll('.scope-grid input,.scope-grid select'))input.disabled=filters.hidden||automatic||!!pinnedIds;
  el('note').textContent=automatic?'点执行时重新读取缺图队列并冻结名单；每批按箭头顺序取下一段，已有图、占用和待核验项排除。':'按西语词头排序；已有图、已领取和待核验项自动排除。';
  if(filters.hidden)return;
  el('preview').replaceChildren();
  if(automatic&&!required){el('demand').textContent='连接至少一张批次卡片并填写数量，系统才知道要取多少词。';el('summary').textContent='等待连接批次卡片。';el('queue').textContent='';return;}
  if(automatic&&required>1000){el('demand').textContent='后续批次共需 '+required+' 张，单张派单卡目前最多自动取 1000 词；请拆成两张派单卡。';el('summary').textContent='超出自动取词上限。';return;}
  const scope=options();if(!Number.isInteger(scope.offset)||scope.offset<0||scope.offset>30000||!Number.isInteger(scope.limit)||scope.limit<1||scope.limit>1000){el('summary').textContent='起始项须为 1—30001，选取数量须为 1—1000。';return;}
  el('summary').textContent='正在核对词库范围…';
  try{
   const request={...scope};delete request.mode;
   const data=await (pinnedIds&&!automatic?api('registry/live/selection',request):api('registry/scope?'+new URLSearchParams(request)));
   if(id!==seq)return;result=data;loadedKey=JSON.stringify(scope);
   el('summary').textContent=automatic?'按缺图顺序预计取 '+data.selectedCount+' / '+required+' 词（当前队列符合条件 '+data.matchedCount+' 词）'+(data.selectedCount<required?'，还差 '+(required-data.selectedCount)+' 词':''):(pinnedIds?'已固定你勾选的 '+pinnedIds.length+' 个词。':'')+'符合条件 '+data.matchedCount+' 项 · 本次选取 '+data.selectedCount+' 项'+(data.selectedCount?'（第 '+(scope.offset+1)+'—'+(scope.offset+data.selectedCount)+' 项）':'')+(savedHash&&savedHash!==data.selectionHash?'。词库状态有更新，保存后采用本次结果。':'');
   el('demand').textContent=automatic?'后续批次合计 '+required+' 张 → 自动取前 '+required+' 个缺图词；执行时重新核对。':required?'连线执行槽共需 '+required+' 张 · 本次选取 '+data.selectedCount+' 项'+(data.selectedCount<required?' · 还差 '+(required-data.selectedCount)+' 项':''):'';
   el('queue').textContent=(data.coverage?'全库有效注册缺图 '+data.coverage.validImages.absent+' 词卡 · 监测于 '+new Date(data.sourceUpdatedAt).toLocaleTimeString('zh-CN',{timeZone:'Europe/Paris'})+'。':'')+'当前范围：已有画面草案 '+data.taskCounts.available+' 项，待组长准备 '+data.taskCounts.context+' 项。本次含待准备 '+data.selectedContext+' 项，准备完成后才能生成。以下只预览前 '+data.preview.length+' 项。';
   el('preview').innerHTML=data.preview.map(r=>'<li><b>'+esc(r.spanish)+'</b><span>'+esc(r.meaningZh)+'</span></li>').join('');
  }catch(e){if(id===seq){el('queue').textContent='';el('summary').textContent=e.message==='VOCABULARY_SELECTION_STALE'?'所选词已有变化或被领取，请回选词页重新核对。':e.message==='LIVE_VOCABULARY_STALE'?'实时词库监测已迟滞，等待同步恢复后刷新。':e.message==='LIVE_VOCABULARY_UNAVAILABLE'?'实时词库连接暂不可用，请检查源机监听器。':'词库读取失败，请刷新范围重试。';}}
 }
 function changed(){++seq;result=null;loadedKey='';el('summary').textContent='正在更新范围…';clearTimeout(timer);timer=setTimeout(preview,250);}
 auto.onchange=()=>{if(auto.checked){pinnedIds=null;source.value='live-registered';}preview();};
 el('unpin').onclick=()=>{pinnedIds=null;el('unpin').hidden=true;preview();};
 source.onchange=()=>{pinnedIds=null;el('unpin').hidden=true;if(source.value==='live-registered'&&required>0)el('limit').value=Math.min(1000,required);preview();};
 for(const input of block.querySelectorAll('.scope-grid input,.scope-grid select'))input.addEventListener('input',changed);
 el('refresh').onclick=preview;
 return {
  open(scope,defaultRegistered=false,demand=0){pinnedIds=scope?.entryIds?[...scope.entryIds]:null;required=demand;auto.checked=scope?.mode==='auto-missing'||!scope;el('queue').textContent='';clearTimeout(timer);++seq;source.value=scope?.source||(defaultRegistered?'live-registered':'custom');el('status').value=scope?.status||'selectable';el('pos').value=scope?.partOfSpeech||'all';el('level').value=scope?.level||'all';el('query').value=scope?.query||'';el('start').value=(scope?.offset||0)+1;el('limit').value=scope?.limit||Math.min(1000,required||50);savedHash=scope?.selectionHash||'';preview();},
  read(){if(auto.checked)return {mode:'auto-missing',source:'live-registered'};if(source.value==='custom')return null;if(!result||loadedKey!==JSON.stringify(options()))throw Error('请等待词库范围读取完成，或点击“刷新范围”。');if(!result.selectedCount)throw Error('这个范围没有可选词，请调整筛选或起始项。');const {selectionHash,selectedCount,sourceUpdatedAt}=result;return {...options(),selectionHash,selectedCount,sourceUpdatedAt};},
  close(){clearTimeout(timer);++seq;}
 };
}};
