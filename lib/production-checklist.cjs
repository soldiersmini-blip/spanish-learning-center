'use strict';
// Read-only admission projection. Identity is independent of filenames, job IDs and prompts.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const ROOT = 'staff/02-spanish-engineering/storage-tools/';
const SOURCES = {
  index: 'staff/04-spanish-lexicon/word-registry/incoming/index.json',
  queue: 'staff/04-spanish-lexicon/word-registry/incoming/image-queue.json',
  delivery: 'staff/05-spanish-teaching/word-registry-images/delivery.json',
  teaching: 'staff/05-spanish-teaching/word-registry-images/status.json',
  run: ROOT + 'IMAGE-FACTORY-RUN-CURRENT.json',
  previous: ROOT + 'IMAGE-FACTORY-RUN-PREVIOUS.json'
};
const keyOf = x => crypto.createHash('sha256').update(JSON.stringify([x.entryId,x.senseId,x.sourceRevision])).digest('hex');
const hash = x => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
// Same entry hash and semantic-sense hash as 04 register-incoming.cjs; these are different revisions.
function currentSource(project, reg, item) {
  if (!/^words\/[a-f0-9]{24}$/.test(reg.directory || '') || !/^[a-f0-9]{64}$/.test(reg.sourceRevision || '')) return false;
  const entry = read(path.join(project,path.dirname(SOURCES.index),reg.directory,'entry.json'));
  if (entry.id !== item.entryId || hash(entry) !== reg.sourceRevision || entry.registrationReview?.status !== 'passed-scoped-lexical-review') return false;
  const sense = entry.registrationReview.senses?.find(x => x.id === item.senseId);
  if (!sense) return false;
  const semanticSense = sense.illustrationContext ? {...sense,illustrationContext:{context:sense.illustrationContext.context,illustrationPlan:sense.illustrationContext.illustrationPlan}} : sense;
  return hash({entryId:entry.id,spanish:entry.spanish,partOfSpeech:sense.partOfSpeech,gender:sense.gender,forms:entry.forms,sense:semanticSense}) === item.sourceRevision;
}
function read(file, optional = false) {
  if (optional && !fs.existsSync(file)) return null;
  const before = fs.statSync(file);
  if (!before.isFile() || before.size > (/^IMAGE-FACTORY-RUN-/.test(path.basename(file))?require('./production-limits.cjs').RUN_BYTES:40 * 1024 ** 2)) throw Error('CHECKLIST_SOURCE_SIZE');
  const bytes = fs.readFileSync(file), after = fs.statSync(file);
  if (before.mtimeMs !== after.mtimeMs || before.size !== after.size || bytes.length !== before.size) throw Error('CHECKLIST_SOURCE_CHANGED');
  return JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
}
function validIdentity(x) { return ['entryId','senseId','sourceRevision'].every(k => typeof x?.[k] === 'string' && x[k].trim() && x[k].length <= 300); }
function load(project, run) {
  const d = Object.fromEntries(Object.entries(SOURCES).map(([name, rel]) => [name, name === 'run' && run ? run : read(path.join(project,rel), name === 'previous')]));
  if (d.index.schemaVersion !== 1 || d.queue.schemaVersion !== 1 || !Array.isArray(d.index.entries) || !Array.isArray(d.queue.items) || !Array.isArray(d.delivery.items) || !Array.isArray(d.teaching.externalIntakeDecisions?.held) || !Array.isArray(d.teaching.externalImageReservations?.items) || !Array.isArray(d.run.attempts) || (d.previous && !Array.isArray(d.previous.attempts)) || (d.teaching.claimed != null && !Array.isArray(d.teaching.claimed))) throw Error('CHECKLIST_SOURCE_SCHEMA');
  const arrays = [d.queue.items,d.delivery.items,d.teaching.externalIntakeDecisions.held,d.teaching.externalImageReservations.items,d.teaching.claimed || [],d.run.attempts,d.previous?.attempts || []];
  if (arrays.some(rows => rows.length > 30000 || rows.some(x => !validIdentity(x)))) throw Error('CHECKLIST_SOURCE_IDENTITY');
  if (new Set(d.queue.items.map(keyOf)).size !== d.queue.items.length) throw Error('CHECKLIST_DUPLICATE_SOURCE');
  return d;
}
function inspect(project, items, {ownAttemptId, dispatchId, run, reviewAfterGeneration = false} = {}) {
  if (!Array.isArray(items) || items.length > 50 || items.some(x => !validIdentity(x))) throw Error('CHECKLIST_INPUT');
  const d = load(project, run), seen = new Set();
  const claims = require('./production-claims.cjs').readClaims(project, items.map(keyOf));
  return items.map(item => {
    const key = keyOf(item), same = x => reviewAfterGeneration ? x.entryId === item.entryId : keyOf(x) === key;
    const out = (status, reason, evidence = null) => ({key,entryId:item.entryId,senseId:item.senseId,sourceRevision:item.sourceRevision,status,reason,evidence,allowed:status === 'new',newCoverageCandidate:status === 'new'});
    if (seen.has(key)) return out('duplicate','同一清单重复义项；更换任务编号不产生新任务。');
    seen.add(key);
    if (item.purpose && item.purpose !== 'registered-missing-image') return out('rework-review','返修或风格对照不能作为缺图生产；需另行核准原图与返修范围。');
    const q = d.queue.items.find(x => keyOf(x) === key), reg = d.index.entries.find(x => x.entryId === item.entryId);
    if ((!q && !reviewAfterGeneration) || !reg?.stageEligible || !currentSource(project,reg,item)) return out('stale','词库正文、注册版本与义项版本未一致，请重新核对清单。');
    const held = d.teaching.externalIntakeDecisions.held.find(x => same(x) && !x.resolvedAt);
    if ((!reviewAfterGeneration && (q?.qualityHold || held)) || held?.sha256 || held?.image || held?.artifact) return out('hold','已有质量保留；不能把返修当成新图重复生产。',held?.sha256 || null);
    const delivered = d.delivery.items.find(same);
    if (d.queue.items.some(x => same(x) && x.status === 'archived-reviewed') || delivered) return out('covered','已有收件或交付，先查看原结果。',delivered?.sha256 || delivered?.image?.sha256 || null);
    const prior = [...d.previous?.attempts || [],...d.run.attempts].filter(a => same(a) && !(a.attemptId === ownAttemptId && a.jobId === item.jobId));
    const last = prior.at(-1);
    const safeRecovery = last && item.recoveryOfAttemptId === last.attemptId && last.jobId === item.jobId && prior.every(a => !a.artifact && !a.itemId && !a.generationId && !a.toolStartedAt && !a.toolCompletedAt && ((a.state === 'failed' && a.failureReconciliation?.confirmedNoImageCall === true) || (a.state === 'deferred' && !a.submittedAt && !a.turnId)));
    if (last && !safeRecovery) return out(['submitted','queued','running'].includes(last.state)?'inflight':last.state === 'unknown'?'unknown':'recorded','已有执行记录，先对账或审核；不能自动重试。',{attemptId:last.attemptId || null,state:last.state,sha256:last.artifact?.sha256 || null});
    const apiClaim=path.join(project,'staff/15-spanish-research/desktop-image-workbench/runtime/api-plan/claims',key+'.json');
    if(fs.existsSync(apiClaim))return out('claimed','API 方案已领取该义项；先核对图片或待审核回执，不能切换来源重复生图。');
    if(reviewAfterGeneration && fs.existsSync(path.join(project,'staff/15-spanish-research/desktop-image-workbench/runtime/api-plan/entry-claims',crypto.createHash('sha256').update(item.entryId).digest('hex')+'.json')))return out('claimed','此词卡已有 API 领取记录，不能换义项或版本重复生成。');
    const claim = claims.get(key);
    if (claim && claim.attemptId !== ownAttemptId && !(safeRecovery && claim.attemptId === last.attemptId)) return out('claimed','持久防重记录已占用；重启、换批次或改提示词不会释放。',{attemptId:claim.attemptId,receiptPath:claim.receiptPath});
    const reservation = [...d.teaching.externalImageReservations.items,...d.teaching.claimed || []].find(x => same(x) && !(dispatchId && x.dispatchId === dispatchId && x.jobId === item.jobId));
    if (reservation) return out('reserved','已有领取或独占派单；缺少与当前正式派单一致的绑定，需先核对。');
    if (!reviewAfterGeneration && (q.status !== 'ready' || !q.imageBrief || q.lexicalReviewStatus !== 'passed-scoped-lexical-review')) return out('context','尚未达到缺图生产条件，先补语境或核验。');
    return out('new','身份检查通过；仍需正式派单、租约与执行门禁。');
  });
}
function assertEligible(project, items, options) {
  const rows = inspect(project,items,options), blocked = rows.find(x => !x.allowed);
  if (blocked) throw Error('CHECKLIST_' + blocked.status.toUpperCase().replaceAll('-','_') + ': ' + blocked.reason);
  return rows;
}
module.exports = {SOURCES,keyOf,inspect,assertEligible,currentSource};
