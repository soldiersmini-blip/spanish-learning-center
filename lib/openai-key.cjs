'use strict';
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync,spawnSync}=require('node:child_process');

function createKeyStore({dir=path.join(require('./workspace-paths.cjs').USER_DATA,'Secrets'),spawnProcess=spawnSync}={}){
  const file=path.join(dir,'openai-api-key.dpapi');
  let cached='',cachedSignature=null,retryAfter=0;
  function signature(){try{const s=fs.statSync(file);return s.mtimeMs+':'+s.size;}catch{return 'missing';}}
  function run(script,input){
    const result=spawnProcess('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{input,encoding:'utf8',windowsHide:true,timeout:5000,maxBuffer:8192,env:{...process.env,LINARCHIVE_KEY_FILE:file}});
    if(result.error?.code==='EPERM')throw Error('KEY_STORE_PROCESS_BLOCKED');
    if(result.error||result.status!==0)throw Error('KEY_STORE_UNAVAILABLE');
    return result.stdout.trim();
  }
  function readKey(){
    if(process.platform==='win32'&&fs.existsSync(file)){
      try{return run('Add-Type -AssemblyName System.Security;$bytes=[IO.File]::ReadAllBytes($env:LINARCHIVE_KEY_FILE);$clear=[Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Text.Encoding]::UTF8.GetString($clear))');}catch{}
    }
    const fromProcess=String(process.env.OPENAI_API_KEY||'').trim();if(fromProcess)return fromProcess;
    if(process.platform!=='win32')return '';
    try{return execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$v=[Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User');if($v){[Console]::Out.Write($v)}"],{encoding:'utf8',windowsHide:true,timeout:3000,maxBuffer:8192}).trim();}catch{return '';}
  }
  function get(){
    const stamp=signature(),envKey=String(process.env.OPENAI_API_KEY||'').trim(),sig=stamp+'|'+envKey;
    if(cachedSignature===sig&&(cached||Date.now()<retryAfter))return cached;
    cached=readKey();cachedSignature=sig;retryAfter=Date.now()+30000;
    return cached;
  }
  function save(value){
    if(process.platform!=='win32')throw Error('WINDOWS_KEY_STORE_REQUIRED');
    if(typeof value!=='string'||!/^sk-[A-Za-z0-9_-]{20,512}$/.test(value.trim()))throw Error('API_KEY_FORMAT');
    fs.mkdirSync(dir,{recursive:true,mode:0o700});
    run('$ErrorActionPreference="Stop";Add-Type -AssemblyName System.Security;$clear=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd());$sealed=[Security.Cryptography.ProtectedData]::Protect($clear,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);$temp=$env:LINARCHIVE_KEY_FILE+".tmp";$backup=$env:LINARCHIVE_KEY_FILE+".bak";[IO.File]::WriteAllBytes($temp,$sealed);if([IO.File]::Exists($env:LINARCHIVE_KEY_FILE)){if([IO.File]::Exists($backup)){[IO.File]::Delete($backup)};[IO.File]::Replace($temp,$env:LINARCHIVE_KEY_FILE,$backup);[IO.File]::Delete($backup)}else{[IO.File]::Move($temp,$env:LINARCHIVE_KEY_FILE)}',value.trim());
    cachedSignature=null;
    if(get()!==value.trim())throw Error('KEY_STORE_UNAVAILABLE');
    return {configured:true};
  }
  return {get,save,file};
}
module.exports={createKeyStore};
