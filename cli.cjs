'use strict';
const fs=require('node:fs'); const path=require('node:path');
const {Store,readManifest,fixtureManifest}=require('./lib/store.cjs');
const {probe}=require('./lib/codex-probe.cjs');
const runtime=path.join(__dirname,'runtime'),intake=path.join(__dirname,'intake');
async function main(){
  fs.mkdirSync(intake,{recursive:true}); const [command,arg]=process.argv.slice(2);
  if(command==='stop'){
    const file=path.join(runtime,'connection.json');if(!fs.existsSync(file))return {stopped:true,alreadyStopped:true};
    const c=JSON.parse(fs.readFileSync(file,'utf8')),url=new URL(c.url);
    if(url.hostname!=='127.0.0.1'||url.protocol!=='http:')throw new Error('INVALID_LOCAL_ENDPOINT');
    const r=await fetch(c.url+'/api/shutdown',{method:'POST',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});
    if(!r.ok)throw new Error('STOP_FAILED');return {stopped:true};
  }
  if(command==='probe'){ const result=await probe();fs.mkdirSync(runtime,{recursive:true});fs.writeFileSync(path.join(runtime,'connection-probe.json'),JSON.stringify(result,null,2));return result; }
  const store=new Store(runtime);
  try{
    if(command==='dispatch')return store.import(readManifest(path.resolve(arg||''),intake));
    if(command==='demo')return store.import(fixtureManifest(arg?Number(arg):12));
    if(command==='receipt')return store.receipt(arg);
    if(command==='status'){const s=store.snapshot();return {paused:s.paused,concurrency:s.concurrency,counts:s.counts,total:s.total,boundLead:s.boundLead,realExecutionEnabled:false};}
    throw new Error('USAGE: node cli.cjs dispatch intake/<file>.json | demo [1..20] | status | receipt <jobId> | probe | stop');
  }finally{store.close();}
}
main().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(JSON.stringify({error:e.message}));process.exitCode=1;});
