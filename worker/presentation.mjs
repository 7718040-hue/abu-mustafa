import { AppError, database, requirePermission, audit, initialImages } from './data.mjs';

export const contactGroups = [
  {id:'incense',name:'الزباد والبخور والأخضرين',phones:[['+9674427600','04 427600','هاتف القسم'],['+967770525525','770 525 525','الجوال الرئيسي'],['+967716525525','716 525 525','جوال القسم']]},
  {id:'perfume',name:'التجميل والعطور',phones:[['+9674418100','04 418100','هاتف القسم'],['+967778525525','778 525 525','جوال القسم'],['+967714525525','714 525 525','جوال القسم']]},
  {id:'management',name:'مكتب إدارة المركز',phones:[['+967777550035','777 550 035','جوال الإدارة']]},
];
export const brandImages = [
  {url:'/assets/brand-card.png',filename:'بطاقة المركز الأصلية',width:1536,height:1536},
  {url:'/assets/storefront.webp',filename:'واجهة المحل من الشارع',width:765,height:1020},
  {url:'/assets/logo-original.png',filename:'الشعار الأصلي',width:960,height:960},
];
// Department and management chat links requested by the owner in review.
const defaults={version:1,whatsapp:['+967770525525','+967716525525','+967778525525','+967714525525','+967777550035'],cards:[
  {id:'catalog',title:'من العطر إلى عبق العود.',summary:'تصفّح المنتجات بصورها الحقيقية، ثم اسأل عن السعر والحجم والتوفر.',image:'',target:'catalog',product_id:'',visible:true,position:0,theme:'garnet'},
  {id:'identity',title:'الهوية الرسمية للمركز',summary:'',image:'/assets/brand-card.png',target:'contact',product_id:'',visible:true,position:1,theme:'gold'},
  {id:'storefront',title:'واجهة المركز',summary:'شارع تعز · جوار البرج',image:'/assets/storefront.webp',target:'map',product_id:'',visible:true,position:2,theme:'garnet'},
  {id:'learning',title:'المعرفة جزء من تجربتنا.',summary:'تابع محتوى المركز في العطور والبخور والخلطات من قنواته الأصلية.',image:'',target:'learn',product_id:'',visible:true,position:3,theme:'garnet'},
]};
const key='presentation_v1';
const text=(value,max,required=false)=>{if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))throw new AppError('تحقق من النص وطوله قبل الحفظ.');return value.trim();};
async function rawState(env){const row=await database(env).prepare('SELECT value FROM settings WHERE key=?').bind(key).first();return {raw:row?.value??null,state:row?JSON.parse(row.value):structuredClone(defaults)};}
export async function readPresentation(env,products,admin=false){
  const {state}=await rawState(env),available=new Set(products.filter(p=>p.visible).map(p=>p.id));
  return {...state,cards:state.cards.filter(c=>admin||(c.visible&&(c.target!=='product'||available.has(c.product_id)))).sort((a,b)=>a.position-b.position),contacts:contactGroups.map(g=>({...g,phones:g.phones.map(([number,display,label])=>({number,display,label,whatsapp:state.whatsapp.includes(number)}))}))};
}
async function persist(env,user,old,input,next,action,id){
  if(!Number.isInteger(input.version)||input.version!==old.state.version)throw new AppError('تغيّرت الإعدادات في نافذة أخرى. حدّث القائمة ثم أعد المحاولة.',409);
  next.version=old.state.version+1;const serialized=JSON.stringify(next),db=database(env);
  const result=old.raw===null?await db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').bind(key,serialized).run():await db.prepare('UPDATE settings SET value=? WHERE key=? AND value=?').bind(serialized,key,old.raw).run();
  if(!result.meta.changes)throw new AppError('حُفظ تعديل أحدث. حدّث القائمة قبل إعادة الحفظ.',409);
  await audit(env,user,action,'presentation',id);return {version:next.version};
}
export async function saveContactOptions(env,user,input){
  requirePermission(user,'structure');
  const allowed=new Set(contactGroups.flatMap(g=>g.phones.map(p=>p[0])));
  if(!Array.isArray(input.whatsapp)||input.whatsapp.length>7||input.whatsapp.some(n=>!allowed.has(n)))throw new AppError('اختر رقمًا مسجلًا في دليل التواصل.');
  const old=await rawState(env),whatsapp=[...new Set(['+967770525525',...input.whatsapp])];
  return persist(env,user,old,input,{...old.state,whatsapp},'confirm-whatsapp','contacts');
}
async function checkedImage(env,url){
  url=text(url,200);if(!url)return '';
  if(brandImages.some(i=>i.url===url))return url;
  // The product image manifest is the authority for imported product assets.
  if(initialImages.some(i=>i.url===url))return url;
  if(/^\/media\/[a-f0-9-]{36}$/.test(url)&&await database(env).prepare('SELECT id FROM media WHERE id=?').bind(url.slice(7)).first())return url;
  throw new AppError('اختر صورة محفوظة في الموقع أو ارفع صورة جديدة.');
}
export async function savePromoCard(env,user,input,id=null){
  requirePermission(user,'style');const old=await rawState(env),previous=id?old.state.cards.find(c=>c.id===id):null;
  if(id&&!previous)throw new AppError('البطاقة غير موجودة.',404);
  const target=text(input.target,20,true),theme=text(input.theme,20,true),position=Number(input.position);
  if(!['catalog','contact','learn','map','product'].includes(target)||!['garnet','gold','obsidian'].includes(theme)||!Number.isInteger(position)||position<0||position>100000||typeof input.visible!=='boolean')throw new AppError('تحقق من الوجهة والطابع وترتيب البطاقة.');
  const product_id=target==='product'?text(input.product_id,80,true):'';
  if(product_id&&!await database(env).prepare('SELECT id FROM products WHERE id=? AND deleted_at IS NULL').bind(product_id).first())throw new AppError('اختر منتجًا موجودًا.');
  if(!id&&old.state.cards.length>=60)throw new AppError('وصلت البطاقات إلى 60 بطاقة؛ عدّل بطاقة موجودة أو احذف غير المستخدمة.');
  const card={id:id||'promo-'+crypto.randomUUID().slice(0,12),title:text(input.title,150,true),summary:text(input.summary,400),image:await checkedImage(env,input.image),target,product_id,visible:input.visible,position,theme};
  const cards=previous?old.state.cards.map(c=>c.id===id?card:c):[...old.state.cards,card];
  return {...await persist(env,user,old,input,{...old.state,cards},previous?'save-card':'create-card',card.id),id:card.id};
}
export async function deletePromoCard(env,user,input,id){
  requirePermission(user,'style');const old=await rawState(env);
  if(!old.state.cards.some(c=>c.id===id))throw new AppError('البطاقة غير موجودة.',404);
  return persist(env,user,old,input,{...old.state,cards:old.state.cards.filter(c=>c.id!==id)},'delete-card',id);
}
