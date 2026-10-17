import {spawnSync} from 'node:child_process';

// D1 export prints a signed download URL. Never forward that capability URL
// into public Actions logs, including when an export fails after URL creation.
export function redactDownloadQueries(text) {
  return text.replace(/https?:\/\/[^\s<>"']+/g, url=>{
    const query=url.indexOf('?');
    return query<0?url:url.slice(0,query)+'?[redacted]';
  });
}

export function exportDatabase(args,env) {
  const result=spawnSync(process.execPath,args,{encoding:'utf8',env,maxBuffer:16*1024*1024});
  if(result.error)throw new Error('Database backup process failed: '+result.error.code);
  if(result.status!==0){
    const diagnostic=redactDownloadQueries((result.stderr||'')+'\n'+(result.stdout||''));
    throw new Error('Database backup failed; no deployment started (exit '+result.status+').\n'+diagnostic);
  }
  console.log('Database backup export completed; signed download links omitted from logs.');
}
