'use strict';
// Application bounds, not a claim about the subscription/backend's actual capacity.
const MAX_JOBS=50,MAX_RUN_ATTEMPTS=256,RUN_BYTES=4*1024*1024,AUTHORITY_BYTES=512*1024;
const isWave=n=>Number.isInteger(n)&&n>=10&&n<=MAX_JOBS&&n%10===0;
module.exports={MAX_JOBS,MAX_RUN_ATTEMPTS,AUTHORITY_BYTES,RUN_BYTES,isWave};
