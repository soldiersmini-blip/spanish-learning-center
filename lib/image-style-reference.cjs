'use strict';
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const RULE='参考图仅提供线条、色块、阴影层次与整体媒介风格。依据文字任务绘制全新的主体与场景；不要复制参考图中的人物身份、物品、动作、构图或文字。词义、关键结构和原登记限制以本任务为准。';
function promptWithReference(prompt,reference){
 if(!reference)return prompt;
 const q=require('./image-quality-contract.cjs');
 const styled=prompt.replace(q.STYLE,q.REFERENCE_STYLE).replace(q.STYLE_FINISH,q.REFERENCE_FINISH);
 return styled.endsWith(RULE)?styled:styled+'\n'+RULE;
}
function contractWithReference(contract,reference){
 if(!reference)return contract;
 const q=require('./image-quality-contract.cjs');
 return {...contract,style:q.REFERENCE_STYLE,styleRendering:q.REFERENCE_FINISH,styleVersion:'approved-reference-v1',styleReferenceSha256:reference.sha256};
}
function selector(value){
 if(!value||typeof value!=='object'||!/^[-a-f0-9]{36}$/.test(value.executionId||'')||!/^[a-zA-Z0-9-]{1,40}$/.test(value.nodeId||'')||!/^[a-zA-Z0-9-]{1,80}$/.test(value.jobId||'')||!/^[a-f0-9]{64}$/.test(value.sha256||''))throw Error('STYLE_REFERENCE_INVALID');
 return {executionId:value.executionId,nodeId:value.nodeId,jobId:value.jobId,sha256:value.sha256};
}
function read(file){if(fs.statSync(file).size>4*1024*1024)throw Error('STYLE_REFERENCE_TOO_LARGE');return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}
function resolve(runtime,input,readImage){
 const ref=selector(input),dir=path.join(runtime,'api-plan',ref.executionId);
 const receipt=read(path.join(dir,ref.nodeId+'.json')),review=read(path.join(dir,'REVIEW.json'));
 const entries=(receipt.items||[]).filter(x=>x.jobId===ref.jobId),reviews=(review.items||[]).filter(x=>x.jobId===ref.jobId);
 if(receipt.executionId!==ref.executionId||review.executionId!==ref.executionId||entries.length!==1||reviews.length!==1)throw Error('STYLE_REFERENCE_IDENTITY');
 const x=entries[0],v=reviews[0];
 if(x.state!=='awaiting-review'||v.decision!=='pass'||v.styleStatus!=='pass')throw Error('STYLE_REFERENCE_NOT_APPROVED');
 if(x.artifact?.sha256!==ref.sha256||v.sha256!==ref.sha256||v.finalPromptHash!==x.promptHash||['entryId','senseId','sourceRevision'].some(k=>!x[k]||v[k]!==x[k]))throw Error('STYLE_REFERENCE_IDENTITY');
 const file=readImage(x.imageId);
 if(!file||fs.statSync(file).size>20*1024*1024||createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==ref.sha256)throw Error('STYLE_REFERENCE_IMAGE_CHANGED');
 return {...ref,imageId:x.imageId,mode:'style-only-v1',reviewIdentity:{entryId:x.entryId,senseId:x.senseId,sourceRevision:x.sourceRevision,promptHash:x.promptHash,decision:'pass',styleStatus:'pass'}};
}
module.exports={RULE,promptWithReference,contractWithReference,selector,resolve};
