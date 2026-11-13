'use strict';
// Bounded local monitor for one already-authorized plan. It only reconciles a
// verified moderation rejection; every ambiguous failure remains stopped.
const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite');
const runtime=path.resolve(process.argv[2]||''),executionId=process.argv[3];
if(!path.isAbsolute(runtime)||!/^[a-f0-9-]{36}$/.test(executionId||''))throw Error('MONITOR_ARGUMENTS');
const statusFile=path.join(runtime,'plan-monitor-status.json');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let recoveries=0,connectionFailures=0;
function status(value){const file=statusFile+'.pending',data=JSON.stringify({executionId,checkedAt:new Date().toISOString(),recoveries,...value});fs.writeFileSync(file,data);fs.renameSync(file,statusFile);}
async function api(route,method='GET',body){const c=JSON.parse(fs.readFileSync(path.join(runtime,'connection.json'),'utf8'));const response=await fetch(c.url+route,{method,headers:{Authorization:'Bearer '+c.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});const value=await response.json();if(!response.ok)throw Error(value.error||'MONITOR_HTTP_'+response.status);return value;}
async function main(){const started=Date.now();while(Date.now()-started<12*60*60*1000){let run;try{run=await api('/api/plan/execution');connectionFailures=0;}catch(e){connectionFailures++;status({state:'connection-wait',error:e.message});if(connectionFailures>10)break;await sleep(30000);continue;}
  if(run.id!==executionId){status({state:'stopped',error:'MONITOR_ORDER_CHANGED'});return;}
  status({state:run.state,error:run.error||null,generated:run.generated,total:run.total});
  if(run.state==='generated-awaiting-review')return;
  if(run.state==='unknown'&&run.error==='API_PLAN_RECONCILIATION_REQUIRED'){
   if(recoveries>=20){status({state:'stopped',error:'MONITOR_RECOVERY_LIMIT',generated:run.generated});return;}
   try{const fixed=await api('/api/plan/reconcile-moderation','POST',{});if(fixed.state!=='blocked'||fixed.error!=='PLAN_RECONCILED_READY')throw Error('MONITOR_RECONCILIATION_INVALID');
    const db=new DatabaseSync(path.join(runtime,'plan-execution.sqlite'),{readOnly:true});let plan;try{const row=db.prepare('SELECT payload FROM executions WHERE id=?').get(executionId);plan=JSON.parse(row.payload).plan;}finally{db.close();}
    const resumed=await api('/api/plan/execute','POST',plan);if(resumed.id!==executionId||resumed.generated<run.generated)throw Error('MONITOR_RESUME_INVALID');recoveries++;status({state:'resumed',generated:resumed.generated,total:resumed.total});
   }catch(e){if(e.message==='PLAN_RECONCILIATION_NOT_SAFE'){await sleep(30000);continue;}status({state:'stopped',error:e.message,generated:run.generated});return;}
  }else if(run.state==='unknown'||run.state==='blocked'){status({state:'stopped',error:run.error||run.state,generated:run.generated});return;}
  await sleep(30000);
 }
 status({state:'stopped',error:'MONITOR_TIME_LIMIT'});
}
main().catch(e=>{status({state:'stopped',error:e.message});process.exitCode=1;});
