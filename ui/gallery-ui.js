'use strict';
// Batch inspection is read-only. No production or formal review writes originate here.
window.WorkbenchGallery=(()=>{
 let batches=[],current=null,data=null,page=0,serial=0,lastSync=0,loading=false,modalIndex=0,moving=false;
 const urls=new Map(),titleCache=new Map();let controller=new AbortController(),imageObserver=null;
 const statusText={pending:'待审核',passed:'审核通过',issues:'审核有问题',missing:'原图不可读','no-image':'尚无图片'};
 const el=id=>document.getElementById(id);
 const host=el('real-jobs');
 const dialog=document.createElement('dialog');dialog.className='picture-preview batch-preview';
 dialog.innerHTML='<div class="preview-toolbar"><button type="button" id="gallery-prev-image">← 上一张</button><span id="gallery-position"></span><button type="button" id="gallery-next-image">下一张 →</button><form method="dialog"><button class="quiet">关闭</button></form></div><div class="image-zoom-tools"><button type="button" id="image-zoom-out" aria-label="缩小图片">−</button><input id="image-zoom" aria-label="图片缩放" type="range" min="5" max="400" value="100"><output id="image-zoom-value">100%</output><button type="button" id="image-zoom-in" aria-label="放大图片">＋</button><button type="button" id="image-fit">适应窗口</button><button type="button" id="image-original">原始大小</button><span>滚轮缩放 · 拖动看细节</span></div><div class="preview-layout"><div id="gallery-large"></div><div id="gallery-detail"></div></div>';
 document.body.append(dialog);
 const viewport=el('gallery-large');let zoom=1,px=0,py=0,fitMode=true,pan=null;
 function drawZoom(){const img=viewport.querySelector('img');if(!img)return;const w=img.naturalWidth*zoom,h=img.naturalHeight*zoom;px=w<=viewport.clientWidth?(viewport.clientWidth-w)/2:Math.max(viewport.clientWidth-w,Math.min(0,px));py=h<=viewport.clientHeight?(viewport.clientHeight-h)/2:Math.max(viewport.clientHeight-h,Math.min(0,py));img.style.width=img.naturalWidth+'px';img.style.height=img.naturalHeight+'px';img.style.transform='translate('+px+'px,'+py+'px) scale('+zoom+')';el('image-zoom').value=Math.round(zoom*100);el('image-zoom-value').textContent=Math.round(zoom*100)+'%';}
 function setZoom(value,x=viewport.clientWidth/2,y=viewport.clientHeight/2){const next=Math.max(.05,Math.min(4,value));px=x-(x-px)*next/zoom;py=y-(y-py)*next/zoom;zoom=next;fitMode=false;drawZoom();}
 function fitImage(){const img=viewport.querySelector('img');if(!img?.naturalWidth)return;fitMode=true;zoom=Math.min(1,viewport.clientWidth/img.naturalWidth,viewport.clientHeight/img.naturalHeight);px=py=0;drawZoom();}
 function mountImage(a,url){const img=imageMarkup(a,url);img.draggable=false;img.onload=fitImage;viewport.replaceChildren(img);fitMode=true;if(img.complete)fitImage();}
 el('image-zoom').oninput=e=>setZoom(Number(e.target.value)/100);el('image-zoom-in').onclick=()=>setZoom(zoom*1.25);el('image-zoom-out').onclick=()=>setZoom(zoom/1.25);el('image-fit').onclick=fitImage;el('image-original').onclick=()=>setZoom(1);
 viewport.addEventListener('wheel',e=>{if(!viewport.querySelector('img'))return;e.preventDefault();const r=viewport.getBoundingClientRect();setZoom(zoom*Math.exp(-Math.max(-100,Math.min(100,e.deltaY))*.003),e.clientX-r.left,e.clientY-r.top);},{passive:false});
 viewport.addEventListener('pointerdown',e=>{if(e.button!==0||!viewport.querySelector('img'))return;e.preventDefault();pan={id:e.pointerId,x:e.clientX,y:e.clientY,px,py};viewport.setPointerCapture(e.pointerId);viewport.classList.add('panning');});
 viewport.addEventListener('pointermove',e=>{if(!pan||pan.id!==e.pointerId)return;px=pan.px+e.clientX-pan.x;py=pan.py+e.clientY-pan.y;drawZoom();});for(const event of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(event,()=>{pan=null;viewport.classList.remove('panning');});
 new ResizeObserver(()=>{if(dialog.open){if(fitMode)fitImage();else drawZoom();}}).observe(viewport);
 const thumbControl=document.createElement('label');thumbControl.className='thumbnail-size';thumbControl.innerHTML='缩略图大小 <input type="range" id="gallery-thumb-size" aria-label="缩略图大小" min="160" max="480" step="20" value="280">';el('gallery-search-form').append(thumbControl);
 const thumb=el('gallery-thumb-size');try{const stored=Number(localStorage.getItem('linarchive-thumb-size'));if(stored>=160&&stored<=480)thumb.value=stored;}catch{}function sizeThumbs(){host.style.setProperty('--thumb-size',thumb.value+'px');try{localStorage.setItem('linarchive-thumb-size',thumb.value);}catch{}}thumb.oninput=sizeThumbs;sizeThumbs();
 function resetImages(){imageObserver?.disconnect();imageObserver=null;controller.abort();controller=new AbortController();for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();}
 function title(a){return titleCache.get(a.id)||a.title||'配图 · 待核对词名';}
 function controls(){el('gallery-prev').disabled=!data||data.page===0;el('gallery-next').disabled=!data||data.page+1>=data.pages;el('gallery-page').textContent=data?.showAll?'全部 '+data.total+' 项':data?`${data.total?data.page*data.limit+1:0}–${Math.min((data.page+1)*data.limit,data.total)} / ${data.total} 项 · 第 ${data.pages?data.page+1:0}/${data.pages} 页`:'';}
 function summary(){const b=batches.find(x=>x.id===current);el('results-summary').textContent=b?`本批 ${b.total} 项 · 可查看 ${b.images} 张 · 待审核 ${b.pending} 张 · 通过 ${b.passed} 张 · 异常 / 未出图 ${b.issues} 项`: '暂无可读取的批次';el('gallery-scope').textContent=b?.scope==='research'?'历史测试批次：展示原生图片，不计入正式词库或独审通过。':'正式任务批次：审核状态来自教学岗回执；此页查看不会改变审核结果。';}
 async function fetchImage(a,epoch){if(urls.has(a.id))return urls.get(a.id);const r=await fetch('/api/gallery/image?'+new URLSearchParams({batchId:current,id:a.id}),{headers:{Authorization:'Bearer '+token},signal:controller.signal});if(!r.ok)throw Error('原图暂不可读');const blob=await r.blob();if(epoch!==serial)return null;const url=URL.createObjectURL(blob);urls.set(a.id,url);return url;}
 function imageMarkup(a,url){const img=document.createElement('img');img.src=url;img.alt=title(a);img.decoding='async';return img;}
 async function enrich(a,epoch){
  if(a.entryId&&!a.teachingTarget&&!titleCache.has(a.id))try{const r=await api('registry?'+new URLSearchParams({query:a.entryId,status:'all',page:'0',limit:'40'}));const match=r.items.find(i=>i.entryId===a.entryId&&i.senseId===a.senseId&&i.sourceRevision===a.sourceRevision);if(match)titleCache.set(a.id,match.spanish+' · '+match.meaningZh);}catch{}
  if(epoch!==serial)return;
  const card=host.querySelector('[data-image-id="'+a.id+'"]');if(!card)return;card.querySelector('h3').textContent=title(a);
  if(!a.hasImage)return;
  try{const url=await fetchImage(a,epoch);if(epoch!==serial||!url)return;const button=card.querySelector('.art-preview');button.replaceChildren(imageMarkup(a,url));button.setAttribute('aria-label','查看原图：'+title(a));}catch(e){if(epoch===serial)card.querySelector('.art-preview').textContent='原图读取失败，点击重试';}
 }
 async function renderPage(){
  const epoch=++serial;resetImages();host.replaceChildren();controls();summary();if(!data)return;
  el('queue-count').textContent=`本批 ${data.batchTotal} 项${data.total!==data.batchTotal?' · 筛选后 '+data.total+' 项':''}`;
  if(!data.items.length){host.innerHTML='<p class="empty">当前筛选下没有图片。</p>';return;}
  for(const [index,a]of data.items.entries()){
   const card=document.createElement('article');card.className='job-card';card.dataset.imageId=a.id;
   card.innerHTML=`<div class="job-art">${a.hasImage?'<button type="button" class="art-preview">读取图片…</button>':'<span>'+esc(statusText[a.status])+'</span>'}</div><div class="job-body"><span class="image-number">#${a.number}</span><h3>${esc(title(a))}</h3><span class="tag ${a.status==='passed'?'passed':'pending'}">${esc(statusText[a.status])}</span><p>${esc(a.reviewReason||'')}</p><button type="button" class="quiet image-details">${a.hasImage?'放大 / 看要求':'查看任务详情'}</button></div>`;
   card.querySelector('.art-preview')?.addEventListener('click',()=>open(index));card.querySelector('.image-details').onclick=()=>open(index);host.append(card);
  }
  if(data.showAll){
   const visible=new Set(),pending=new Set(),queue=new Map();let active=0;
   const unload=a=>{if(dialog.open&&data.items[modalIndex]?.id===a.id)return;const button=host.querySelector('[data-image-id="'+a.id+'"] .art-preview');if(button)button.textContent='滚动到此处加载图片';const url=urls.get(a.id);if(url){URL.revokeObjectURL(url);urls.delete(a.id);}};
   function pump(){if(epoch!==serial)return;while(active<4&&queue.size){const [id,a]=queue.entries().next().value;queue.delete(id);if(!visible.has(id))continue;pending.add(id);active++;enrich(a,epoch).finally(()=>{pending.delete(id);active--;if(epoch!==serial)return;if(!visible.has(id))unload(a);pump();});}}
   imageObserver=new IntersectionObserver(entries=>{if(epoch!==serial)return;for(const entry of entries){const a=data.items[Number(entry.target.dataset.galleryIndex)];if(entry.isIntersecting){visible.add(a.id);if(!pending.has(a.id)&&!urls.has(a.id))queue.set(a.id,a);}else{visible.delete(a.id);queue.delete(a.id);unload(a);}}pump();},{rootMargin:'400px'});
   for(const [i,card]of [...host.children].entries()){card.dataset.galleryIndex=i;imageObserver.observe(card);}return;
  }
  // Keep the same four readers for ordinary paginated browsing.
  let cursor=0;await Promise.all(Array.from({length:Math.min(4,data.items.length)},async()=>{while(epoch===serial&&cursor<data.items.length)await enrich(data.items[cursor++],epoch);}));
 }
 async function loadPage(){if(!current)return;const request=++serial;controller.abort();el('gallery-page').textContent='读取批次…';try{const next=await api('gallery/items?'+new URLSearchParams({batchId:current,page:String(page),limit:el('gallery-size').value,status:el('gallery-status').value,query:el('gallery-search').value}));if(request!==serial)return;data=next;page=data.page;renderPage();}catch(e){if(request===serial){host.innerHTML='<p class="empty">批次暂不可读，请刷新重试。</p>';el('gallery-page').textContent=e.message;}}}
 async function sync(force=false){if(loading||(!force&&(el('pane-results').hidden||Date.now()-lastSync<15000)))return;loading=true;try{const previousBatch=JSON.stringify(batches.find(b=>b.id===current));const result=await api('gallery/batches');batches=result.batches;lastSync=Date.now();const old=current;if(!batches.some(b=>b.id===current))current=batches.find(b=>b.images>0)?.id||batches[0]?.id||null;const select=el('gallery-batch');select.innerHTML=batches.map(b=>`<option value="${b.id}">${esc(b.title)} · ${b.images}/${b.total} 张${b.scope==='research'?' · 历史测试':''}</option>`).join('');select.value=current||'';el('gallery-warning').textContent=result.warnings.join(' ');summary();if(!dialog.open&&(old!==current||!data||force||previousBatch!==JSON.stringify(batches.find(b=>b.id===current))))await loadPage();}catch(e){el('results-summary').textContent='图库暂不可读，请刷新：'+e.message;}finally{loading=false;}}
 async function open(index){modalIndex=index;const a=data.items[index],epoch=serial;if(!dialog.open)dialog.showModal();el('gallery-position').textContent=`${data.page*data.limit+index+1} / ${data.total}`;el('gallery-prev-image').disabled=data.page===0&&index===0;el('gallery-next-image').disabled=data.page*data.limit+index+1>=data.total;
  el('gallery-detail').innerHTML=`<h2>${esc(title(a))}</h2><p>#${a.number} · ${esc(statusText[a.status])}</p><h3>审核意见</h3><p>${esc(a.reviewReason||'尚无有效独立审核意见')}</p>${a.teachingTarget?`<h3>本图词义</h3><p>${esc(a.teachingTarget.meaning)}</p>${a.teachingTarget.contextEs?`<h3>配句${a.teachingTarget.contextStatus==='generated-draft'?'（草案，待教学核对）':''}</h3><p>${esc(a.teachingTarget.contextEs)}</p>`:''}${a.teachingTarget.mustShow?.length?`<h3>核对重点</h3><ul>${a.teachingTarget.mustShow.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}`:''}<h3>画面要求</h3><p class="image-brief">${esc(a.summary||a.title||'该历史回执未记录画面要求')}</p><details><summary>任务与文件信息</summary><p>${esc(a.entryId||a.jobId||'回执缺失')}</p><p>${esc(a.senseId||'')}</p><p>${esc(a.sha256||'尚无图片指纹')}</p>${a.width?`<p>${a.width} × ${a.height}</p>`:''}</details>`;
  el('gallery-large').textContent=a.hasImage?'读取原图…':statusText[a.status];if(a.hasImage)try{const url=await fetchImage(a,epoch);if(dialog.open&&modalIndex===index&&epoch===serial&&url)mountImage(a,url);}catch{if(epoch===serial)el('gallery-large').textContent='原图读取失败，可关闭后重试。';}
 }
 async function move(delta){if(!data||moving)return;moving=true;try{let next=modalIndex+delta;if(next<0||next>=data.items.length){const target=page+(next<0?-1:1);if(target<0||target>=data.pages)return;page=target;await loadPage();next=delta<0?data.items.length-1:0;}await open(next);}finally{moving=false;}}
 el('gallery-prev-image').onclick=()=>move(-1);el('gallery-next-image').onclick=()=>move(1);dialog.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea'))return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}});
 el('gallery-batch').onchange=()=>{current=el('gallery-batch').value;page=0;loadPage();};
 for(const id of ['gallery-status','gallery-size'])el(id).onchange=()=>{page=0;loadPage();};
 el('gallery-search-form').onsubmit=e=>{e.preventDefault();page=0;loadPage();};
 el('gallery-prev').onclick=()=>{page--;loadPage();};el('gallery-next').onclick=()=>{page++;loadPage();};el('gallery-refresh').onclick=()=>sync(true);
 document.addEventListener('click',e=>{if(e.target.closest('[data-pane="results"]'))sync();});
 return {sync};
})();
