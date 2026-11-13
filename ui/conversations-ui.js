'use strict';
window.WorkbenchConversations=(()=>{
 let menu=null,timer=null;
 function close(){clearTimeout(timer);menu?.remove();menu=null;}
 async function open(anchor=document.getElementById('node-codex')){
  close();const panel=document.createElement('div');panel.className='graph-menu conversation-picker';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','选择 Codex 对话');
  panel.innerHTML='<div class="conversation-heading"><b>选择 Codex 对话</b><button type="button" data-close aria-label="关闭对话选择">×</button></div><input class="conversation-search" type="search" aria-label="搜索 Codex 对话标题" placeholder="搜索所有对话的标题…" maxlength="160"><div class="conversation-filters"><select aria-label="对话范围"><option value="false">未归档对话</option><option value="true">已归档对话</option></select><button type="button" data-refresh>刷新</button></div><div class="conversation-status" role="status"></div><div class="conversation-list"></div><div class="conversation-pages"><button type="button" data-prev>← 上一页</button><span></span><button type="button" data-next>下一页 →</button></div><p class="conversation-note">选择方案接收对话；保存不会自动发消息、恢复归档或开始生图。</p>';
  document.body.append(panel);menu=panel;let request=0,items=[],cursor=null,nextCursor=null,history=[],busy=false;
  const search=panel.querySelector('input'),scope=panel.querySelector('select'),list=panel.querySelector('.conversation-list'),status=panel.querySelector('.conversation-status'),prev=panel.querySelector('[data-prev]'),next=panel.querySelector('[data-next]');
  const r=anchor?.getBoundingClientRect()||{left:20,bottom:80};const place=()=>{panel.style.left=Math.max(8,Math.min(innerWidth-panel.offsetWidth-8,r.left))+'px';panel.style.top=Math.max(8,Math.min(innerHeight-panel.offsetHeight-8,r.bottom+6))+'px';};place();
  const load=async(reset=false)=>{
   clearTimeout(timer);if(reset){cursor=null;history=[];}const seq=++request;busy=true;items=[];list.replaceChildren();prev.disabled=next.disabled=true;status.textContent='正在读取本机 Codex 对话…';place();
   const params=new URLSearchParams({query:search.value.trim(),archived:scope.value});if(cursor)params.set('cursor',cursor);
   try{const data=await api('conversations?'+params);if(menu!==panel||seq!==request)return;if(data.error)throw Error(data.error);items=data.items||[];nextCursor=data.nextCursor||null;
    list.innerHTML=items.map(item=>'<button type="button" data-thread-id="'+esc(item.threadId)+'" '+(item.available?'':'disabled')+'><span><b>'+esc(item.title||item.label)+'</b><small>'+esc((item.archived?'已归档 · ':'')+item.threadId)+'</small></span><span>'+(draft.recipientThreadId===item.threadId?'✓':'→')+'</span></button>').join('');
    status.textContent=items.length?'本页 '+items.length+' 个对话':'没有匹配的对话';panel.querySelector('.conversation-pages span').textContent='第 '+(history.length+1)+' 页';
    for(const button of list.querySelectorAll('[data-thread-id]'))button.onclick=()=>{const item=items.find(i=>i.threadId===button.dataset.threadId&&i.available);if(!item)return;window.WorkbenchGraph.setRecipient(item.threadId,item.title||item.label);close();toast('已选择：'+(item.title||item.label)+'。随方案保存。');};
   }catch{if(menu!==panel||seq!==request)return;nextCursor=null;status.textContent='读取失败，请点刷新重试。';}finally{if(menu===panel&&seq===request){busy=false;prev.disabled=!history.length;next.disabled=!nextCursor;place();}}
  };
  panel.querySelector('[data-close]').onclick=close;panel.querySelector('[data-refresh]').onclick=()=>load(true);
  search.oninput=()=>{clearTimeout(timer);++request;busy=true;list.replaceChildren();prev.disabled=next.disabled=true;status.textContent='正在搜索…';timer=setTimeout(()=>load(true),350);};search.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();load(true);}};scope.onchange=()=>load(true);
  next.onclick=()=>{if(busy||!nextCursor)return;history.push(cursor);cursor=nextCursor;load();};prev.onclick=()=>{if(busy||!history.length)return;cursor=history.pop();load();};
  panel.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();anchor?.focus({preventScroll:true});}if(['ArrowDown','ArrowUp'].includes(e.key)&&e.target.tagName!=='SELECT'){const buttons=[...list.querySelectorAll('button:not(:disabled)')];if(!buttons.length)return;e.preventDefault();const i=buttons.indexOf(document.activeElement);buttons[(i+(e.key==='ArrowDown'?1:buttons.length-1)+buttons.length)%buttons.length]?.focus();}};
  search.focus({preventScroll:true});await load(true);
 }
 document.addEventListener('click',e=>{const button=e.target.closest('[data-choose-conversation]');if(button)open(button);});
 document.addEventListener('pointerdown',e=>{if(menu&&!menu.contains(e.target)&&!e.target.closest('[data-choose-conversation]'))close();},true);window.addEventListener('resize',close);
 return {open};
})();
