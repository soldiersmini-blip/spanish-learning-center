'use strict';
const path=require('node:path'),{readLedger}=require(path.join(require('./lib/workspace-paths.cjs').RESEARCH,'capacity-test/measure.cjs')),c=require('./lib/command-center.cjs');
const runtime=path.join(__dirname,'runtime');
function summary(x){if(!x)return null;const {expectedItems,completion,interruptedCommand,...rest}=x;return {...rest,expectedCount:expectedItems?.length,completion:completion&&{generation:completion.generation,review:completion.review,total:completion.total,generated:completion.generated,qualified:completion.qualified,failed:completion.failed},interruptedCommand:interruptedCommand&&{id:interruptedCommand.id,state:interruptedCommand.state,workOrderId:interruptedCommand.workOrderId}};}
try{const [op,arg]=process.argv.slice(2);let out;
 if(op==='status'||op==='next'){const s=c.snapshot(runtime);out={command:summary(s.command),dispatch:{...s.dispatch,items:s.dispatch.items.map(({jobId,entryId,senseId,sourceRevision})=>({jobId,entryId,senseId,sourceRevision}))},workflow:s.workflow&&{workOrderId:s.workflow.workOrderId,state:s.workflow.state,owner:s.workflow.owner,reason:s.workflow.reason},productionStatus:s.production.status};}
 else if(op==='request')out=summary(c.request(runtime,{action:arg,concurrency:Number(process.argv[4]||2)}));
 else if(op==='ack')out=summary(c.ack(runtime,readLedger(path.resolve(arg))));
 else if(op==='reconcile')out=summary(c.reconcile(runtime,readLedger(path.resolve(arg))));
 else throw new Error('USAGE_COMMAND_STATUS_NEXT_REQUEST_ACK_RECONCILE');
 const text=JSON.stringify(out);if(Buffer.byteLength(text)>4096)throw new Error('OUTPUT_LIMIT');console.log(text);
}catch(e){console.error(JSON.stringify({errorCode:/^[A-Z0-9_]+$/.test(e.message)?e.message:'COMMAND_FAILED'}));process.exitCode=1;}
