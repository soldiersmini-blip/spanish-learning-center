'use strict';
const path=require('node:path');
const config=require('../deployment.json');
if(!path.isAbsolute(config.projectRoot))throw Error('PROJECT_ROOT_REQUIRED');
const PROJECT=path.resolve(config.projectRoot);
module.exports={PROJECT,RESEARCH:path.join(PROJECT,'staff/15-spanish-research'),USER_DATA:path.resolve(config.userDataRoot)};
