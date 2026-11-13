'use strict';
// Compact immutable completion evidence; image bytes stay in CAS.
const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite'),{createHash}=require('node:crypto');
function withDb(runtime,fn){const db=new DatabaseSync(path.join(runtime,'command-receipts.sqlite'));try{db.exec('CREATE TABLE IF NOT EXISTS receipts(id TEXT PRIMARY KEY,payload TEXT NOT NULL)');return fn(db);}finally{db.close();}}
function save(runtime,command){return withDb(runtime,db=>{const text=JSON.stringify(command),old=db.prepare('SELECT payload FROM receipts WHERE id=?').get(command.id);if(old&&old.payload!==text)throw Error('COMMAND_RECEIPT_CONFLICT');db.prepare('INSERT OR IGNORE INTO receipts VALUES(?,?)').run(command.id,text);});}
function settled(runtime,command,project){
 if(command.state!=='generated-complete'||!command.completion||command.completion.generated!==command.expectedItems.length)return false;
 const old=withDb(runtime,db=>db.prepare('SELECT payload FROM receipts WHERE id=?').get(command.id));if(old?.payload!==JSON.stringify(command))return false;
 return command.completion.items.every(item=>{if(item.generation!=='generated'||!/^[a-f0-9]{64}$/.test(item.sha256||''))return false;const file=path.join(project,'staff/02-spanish-engineering/image-asset-store/sha256',item.sha256.slice(0,2),item.sha256+'.png');try{if(fs.statSync(file).size>32*1024*1024)return false;return createHash('sha256').update(fs.readFileSync(file)).digest('hex')===item.sha256;}catch{return false;}});
}
module.exports={save,settled};
