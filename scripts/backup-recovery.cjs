// Offline recovery drill only. This script has no production database write path.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {createRuntime} = require('./local-runtime.cjs');
const root = path.resolve(__dirname, '..');
const config = JSON.parse(require('node:fs').readFileSync(path.join(root,'wrangler.json'),'utf8'));
const origin = config.vars.PUBLIC_ORIGIN;
const order = ['settings','categories','media','products','reviews','admin_members','faqs','posts','audit_log'];
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const normalized = rows => JSON.stringify(rows.map(r=>Object.fromEntries(Object.keys(r).sort().map(k=>[k,r[k]]))).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
async function main(){
  const [mode, supplied] = process.argv.slice(2);
  if(!['capture-files','verify'].includes(mode)||!supplied)throw Error('Usage: node scripts/backup-recovery.cjs capture-files|verify ABSOLUTE_BACKUP_DIRECTORY');
  if(!path.isAbsolute(supplied))throw Error('Use an absolute backup directory');
  const dir = await fs.realpath(supplied);
  const snapshot = JSON.parse(await fs.readFile(path.join(dir,'database.json'),'utf8'));
  assert.equal(snapshot.format,'abu-mustafa-d1-snapshot-v1');
  assert.equal(snapshot.project_id,'appgprj_6aa1eb802d248191a59b180504543d7c');
  assert.deepEqual(Object.keys(snapshot.tables).sort(),[...order].sort());
  if(mode==='capture-files'){
    // Existing snapshots are never overwritten; use a new timestamped directory.
    await fs.mkdir(path.join(dir,'objects'));
    const files=[];
    for(const m of snapshot.tables.media.rows){
      assert.match(m.id,/^[a-f0-9-]{36}$/);
      const r=await fetch(origin+'/media/'+m.id,{redirect:'error',signal:AbortSignal.timeout(30000)});
      assert.equal(r.status,200,'Missing media '+m.id);
      assert.equal(r.headers.get('content-type')?.split(';')[0],m.content_type);
      const bytes=Buffer.from(await r.arrayBuffer());assert.equal(bytes.length,m.size);
      const file='objects/'+m.id;await fs.writeFile(path.join(dir,file),bytes,{flag:'wx'});
      files.push({id:m.id,object_key:m.object_key,file,size:bytes.length,sha256:hash(bytes),content_type:m.content_type});
    }
    const source=path.join(dir,'source');await fs.mkdir(source);
    // Include all deployed static files and application sources, never local credentials or Git metadata.
    for(const name of ['worker','web','content','public','db','drizzle','scripts','tests','docs','wrangler.json','package.json','package-lock.json','README.md','build.py','catalog.py','report.py','finalize.py','prepare-assets.cjs','server.cjs','drizzle.config.ts','.gitignore','.env.example']){
      await fs.cp(path.join(root,name),path.join(source,name),{recursive:true,errorOnExist:true,force:false});
    }
    const sourceFiles=[];
    async function inventory(folder,prefix=''){
      for(const e of await fs.readdir(folder,{withFileTypes:true})){
        if(e.isSymbolicLink())throw Error('Symlinks are not accepted in backup');
        const rel=prefix+e.name;
        if(e.isDirectory())await inventory(path.join(folder,e.name),rel+'/');
        else {const bytes=await fs.readFile(path.join(folder,e.name));sourceFiles.push({file:rel,size:bytes.length,sha256:hash(bytes)});}
      }
    }
    await inventory(source);
    const manifest={format:'abu-mustafa-backup-v1',created_at:new Date().toISOString(),database_sha256:hash(await fs.readFile(path.join(dir,'database.json'))),files,sourceFiles,scope:'All application D1 tables, every R2 object referenced by media, application source and static assets. Provider secrets and unreferenced R2 objects are not exported.'};
    await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
    console.log(JSON.stringify({captured:true,media:files.length,sourceFiles:sourceFiles.length,directory:dir}));return;
  }
  const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
  assert.equal(hash(await fs.readFile(path.join(dir,'database.json'))),manifest.database_sha256);
  for(const f of manifest.sourceFiles){
    const file=path.resolve(dir,'source',f.file),base=path.resolve(dir,'source')+path.sep;
    assert.ok(file.startsWith(base));const bytes=await fs.readFile(file);assert.equal(bytes.length,f.size);assert.equal(hash(bytes),f.sha256);
  }
  assert.equal(manifest.files.length,snapshot.tables.media.rows.length);
  const drill=await fs.mkdtemp(path.join(dir,'restore-check-'));
  const mf=await createRuntime({stateDirectory:drill,publicIndexing:true,scriptPath:path.join(root,'dist/server/index.js'),bindings:config.vars});
  try{
    const db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('BUCKET');
    for(const name of order){
      assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM "'+name+'"').first()).n,0,'Restore requires a fresh database');
      const table=snapshot.tables[name],allowed=(await db.prepare('PRAGMA table_info("'+name+'")').all()).results.map(c=>c.name);
      for(const column of table.columns){assert.match(column,/^[a-z_]+$/);assert.ok(allowed.includes(column));}
      let rows=[...table.rows];
      if(name==='categories'){
        const pending=rows,sorted=[],seen=new Set();
        while(pending.length){const i=pending.findIndex(r=>!r.parent_id||seen.has(r.parent_id));assert.ok(i>=0,'Invalid category hierarchy');const [row]=pending.splice(i,1);sorted.push(row);seen.add(row.id);}rows=sorted;
      }
      for(const row of rows)await db.prepare('INSERT INTO "'+name+'" ('+table.columns.map(c=>'"'+c+'"').join(',')+') VALUES ('+table.columns.map(()=>'?').join(',')+')').bind(...table.columns.map(c=>row[c])).run();
      const restored=(await db.prepare('SELECT * FROM "'+name+'"').all()).results;
      assert.equal(normalized(restored),normalized(table.rows),'Table mismatch '+name);
    }
    assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length,0);
    for(const f of manifest.files){
      assert.equal(f.file,'objects/'+f.id);const bytes=await fs.readFile(path.join(dir,f.file));assert.equal(hash(bytes),f.sha256);assert.equal(bytes.length,f.size);
      const m=snapshot.tables.media.rows.find(m=>m.id===f.id);assert.equal(f.object_key,m.object_key);
      await bucket.put(f.object_key,bytes,{httpMetadata:{contentType:f.content_type}});
      assert.equal(hash(Buffer.from(await (await bucket.get(f.object_key)).arrayBuffer())),f.sha256);
      const r=await mf.dispatchFetch(origin+'/media/'+f.id);assert.equal(r.status,200);assert.equal(hash(Buffer.from(await r.arrayBuffer())),f.sha256);
    }
    const catalog=await (await mf.dispatchFetch(origin+'/catalog.json')).json();
    const expected=snapshot.tables.products.rows.filter(p=>p.visible&&!p.deleted_at);
    assert.deepEqual(catalog.products.map(p=>p.id).sort(),expected.map(p=>p.id).sort());
    for(const p of catalog.products)assert.equal((await mf.dispatchFetch(p.url)).status,200);
    assert.ok([401,403,503].includes((await mf.dispatchFetch(origin+'/api/admin/catalog')).status));
    const report={verified_at:new Date().toISOString(),tables:order.length,records:Object.fromEntries(order.map(t=>[t,snapshot.tables[t].rows.length])),media:manifest.files.length,sourceFiles:manifest.sourceFiles.length,publicProducts:catalog.products.length,foreignKeyErrors:0,byteIdenticalTables:true,byteIdenticalMedia:true,productionWrites:false,drillDirectory:drill};
    await fs.writeFile(path.join(drill,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }finally{await mf.dispose();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
