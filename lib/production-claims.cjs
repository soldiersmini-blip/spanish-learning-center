'use strict';
// A durable idempotency index, not a task queue or a second business ledger.
// It contains no prompts/images and never expires claims automatically.
const fs = require('node:fs'), path = require('node:path');
const {DatabaseSync} = require('node:sqlite');
const FILE = 'staff/15-spanish-research/desktop-image-workbench/runtime/production-claims.sqlite';
function fileOf(project) { return path.join(project,FILE); }
function open(project, readOnly = false) {
  const file = fileOf(project);
  if (readOnly && !fs.existsSync(file)) return null;
  if (fs.existsSync(file) && fs.statSync(file).size > 64 * 1024 ** 2) throw Error('CHECKLIST_INDEX_CAPACITY');
  if (!readOnly) fs.mkdirSync(path.dirname(file),{recursive:true});
  const db = new DatabaseSync(file,{readOnly});
  db.exec('PRAGMA busy_timeout=3000');
  if (!readOnly) {
    db.exec('PRAGMA synchronous=FULL');
    db.exec('CREATE TABLE IF NOT EXISTS claims (identity TEXT PRIMARY KEY, attemptId TEXT NOT NULL, runId TEXT NOT NULL, inputHash TEXT NOT NULL, receiptPath TEXT NOT NULL, claimedAt TEXT NOT NULL)');
  }
  return db;
}
function readClaims(project, keys) {
  const db = open(project,true), rows = new Map();
  if (!db) return rows;
  try { const get = db.prepare('SELECT * FROM claims WHERE identity=?'); for (const key of keys) { const row = get.get(key); if (row) rows.set(key,row); } return rows; }
  finally { db.close(); }
}
function claim(project, record) {
  if (!/^[a-f0-9]{64}$/.test(record.identity || '') || !/^[a-f0-9]{64}$/.test(record.inputHash || '') || ['attemptId','runId','receiptPath'].some(k => typeof record[k] !== 'string' || !record[k] || record[k].length > 1200)) throw Error('CHECKLIST_CLAIM_INPUT');
  const db = open(project);
  try {
    db.exec('BEGIN IMMEDIATE');
    // Even the exact same attempt cannot re-send after a lost receipt/process restart.
    if (db.prepare('SELECT identity FROM claims WHERE identity=?').get(record.identity)) throw Error('CHECKLIST_ALREADY_CLAIMED_RECONCILE');
    if (db.prepare('SELECT count(*) AS n FROM claims').get().n >= 100000) throw Error('CHECKLIST_INDEX_CAPACITY');
    db.prepare('INSERT INTO claims VALUES (?,?,?,?,?,?)').run(record.identity,record.attemptId,record.runId,record.inputHash,record.receiptPath,new Date().toISOString());
    db.exec('COMMIT');
  } catch(e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
  finally { db.close(); }
}
module.exports = {FILE,fileOf,readClaims,claim};
