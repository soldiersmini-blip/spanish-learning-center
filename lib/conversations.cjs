'use strict';
const {spawn}=require('node:child_process'),{StringDecoder}=require('node:string_decoder');
const roles=[{threadId:'01a13637-abd8-7151-9fdd-cae83f313ba1',label:'组长 · 工程与交付',shortName:'组长'},{threadId:'01a1ac0a-d293-7df3-bcb0-5dd9a74510f9',label:'产图部 · 执行与回执',shortName:'产图部'}];
function target(id){if(typeof id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))throw Error('PLAN_CONVERSATION_UNKNOWN');return roles.find(r=>r.threadId===id)||{threadId:id};}
async function readConversations({spawnProcess=spawn,timeoutMs=30000,cursor=null,query='',archived=false}={}){
 let child,buffer='',seq=0,timer,closed=false;const pending=new Map(),decoder=new StringDecoder('utf8');
 const abort=code=>{closed=true;for(const p of pending.values())p.reject(Error(code));pending.clear();};
 const rpc=(method,params)=>new Promise((resolve,reject)=>{if(closed)return reject(Error('CONVERSATION_DISCONNECTED'));if(!['initialize','thread/list'].includes(method))return reject(Error('READ_ONLY'));const id=++seq;pending.set(id,{resolve,reject});child.stdin.write(JSON.stringify({id,method,params})+'\n');});
 try{
  child=spawnProcess(process.env.WORKBENCH_CODEX||'codex',['app-server','--listen','stdio://'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  child.on('error',()=>abort('CODEX_UNAVAILABLE'));child.on('close',()=>abort('CODEX_CLOSED'));child.stdin.on('error',()=>abort('CODEX_PIPE_CLOSED'));child.stderr.on('data',()=>{});
  child.stdout.on('data',chunk=>{buffer+=decoder.write(chunk);if(Buffer.byteLength(buffer)>1024*1024){abort('METADATA_LIMIT');child.kill();return;}for(let at;(at=buffer.indexOf('\n'))>=0;){const line=buffer.slice(0,at);buffer=buffer.slice(at+1);let m;try{m=JSON.parse(line);}catch{continue;}if(m.method){if(m.id!==undefined)child.stdin.write(JSON.stringify({id:m.id,error:{code:-32601,message:'Read-only metadata client'}})+'\n');continue;}const p=pending.get(m.id);if(!p)continue;pending.delete(m.id);m.error?p.reject(Error('THREAD_UNAVAILABLE')):p.resolve(m.result);}});
  timer=setTimeout(()=>{abort('CONVERSATION_TIMEOUT');child.kill();},timeoutMs);
  await rpc('initialize',{clientInfo:{name:'linarchive_conversation_picker',title:'LinArchive',version:'1.0.0'},capabilities:{experimentalApi:true}});child.stdin.write(JSON.stringify({method:'initialized',params:{}})+'\n');
  if(typeof cursor!=='string'&&cursor!==null||cursor?.length>4096||typeof query!=='string'||query.length>160)throw Error('CONVERSATION_QUERY');
  const result=await rpc('thread/list',{cursor,limit:50,sortKey:'updated_at',modelProviders:[],sourceKinds:['cli','vscode','exec','appServer','subAgent','subAgentReview','subAgentCompact','subAgentThreadSpawn','subAgentOther','unknown'],archived:!!archived,useStateDbOnly:true,...(query.trim()?{searchTerm:query.trim()}:{})});
  if(!Array.isArray(result.data))throw Error('CONVERSATION_RESPONSE');
  const items=[];for(const t of result.data.slice(0,50)){try{target(t.id);}catch{continue;}const title=String(t.name||t.title||('未命名对话 · '+t.id.slice(0,8))).slice(0,160);items.push({threadId:t.id,label:title,title,shortName:title,available:true,archived:!!archived,status:String(t.status?.type||'notLoaded'),updatedAt:Number(t.updatedAt)||0});}
  return {items,nextCursor:typeof result.nextCursor==='string'?result.nextCursor:null,archived:!!archived,readOnly:true,checkedAt:new Date().toISOString(),modelTurns:0};
 }catch{return {items:[],nextCursor:null,archived:!!archived,error:'CONVERSATIONS_UNAVAILABLE',readOnly:true,checkedAt:new Date().toISOString(),modelTurns:0};}

 finally{clearTimeout(timer);abort('FINISHED');child?.stdin.end();child?.kill();}
}
module.exports={roles,target,readConversations};
