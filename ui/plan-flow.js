'use strict';
// Same dependency interpretation in the browser and the saved server proposal.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.WorkbenchPlanFlow=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 function derive(plan){
  const allNodes=plan.nodes||[],allEdges=plan.edges||[],executeNodes=allNodes.filter(n=>n.type==='execute'),hasExecute=executeNodes.length>0;
  if(plan.schemaVersion===3&&!hasExecute)return {version:1,hasExecute:false,executeNodeId:null,activeNodeIds:[],enabled:false,valid:false,vocabularyDemands:[],totalQuantity:0,branchWidth:0,requestedConcurrency:2,dependencyRule:'all-predecessors-complete',steps:[],errors:[{code:'PLAN_EXECUTION_NODE_REQUIRED',nodeIds:[]}]};
  let ancestors=null;
  if(hasExecute){const parents=new Map();for(const e of allEdges){if(!parents.has(e.to))parents.set(e.to,new Set());parents.get(e.to).add(e.from);}ancestors=new Set(executeNodes.map(n=>n.id));const pending=[...ancestors];while(pending.length){for(const from of parents.get(pending.pop())||[]){if(!ancestors.has(from)){ancestors.add(from);pending.push(from);}}}}
  const nodes=hasExecute?allNodes.filter(n=>ancestors.has(n.id)):allNodes,edges=hasExecute?allEdges.filter(e=>ancestors.has(e.from)&&ancestors.has(e.to)):allEdges,byId=new Map(allNodes.map(n=>[n.id,n])),roots=hasExecute?nodes.filter(n=>n.type==='user-order').map(n=>n.id):['dispatch',...nodes.filter(n=>n.type==='user-order').map(n=>n.id)],adj=new Map();
  for(const e of edges){if(!adj.has(e.from))adj.set(e.from,new Set());adj.get(e.from).add(e.to);}
  const reachable=new Set(),stack=[...roots];while(stack.length){const id=stack.pop();if(reachable.has(id))continue;reachable.add(id);for(const to of adj.get(id)||[])stack.push(to);}
  const degree=new Map([...reachable].map(id=>[id,0]));for(const from of reachable)for(const to of adj.get(from)||[])degree.set(to,degree.get(to)+1);
  const queue=[...reachable].filter(id=>degree.get(id)===0),order=[];for(let i=0;i<queue.length;i++){const id=queue[i];order.push(id);for(const to of adj.get(id)||[]){degree.set(to,degree.get(to)-1);if(!degree.get(to))queue.push(to);}}
  const errors=[],enabled=nodes.some(n=>n.type==='card'&&(hasExecute||n.batchSize!==undefined));
  if(executeNodes.length>1)errors.push({code:'PLAN_EXECUTE_NODE_MULTIPLE',nodeIds:executeNodes.map(n=>n.id)});
  const cycles=[...reachable].filter(id=>degree.get(id)>0);if(cycles.length)errors.push({code:'PLAN_FLOW_CYCLE',nodeIds:cycles});
  const disconnected=nodes.filter(n=>n.type==='card'&&(hasExecute||n.batchSize!==undefined)&&!reachable.has(n.id)).map(n=>n.id);if(disconnected.length)errors.push({code:'PLAN_FLOW_DISCONNECTED',nodeIds:disconnected});
  const missing=nodes.filter(n=>n.type==='card'&&reachable.has(n.id)&&n.batchSize===undefined).map(n=>n.id);if(missing.length)errors.push({code:'PLAN_FLOW_QUANTITY_REQUIRED',nodeIds:missing});
  const incoming=new Map(),stages=new Map(),steps=[];
  for(const id of order){const n=byId.get(id),after=[...(incoming.get(id)||[])].sort();let forwarded=new Set(after);
   if(n?.type==='card'){const stage=1+Math.max(0,...after.map(id=>stages.get(id)||0));stages.set(id,stage);steps.push({nodeId:id,quantity:n.batchSize??null,after,stage});forwarded=new Set([id]);}
   for(const to of adj.get(id)||[]){if(!incoming.has(to))incoming.set(to,new Set());for(const dep of forwarded)incoming.get(to).add(dep);}
  }
  const stageWidths=new Map();for(const step of steps)stageWidths.set(step.stage,(stageWidths.get(step.stage)||0)+1);
  const branchWidth=Math.max(0,...stageWidths.values()),requestedConcurrency=Math.max(2,branchWidth);
  if(branchWidth>50)errors.push({code:'PLAN_FLOW_CONCURRENCY_LIMIT',nodeIds:steps.filter(s=>stageWidths.get(s.stage)>50).map(s=>s.nodeId),branchWidth});
  const vocabularyDemands=[];
  for(const source of nodes.filter(n=>n.type==='user-order')){const visited=new Set(),todo=[...(adj.get(source.id)||[])];while(todo.length){const id=todo.pop();if(visited.has(id)||byId.get(id)?.type==='user-order')continue;visited.add(id);for(const to of adj.get(id)||[])todo.push(to);}const slots=nodes.filter(n=>visited.has(n.id)&&n.type==='card'&&Number.isInteger(n.batchSize)),required=slots.reduce((sum,n)=>sum+n.batchSize,0),automatic=source.vocabularyScope?.mode==='auto-missing',selected=automatic?null:source.vocabularyScope?.selectedCount??null;if(hasExecute&&!slots.length)continue;vocabularyDemands.push({nodeId:source.id,required,selected,automatic,slotCount:slots.length});if(automatic&&required>1000)errors.push({code:'PLAN_AUTO_SCOPE_LIMIT',nodeIds:[source.id],required});if(selected!==null&&required>selected)errors.push({code:'PLAN_SCOPE_SHORTAGE',nodeIds:[source.id],required,selected,shortage:required-selected});}
  return {version:1,hasExecute,executeNodeId:executeNodes.length===1?executeNodes[0].id:null,activeNodeIds:hasExecute?[...ancestors]:[],enabled,valid:errors.length===0,vocabularyDemands,totalQuantity:steps.reduce((sum,s)=>sum+(s.quantity||0),0),branchWidth,requestedConcurrency,dependencyRule:'all-predecessors-complete',steps,errors};
 }
 return {derive};
});
