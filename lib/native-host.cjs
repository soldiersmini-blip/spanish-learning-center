'use strict';
const {spawn}=require('node:child_process'),{StringDecoder}=require('node:string_decoder'),{EventEmitter}=require('node:events');
// One official stdio transport can own many isolated native thread contexts.
// This avoids starting fifty separate Codex app-server processes.
class NativeHost {
 constructor({spawnProcess=spawn,requestTimeoutMs=30000}={}){Object.assign(this,{spawnProcess,requestTimeoutMs});this.pending=new Map();this.events=new EventEmitter();this.events.setMaxListeners(60);this.seq=0;this.cache=new Map();this.active=false;}
 open(){if(this.opening)return this.opening;this.opening=this.start();return this.opening;}
 async start(){
  const child=this.child=this.spawnProcess(process.env.WORKBENCH_CODEX||'codex',['app-server','--listen','stdio://'],{stdio:['pipe','pipe','pipe'],windowsHide:true});this.active=true;let buffer='';const decoder=new StringDecoder('utf8');
  const lost=code=>this.disconnect(code);child.on('error',()=>lost('NATIVE_HOST_PROCESS_ERROR'));child.on('close',()=>lost('NATIVE_HOST_PROCESS_CLOSED'));child.stdin.on('error',()=>lost('NATIVE_HOST_PIPE_CLOSED'));child.stderr.on('data',()=>{});
  child.stdout.on('data',chunk=>{if(!this.active)return;buffer+=decoder.write(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));if(Buffer.byteLength(buffer)>48*1024**2){buffer='';lost('NATIVE_HOST_FRAME_LIMIT');return;}
   for(let at;(at=buffer.indexOf('\n'))>=0;){const line=buffer.slice(0,at);buffer=buffer.slice(at+1);let m;try{m=JSON.parse(line);}catch{continue;}
    if(m.method){if(m.id!==undefined){this.events.emit('interactive',m.method,m.params);child.stdin.write(JSON.stringify({id:m.id,error:{code:-32601,message:'Interactive approval is not implemented by this client'}})+'\n');}else this.events.emit('notification',m.method,m.params);continue;}
    const p=this.pending.get(m.id);if(!p)continue;this.pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error('NATIVE_HOST_RPC_REJECTED')):p.resolve(m.result);
   }
  });
  const init=await this.rpc('initialize',{clientInfo:{name:'linarchive_native_batch',version:'0.3.0'},capabilities:{experimentalApi:true}});child.stdin.write(JSON.stringify({method:'initialized',params:{}})+'\n');return init;
 }
 rpc(method,params){
  if(!['initialize','account/read','modelProvider/capabilities/read','model/list','thread/start','thread/inject_items','thread/read','turn/start'].includes(method))throw Error('NATIVE_METHOD_NOT_ALLOWED');
  const cacheable=['account/read','modelProvider/capabilities/read','model/list'].includes(method),key=method+JSON.stringify(params);
  if(cacheable&&this.cache.has(key))return this.cache.get(key);
  const result=new Promise((resolve,reject)=>{if(!this.active)return reject(Error('NATIVE_HOST_DISCONNECTED'));const id=++this.seq,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('NATIVE_HOST_RPC_TIMEOUT'));},this.requestTimeoutMs);this.pending.set(id,{resolve,reject,timer});this.child.stdin.write(JSON.stringify({id,method,params})+'\n');});
  if(cacheable)this.cache.set(key,result);return result;
 }
 subscribe({notification,disconnect,interactive}){this.events.on('notification',notification);this.events.on('disconnect',disconnect);this.events.on('interactive',interactive);return()=>{this.events.off('notification',notification);this.events.off('disconnect',disconnect);this.events.off('interactive',interactive);};}
 disconnect(code){if(!this.active)return;this.active=false;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error(code));}this.pending.clear();this.events.emit('disconnect',code);}
 close(){this.disconnect('NATIVE_HOST_CLOSED');this.child?.stdin.end();this.child?.kill();}
}
module.exports={NativeHost};
