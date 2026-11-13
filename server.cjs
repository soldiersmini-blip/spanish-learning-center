'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {randomBytes,timingSafeEqual}=require('node:crypto');
const {Store,fixtureManifest}=require('./lib/store.cjs');
const {probe}=require('./lib/codex-probe.cjs');
const {readProjection}=require(path.join(require('./lib/workspace-paths.cjs').RESEARCH,'capacity-test/projection.cjs'));
const commandCenter=require('./lib/command-center.cjs');
const plans=require('./lib/plans.cjs');
const {createRegistry}=require('./lib/registered-words.cjs');
const {NativePreparation}=require('./lib/native-preparation.cjs');
const {NativeExecution}=require('./lib/native-execution.cjs');
const {NativeBatch}=require('./lib/native-batch.cjs');
const {readResearchCapacity}=require('./lib/research-capacity.cjs');
const batchPrompt=require('./lib/batch-prompt.cjs');
const {createResearchGpt}=require('./lib/research-gpt.cjs');
const {createResearchImage}=require('./lib/research-image.cjs');
const {createKeyStore}=require('./lib/openai-key.cjs');
const {createVocabularyStats}=require('../../../Projects/搭建个人网站/staff/02-spanish-engineering/storage-tools/workbench-vocabulary-stats.cjs');
const {batchRuntime}=require('./lib/batch-runtime.cjs');
const ROOT=__dirname;
function start({runtime=path.join(ROOT,'runtime'),port=0,durationMs=5000,reuseEndpoint=runtime===path.join(ROOT,'runtime'),registryProject,makePlanRunner,keyDir,readConversations=require('./lib/conversations.cjs').readConversations}={}) {
  fs.mkdirSync(runtime,{recursive:true});
  let prior=null;
  if(reuseEndpoint&&fs.existsSync(path.join(runtime,'connection.json'))){
    try{const value=JSON.parse(fs.readFileSync(path.join(runtime,'connection.json'),'utf8')),u=new URL(value.url);
      if(u.protocol==='http:'&&u.hostname==='127.0.0.1'&&/^\d+$/.test(u.port)&&/^[a-f0-9]{64}$/.test(value.token)){prior=value;if(!port)port=Number(u.port);}
    }catch{}
  }
  const lock=path.join(runtime,'server.lock');
  try { fs.writeFileSync(lock,String(process.pid),{flag:'wx'}); }
  catch(e) {
    if(e.code!=='EEXIST') throw e;
    const pid=Number(fs.readFileSync(lock,'utf8')); let alive=true;
    try{process.kill(pid,0)}catch(x){if(x.code==='ESRCH') alive=false;}
    if(alive || !Number.isInteger(pid) || pid<=0) throw new Error('WORKBENCH_ALREADY_RUNNING_OR_LOCK_UNKNOWN');
    fs.unlinkSync(lock); fs.writeFileSync(lock,String(process.pid),{flag:'wx'});
  }
  const project=registryProject||commandCenter.PROJECT;
  const vocabularyStats=createVocabularyStats({project});
  const conversationCache=new Map(),conversationPending=new Map();
  async function conversations(params){const key=JSON.stringify(params),cached=conversationCache.get(key);if(cached&&Date.now()-cached.at<15000)return cached.value;if(!conversationPending.has(key)){if(conversationPending.size>=2)throw Error('CONVERSATIONS_BUSY');conversationPending.set(key,Promise.resolve().then(()=>readConversations(params)).then(value=>{if(!value.error){if(conversationCache.size>=30)conversationCache.delete(conversationCache.keys().next().value);conversationCache.set(key,{at:Date.now(),value});}return value;}).finally(()=>conversationPending.delete(key)));}return conversationPending.get(key);}
  const gallery=require('./lib/image-gallery.cjs').createGallery({root:registryProject?path.join(runtime,'gallery-fixture'):ROOT,project,runtime,readPlanExecution:()=>planExecution.current()});
  const store=new Store(runtime); store.recover();const registry=createRegistry({runtime,project});const liveVocabulary=require('./lib/live-vocabulary.cjs').createLiveVocabulary({project,registry,runtime});const vocabularyScope=s=>(s.source==='live-registered'?liveVocabulary:registry).scope(s);
  const nativePreparation=new NativePreparation({runtime,cwd:path.join(runtime,'native-worker')});
  const nativeExecution=new NativeExecution({native:nativePreparation,runtime,project});
  const nativeBatch=new NativeBatch({runtime:batchRuntime(runtime),commandRuntime:runtime,project});
  const planExecution=require('./lib/plan-execution.cjs').createPlanExecution({runtime,project,resolveScope:vocabularyScope,makeRunner:makePlanRunner,canStart:()=>!nativePreparation.busyCheck()&&!nativeBatch.busy()&&!['pending','accepted'].includes(commandCenter.snapshot(runtime,project).command?.state)});
  const token=prior?.token||randomBytes(32).toString('hex'); const timers=new Set();
  const keyStore=createKeyStore({dir:keyDir});
  let apiKeyConfigured=!!keyStore.get();
  const researchGpt=createResearchGpt({getKey:keyStore.get});
  const researchImage=createResearchImage({runtime,getKey:keyStore.get});
  const imageOutput=require('./lib/image-output.cjs').createImageOutput({runtime,project});
  let stopping=false,probeBusy=false,origin='';
  const probeFile=path.join(runtime,'connection-probe.json');
  let connection={status:'not-tested',realImageVerified:false};
  if(fs.existsSync(probeFile)) { try{connection=JSON.parse(fs.readFileSync(probeFile,'utf8'))}catch{} }
  function pump() {
    if(stopping) return;
    try { for(let j;(j=store.claim());) {
      const wait=durationMs+(parseInt(j.identity.slice(0,2),16)%5)*350;
      const timer=setTimeout(()=>{timers.delete(timer); if(stopping)return; store.finish(j.id,j.attempt); pump();},wait); timers.add(timer);
    } } catch { store.configure({paused:true,concurrency:store.setting('concurrency')}); }
  }
  const tick=setInterval(pump,250);
  function json(res,status,value) { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value)); }
  async function body(req,limit=4096) { let value=''; for await(const c of req){value+=c; if(Buffer.byteLength(value)>limit)throw new Error('BODY_LIMIT');} return JSON.parse(value||'{}'); }
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','no-referrer');
    try {
      if(req.headers.host!==origin.slice(7)) return json(res,403,{error:'HOST_REJECTED'});
      const url=new URL(req.url,origin);
      // Failed health probes must also close: otherwise a pooled pre-restart socket
      // can outlive this process and make the first reconnect fail intermittently.
      if(url.pathname==='/api/health')res.setHeader('Connection','close');
      if(url.pathname.startsWith('/api/')) {
        const supplied=Buffer.from((req.headers.authorization||'').replace(/^Bearer /,'')); const expected=Buffer.from(token);
        if(supplied.length!==expected.length || !timingSafeEqual(supplied,expected))return json(res,401,{error:'LOCAL_SESSION_REQUIRED'});
        if(req.headers.origin && req.headers.origin!==origin)return json(res,403,{error:'ORIGIN_REJECTED'});
        if(req.method!=='GET' && req.headers['content-type']!=='application/json') return json(res,415,{error:'JSON_REQUIRED'});
        if(url.pathname==='/api/health'&&req.method==='GET'){res.setHeader('Connection','close');return json(res,200,{state:'ready',pid:process.pid,version:'stability-v1'});}
        if(url.pathname==='/api/settings/image-output'&&req.method==='GET')return json(res,200,imageOutput.snapshot());
        if(url.pathname==='/api/settings/image-output'&&req.method==='POST'){
          if(planExecution.busy()||nativePreparation.busyCheck()||nativeBatch.busy()||researchImage.status().busy)throw Error('OUTPUT_DIRECTORY_BUSY');
          return json(res,200,imageOutput.save((await body(req,2048)).directory));
        }
        if(url.pathname==='/api/settings/image-output/open'&&req.method==='POST'){
          const kind=(await body(req,128)).kind,dir=imageOutput.snapshot()[{api:'apiDirectory',pro:'proDirectory',cas:'casDirectory'}[kind]];
          if(!dir||!fs.existsSync(dir))throw Error('OUTPUT_DIRECTORY_NOT_FOUND');
          const child=require('node:child_process').spawn('explorer.exe',[dir],{windowsHide:true,stdio:'ignore'});
          await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();return json(res,200,{opened:true});
        }
        if(url.pathname==='/api/state' && req.method==='GET'){
          const batch=nativeBatch.status(),single=nativeExecution.status();
          const nativeBridge={implemented:true,realImageVerified:single.state==='generated'||(batch.entries||[]).some(e=>e.state==='generated'&&e.imageCalls===1),batchState:batch.state,activeWorkers:(batch.entries||[]).filter(e=>['submitted','running'].includes(e.state)).length+(nativeExecution.busy()?1:0),model:batch.requestedModel||nativePreparation.status().model||null};
          return json(res,200,{...store.snapshot(),connection,probeBusy,nativeBridge,apiImage:{configured:apiKeyConfigured},planGraphConcurrency:'execute-node-v1',planExecution:planExecution.summary(),researchCapacity:readResearchCapacity(ROOT),production:readProjection(project),control:commandCenter.snapshot(runtime,project)});
        }
        if(url.pathname==='/api/conversations'&&req.method==='GET')return json(res,200,await conversations({cursor:url.searchParams.get('cursor'),query:(url.searchParams.get('query')||'').slice(0,160),archived:url.searchParams.get('archived')==='true'}));
        if(url.pathname==='/api/gallery/batches'&&req.method==='GET')return json(res,200,gallery.list());
        if(url.pathname==='/api/gallery/items'&&req.method==='GET')return json(res,200,gallery.page({batchId:url.searchParams.get('batchId'),page:Number(url.searchParams.get('page')||0),limit:url.searchParams.get('limit')==='all'?'all':Number(url.searchParams.get('limit')||24),status:url.searchParams.get('status')||'all',query:url.searchParams.get('query')||''}));
        if(url.pathname==='/api/gallery/image'&&req.method==='GET'){const file=gallery.image(url.searchParams.get('batchId'),url.searchParams.get('id'));res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'private, max-age=3600'});fs.createReadStream(file).pipe(res);return;}
        if(url.pathname==='/api/research/prompt'&&req.method==='GET')return json(res,200,batchPrompt.snapshot(runtime));
        if(url.pathname==='/api/research/gpt/status'&&req.method==='GET')return json(res,200,researchGpt.status());
        if(url.pathname==='/api/research/key'&&req.method==='POST'){try{const saved=keyStore.save((await body(req,2048)).apiKey);apiKeyConfigured=true;return json(res,200,saved);}catch(e){const format=e.message==='API_KEY_FORMAT',blocked=e.message==='KEY_STORE_PROCESS_BLOCKED',existing=!!keyStore.get();return json(res,400,{error:format?e.message:blocked?'KEY_STORE_PROCESS_BLOCKED':'KEY_STORE_UNAVAILABLE',configured:existing,message:format?'API Key 格式不正确。':existing?'新 Key 未保存，原 Key 仍可使用；没有调用图片 API。':blocked?'本地服务被运行环境限制，无法启动 Windows 加密组件；Key 未保存，也未调用图片 API。':'本机加密保存失败；Key 未保存，也未调用图片 API。'});}}
        if(url.pathname==='/api/research/key/copy'&&req.method==='POST'){
          await body(req,32);
          const apiKey=keyStore.get();
          return apiKey?json(res,200,{apiKey}):json(res,404,{error:'API_KEY_MISSING',message:'没有可复制的 API Key，请先在本机保存。'});
        }
        if(url.pathname==='/api/research/gpt/analyze'&&req.method==='POST'){const result=await researchGpt.analyze(await body(req,8192));return json(res,result.status,result.value);}
        if(url.pathname==='/api/research/image/status'&&req.method==='GET')return json(res,200,researchImage.status());
        if(url.pathname==='/api/research/image/generate'&&req.method==='POST'){const result=await researchImage.generate(await body(req,8192));return json(res,result.status,result.value);}
        if(url.pathname==='/api/research/image/file'&&req.method==='GET'){const file=researchImage.read(url.searchParams.get('id'));if(!file)return json(res,404,{error:'IMAGE_NOT_FOUND'});res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'private, no-store'});fs.createReadStream(file).pipe(res);return;}
        if(url.pathname==='/api/research/prompt'&&req.method==='POST')return json(res,200,batchPrompt.write(runtime,await body(req,65536)));
        if(url.pathname==='/api/command' && req.method==='POST')return json(res,200,commandCenter.request(runtime,await body(req),project));
        if(url.pathname==='/api/native/prepare'&&req.method==='POST')return json(res,200,await nativePreparation.prepare(await body(req)));
        if(url.pathname==='/api/native/status'&&req.method==='GET')return json(res,200,nativePreparation.status());
        if(url.pathname==='/api/native/execute'&&req.method==='POST')return json(res,200,await nativeExecution.execute(await body(req)));
        if(url.pathname==='/api/native/result'&&req.method==='GET')return json(res,200,nativeExecution.status());
        if(url.pathname==='/api/native/close'&&req.method==='POST'){await body(req);return json(res,200,nativePreparation.close());}
        if(url.pathname==='/api/native/batch/prepare'&&req.method==='POST')return json(res,202,nativeBatch.prepare(await body(req,8192)));
        if(url.pathname==='/api/native/batch/status'&&req.method==='GET')return json(res,200,nativeBatch.status());
        if(url.pathname==='/api/native/batch/execute'&&req.method==='POST')return json(res,200,await nativeBatch.execute(await body(req)));
        if(url.pathname==='/api/native/batch/result'&&req.method==='GET')return json(res,200,nativeBatch.result(url.searchParams.get('jobId')));
        if(url.pathname==='/api/native/batch/wait'&&req.method==='GET')return json(res,200,await nativeBatch.wait(url.searchParams.get('jobId'),url.searchParams.get('afterUpdatedAt')));
        if(url.pathname==='/api/native/batch/close'&&req.method==='POST'){await body(req);return json(res,200,nativeBatch.close());}
        if(url.pathname==='/api/plan/pause'&&req.method==='POST'){const input=await body(req,1024);return json(res,200,planExecution.pause(input.executionId));}
        if(url.pathname==='/api/plan/quality-sample'&&req.method==='POST')return json(res,202,planExecution.executeQualitySample(await body(req,262144)));
        if(url.pathname==='/api/plan/execute'&&req.method==='POST')return json(res,202,planExecution.execute(await body(req,262144)));
        if(url.pathname==='/api/plan/execution'&&req.method==='GET')return json(res,200,planExecution.summary());
        if(url.pathname==='/api/plan/orders'&&req.method==='GET')return json(res,200,{orders:planExecution.orders()});
        if(url.pathname==='/api/plan/check'&&req.method==='POST'){await body(req);return json(res,200,await planExecution.checkCurrent());}
        if(url.pathname==='/api/plan/replace-missing'&&req.method==='POST'){const input=await body(req,1024);return json(res,200,planExecution.replaceMissingCards(input.executionId));}
        if(url.pathname==='/api/plan/reconcile-moderation'&&req.method==='POST'){await body(req,1024);return json(res,200,planExecution.reconcileModeration());}
        if(url.pathname==='/api/plan' && req.method==='POST'){const input=await body(req,262144);for(const n of input.nodes||[])if(n.vocabularyScope&&n.vocabularyScope.mode!=='auto-missing'){const current=vocabularyScope(n.vocabularyScope);if(!current.selectedCount||current.selectionHash!==n.vocabularyScope.selectionHash||current.selectedCount!==n.vocabularyScope.selectedCount)throw Error('VOCABULARY_SCOPE_STALE');}return json(res,200,plans.submit(runtime,input));}
        if(url.pathname==='/api/registry' && req.method==='GET')return json(res,200,registry.list({query:url.searchParams.get('query')||'',status:url.searchParams.get('status')||'all',page:Number(url.searchParams.get('page')||0),limit:Number(url.searchParams.get('limit')||20)}));
        if(url.pathname==='/api/registry/scope' && req.method==='GET')return json(res,200,vocabularyScope({source:url.searchParams.get('source')||'registered',status:url.searchParams.get('status')||'available',partOfSpeech:url.searchParams.get('partOfSpeech')||'all',level:url.searchParams.get('level')||'all',query:url.searchParams.get('query')||'',offset:Number(url.searchParams.get('offset')||0),limit:Number(url.searchParams.get('limit')||50)}));
        if(url.pathname==='/api/registry/live/selection' && req.method==='POST')return json(res,200,liveVocabulary.select(await body(req,262144)));
        if(url.pathname==='/api/registry/live' && req.method==='GET')return json(res,200,liveVocabulary.list({query:url.searchParams.get('query')||'',page:Number(url.searchParams.get('page')||0),limit:Number(url.searchParams.get('limit')||10)}));
        if(url.pathname==='/api/vocabulary-stats/summary' && req.method==='GET'){
          const result=await vocabularyStats.summary();return json(res,result.status,result.value);
        }
        if(url.pathname==='/api/registry/item' && req.method==='GET')return json(res,200,registry.item(url.searchParams.get('key')));
        if(url.pathname==='/api/registry/request' && req.method==='POST')return json(res,200,registry.propose(await body(req,8192)));
        if(url.pathname==='/api/registry/cancel' && req.method==='POST'){const v=await body(req);return json(res,200,registry.transition({id:v.id,action:'cancel',reason:v.reason}));}
        if(url.pathname==='/api/image' && req.method==='GET'){
          const file=commandCenter.imagePath(url.searchParams.get('attemptId'),project);
          res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'private, max-age=3600'});fs.createReadStream(file).pipe(res);return;
        }
        if(url.pathname==='/api/config' && req.method==='POST'){store.configure(await body(req));pump();return json(res,200,{ok:true});}
        if(url.pathname==='/api/demo' && req.method==='POST'){await body(req);return json(res,200,store.import(fixtureManifest()));}
        if(url.pathname==='/api/shutdown' && req.method==='POST'){await body(req);if(planExecution.busy()||nativePreparation.busyCheck()||nativeBatch.busy())return json(res,409,{error:'NATIVE_EXECUTION_REQUIRES_RECONCILIATION'});json(res,200,{ok:true});setImmediate(()=>stop());return;}
        if(url.pathname==='/api/probe' && req.method==='POST'){
          await body(req); if(probeBusy)return json(res,409,{error:'PROBE_IN_PROGRESS'});probeBusy=true;
          try{connection=await probe(); fs.writeFileSync(probeFile+'.tmp',JSON.stringify(connection,null,2));fs.renameSync(probeFile+'.tmp',probeFile);return json(res,200,connection);}
          finally{probeBusy=false;}
        }
        if(url.pathname==='/api/receipt' && req.method==='GET')return json(res,200,store.receipt(url.searchParams.get('id')));
        return json(res,404,{error:'UNKNOWN_OPERATION'});
      }
      if(req.method==='GET'&&['/app-icon.png','/app-icon.ico'].includes(url.pathname)){res.writeHead(200,{'Content-Type':url.pathname.endsWith('.png')?'image/png':'image/x-icon','Cache-Control':'no-cache'});fs.createReadStream(path.join(ROOT,'assets',url.pathname.slice(1))).pipe(res);return;}
      const assets={'/':['command.html','text/html; charset=utf-8'],'/guide':['guide.html','text/html; charset=utf-8'],'/app.js':['command-ui.js','text/javascript; charset=utf-8'],'/motion.js':['motion.js','text/javascript; charset=utf-8'],'/motion.css':['motion.css','text/css; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8'],'/command.css':['command.css','text/css; charset=utf-8']};
      assets['/graph.js']=['graph-ui.js','text/javascript; charset=utf-8'];assets['/graph.css']=['graph.css','text/css; charset=utf-8'];
      assets['/output-settings.js']=['output-settings.js','text/javascript; charset=utf-8'];
      assets['/registry.js']=['registry-ui.js','text/javascript; charset=utf-8'];assets['/registry.css']=['registry.css','text/css; charset=utf-8'];
      assets['/stats.js']=['stats-ui.js','text/javascript; charset=utf-8'];assets['/stats.css']=['stats.css','text/css; charset=utf-8'];
      assets['/workflow.js']=['workflow-ui.js','text/javascript; charset=utf-8'];assets['/workflow.css']=['workflow.css','text/css; charset=utf-8'];
      assets['/gallery.js']=['gallery-ui.js','text/javascript; charset=utf-8'];
      assets['/plan-flow.js']=['plan-flow.js','text/javascript; charset=utf-8'];
      assets['/vocabulary.js']=['vocabulary-ui.js','text/javascript; charset=utf-8'];
      assets['/conversations.js']=['conversations-ui.js','text/javascript; charset=utf-8'];
      assets['/gpt.js']=['gpt-ui.js','text/javascript; charset=utf-8'];
      const entry=assets[url.pathname]; if(!entry||req.method!=='GET')return json(res,404,{error:'NOT_FOUND'});
      res.writeHead(200,{'Content-Type':entry[1],'Cache-Control':'no-store'});res.end(fs.readFileSync(path.join(ROOT,'ui',entry[0])));
    } catch(e){json(res,400,{error:/^[A-Z0-9_]+$/.test(e.message)?e.message:'REQUEST_REJECTED'});}
  });
  async function stop(){
    if(stopping)return;if(planExecution.busy()||nativePreparation.busyCheck()||nativeBatch.busy())throw Error('NATIVE_EXECUTION_REQUIRES_RECONCILIATION');stopping=true;clearInterval(tick);for(const t of timers)clearTimeout(t);
    nativePreparation.close('WORKBENCH_STOPPED');
    nativeBatch.close();
    store.recover(); await new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();}); store.close();planExecution.close();
    for(const file of [lock,...(reuseEndpoint?[]:[path.join(runtime,'connection.json')])])if(fs.existsSync(file))fs.unlinkSync(file);
  }
  const ready=new Promise((resolve,reject)=>{server.once('error',e=>{clearInterval(tick);store.close();if(fs.existsSync(lock))fs.unlinkSync(lock);reject(e);});server.listen(port,'127.0.0.1',()=>{
    origin=`http://127.0.0.1:${server.address().port}`;
    const connectionFile=path.join(runtime,'connection.json');
    fs.writeFileSync(connectionFile+'.tmp',JSON.stringify({pid:process.pid,url:origin,token}),{mode:0o600});
    fs.renameSync(connectionFile+'.tmp',connectionFile);
    resolve({origin,token,store,stop,server});
  });});
  return ready;
}
if(require.main===module)start().then(app=>{console.log(`工作台已启动：${app.origin}（请通过启动脚本打开带本地会话的窗口）`);process.on('SIGINT',()=>app.stop().then(()=>process.exit()));process.on('SIGTERM',()=>app.stop().then(()=>process.exit()));}).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={start};
