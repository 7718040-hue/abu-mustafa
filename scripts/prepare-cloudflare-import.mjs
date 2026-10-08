import {readFile,mkdir,writeFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const order=['settings','categories','media','products','reviews','admin_members','faqs','posts','audit_log'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const ident=name=>{assert.match(name,/^[a-z_]+$/);return '"'+name+'"';};
const literal=v=>{if(v===null)return 'NULL';if(typeof v==='number'){assert.ok(Number.isFinite(v));return String(v);}assert.equal(typeof v,'string');assert.ok(!v.includes('\0'));return "'"+v.replaceAll("'","''").replaceAll('\r',"'||char(13)||'").replaceAll('\n',"'||char(10)||'")+"'";};
export function snapshotSql(snapshot){
  assert.equal(snapshot.format,'abu-mustafa-d1-snapshot-v1');
  for(const table of order)assert.ok(snapshot.tables[table],'Missing '+table);
  for(const table of Object.keys(snapshot.tables))assert.ok([...order,'review_submission_limits'].includes(table),'Unknown table '+table);
  const tables=[...order,...(snapshot.tables.review_submission_limits?['review_submission_limits']:[])];
  const sql=['-- Import ONLY into a new, migrated, empty Cloudflare database before deployment.',
    'CREATE TABLE __cloudflare_empty_guard (n INTEGER CHECK(n=0));',
    'INSERT INTO __cloudflare_empty_guard SELECT '+tables.map(t=>'(SELECT COUNT(*) FROM '+ident(t)+')').join('+')+';'];
  for(const table of tables){
    const {columns}=snapshot.tables[table];assert.ok(Array.isArray(columns)&&columns.length);assert.equal(new Set(columns).size,columns.length);
    let rows=structuredClone(snapshot.tables[table].rows);assert.ok(Array.isArray(rows));
    if(table==='settings')rows=rows.filter(r=>r.key!=='owner_user_id');
    if(table==='admin_members')for(const row of rows)row.user_id=null;
    if(table==='categories'){
      const sorted=[],seen=new Set();
      while(rows.length){const i=rows.findIndex(r=>!r.parent_id||seen.has(r.parent_id));assert.ok(i>=0,'Invalid category hierarchy');const [row]=rows.splice(i,1);sorted.push(row);seen.add(row.id);}rows=sorted;
    }
    for(const row of rows){for(const column of columns)assert.ok(Object.hasOwn(row,column),'Missing '+table+'.'+column);sql.push('INSERT INTO '+ident(table)+' ('+columns.map(ident).join(',')+') VALUES ('+columns.map(c=>literal(row[c])).join(',')+');');}
  }
  sql.push('DROP TABLE __cloudflare_empty_guard;');return sql.join('\n')+'\n';
}
export async function prepare(source,destination){
  assert.ok(path.isAbsolute(source)&&path.isAbsolute(destination),'Use absolute paths');
  const dir=await realpath(source),snapshotBytes=await readFile(path.join(dir,'database.json'));
  const snapshot=JSON.parse(snapshotBytes),manifest=JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'));
  assert.equal(manifest.format,'abu-mustafa-backup-v1');assert.equal(hash(snapshotBytes),manifest.database_sha256);
  assert.equal(manifest.files.length,snapshot.tables.media.rows.length);
  const ids=new Set(),plan=[];
  for(const media of snapshot.tables.media.rows){
    assert.match(media.id,/^[a-f0-9-]{36}$/);assert.ok(!ids.has(media.id));ids.add(media.id);
    const item=manifest.files.find(f=>f.id===media.id);assert.ok(item);assert.equal(item.file,'objects/'+media.id);assert.equal(item.object_key,media.object_key);
    assert.match(media.object_key,/^[a-zA-Z0-9_./-]+$/);assert.ok(!media.object_key.split('/').includes('..'));
    const file=await realpath(path.join(dir,item.file));assert.ok(file.startsWith(dir+path.sep));
    const bytes=await readFile(file);assert.equal(bytes.length,media.size);assert.equal(hash(bytes),item.sha256);assert.equal(media.content_type,item.content_type);
    plan.push({object_key:media.object_key,file,content_type:media.content_type,size:media.size,sha256:item.sha256});
  }
  const sql=snapshotSql(snapshot);await mkdir(destination); // Refuses an existing destination.
  await writeFile(path.join(destination,'database.sql'),sql,{flag:'wx'});
  await writeFile(path.join(destination,'media-upload-plan.json'),JSON.stringify({format:'abu-mustafa-cloudflare-media-v1',files:plan},null,2),{flag:'wx'});
  return {tables:Object.keys(snapshot.tables).length,media:plan.length,directory:destination,ownerIdentityReset:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [source,destination]=process.argv.slice(2);if(!source||!destination)throw Error('Usage: node scripts/prepare-cloudflare-import.mjs ABSOLUTE_BACKUP ABSOLUTE_NEW_OUTPUT');
  console.log(JSON.stringify(await prepare(source,destination),null,2));
}
