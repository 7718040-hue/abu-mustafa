import seed from '../content/products.json';
import imageMetadata from '../content/image-metadata.json';
export const ORIGIN=__PUBLIC_ORIGIN__;
export const STORE_NAME='مركز أبو مصطفى التجاري للعود والعطور ومستلزمات التجميل ومستلزمات الأخضرين والزباد والبخور';
export const STORE_ADDRESS='اليمن - إب - شارع تعز - جوار البرج - أمام القوسي للجنابي تمامًا';
export const WA='https://wa.me/967770525525';
export const initialCategories=[['perfumes','عطور'],['oud','عود وبخور'],['musk','مسك ومخمريات'],['fresheners','معطرات'],['beauty','عناية وتجميل'],['supplies','عبوات ومستلزمات']];
const seedNumbers=[...new Set(seed.flatMap(p=>p.photos))];
const discoverableImageUrl=url=>url.startsWith('/assets/photos/')?url.replace('/assets/photos/','/product-images/'):url;
export const initialImages=seedNumbers.map(n=>({url:`/product-images/${n}.webp`,thumbnail:`/product-images/${n}-small.webp`,width:imageMetadata[n].width,height:imageMetadata[n].height,filename:`صورة ${n}`,id:`source-${n}`}));
const now=()=>new Date().toISOString();
const defaultFaqs=[
 ['كيف أعرف السعر والتوفر؟','افتح المنتج واضغط «اسأل عن هذا المنتج». سيُرسل اسم المنتج ومرجعه إلى واتساب المركز لتأكيد السعر والحجم والتوفر.'],
 ['أين يقع مركز أبو مصطفى؟','اليمن - إب - شارع تعز - جوار البرج - أمام القوسي للجنابي تمامًا.'],
 ['هل يمكن الاستفسار عن طلبات الجملة؟','نعم، يقدم المركز البيع بالجملة والتجزئة. حدّد الأصناف والكميات عند التواصل.'],
 ['أين أتابع «تعلّم أسرار العطور مجانًا»؟','عبر قناة المركز التعليمية على تيليجرام وقناته على يوتيوب.'],
 ['هل الصور المعروضة حقيقية؟','الصور من الملفات التي قدّمها مالك المركز، مع تأكيد الإصدار والحجم والتوفر عند الاستفسار.'],
 ['هل أستطيع البحث باسم العطر أو العلامة؟','نعم، يدعم الكتالوج البحث العربي والتصفية حسب الأقسام.'],
 ['كيف أرسل استفسارًا عن منتج محدد؟','افتح صفحة المنتج واضغط زر واتساب؛ تُجهّز رسالة باسم المنتج ومرجعه.'],
 ['هل توجد أسعار داخل الموقع؟','لا يظهر سعر إلا بعد أن تعتمد إدارة المركز قيمته. إذا لم يُضف سعر مؤكد فلن يعرض الموقع سعرًا للمنتج.'],
 ['ما الفرق بين أرقام الأقسام؟','لكل قسم أرقام مخصصة لتوجيهك إلى الفريق الأنسب، والرقم 770 525 525 هو رقم واتساب الرئيسي.'],
 ['هل وجود المنتج في الموقع يعني أنه متوفر الآن؟','لا. يؤكد المركز التوفر الحالي والإصدار والحجم قبل إتمام الطلب.'],
 ['كيف أصل إلى جميع الحسابات؟','ستجد الحسابات الرسمية والبطاقة الرقمية وخرائط جوجل في قسم التواصل.'],
 ['هل يمكن إضافة منتجات وأقسام جديدة؟','نعم، يملك فريق الموقع لوحة إدارة بصلاحيات منفصلة للمالك والمشرف والمحرر.'],
];
export class AppError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export const database=env=>{if(!env.DB)throw new AppError('خدمة حفظ البيانات غير متاحة الآن. حاول مرة أخرى.',503);return env.DB;};

// Seed is a separate, idempotent data operation. Schema is owned only by migrations.
export async function ensureCatalog(env){
  const db=database(env);
  const timestamp=now(),statements=[];
  if(!await db.prepare('SELECT value FROM settings WHERE key = ?').bind('seed_v1').first()){
    const guard=" WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'seed_v1')";
    initialCategories.forEach(([id,name],i)=>statements.push(db.prepare('INSERT OR IGNORE INTO categories (id,name,position,updated_at) SELECT ?,?,?,?'+guard).bind(id,name,i,timestamp)));
    seed.forEach((p,i)=>{const category=initialCategories.find(c=>c[1]===p.category)[0],gallery=p.photos.map(n=>({url:`/product-images/${n}.webp`,width:imageMetadata[n].width,height:imageMetadata[n].height,alt:p.name}));statements.push(db.prepare('INSERT OR IGNORE INTO products (id,name,category_id,intro,description,brand,size,reference,images,position,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?'+guard).bind(p.id,p.name,category,p.intro,p.description,p.brand||'',p.size||'',p.reference,JSON.stringify(gallery),i,timestamp));});
    statements.push(db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').bind('seed_v1',timestamp));
  }
  if(!await db.prepare('SELECT value FROM settings WHERE key = ?').bind('seed_v2').first()){
    defaultFaqs.forEach(([question,answer],i)=>statements.push(db.prepare('INSERT OR IGNORE INTO faqs (id,question,answer,position,updated_at) VALUES (?,?,?,?,?)').bind('faq-'+String(i+1).padStart(2,'0'),question,answer,i,timestamp)));
    statements.push(db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').bind('seed_v2',timestamp));
  }
  if(statements.length)await db.batch(statements);
}

export function identity(request){const id=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email');return id&&email?{id,email:email.trim().toLowerCase()}:null;}
export async function adminAccess(request,env){
  const user=identity(request);if(!user)return null;
  const db=database(env),owner=await db.prepare('SELECT value FROM settings WHERE key = ?').bind('owner_user_id').first();
  if(owner?.value===user.id)return {...user,role:'owner'};
  if(!owner&&env.SITE_OWNER_EMAIL&&user.email===env.SITE_OWNER_EMAIL.trim().toLowerCase()){
    await db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').bind('owner_user_id',user.id).run();
    if((await db.prepare('SELECT value FROM settings WHERE key = ?').bind('owner_user_id').first())?.value===user.id)return {...user,role:'owner'};
  }
  const member=await db.prepare('SELECT email,user_id,role FROM admin_members WHERE email=?').bind(user.email).first();
  if(!member||!['supervisor','editor'].includes(member.role))return null;
  if(member.user_id&&member.user_id!==user.id)return null;
  if(!member.user_id){
    const bound=await db.prepare('UPDATE admin_members SET user_id=?,updated_at=? WHERE email=? AND user_id IS NULL').bind(user.id,now(),user.email).run();
    if(!bound.meta.changes)return null;
  }
  return {...user,role:member.role};
}
export async function isAdmin(request,env){return !!await adminAccess(request,env);}
export async function requireAdmin(request,env){const access=await adminAccess(request,env);if(!access)throw new AppError('هذه الصفحة متاحة للمالك والمشرفين والمحررين المصرّح لهم فقط.',403);return access;}
export function requireOwner(user){if(user.role!=='owner')throw new AppError('إدارة المشرفين والمحررين متاحة لمالك الموقع فقط.',403);}
const permissions={owner:new Set(['all']),supervisor:new Set(['product_write','image_upload','structure','publish','style','moderate','delete','restore','audit']),editor:new Set(['product_write','image_upload','post_draft'])};
export const can=(user,permission)=>!!user&&(permissions[user.role]?.has('all')||permissions[user.role]?.has(permission));
export function requirePermission(user,permission,message='ليست لديك صلاحية لتنفيذ هذا الإجراء.'){if(!can(user,permission))throw new AppError(message,403);}
export async function audit(env,user,action,entityType,entityId,detail=''){await database(env).prepare('INSERT INTO audit_log (actor_id,actor_email,actor_role,action,entity_type,entity_id,detail,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(user.id,user.email,user.role,action,entityType,entityId,detail,now()).run();}
export function mutationGuard(request){
  const origin=request.headers.get('origin');
  if(request.headers.get('x-admin-request')!=='1'||!origin||![ORIGIN,new URL(request.url).origin].includes(origin))throw new AppError('تعذّر تأكيد مصدر الطلب. أعد فتح لوحة الإدارة.',403);
}
export async function bodyBytes(request,limit){
  const reader=request.body?.getReader();if(!reader)throw new AppError('الطلب فارغ.');
  const parts=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new AppError('حجم الملف أو البيانات أكبر من الحد المسموح.',413);}parts.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}return bytes;
}
export async function readJson(request){if(!request.headers.get('content-type')?.includes('application/json'))throw new AppError('صيغة البيانات غير صحيحة.',415);try{return JSON.parse(new TextDecoder().decode(await bodyBytes(request,60000)));}catch(e){if(e instanceof AppError)throw e;throw new AppError('تعذّر قراءة البيانات.');}}
function str(value,label,max,required=false){if(typeof value!=='string')value='';const text=value.trim();if(required&&!text)throw new AppError(`أدخل ${label}.`);if(text.length>max)throw new AppError(`${label} أطول من الحد المسموح (${max}).`);return text;}
export function priceMinor(value){
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const s=String(value).trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace('٫','.');
  if(!/^\d{1,8}(\.\d{1,2})?$/.test(s)||Number(s)<=0)throw new AppError('اكتب سعرًا أكبر من صفر، بمنزلتين عشريتين كحد أقصى، أو اتركه فارغًا.');
  const [whole,fraction='']=s.split('.');return Number(whole)*100+Number(fraction.padEnd(2,'0'));
}
const verifyVersion=value=>{if(!Number.isInteger(value)||value<1)throw new AppError('نسخة السجل غير صحيحة. أعد فتحه.',409);return value;};
function productRow(p,categoryMap){
  const gallery=JSON.parse(p.images).map(image=>({...image,url:discoverableImageUrl(image.url)})),url=ORIGIN+'/products/'+p.id+'/',category=categoryMap.get(p.category_id),parent=category?.parent_id?categoryMap.get(category.parent_id):null;
  return {id:p.id,name:p.name,category_id:p.category_id,category:p.category_name,category_path:parent?parent.name+' — '+p.category_name:p.category_name,category_ids:parent?[parent.id,p.category_id]:[p.category_id],intro:p.intro,description:p.description,brand:p.brand,size:p.size,reference:p.reference,gallery,images:gallery.map(i=>ORIGIN+i.url),price_minor:p.price_minor,price:p.price_minor===null?null:(p.price_minor/100).toFixed(2),currency:p.currency,availability:p.availability,visible:!!p.visible,featured:!!p.featured,best_seller:!!p.best_seller,badge:p.badge||'',card_theme:p.card_theme||'obsidian',accent_color:p.accent_color||'',position:p.position,version:p.version,updated_at:p.updated_at,url,inquiry_url:WA+'?text='+encodeURIComponent(`السلام عليكم، أود الاستفسار عن ${p.name}، السعر والتوفر والحجم.\nمرجع المنتج: ${p.reference}\n${url}`)};
}
export async function readCatalog(env,admin=false){
  await ensureCatalog(env);const db=database(env);
  const reviewFields='id,customer_name,rating,quote,source_label,visible,position,moderation_reason,moderated_at,moderated_by,version,updated_at'+(admin?',verification_phone,submitted_at,submission_kind':'');
  const [categories,records,reviews,faqs,posts]=await Promise.all([
    db.prepare('SELECT id,name,parent_id,description,position,version,updated_at FROM categories WHERE deleted_at IS NULL ORDER BY parent_id IS NOT NULL,parent_id,position,name').all(),
    db.prepare('SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.deleted_at IS NULL AND c.deleted_at IS NULL'+(admin?'':' AND p.visible = 1')+' ORDER BY p.best_seller DESC,p.featured DESC,p.position,p.name').all(),
    db.prepare('SELECT '+reviewFields+' FROM reviews WHERE deleted_at IS NULL'+(admin?'':' AND visible = 1')+' ORDER BY position,updated_at DESC').all(),
    db.prepare('SELECT id,question,answer,visible,position,version,updated_at FROM faqs WHERE deleted_at IS NULL'+(admin?'':' AND visible = 1')+' ORDER BY position,updated_at').all(),
    db.prepare("SELECT id,slug,title,summary,body,image,status,pinned,position,published_at,version,updated_at FROM posts WHERE deleted_at IS NULL"+(admin?"":" AND status = 'published'")+" ORDER BY pinned DESC,position,published_at DESC,updated_at DESC").all(),
  ]);
  const categoryMap=new Map(categories.results.map(c=>[c.id,c]));
  return {categories:categories.results,products:records.results.map(p=>productRow(p,categoryMap)),reviews:reviews.results.map(r=>({...r,visible:!!r.visible})),faqs:faqs.results.map(f=>({...f,visible:!!f.visible})),posts:posts.results.map(p=>({...p,pinned:!!p.pinned}))};
}

const reviewFingerprint=async request=>{
  const address=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const agent=request.headers.get('user-agent')||'unknown';
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`abu-mustafa-reviews|${address}|${agent}`));
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
};
export async function submitPublicReview(request,env,input){
  const origin=request.headers.get('origin');
  if(!origin||![ORIGIN,new URL(request.url).origin].includes(origin))throw new AppError('تعذّر تأكيد مصدر التقييم. أعد فتح الموقع وحاول مجددًا.',403);
  if(str(input.website,'الحقل الإضافي',200))throw new AppError('تعذّر إرسال التقييم.',400);
  const customerName=str(input.customer_name,'اسم العميل',100,true),quote=str(input.quote,'نص الرأي',1000,true),phone=str(input.verification_phone,'رقم الهاتف',30),rating=Number(input.rating);
  if(!Number.isInteger(rating)||rating<1||rating>5)throw new AppError('اختر تقييمًا من نجمة إلى خمس نجوم.');
  if(phone&&!/^[+0-9٠-٩۰-۹ ()-]{7,30}$/.test(phone))throw new AppError('اكتب رقم هاتف صحيحًا أو اتركه فارغًا.');
  if(input.consent!==true)throw new AppError('يجب الموافقة على مراجعة الرأي ونشره في الموقع.');
  const db=database(env),time=now(),windowStart=new Date(Date.now()-24*60*60*1000).toISOString(),fingerprint=await reviewFingerprint(request);
  await db.prepare("INSERT INTO review_submission_limits (fingerprint,window_started,submission_count) VALUES (?,?,1) ON CONFLICT(fingerprint) DO UPDATE SET window_started=CASE WHEN window_started<? THEN excluded.window_started ELSE window_started END,submission_count=CASE WHEN window_started<? THEN 1 ELSE submission_count+1 END").bind(fingerprint,time,windowStart,windowStart).run();
  const limit=await db.prepare('SELECT submission_count FROM review_submission_limits WHERE fingerprint=?').bind(fingerprint).first();
  if(Number(limit?.submission_count)>3)throw new AppError('وصلت إلى الحد اليومي لإرسال التقييمات. حاول بعد 24 ساعة.',429);
  const id='review-'+crypto.randomUUID().slice(0,12),position=Number((await db.prepare('SELECT COALESCE(MAX(position),-1)+1 AS next_position FROM reviews WHERE deleted_at IS NULL').first())?.next_position||0);
  await db.prepare('INSERT INTO reviews (id,customer_name,rating,quote,source_label,visible,position,moderation_reason,verification_phone,consent_at,submitted_at,submission_kind,updated_at,updated_by) VALUES (?,?,?,?,?,0,?,?,?,?,?,?,?,?)').bind(id,customerName,rating,quote,'أرسله عميل عبر الموقع',position,'',phone,time,time,'public-site',time,'public-site').run();
  await audit(env,{id:'public-site',email:'visitor@public.invalid',role:'visitor'},'submit','review',id,'بانتظار المراجعة');
  return {submitted:true};
}
async function validateProduct(input,env){
  if(typeof input.visible!=='boolean')throw new AppError('حالة إظهار المنتج غير صحيحة.');
  const categoryId=str(input.category_id,'القسم',80,true);
  if(!await database(env).prepare('SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL').bind(categoryId).first())throw new AppError('اختر قسمًا موجودًا.');
  const currencies=['YER','SAR','USD'];if(!currencies.includes(input.currency))throw new AppError('اختر عملة صحيحة.');
  if(!['unknown','in_stock','out_of_stock'].includes(input.availability))throw new AppError('اختر حالة توفر صحيحة.');
  if(!Array.isArray(input.gallery)||!input.gallery.length||input.gallery.length>12)throw new AppError('أضف من صورة إلى 12 صورة للمنتج.');
  const gallery=[];for(const item of input.gallery){
    const url=str(item.url,'رابط الصورة',200,true);let meta=initialImages.find(i=>i.url===url);
    if(!meta&&/^\/media\/[a-f0-9-]{36}$/.test(url)){const record=await database(env).prepare('SELECT id,width,height FROM media WHERE id = ?').bind(url.split('/').pop()).first();if(record)meta=record;}
    if(!meta)throw new AppError('إحدى الصور غير محفوظة. أعد رفعها أو اخترها من الصور المتاحة.');
    if(!gallery.some(x=>x.url===url))gallery.push({url,width:meta.width,height:meta.height,alt:str(item.alt,'وصف الصورة',200)||str(input.name,'اسم المنتج',150,true)});
  }
  const position=Number(input.position);if(!Number.isInteger(position)||position<0||position>100000)throw new AppError('ترتيب العرض يجب أن يكون عددًا صحيحًا من صفر إلى 100000.');
  const theme=['obsidian','garnet','ivory','emerald'].includes(input.card_theme)?input.card_theme:'obsidian',accent=str(input.accent_color,'لون الإطار',7);
  if(accent&&!/^#[0-9a-fA-F]{6}$/.test(accent))throw new AppError('لون الإطار يجب أن يكون بصيغة مثل #D5A35B.');
  return {name:str(input.name,'اسم المنتج',150,true),category_id:categoryId,intro:str(input.intro,'الوصف المختصر',280,true),description:str(input.description,'الوصف التفصيلي',5000,true),brand:str(input.brand,'العلامة',120),size:str(input.size,'الحجم',100),gallery,price_minor:priceMinor(input.price),currency:input.currency,availability:input.availability,visible:input.visible?1:0,featured:input.featured?1:0,best_seller:input.best_seller?1:0,badge:str(input.badge,'شارة المنتج',40),card_theme:theme,accent_color:accent,position};
}
export async function saveProduct(env,user,input,id=null){
  requirePermission(user,'product_write');const creating=!id,p=await validateProduct(input,env),db=database(env),time=now();
  if(user.role==='editor'&&id){const old=await db.prepare('SELECT name,brand,size,category_id,price_minor,currency,availability,visible,featured,best_seller,badge,card_theme,accent_color,position FROM products WHERE id=? AND deleted_at IS NULL').bind(id).first();if(!old)throw new AppError('المنتج غير موجود.',404);const protectedChanged=old.name!==p.name||old.brand!==p.brand||old.size!==p.size||old.category_id!==p.category_id||old.price_minor!==p.price_minor||old.currency!==p.currency||old.availability!==p.availability||old.visible!==p.visible||old.featured!==p.featured||old.best_seller!==p.best_seller||old.badge!==p.badge||old.card_theme!==p.card_theme||old.accent_color!==p.accent_color||old.position!==p.position;if(protectedChanged)throw new AppError('المحرر يستطيع تعديل الصور والأوصاف فقط؛ اطلب من المشرف تعديل القسم أو السعر أو الظهور أو شكل البطاقة.',403);}
  if(user.role==='editor'&&!id){p.price_minor=null;p.availability='unknown';p.visible=0;p.featured=0;p.best_seller=0;p.badge='';p.card_theme='obsidian';p.accent_color='';}
  const values=[p.name,p.category_id,p.intro,p.description,p.brand,p.size,JSON.stringify(p.gallery),p.price_minor,p.currency,p.availability,p.visible,p.featured,p.best_seller,p.badge,p.card_theme,p.accent_color,p.position,time,user.id];
  if(id){
    const result=await db.prepare('UPDATE products SET name=?,category_id=?,intro=?,description=?,brand=?,size=?,images=?,price_minor=?,currency=?,availability=?,visible=?,featured=?,best_seller=?,badge=?,card_theme=?,accent_color=?,position=?,updated_at=?,updated_by=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM categories WHERE id=? AND deleted_at IS NULL)').bind(...values,id,verifyVersion(input.version),p.category_id).run();
    if(!result.meta.changes)throw new AppError('تم تغيير هذا المنتج في نافذة أخرى. افتحه من جديد قبل الحفظ؛ نصك الحالي محفوظ في النموذج.',409);
  }else{
    id='item-'+crypto.randomUUID().slice(0,12);
    const placeholders=Array(values.length+2).fill('?').join(','),inserted=await db.prepare(`INSERT INTO products (name,category_id,intro,description,brand,size,images,price_minor,currency,availability,visible,featured,best_seller,badge,card_theme,accent_color,position,updated_at,updated_by,id,reference) SELECT ${placeholders} WHERE EXISTS (SELECT 1 FROM categories WHERE id=? AND deleted_at IS NULL)`).bind(...values,id,'AM-'+id.slice(5).toUpperCase(),p.category_id).run();
    if(!inserted.meta.changes)throw new AppError('حُذف القسم أثناء التحرير. اختر قسمًا آخر ثم احفظ.',409);
  }
  await audit(env,user,creating?'create':'save','product',id,p.name);return {id};
}
export async function deleteProduct(env,user,id,input){requirePermission(user,'delete');const result=await database(env).prepare('UPDATE products SET deleted_at=?,visible=0,updated_by=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL').bind(now(),user.id,id,verifyVersion(input.version)).run();if(!result.meta.changes)throw new AppError('تعذّر الحذف لأن السجل تغيّر. أعد تحميله.',409);await audit(env,user,'delete','product',id);return {deleted:true};}
export async function saveCategory(env,user,input,id=null){
  requirePermission(user,'structure');const creating=!id;
  const name=str(input.name,'اسم القسم',80,true),description=str(input.description,'وصف القسم',500),parentId=str(input.parent_id,'القسم الرئيسي',80),position=Number(input.position);
  if(!Number.isInteger(position)||position<0||position>100000)throw new AppError('ترتيب القسم يجب أن يكون عددًا صحيحًا من صفر إلى 100000.');
  const db=database(env),duplicate=await db.prepare('SELECT id FROM categories WHERE name=? AND deleted_at IS NULL AND id!=?').bind(name,id||'').first();if(duplicate)throw new AppError('يوجد قسم بهذا الاسم بالفعل.',409);
  if(parentId){
    if(parentId===id)throw new AppError('لا يمكن جعل القسم تابعًا لنفسه.');
    const parent=await db.prepare('SELECT id,parent_id FROM categories WHERE id=? AND deleted_at IS NULL').bind(parentId).first();
    if(!parent)throw new AppError('اختر قسمًا رئيسيًا موجودًا.');
    if(parent.parent_id)throw new AppError('يمكن إنشاء مستوى فرعي واحد فقط للحفاظ على وضوح الكتالوج.');
    if(id&&(await db.prepare('SELECT id FROM categories WHERE parent_id=? AND deleted_at IS NULL LIMIT 1').bind(id).first()))throw new AppError('هذا القسم يحتوي أقسامًا فرعية؛ انقلها أولًا قبل جعله قسمًا فرعيًا.');
  }
  if(id){const result=await db.prepare('UPDATE categories SET name=?,parent_id=?,description=?,position=?,updated_at=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL').bind(name,parentId||null,description,position,now(),id,verifyVersion(input.version)).run();if(!result.meta.changes)throw new AppError('تغيّر هذا القسم في نافذة أخرى. أعد فتحه.',409);}
  else{id='category-'+crypto.randomUUID().slice(0,12);await db.prepare('INSERT INTO categories (id,name,parent_id,description,position,updated_at) VALUES (?,?,?,?,?,?)').bind(id,name,parentId||null,description,position,now()).run();}
  await audit(env,user,creating?'create':'save','category',id,name);return {id};
}
export async function deleteCategory(env,user,id,input){
  requirePermission(user,'delete');
  const db=database(env);
  const result=await db.prepare('UPDATE categories SET deleted_at=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM products WHERE category_id=? AND deleted_at IS NULL) AND NOT EXISTS (SELECT 1 FROM categories WHERE parent_id=? AND deleted_at IS NULL)').bind(now(),id,verifyVersion(input.version),id,id).run();
  if(!result.meta.changes){
    const [products,children]=await Promise.all([db.prepare('SELECT count(*) AS count FROM products WHERE category_id=? AND deleted_at IS NULL').bind(id).first(),db.prepare('SELECT count(*) AS count FROM categories WHERE parent_id=? AND deleted_at IS NULL').bind(id).first()]);
    if(children.count)throw new AppError('انقل الأقسام الفرعية التابعة لهذا القسم أو احذفها أولًا.',409);
    throw new AppError(products.count?'انقل منتجات هذا القسم إلى قسم آخر أو احذفها أولًا، بما فيها المنتجات المخفية.':'تغيّر القسم. أعد تحميله قبل الحذف.',409);
  }await audit(env,user,'delete','category',id);return {deleted:true};
}
function selectedItems(input){
  if(!Array.isArray(input.items)||!input.items.length||input.items.length>50)throw new AppError('اختر من منتج واحد إلى 50 منتجًا.');
  const seen=new Set();return input.items.map(item=>{const id=str(item?.id,'معرّف المنتج',80,true);if(!/^[a-z0-9-]+$/.test(id)||seen.has(id))throw new AppError('قائمة المنتجات المحددة غير صحيحة.');seen.add(id);return {id,version:verifyVersion(item.version)};});
}
export async function bulkProducts(env,user,input){
  requirePermission(user,'structure');
  const items=selectedItems(input),target=str(input.target_category_id,'القسم المستهدف',80,true),action=input.action;
  if(!['move','copy'].includes(action))throw new AppError('اختر نقل المنتجات أو نسخها.');
  const db=database(env),category=await db.prepare('SELECT id FROM categories WHERE id=? AND deleted_at IS NULL').bind(target).first();if(!category)throw new AppError('القسم المستهدف غير موجود.');
  const time=now(),payload=JSON.stringify(items);
  const validCount="(SELECT COUNT(*) FROM json_each(?) e JOIN products p ON p.id=json_extract(e.value,'$.id') AND p.version=json_extract(e.value,'$.version') WHERE p.deleted_at IS NULL)";
  if(action==='move'){
    const result=await db.prepare("UPDATE products SET category_id=?,updated_at=?,updated_by=?,version=version+1 WHERE id IN (SELECT json_extract(value,'$.id') FROM json_each(?)) AND deleted_at IS NULL AND "+validCount+"=? AND EXISTS (SELECT 1 FROM categories WHERE id=? AND deleted_at IS NULL) RETURNING id").bind(target,time,user.id,payload,payload,items.length,target).all();
    if(result.results.length!==items.length)throw new AppError('تغيّر أحد المنتجات أو القسم. لم يُنفذ النقل؛ حدّث القائمة ثم حاول مرة أخرى.',409);
    await audit(env,user,'move','product-bulk',target,String(items.length));return {moved:items.length};
  }
  const copies=items.map((item,index)=>({...item,newId:'item-'+crypto.randomUUID().slice(0,12),offset:index+1})),copyPayload=JSON.stringify(copies);
  const result=await db.prepare("INSERT INTO products (id,name,category_id,intro,description,brand,size,reference,images,price_minor,currency,availability,visible,featured,best_seller,badge,card_theme,accent_color,position,updated_at,updated_by) SELECT json_extract(e.value,'$.newId'),p.name,?,p.intro,p.description,p.brand,p.size,'AM-COPY-'||upper(substr(json_extract(e.value,'$.newId'),6)),p.images,p.price_minor,p.currency,p.availability,p.visible,p.featured,p.best_seller,p.badge,p.card_theme,p.accent_color,(SELECT COALESCE(MAX(position),-1) FROM products WHERE category_id=? AND deleted_at IS NULL)+json_extract(e.value,'$.offset'),?,? FROM json_each(?) e JOIN products p ON p.id=json_extract(e.value,'$.id') AND p.version=json_extract(e.value,'$.version') WHERE p.deleted_at IS NULL AND "+validCount+"=? AND EXISTS (SELECT 1 FROM categories WHERE id=? AND deleted_at IS NULL) RETURNING id").bind(target,target,time,user.id,copyPayload,payload,items.length,target).all();
  if(result.results.length!==items.length)throw new AppError('تغيّر أحد المنتجات أو القسم. لم تُنشأ نسخ؛ حدّث القائمة ثم حاول مرة أخرى.',409);
  const ids=copies.map(x=>x.newId);await audit(env,user,'copy','product-bulk',target,String(ids.length));return {copied:ids.length,ids};
}
export async function saveReview(env,user,input,id=null){
  requirePermission(user,'moderate');const position=Number(input.position),visible=input.visible===true,reason=str(input.moderation_reason,'سبب الإخفاء أو الحذف',500);
  if(!Number.isInteger(position)||position<0||position>100000)throw new AppError('ترتيب الرأي غير صحيح.');
  if(typeof input.visible!=='boolean')throw new AppError('حالة إظهار الرأي غير صحيحة.');
  const db=database(env),time=now();
  if(id){
    const old=await db.prepare('SELECT visible FROM reviews WHERE id=? AND deleted_at IS NULL').bind(id).first();if(!old)throw new AppError('الرأي غير موجود.',404);
    if(old.visible&&!visible&&!reason)throw new AppError('اكتب سبب الإخفاء، مثل: ألفاظ مسيئة أو محتوى غير أخلاقي.');
    const result=await db.prepare('UPDATE reviews SET visible=?,position=?,moderation_reason=?,moderated_at=?,moderated_by=?,updated_at=?,updated_by=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL').bind(visible?1:0,position,reason,reason||!visible?time:null,reason||!visible?user.id:'',time,user.id,id,verifyVersion(input.version)).run();if(!result.meta.changes)throw new AppError('تغيّر هذا الرأي في نافذة أخرى. أعد فتحه.',409);
    await audit(env,user,visible?'show':'hide','review',id,reason);return {id};
  }
  const customerName=str(input.customer_name,'اسم العميل',100,true),quote=str(input.quote,'نص الرأي',1000,true),sourceLabel=str(input.source_label,'مصدر الرأي',120),rating=Number(input.rating);
  if(!Number.isInteger(rating)||rating<1||rating>5)throw new AppError('اختر تقييمًا من نجمة إلى خمس نجوم.');
  id='review-'+crypto.randomUUID().slice(0,12);await db.prepare('INSERT INTO reviews (id,customer_name,rating,quote,source_label,visible,position,moderation_reason,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,customerName,rating,quote,sourceLabel,visible?1:0,position,reason,time,user.id).run();await audit(env,user,'create','review',id,'رأي موثّق لا يمكن تعديل كلماته بعد الحفظ');return {id};
}
export async function deleteReview(env,user,id,input){requirePermission(user,'moderate');const reason=str(input.moderation_reason,'سبب الحذف',500,true),time=now(),result=await database(env).prepare('UPDATE reviews SET deleted_at=?,visible=0,moderation_reason=?,moderated_at=?,moderated_by=?,updated_at=?,updated_by=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL').bind(time,reason,time,user.id,time,user.id,id,verifyVersion(input.version)).run();if(!result.meta.changes)throw new AppError('تغيّر هذا الرأي. أعد تحميله قبل الحذف.',409);await audit(env,user,'delete','review',id,reason);return {deleted:true};}

export async function saveFaq(env,user,input,id=null){requirePermission(user,'structure');const question=str(input.question,'السؤال',240,true),answer=str(input.answer,'الإجابة',1600,true),visible=input.visible===true,position=Number(input.position);if(typeof input.visible!=='boolean'||!Number.isInteger(position)||position<0||position>100000)throw new AppError('بيانات السؤال أو ترتيبه غير صحيحة.');const db=database(env),time=now(),creating=!id;if(id){const result=await db.prepare('UPDATE faqs SET question=?,answer=?,visible=?,position=?,updated_at=?,updated_by=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL').bind(question,answer,visible?1:0,position,time,user.id,id,verifyVersion(input.version)).run();if(!result.meta.changes)throw new AppError('تغيّر السؤال في نافذة أخرى. أعد فتحه.',409);}else{id='faq-'+crypto.randomUUID().slice(0,12);await db.prepare('INSERT INTO faqs (id,question,answer,visible,position,updated_at,updated_by) VALUES (?,?,?,?,?,?,?)').bind(id,question,answer,visible?1:0,position,time,user.id).run();}await audit(env,user,creating?'create':'save','faq',id,question);return {id};}
export async function deleteFaq(env,user,id,input){requirePermission(user,'delete');const result=await database(env).prepare('UPDATE faqs SET deleted_at=?,visible=0,updated_at=?,updated_by=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL').bind(now(),now(),user.id,id,verifyVersion(input.version)).run();if(!result.meta.changes)throw new AppError('تغيّر السؤال. أعد تحميله.',409);await audit(env,user,'delete','faq',id);return {deleted:true};}

async function validateMediaUrl(env,value){const url=str(value,'صورة المنشور',200);if(!url)return '';if(initialImages.some(i=>i.url===url))return url;if(/^\/media\/[a-f0-9-]{36}$/.test(url)&&await database(env).prepare('SELECT id FROM media WHERE id=?').bind(url.slice(7)).first())return url;throw new AppError('صورة المنشور غير محفوظة في مكتبة الموقع.');}
export async function savePost(env,user,input,id=null){
  if(user.role==='editor')requirePermission(user,'post_draft');else requirePermission(user,'publish');
  const title=str(input.title,'عنوان المنشور',180,true),summary=str(input.summary,'ملخص المنشور',360,true),body=str(input.body,'نص المنشور',8000,true),slug=str(input.slug,'رابط المنشور',100,true).toLowerCase(),status=input.status==='published'?'published':'draft',position=Number(input.position),image=await validateMediaUrl(env,input.image);
  let pinned=input.pinned===true;
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new AppError('رابط المنشور يستخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطات فقط.');
  if(!Number.isInteger(position)||position<0||position>100000)throw new AppError('ترتيب المنشور غير صحيح.');
  if(user.role==='editor'&&status!=='draft')throw new AppError('المحرر يحفظ المسودات فقط؛ ينشرها المشرف أو المالك بعد المراجعة.',403);
  const db=database(env),time=now(),creating=!id;
  if(id&&user.role==='editor'){const old=await db.prepare('SELECT status,pinned FROM posts WHERE id=? AND deleted_at IS NULL').bind(id).first();if(!old)throw new AppError('المنشور غير موجود.',404);if(old.status==='published')throw new AppError('المنشور المنشور يراجعه المشرف أو المالك.',403);pinned=!!old.pinned;}
  if(user.role==='editor'&&!id)pinned=false;
  try{
    if(id){const result=await db.prepare('UPDATE posts SET slug=?,title=?,summary=?,body=?,image=?,status=?,pinned=?,position=?,published_at=?,updated_at=?,updated_by=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL').bind(slug,title,summary,body,image,status,pinned?1:0,position,status==='published'?time:null,time,user.id,id,verifyVersion(input.version)).run();if(!result.meta.changes)throw new AppError('تغيّر المنشور في نافذة أخرى. أعد فتحه.',409);}
    else{id='post-'+crypto.randomUUID().slice(0,12);await db.prepare('INSERT INTO posts (id,slug,title,summary,body,image,status,pinned,position,published_at,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,slug,title,summary,body,image,status,pinned?1:0,position,status==='published'?time:null,time,user.id).run();}
  }catch(error){if(String(error?.message).includes('UNIQUE'))throw new AppError('رابط المنشور مستخدم بالفعل.',409);throw error;}
  await audit(env,user,creating?'create':status==='published'?'publish':'save','post',id,title+(pinned?' · مثبت':''));return {id};
}
export async function deletePost(env,user,id,input){requirePermission(user,'delete');const result=await database(env).prepare('UPDATE posts SET deleted_at=?,status=\'draft\',updated_at=?,updated_by=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL').bind(now(),now(),user.id,id,verifyVersion(input.version)).run();if(!result.meta.changes)throw new AppError('تغيّر المنشور. أعد تحميله.',409);await audit(env,user,'delete','post',id);return {deleted:true};}

function historyOptions(input={}){
  const search=str(input.search,'البحث',100),type=str(input.type,'نوع السجل',30),from=str(input.from,'تاريخ البداية',10),to=str(input.to,'تاريخ النهاية',10),order=input.order==='asc'?'asc':'desc';
  if(from&&!/^\d{4}-\d{2}-\d{2}$/.test(from))throw new AppError('تاريخ البداية غير صحيح.');
  if(to&&!/^\d{4}-\d{2}-\d{2}$/.test(to))throw new AppError('تاريخ النهاية غير صحيح.');
  const page=Math.max(1,Math.min(100000,Number(input.page)||1)),pageSize=Math.max(10,Math.min(100,Number(input.page_size)||25));
  return {search,type,from,to,order,page,pageSize,offset:(page-1)*pageSize};
}
export async function queryAudit(env,user,input={}){
  requirePermission(user,'audit');const o=historyOptions(input),allowed=new Set(['','product','category','review','faq','post','media','member','presentation','product-bulk']);
  if(!allowed.has(o.type))throw new AppError('نوع سجل التغييرات غير صحيح.');
  const where=[],args=[];if(o.type){where.push('entity_type=?');args.push(o.type);}if(o.search){where.push('(actor_email LIKE ? OR detail LIKE ? OR entity_id LIKE ? OR action LIKE ?)');const q='%'+o.search+'%';args.push(q,q,q,q);}if(o.from){where.push('created_at>=?');args.push(o.from+'T00:00:00.000Z');}if(o.to){where.push('created_at<=?');args.push(o.to+'T23:59:59.999Z');}
  const clause=where.length?' WHERE '+where.join(' AND '):'',db=database(env),direction=o.order==='asc'?'ASC':'DESC';
  const [count,rows]=await Promise.all([db.prepare('SELECT COUNT(*) AS count FROM audit_log'+clause).bind(...args).first(),db.prepare('SELECT id,actor_email,actor_role,action,entity_type,entity_id,detail,created_at FROM audit_log'+clause+` ORDER BY created_at ${direction},id ${direction} LIMIT ? OFFSET ?`).bind(...args,o.pageSize,o.offset).all()]);
  const total=Number(count?.count||0);return {items:rows.results,total,page:o.page,page_size:o.pageSize,pages:Math.max(1,Math.ceil(total/o.pageSize))};
}
export async function readAudit(env,user){return (await queryAudit(env,user,{page_size:100})).items;}
export async function queryTrash(env,user,input={}){
  requirePermission(user,'restore');const o=historyOptions(input),allowed=new Set(['','product','category','review','faq','post']);if(!allowed.has(o.type))throw new AppError('نوع المحذوفات غير صحيح.');
  const union="SELECT id,name AS label,version,deleted_at,'product' AS type FROM products WHERE deleted_at IS NOT NULL UNION ALL SELECT id,name AS label,version,deleted_at,'category' AS type FROM categories WHERE deleted_at IS NOT NULL UNION ALL SELECT id,customer_name AS label,version,deleted_at,'review' AS type FROM reviews WHERE deleted_at IS NOT NULL UNION ALL SELECT id,question AS label,version,deleted_at,'faq' AS type FROM faqs WHERE deleted_at IS NOT NULL UNION ALL SELECT id,title AS label,version,deleted_at,'post' AS type FROM posts WHERE deleted_at IS NOT NULL";
  const where=[],args=[];if(o.type){where.push('type=?');args.push(o.type);}if(o.search){where.push('(label LIKE ? OR id LIKE ?)');const q='%'+o.search+'%';args.push(q,q);}if(o.from){where.push('deleted_at>=?');args.push(o.from+'T00:00:00.000Z');}if(o.to){where.push('deleted_at<=?');args.push(o.to+'T23:59:59.999Z');}
  const clause=where.length?' WHERE '+where.join(' AND '):'',db=database(env),direction=o.order==='asc'?'ASC':'DESC';
  const [count,rows]=await Promise.all([db.prepare('SELECT COUNT(*) AS count FROM ('+union+')'+clause).bind(...args).first(),db.prepare('SELECT * FROM ('+union+')'+clause+` ORDER BY deleted_at ${direction} LIMIT ? OFFSET ?`).bind(...args,o.pageSize,o.offset).all()]);
  const total=Number(count?.count||0);return {items:rows.results,total,page:o.page,page_size:o.pageSize,pages:Math.max(1,Math.ceil(total/o.pageSize))};
}
export async function readTrash(env,user){return (await queryTrash(env,user,{page_size:100})).items;}
export async function restoreRecord(env,user,input){requirePermission(user,'restore');const type=str(input.type,'نوع السجل',20,true),id=str(input.id,'معرّف السجل',100,true),version=verifyVersion(input.version),allowed={product:'products',category:'categories',review:'reviews',faq:'faqs',post:'posts'},table=allowed[type];if(!table)throw new AppError('نوع السجل غير مدعوم.');const db=database(env);if(type==='product'){const p=await db.prepare('SELECT category_id FROM products WHERE id=? AND deleted_at IS NOT NULL').bind(id).first();if(p&&!await db.prepare('SELECT id FROM categories WHERE id=? AND deleted_at IS NULL').bind(p.category_id).first())throw new AppError('استعد قسم هذا المنتج أولًا، ثم أعد محاولة استعادة المنتج.',409);}if(type==='category'){const c=await db.prepare('SELECT parent_id,name FROM categories WHERE id=? AND deleted_at IS NOT NULL').bind(id).first();if(c?.parent_id&&!await db.prepare('SELECT id FROM categories WHERE id=? AND deleted_at IS NULL').bind(c.parent_id).first())throw new AppError('استعد القسم الرئيسي أولًا.',409);if(c&&await db.prepare('SELECT id FROM categories WHERE name=? AND deleted_at IS NULL').bind(c.name).first())throw new AppError('يوجد قسم حالي بالاسم نفسه. غيّر اسمه قبل الاستعادة.',409);}if(type==='post'){const p=await db.prepare('SELECT slug FROM posts WHERE id=? AND deleted_at IS NOT NULL').bind(id).first();if(p&&await db.prepare('SELECT id FROM posts WHERE slug=? AND deleted_at IS NULL').bind(p.slug).first())throw new AppError('رابط هذا المنشور مستخدم حاليًا. غيّر الرابط المتعارض قبل الاستعادة.',409);}const result=type==='category'?await db.prepare('UPDATE categories SET deleted_at=NULL,updated_at=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NOT NULL').bind(now(),id,version).run():await db.prepare(`UPDATE ${table} SET deleted_at=NULL,updated_at=?,updated_by=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NOT NULL`).bind(now(),user.id,id,version).run();if(!result.meta.changes)throw new AppError('تعذّرت الاستعادة لأن السجل تغيّر أو لم يعد في المحذوفات.',409);await audit(env,user,'restore',type,id);return {restored:true};}
export async function restoreRecords(env,user,input){
  requirePermission(user,'restore');if(!Array.isArray(input.items)||!input.items.length||input.items.length>50)throw new AppError('اختر من سجل واحد إلى 50 سجلًا للاستعادة.');
  const allowed={product:'products',category:'categories',review:'reviews',faq:'faqs',post:'posts'},items=[],seen=new Set();
  for(const item of input.items){const type=str(item?.type,'نوع السجل',20,true),id=str(item?.id,'معرّف السجل',100,true),version=verifyVersion(item?.version),table=allowed[type],key=type+':'+id;if(!table||seen.has(key))throw new AppError('قائمة السجلات المحددة غير صحيحة.');seen.add(key);items.push({type,id,version,table});}
  const db=database(env),selectedCategories=new Set(items.filter(x=>x.type==='category').map(x=>x.id));
  for(const item of items){const row=await db.prepare(`SELECT * FROM ${item.table} WHERE id=? AND version=? AND deleted_at IS NOT NULL`).bind(item.id,item.version).first();if(!row)throw new AppError('تغيّر أحد السجلات المحددة. حدّث المحذوفات ثم أعد الاختيار.',409);if(item.type==='product'&&!(selectedCategories.has(row.category_id)||await db.prepare('SELECT id FROM categories WHERE id=? AND deleted_at IS NULL').bind(row.category_id).first()))throw new AppError(`استعد قسم المنتج «${row.name}» ضمن العملية نفسها أو قبله.`,409);if(item.type==='category'){if(row.parent_id&&!(selectedCategories.has(row.parent_id)||await db.prepare('SELECT id FROM categories WHERE id=? AND deleted_at IS NULL').bind(row.parent_id).first()))throw new AppError(`استعد القسم الرئيسي لقسم «${row.name}» أولًا.`,409);if(await db.prepare('SELECT id FROM categories WHERE name=? AND deleted_at IS NULL').bind(row.name).first())throw new AppError(`يوجد قسم حالي باسم «${row.name}».`,409);}if(item.type==='post'&&await db.prepare('SELECT id FROM posts WHERE slug=? AND deleted_at IS NULL').bind(row.slug).first())throw new AppError(`رابط المنشور «${row.slug}» مستخدم حاليًا.`,409);}
  const time=now(),statements=[];for(const item of items){statements.push(item.type==='category'?db.prepare('UPDATE categories SET deleted_at=NULL,updated_at=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NOT NULL').bind(time,item.id,item.version):db.prepare(`UPDATE ${item.table} SET deleted_at=NULL,updated_at=?,updated_by=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NOT NULL`).bind(time,user.id,item.id,item.version));statements.push(db.prepare('INSERT INTO audit_log (actor_id,actor_email,actor_role,action,entity_type,entity_id,detail,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(user.id,user.email,user.role,'restore',item.type,item.id,'استعادة جماعية',time));}
  await db.batch(statements);return {restored:items.length};
}
export async function readMembers(env){const rows=await database(env).prepare('SELECT email,role,user_id IS NOT NULL AS connected,created_at,updated_at FROM admin_members ORDER BY role,email').all();return rows.results.map(r=>({...r,connected:!!r.connected}));}
export async function saveMember(env,user,input){
  requireOwner(user);const email=str(input.email,'البريد الإلكتروني',254,true).toLowerCase(),role=input.role;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new AppError('اكتب بريدًا إلكترونيًا صحيحًا.');
  if(!['supervisor','editor'].includes(role))throw new AppError('اختر صلاحية مشرف أو محرر.');
  if(env.SITE_OWNER_EMAIL&&email===env.SITE_OWNER_EMAIL.trim().toLowerCase())throw new AppError('هذا هو حساب المالك بالفعل.');
  const time=now();await database(env).prepare('INSERT INTO admin_members (email,role,created_at,created_by,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role,updated_at=excluded.updated_at').bind(email,role,time,user.id,time).run();await audit(env,user,'save','member',email,role);return {email,role};
}
export async function deleteMember(env,user,email){requireOwner(user);const normalized=decodeURIComponent(email).trim().toLowerCase();const result=await database(env).prepare('DELETE FROM admin_members WHERE email=?').bind(normalized).run();if(!result.meta.changes)throw new AppError('المستخدم غير موجود.',404);await audit(env,user,'delete','member',normalized);return {deleted:true};}
export async function uploadImage(request,env,user){
  requirePermission(user,'image_upload');
  if(!request.headers.get('content-type')?.startsWith('multipart/form-data;'))throw new AppError('صيغة رفع الصورة غير صحيحة.',415);
  if(!env.BUCKET)throw new AppError('خدمة الصور غير متاحة الآن. حاول مرة أخرى.',503);
  const raw=await bodyBytes(request,8*1024*1024+10000),form=await new Request(request.url,{method:'POST',headers:{'content-type':request.headers.get('content-type')||''},body:raw}).formData();
  const file=form.get('file');if(!file||typeof file.arrayBuffer!=='function'||file.size>8*1024*1024||file.size<16)throw new AppError('اختر صورة بحجم أقل من 8 ميجابايت.');
  const bytes=new Uint8Array(await file.arrayBuffer());let type;
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)type='image/jpeg';
  else if(bytes.slice(0,8).every((b,i)=>b===[137,80,78,71,13,10,26,10][i]))type='image/png';
  else if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')type='image/webp';
  else throw new AppError('نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP.');
  const width=Number(form.get('width')),height=Number(form.get('height'));
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>10000||height>10000)throw new AppError('تعذّر قراءة أبعاد الصورة. أعد اختيارها.');
  const id=crypto.randomUUID(),key='products/'+id;
  await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:type}});
  try{await database(env).prepare('INSERT INTO media (id,object_key,filename,content_type,size,width,height,created_at,created_by) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,key,str(file.name,'اسم الملف',200)||'product.webp',type,file.size,width,height,now(),user.id).run();}catch(error){await env.BUCKET.delete(key);throw error;}
  await audit(env,user,'upload','media',id,file.name);return {id,url:'/media/'+id,thumbnail:'/media/'+id,width,height,filename:file.name};
}
export async function allImages(env){const rows=await database(env).prepare('SELECT id,filename,width,height FROM media ORDER BY created_at DESC').all();return [...rows.results.map(i=>({...i,url:'/media/'+i.id,thumbnail:'/media/'+i.id})),...initialImages];}
