'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');

function createResearchImage({runtime,root=path.join(runtime,'api-image-trial'),getKey=()=>process.env.OPENAI_API_KEY,request=fetch,allowTargetedEdit=false}={}){
  const model='gpt-image-2.5-flare',size='1024x1024',quality='high';
  const legacyFiles=path.join(root,'by-sha');
  const output=require('./image-output.cjs').createImageOutput({runtime,legacyDirectory:legacyFiles});
  let busy=false;
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const status=()=>({configured:!!String(getKey()||'').trim(),model,busy});
  const record=id=>path.join(root,id+'.json');
  function read(id){
    if(!/^[a-f0-9]{64}$/.test(id||''))return null;
    try{const meta=JSON.parse(fs.readFileSync(record(id),'utf8')),dir=meta.outputDirectory||legacyFiles;if(!output.allowed(dir))return null;const file=path.join(dir,meta.sha+'.png');return meta.state==='done'&&/^[a-f0-9]{64}$/.test(meta.sha)&&fs.existsSync(file)&&fs.realpathSync(file).startsWith(fs.realpathSync(dir)+path.sep)?file:null;}catch{return null;}
  }
  async function generate(input){
    const basePrompt=typeof input?.prompt==='string'?input.prompt.trim():'';
    const reference=input?.styleReference||null,editSource=input?.editSource||null;
    if(editSource&&!allowTargetedEdit)return {status:403,value:{error:'TARGETED_REWORK_ROUTE_REQUIRED'}};
    if(reference&&editSource)return {status:400,value:{error:'IMAGE_INPUT_MODE_CONFLICT'}};
    const prompt=basePrompt?require('./image-style-reference.cjs').promptWithReference(basePrompt,reference):'';
    if(!prompt||prompt.length>2000)return {status:400,value:{error:'PROMPT_LENGTH',message:'请输入 1 至 2000 字的画面要求。'}};
    const key=String(getKey()||'').trim();
    if(!key)return {status:503,value:{error:'API_KEY_MISSING',message:'本机尚未配置 OPENAI_API_KEY。'}};
    let referenceBytes=null;
    const sourceInput=reference||editSource;
    if(sourceInput){try{
      if(!/^[a-f0-9]{64}$/.test(sourceInput.imageId||'')||!/^[a-f0-9]{64}$/.test(sourceInput.sha256||''))throw Error('invalid');
      const source=read(sourceInput.imageId);if(!source||fs.statSync(source).size>20000000)throw Error('invalid');
      referenceBytes=fs.readFileSync(source);if(hash(referenceBytes)!==sourceInput.sha256)throw Error('changed');
    }catch{return {status:400,value:{error:editSource?'EDIT_SOURCE_IMAGE_CHANGED':'STYLE_REFERENCE_IMAGE_CHANGED',message:'输入图片缺失或已改变；未提交图片请求。'}};}}
    const referenceIdentity=reference?{mode:'style-only-v1',sha256:reference.sha256}:null;
    const editIdentity=editSource?{mode:'targeted-edit-v1',sha256:editSource.sha256}:null;
    const requestInfo=reference?{requestMode:'style-reference',styleReference:referenceIdentity}:editSource?{requestMode:'targeted-edit',editSource:editIdentity}:{};
    const id=hash(JSON.stringify({model,size,quality,prompt,...(referenceIdentity?{styleReference:referenceIdentity}:{}),...(editIdentity?{editSource:editIdentity}:{})})),prior=record(id);
    if(fs.existsSync(prior)){
      try{const meta=JSON.parse(fs.readFileSync(prior,'utf8'));if(meta.state==='done'&&read(id))return {status:200,value:{id,model,cached:true,usage:meta.usage||null}};}catch{}
      return {status:409,value:{error:'IMAGE_REQUEST_ALREADY_RECORDED',message:'相同提示词已有请求记录；为防重复扣费，请先核对结果或更换画面要求。'}};
    }
    if(busy)return {status:429,value:{error:'IMAGE_BUSY',message:'上一张图片仍在生成，请等待完成。'}};
    const files=output.read().directory;
    busy=true;
    fs.mkdirSync(files,{recursive:true});
    fs.mkdirSync(root,{recursive:true});
    try{fs.writeFileSync(prior,JSON.stringify({id,state:'pending',outputDirectory:files,model,size,quality,...requestInfo,createdAt:new Date().toISOString()}),{flag:'wx'});}
    catch{busy=false;return {status:409,value:{error:'IMAGE_REQUEST_ALREADY_RECORDED',message:'相同提示词已有请求记录，请勿重复提交。'}};}
    try{
      let body,endpoint='generations',headers={Authorization:'Bearer '+key};
      if(referenceBytes){
        endpoint='edits';body=new FormData();
        for(const [k,v] of Object.entries({model,prompt,n:'1',size,quality,output_format:'png'}))body.set(k,v);
        body.set('image',new Blob([referenceBytes],{type:'image/png'}),editSource?'original-to-repair.png':'style-reference.png');
      }else{headers['Content-Type']='application/json';body=JSON.stringify({model,prompt,n:1,size,quality,output_format:'png'});}
      if(input?.beforeRequest)await input.beforeRequest();
      const response=await request('https://api.openai.com/v1/images/'+endpoint,{method:'POST',headers,body,signal:AbortSignal.timeout(180000)});
      const data=await response.json();
      if(!response.ok){
        const code=data?.error?.code||'';
        const message=code==='credit_balance_exhausted'||code==='insufficient_quota'?'API 赠额或账户余额不足，请检查领取额度的组织。':response.status===401?'API Key 无效或不是此组织的项目 Key。':response.status===403?'当前项目无图片模型权限；可能需要完成组织验证。':response.status===429?'图片接口限流，请稍后核对用量。':'图片接口返回错误，请检查项目权限和模型可用性。';
        fs.writeFileSync(prior,JSON.stringify({id,state:'blocked',...requestInfo,code:code||'UPSTREAM_ERROR',createdAt:new Date().toISOString()}));
        return {status:[401,403,429].includes(response.status)?response.status:502,value:{error:'IMAGE_UPSTREAM_ERROR',message}};
      }
      const b64=data?.data?.[0]?.b64_json;
      if(typeof b64!=='string'||b64.length>30000000)throw Error('INVALID_IMAGE_RESPONSE');
      const bytes=Buffer.from(b64,'base64');
      if(bytes.length<100||bytes.length>20000000||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('INVALID_IMAGE_RESPONSE');
      const sha=hash(bytes),target=path.join(files,sha+'.png');
      if(!fs.existsSync(target)){const temporary=path.join(files,id+'.tmp');fs.writeFileSync(temporary,bytes,{flag:'wx'});fs.renameSync(temporary,target);}
      const meta={id,state:'done',sha,outputDirectory:files,model,size,quality,...requestInfo,usage:data.usage||null,createdAt:new Date().toISOString()};
      fs.writeFileSync(prior,JSON.stringify(meta));
      return {status:200,value:{id,model,cached:false,usage:meta.usage}};
    }catch(e){
      fs.writeFileSync(prior,JSON.stringify({id,state:'unknown',...requestInfo,code:e?.name==='TimeoutError'?'TIMEOUT':'CONNECTION_OR_RESPONSE',createdAt:new Date().toISOString()}));
      return {status:502,value:{error:'IMAGE_RESULT_UNKNOWN',message:'图片结果未能确认；为避免重复扣费，已锁定这条相同提示词。请先核对 API 用量。'}};
    }finally{busy=false;}
  }
  return {status,generate,read};
}
module.exports={createResearchImage};
