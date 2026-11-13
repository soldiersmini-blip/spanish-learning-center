'use strict';
const fs=require('node:fs'),path=require('node:path');
function batchRuntime(runtime){const file=path.join(runtime,'BATCH-SLOT-CURRENT.json');if(!fs.existsSync(file))return runtime;if(fs.statSync(file).size>1024)throw Error('BATCH_SLOT_SIZE');const c=JSON.parse(fs.readFileSync(file,'utf8'));if(!['primary','recovery-01','wave50-01'].includes(c.slot))throw Error('BATCH_SLOT_INVALID');return c.slot==='primary'?runtime:path.join(runtime,c.slot);}
module.exports={batchRuntime};
