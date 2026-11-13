'use strict';
// Offline inspection only. Deliberately no generate/run CLI switch.
const path=require('node:path');
const {createReworkRunner}=require('./lib/targeted-rework.cjs');
if(process.argv[2]!=='dry-run'){console.error('Usage: node rework.cjs dry-run [--order staff/05-spanish-teaching/API-...json] [oldJobId ...]');process.exitCode=2;}
else{
 try{
  const runner=createReworkRunner({project:require('./lib/workspace-paths.cjs').PROJECT,runtime:path.join(__dirname,'runtime')});
  const jobs=process.argv.slice(3),options={};if(jobs[0]==='--order'){jobs.shift();options.orderPath=jobs.shift();if(!options.orderPath)throw Error('REWORK_ORDER_PATH_INVALID');}if(jobs.length)options.jobIds=jobs;const r=runner.inspect(options);
  console.log(JSON.stringify({ready:r.ready,selected:r.selected,readyCount:r.readyCount,manifestHash:r.manifestHash,blockers:r.blockers,items:r.manifest.items.map(x=>({word:x.word,jobId:x.jobId,oldJobId:x.repairOf.jobId,oldSha256:x.repairOf.sha256,promptSha256:x.finalPromptSha256})),generationAuthorized:false,actualImageCalls:0},null,2));
 }catch(e){console.error(/^REWORK_[A-Z0-9_]+$/.test(e.message)?e.message:'REWORK_SOURCE_UNAVAILABLE');process.exitCode=1;}
}

