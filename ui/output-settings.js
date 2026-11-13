'use strict';
(()=>{
 const form=document.getElementById('output-directory-form'),input=document.getElementById('output-directory'),message=document.getElementById('output-directory-message');
 if(!form)return;
 const errors={OUTPUT_DIRECTORY_BUSY:'正在执行任务，请等本批结束后更换目录。',OUTPUT_DIRECTORY_ABSOLUTE_LOCAL_REQUIRED:'请输入本机的完整文件夹路径。',OUTPUT_DIRECTORY_ROOT_REJECTED:'请选择磁盘内的独立文件夹。',OUTPUT_DIRECTORY_MANAGED_STORE:'该目录由 Codex 或业务图库管理，请选择独立的 API 图片文件夹。',OUTPUT_DIRECTORY_NOT_FOUND:'目录尚不存在，保存目录或首次产图后即可打开。'};
 function show(s){input.value=s.apiDirectory;document.getElementById('pro-output-directory').textContent=s.proDirectory;}
 async function load(){try{show(await api('settings/image-output'));}catch{message.textContent='暂时无法读取目录，请刷新连接。';}}
 form.addEventListener('submit',async e=>{e.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;try{show(await api('settings/image-output',{directory:input.value.trim()}));message.textContent='目录已保存，下次打开自动读取。';}catch(e){message.textContent=errors[e.message]||'目录无法保存，请检查路径与写入权限。';}finally{button.disabled=false;}});
 async function open(kind){try{await api('settings/image-output/open',{kind});message.textContent='已在资源管理器打开。';}catch(e){message.textContent=errors[e.message]||'打开失败，请检查目录是否可访问。';}}
 document.querySelectorAll('[data-open-output]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.openOutput)));
 document.getElementById('open-cas-directory').addEventListener('click',e=>{e.preventDefault();open('cas');});
 load();
 document.getElementById('refresh-workbench')?.addEventListener('click',load);
})();
