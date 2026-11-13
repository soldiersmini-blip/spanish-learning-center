'use strict';

function createResearchGpt({getKey=()=>process.env.OPENAI_API_KEY,request=fetch}={}) {
  let busy=false;
  const model='gpt-6-luna';
  const status=()=>({configured:!!String(getKey()||'').trim(),model,busy});
  async function analyze(input) {
    const question=typeof input?.question==='string'?input.question.trim():'';
    if(!question||question.length>2000) return {status:400,value:{error:'QUESTION_LENGTH',message:'请输入 1 至 2000 字的问题。'}};
    const key=String(getKey()||'').trim();
    if(!key) return {status:503,value:{error:'API_KEY_MISSING',message:'本机尚未配置 OPENAI_API_KEY。'}};
    if(busy) return {status:429,value:{error:'RESEARCH_BUSY',message:'上一条分析仍在进行，请稍后再试。'}};
    busy=true;
    try {
      const response=await request('https://api.openai.com/v1/responses',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
        body:JSON.stringify({model,store:false,max_output_tokens:512,instructions:'你是 LinArchive 西语学习科研助手。用中文简洁回答研究问题；区分事实、假设和建议。不生成图片，不执行派单。',input:question}),
        signal:AbortSignal.timeout(30000)
      });
      const data=await response.json();
      if(!response.ok){
        const code=data?.error?.code||'';
        const message=code==='credit_balance_exhausted'||code==='insufficient_quota'?'API 余额不足，请检查关联组织的账单。':response.status===401?'API Key 无效或无权访问该项目。':response.status===429?'API 请求过于频繁，请稍后重试。':'GPT 服务返回错误，请稍后重试。';
        return {status:response.status===401?401:response.status===429?429:502,value:{error:'UPSTREAM_ERROR',message}};
      }
      const answer=typeof data.output_text==='string'?data.output_text:(data.output||[]).flatMap(o=>(o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text||'')).join('\n');
      if(!answer.trim())return {status:502,value:{error:'EMPTY_RESPONSE',message:'GPT 未返回可显示的文字，请缩短问题后重试。'}};
      return {status:200,value:{answer,model,usage:{inputTokens:data.usage?.input_tokens||0,outputTokens:data.usage?.output_tokens||0}}};
    } catch(e) {
      return {status:502,value:{error:'GPT_CONNECTION_FAILED',message:e?.name==='TimeoutError'?'GPT 响应超时，请稍后重试。':'无法连接 GPT 服务，请检查网络后重试。'}};
    } finally {busy=false;}
  }
  return {status,analyze};
}
module.exports={createResearchGpt};
