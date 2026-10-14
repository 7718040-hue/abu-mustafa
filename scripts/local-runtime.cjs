const {Miniflare}=require('miniflare');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
async function createRuntime({stateDirectory=path.join(root,'.local-state'),ownerEmail='owner@preview.test',publicIndexing=false,scriptPath=path.join(root,'dist/server/core-test.js'),bindings={}}={}){
  fs.mkdirSync(stateDirectory,{recursive:true});
  const config=JSON.parse(fs.readFileSync(path.join(root,'wrangler.json'),'utf8'));
  const rules=config.assets.run_worker_first;
  const routing=Array.isArray(rules)?{static_routing:{user_worker:rules.filter(p=>!p.startsWith('!')),asset_worker:rules.filter(p=>p.startsWith('!')).map(p=>p.slice(1))}}:{invoke_user_worker_ahead_of_assets:rules};
  // A deployed asset header file is build-specific. Tests model both builds in
  // independent directories rather than pretending runtime vars alter static headers.
  const assetDirectory=path.join(stateDirectory,'assets');
  fs.cpSync(path.join(root,'dist/client'),assetDirectory,{recursive:true});
  let headerText=fs.readFileSync(path.join(assetDirectory,'_headers'),'utf8');
  headerText=headerText.replace(/X-Robots-Tag: [^\n]+/g,'X-Robots-Tag: '+(publicIndexing?'index, follow, max-image-preview:large':'noindex, nofollow, noarchive'));
  if(!publicIndexing)headerText=headerText.replace(/Cache-Control: [^\n]+/g,'Cache-Control: private, no-store');
  fs.writeFileSync(path.join(assetDirectory,'_headers'),headerText);
  const mf=new Miniflare({modules:true,scriptPath,compatibilityDate:'2026-05-15',cf:false,d1Databases:{DB:'abu-mustafa-catalog'},d1Persist:path.join(stateDirectory,'d1'),r2Buckets:{BUCKET:'abu-mustafa-photos'},r2Persist:path.join(stateDirectory,'r2'),bindings:{SITE_OWNER_EMAIL:ownerEmail,PUBLIC_INDEXING:publicIndexing?'enabled-after-owner-approval':'disabled',...bindings},assets:{directory:assetDirectory,binding:'ASSETS',routerConfig:{has_user_worker:true,...routing},assetConfig:{html_handling:'none',not_found_handling:'none'}}});
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
