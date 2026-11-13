'use strict';
const {AUTHORITY_BYTES}=require('./production-limits.cjs');
const fs=require('node:fs'),path=require('node:path');
function createClient({runtime=path.resolve(__dirname,'../runtime')}={}){
 const file=path.join(runtime,'connection.json');if(fs.statSync(file).size>4096)throw Error('NATIVE_LOCAL_CONNECTION_SIZE');const c=JSON.parse(fs.readFileSync(file,'utf8')),u=new URL(c.url);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1')throw Error('NATIVE_LOCAL_ENDPOINT_REQUIRED');
 async function request(route,data){const r=await fetch(c.url+'/api/native/batch/'+route,{method:data===undefined?'GET':'POST',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(45000)});const text=await r.text();if(Buffer.byteLength(text)>AUTHORITY_BYTES)throw Error('NATIVE_BATCH_RESPONSE_SIZE');const value=JSON.parse(text);if(!r.ok)throw Error(value.error||'NATIVE_BATCH_REQUEST_FAILED');return value;}
 return {prepare:input=>request('prepare',input),status:()=>request('status'),close:()=>request('close',{}),result:jobId=>request('result?jobId='+encodeURIComponent(jobId)),execute:input=>request('execute',input),async runAndWait(input){
  let r=await request('execute',input);const until=Date.now()+16*60*1000;
  while(!['generated','unknown'].includes(r.state)){
   if(Date.now()>until)throw Error('NATIVE_BATCH_WAIT_UNKNOWN');
   r=await request('wait?jobId='+encodeURIComponent(input.jobId)+'&afterUpdatedAt='+encodeURIComponent(r.updatedAt||''));
  }
  return r;
 }};
}
module.exports={createClient,createBatchClient:createClient};
