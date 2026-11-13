'use strict';
const { DatabaseSync } = require('node:sqlite');
const { mkdirSync, realpathSync, readFileSync, statSync } = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const LEAD = '01a13637-abd8-7151-9fdd-cae83f313ba1';
const digest = value => createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(sort(value));
function sort(v) { return Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sort(v[k])])) : v; }
function assert(ok, code) { if (!ok) throw new Error(code); }
function bounded(v, n = 180) { return typeof v === 'string' && v.length > 0 && v.length <= n && !/[\u0000-\u001f]/.test(v); }
function keys(v, allowed) { assert(v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every(k => allowed.includes(k)), 'SCHEMA_FIELDS'); }
function validate(m) {
  keys(m, ['schemaVersion','requestId','mode','requestedByThreadId','createdAt','dispatchRef','jobs']);
  assert(m.schemaVersion === 1 && ['fixture','production'].includes(m.mode), 'SCHEMA_VERSION_OR_MODE');
  assert(bounded(m.requestId) && bounded(m.requestedByThreadId) && bounded(m.createdAt) && Number.isFinite(Date.parse(m.createdAt)), 'REQUEST_IDENTITY');
  assert(m.requestedByThreadId === LEAD || (m.mode === 'fixture' && m.requestedByThreadId === 'fixture'), 'DISPATCHER_NOT_BOUND');
  assert(Array.isArray(m.jobs) && m.jobs.length > 0 && m.jobs.length <= 20, 'BATCH_SIZE_1_TO_20');
  if (m.mode === 'production') {
    keys(m.dispatchRef, ['absolutePath','dispatchId','revision','sha256']);
    assert(path.isAbsolute(m.dispatchRef.absolutePath || '') && bounded(m.dispatchRef.dispatchId), 'DISPATCH_REF');
    assert(bounded(m.dispatchRef.revision) || /^[a-f0-9]{64}$/.test(m.dispatchRef.sha256 || ''), 'DISPATCH_VERSION');
  }
  const ids = new Set();
  for (const j of m.jobs) {
    keys(j, ['jobId','entryId','senseId','sourceRevision','prompt','promptHash','referenceImages','executorThreadId']);
    assert(['jobId','entryId','senseId','sourceRevision','executorThreadId'].every(k => bounded(j[k])), 'JOB_IDENTITY');
    assert(typeof j.prompt === 'string' && j.prompt.length > 0 && Buffer.byteLength(j.prompt) <= 8192, 'PROMPT_SIZE');
    assert(j.promptHash === digest(j.prompt), 'PROMPT_HASH');
    assert(j.executorThreadId === LEAD || (m.mode === 'fixture' && j.executorThreadId === 'fixture'), 'EXECUTOR_NOT_BOUND');
    assert(Array.isArray(j.referenceImages) && j.referenceImages.length <= 5, 'REFERENCE_LIMIT');
    for (const r of j.referenceImages) {
      keys(r, ['path','sha256']);
      assert(bounded(r.path, 1024) && path.isAbsolute(r.path) && /^[a-f0-9]{64}$/.test(r.sha256), 'REFERENCE_IDENTITY');
    }
    assert(!ids.has(j.jobId), 'DUPLICATE_JOB_ID'); ids.add(j.jobId);
  }
  return m;
}
function readManifest(file, intake) {
  const root = realpathSync(intake), target = realpathSync(file);
  const rel = path.relative(root, target);
  assert(rel && !rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel), 'INTAKE_PATH_REQUIRED');
  assert(path.extname(target).toLowerCase() === '.json' && statSync(target).isFile() && statSync(target).size <= 200000, 'MANIFEST_SIZE_OR_TYPE');
  return validate(JSON.parse(readFileSync(target, 'utf8').replace(/^\uFEFF/, '')));
}
class Store {
  constructor(root) {
    mkdirSync(root, { recursive: true });
    this.db = new DatabaseSync(path.join(root, 'workbench.sqlite'));
    this.db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=DELETE; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,hash TEXT NOT NULL,body TEXT NOT NULL,created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,request_id TEXT NOT NULL REFERENCES requests(id),identity TEXT UNIQUE NOT NULL,
        mode TEXT NOT NULL,body TEXT NOT NULL,state TEXT NOT NULL,slot INTEGER,attempt TEXT,started INTEGER,finished INTEGER,error TEXT);
      CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,at INTEGER NOT NULL,type TEXT NOT NULL,job_id TEXT,detail TEXT);
      INSERT OR IGNORE INTO settings VALUES('paused','true'); INSERT OR IGNORE INTO settings VALUES('concurrency','5');`);
  }
  close() { this.db.close(); }
  tx(fn) { this.db.exec('BEGIN IMMEDIATE'); try { const r = fn(); this.db.exec('COMMIT'); return r; } catch (e) { this.db.exec('ROLLBACK'); throw e; } }
  event(type, id = null, detail = null) {
    this.db.prepare('INSERT INTO events(at,type,job_id,detail) VALUES(?,?,?,?)').run(Date.now(), type, id, detail);
    this.db.exec('DELETE FROM events WHERE seq < (SELECT COALESCE(MAX(seq),0)-199 FROM events)');
  }
  setting(k) { return JSON.parse(this.db.prepare('SELECT value FROM settings WHERE key=?').get(k).value); }
  configure({ paused, concurrency }) {
    assert(typeof paused === 'boolean' && Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 20, 'INVALID_SETTINGS');
    return this.tx(() => { this.db.prepare('UPDATE settings SET value=? WHERE key=?').run(JSON.stringify(paused),'paused'); this.db.prepare('UPDATE settings SET value=? WHERE key=?').run(String(concurrency),'concurrency'); this.event('admission',null,paused ? 'paused' : 'fixture-only'); });
  }
  import(m) {
    validate(m); const body = canonical(m), hash = digest(body);
    return this.tx(() => {
      const old = this.db.prepare('SELECT hash FROM requests WHERE id=?').get(m.requestId);
      if (old) { assert(old.hash === hash, 'REQUEST_ID_CONFLICT'); return { requestId:m.requestId, duplicate:true, accepted:0 }; }
      assert(this.db.prepare('SELECT COUNT(*) n FROM jobs').get().n + m.jobs.length <= 1000, 'LOCAL_JOB_CAPACITY');
      this.db.prepare('INSERT INTO requests VALUES(?,?,?,?)').run(m.requestId,hash,body,m.createdAt);
      for (const j of m.jobs) {
        const identity = digest(canonical([m.mode,j.entryId,j.senseId,j.sourceRevision]));
        assert(!this.db.prepare('SELECT id FROM jobs WHERE id=? OR identity=?').get(j.jobId,identity), 'JOB_OR_IDENTITY_CONFLICT');
        this.db.prepare('INSERT INTO jobs(id,request_id,identity,mode,body,state) VALUES(?,?,?,?,?,?)').run(j.jobId,m.requestId,identity,m.mode,canonical(j),m.mode === 'fixture' ? 'queued' : 'proposed');
      }
      this.event('import',null,`${m.mode}:${m.jobs.length}`);
      return { requestId:m.requestId, duplicate:false, accepted:m.jobs.length, state:m.mode === 'fixture' ? 'queued' : 'proposed' };
    });
  }
  recover() {
    return this.tx(() => { const n = this.db.prepare("UPDATE jobs SET state='unknown',error='RESTART_RECONCILE_REQUIRED',slot=NULL WHERE state='running'").run().changes;
      this.db.prepare("UPDATE settings SET value='true' WHERE key='paused'").run(); if(n) this.event('recovery',null,`${n} unknown`); return n; });
  }
  claim() {
    return this.tx(() => {
      if (this.setting('paused')) return null;
      const active = this.db.prepare("SELECT slot FROM jobs WHERE state='running'").all();
      const n = this.setting('concurrency'); if (active.length >= n) return null;
      const j = this.db.prepare("SELECT * FROM jobs WHERE state='queued' AND mode='fixture' ORDER BY rowid LIMIT 1").get();
      if(!j) return null;
      let slot = 1; while(active.some(x => x.slot === slot)) slot++;
      const attempt = randomUUID(), now = Date.now();
      this.db.prepare("UPDATE jobs SET state='running',slot=?,attempt=?,started=?,error=NULL WHERE id=?").run(slot,attempt,now,j.id);
      this.event('claimed',j.id,attempt); return {...j,slot,attempt,started:now};
    });
  }
  finish(id, attempt) {
    return this.tx(() => { const n = this.db.prepare("UPDATE jobs SET state='simulated',finished=?,slot=NULL WHERE id=? AND attempt=? AND state='running' AND mode='fixture'").run(Date.now(),id,attempt).changes; if(n) this.event('simulated',id); return n === 1; });
  }
  receipt(id) {
    const j = this.db.prepare('SELECT * FROM jobs WHERE id=?').get(id); assert(j,'JOB_NOT_FOUND');
    return { schemaVersion:1,requestId:j.request_id,jobId:j.id,attemptId:j.attempt,state:j.state,mode:j.mode,errorCode:j.error,realImageProduced:false };
  }
  snapshot() {
    const counts = Object.fromEntries(this.db.prepare('SELECT state,COUNT(*) n FROM jobs GROUP BY state').all().map(x => [x.state,x.n]));
    const jobs = this.db.prepare('SELECT * FROM jobs ORDER BY rowid DESC LIMIT 100').all().map(j => ({id:j.id,requestId:j.request_id,mode:j.mode,state:j.state,slot:j.slot,attempt:j.attempt,started:j.started,finished:j.finished,error:j.error,...JSON.parse(j.body)}));
    return { paused:this.setting('paused'),concurrency:this.setting('concurrency'),counts,jobs,
      workers:this.db.prepare("SELECT id,slot,started FROM jobs WHERE state='running' ORDER BY slot").all(),
      events:this.db.prepare('SELECT * FROM events ORDER BY seq DESC LIMIT 16').all(),
      boundLead:LEAD,realExecutionEnabled:false,acceptedImages:0,archiveCount:0,total:this.db.prepare('SELECT COUNT(*) n FROM jobs').get().n };
  }
}
function fixtureManifest(count=12) {
  assert(Number.isInteger(count) && count > 0 && count <= 20,'BATCH_SIZE_1_TO_20');
  const id = `demo-${Date.now()}-${randomUUID().slice(0,8)}`;
  const words = ['la manzana','el semáforo','la bicicleta','el paraguas','la biblioteca','el billete','la ventana','la carretera'];
  return { schemaVersion:1,requestId:id,mode:'fixture',requestedByThreadId:'fixture',createdAt:new Date().toISOString(),jobs:Array.from({length:count},(_,i) => {
    const prompt = `${words[i%words.length]} · 调度演示，不生成图片`;
    return { jobId:`${id}-${i+1}`,entryId:`${id}-entry-${i+1}`,senseId:'demo',sourceRevision:'fixture-v1',prompt,promptHash:digest(prompt),referenceImages:[],executorThreadId:'fixture' };
  }) };
}
module.exports = { Store,validate,readManifest,fixtureManifest,digest,LEAD };
