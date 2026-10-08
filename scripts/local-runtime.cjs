const {Miniflare}=require('miniflare');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
async function createRuntime({stateDirectory=path.join(root,'.local-state'),ownerEmail='owner@preview.test',publicIndexing=false,scriptPath=path.join(root,'dist/server/core-test.js'),bindings={}}={}){
  fs.mkdirSync(stateDirectory,{recursive:true});
  const mf=new Miniflare({modules:true,scriptPath,compatibilityDate:'2026-05-15',cf:false,d1Databases:{DB:'abu-mustafa-catalog'},d1Persist:path.join(stateDirectory,'d1'),r2Buckets:{BUCKET:'abu-mustafa-photos'},r2Persist:path.join(stateDirectory,'r2'),bindings:{SITE_OWNER_EMAIL:ownerEmail,PUBLIC_INDEXING:publicIndexing?'enabled-after-owner-approval':'disabled',...bindings},assets:{directory:path.join(root,'dist/client'),binding:'ASSETS',routerConfig:{has_user_worker:true,invoke_user_worker_ahead_of_assets:true},assetConfig:{html_handling:'none',not_found_handling:'none'}}});
  const db=await mf.getD1Database('DB');
  // Development migration runner only. Production migrations are applied with Wrangler.
  await db.prepare('CREATE TABLE IF NOT EXISTS __local_migrations (name TEXT PRIMARY KEY, digest TEXT NOT NULL)').run();
  for(const filename of fs.readdirSync(path.join(root,'drizzle')).filter(f=>f.endsWith('.sql')).sort()){
    const sql=fs.readFileSync(path.join(root,'drizzle',filename),'utf8'),digest=crypto.createHash('sha256').update(sql).digest('hex');
    const applied=await db.prepare('SELECT digest FROM __local_migrations WHERE name=?').bind(filename).first();
    if(applied){if(applied.digest!==digest)throw Error('Applied local migration was changed: '+filename);continue;}
    const statements=sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s));
    statements.push(db.prepare('INSERT INTO __local_migrations (name,digest) VALUES (?,?)').bind(filename,digest));await db.batch(statements);
  }
  await db.prepare('PRAGMA optimize').run();
  return mf;
}
module.exports={createRuntime};
