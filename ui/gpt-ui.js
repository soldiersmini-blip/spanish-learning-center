'use strict';
(()=>{
  const status=document.getElementById('gpt-status');
  const keySetup=document.getElementById('api-key-setup');
  const keyForm=document.getElementById('api-key-form');
  const keyInput=document.getElementById('api-key-input');
  const keyMessage=document.getElementById('api-key-message');
  const keySave=document.getElementById('api-key-save');
  const keyCopy=document.getElementById('api-key-copy');
  const keySummary=keySetup?.querySelector('summary');
  if(!status||!keyForm)return;
  let checking=false;
  async function check(){
    if(checking)return;checking=true;
    try{
      const response=await fetch('/api/research/image/status',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});
      const result=await response.json();
      if(!response.ok)throw Error(result.message||'状态读取失败');
      status.textContent=result.configured?'● 已保存 · Key 已加密保存在本机，重启后自动读取':'○ 未保存 · 请在下方配置 API Key';
      if(result.configured&&/Key 未保存|本机加密保存失败|本地服务被运行环境限制/.test(keyMessage.textContent))keyMessage.textContent='';
      keyCopy.hidden=!result.configured;
      if(keySummary)keySummary.textContent=result.configured?'更换已保存的 API Key':'配置项目 API Key';
      keyInput.placeholder=result.configured?'已有 Key；只在更换时输入新 Key':'sk-proj-…';
      if(!result.configured)keySetup.open=true;
    }catch{status.textContent='暂时无法读取 API 状态；已保存的 Key 不会因此删除。';keyCopy.hidden=true;}
    finally{checking=false;}
  }
  keyCopy.addEventListener('click',async()=>{
    keyCopy.disabled=true;keyMessage.textContent='正在复制…';
    try{
      const response=await fetch('/api/research/key/copy',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',cache:'no-store'});
      const result=await response.json();
      if(!response.ok)throw Error(result.message||'复制失败');
      try{await navigator.clipboard.writeText(result.apiKey);}
      catch{
        const field=document.createElement('textarea');field.value=result.apiKey;field.setAttribute('readonly','');field.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(field);field.select();
        const copied=document.execCommand('copy');field.remove();if(!copied)throw Error('剪贴板不可用，请检查客户端权限。');
      }
      result.apiKey='';keyMessage.textContent='已复制到剪贴板；页面仍隐藏 Key。';
    }catch(e){keyMessage.textContent=e.message;}
    finally{keyCopy.disabled=false;}
  });
  keyForm.addEventListener('submit',async event=>{
    event.preventDefault();const apiKey=keyInput.value.trim();keyInput.value='';keySave.disabled=true;keyMessage.textContent='正在加密保存到本机…';
    try{
      const response=await fetch('/api/research/key',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({apiKey})});
      const result=await response.json();if(!response.ok)throw Error(result.message||'保存失败');
      keyMessage.textContent='Key 已在本机加密保存。';keySetup.open=false;await check();
    }catch(e){keyMessage.textContent=e.message;keySetup.open=true;}
    finally{keyInput.value='';keySave.disabled=false;}
  });
  check();
  document.getElementById('refresh-workbench')?.addEventListener('click',check);
  window.addEventListener('focus',check);
})();
