'use strict';
(()=>{
 const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const normalize=s=>String(s).normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').toLowerCase();
 let catalog={products:[],categories:[],reviews:[],images:[],members:[],access:{}},activeProduct=null,activeCategory=null,activeReview=null,activeFaq=null,activePost=null,activePromo=null,gallery=[],uploads=0,toastTimer,dirty=false,uploadQueue=[];
 const historyState={trash:{page:1,pages:1,total:0},audit:{page:1,pages:1,total:0}};
 const selected=new Set(),trashSelected=new Set(),productForm=$('#product-form'),categoryForm=$('#category-form'),reviewForm=$('#review-form'),memberForm=$('#member-form');
 const error=(id,text)=>{const el=$(id);el.textContent=text||'';el.hidden=!text;if(text)el.scrollIntoView({block:'nearest',behavior:'smooth'});};
 const toast=text=>{const el=$('#admin-toast');el.textContent=text;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,6000);};
 const roleName=role=>({owner:'المالك',supervisor:'مشرف',editor:'محرر'}[role]||'غير معروف');
 async function api(path,method='GET',body){
   const options={method,credentials:'same-origin',headers:{'x-admin-request':'1'}};
   if(body instanceof FormData)options.body=body;else if(body!==undefined){options.headers['content-type']='application/json';options.body=JSON.stringify(body);}
   let response;try{response=await fetch('/api/admin/'+path,options);}catch{throw Error('تعذّر الاتصال. احتفظنا بما كتبته؛ حاول الحفظ مرة أخرى.');}
   let data;try{data=await response.json();}catch{throw Error('تعذّر قراءة الرد. قد تحتاج إلى تسجيل الدخول مجددًا.');}
   if(!response.ok)throw Error(data.error||'تعذّر إكمال العملية. حاول مرة أخرى.');return data;
 }
 function categoryLabel(category){if(!category)return 'قسم غير معروف';const parent=category.parent_id?catalog.categories.find(c=>c.id===category.parent_id):null;return parent?parent.name+' — '+category.name:category.name;}
 function categoryOptions({selectedId='',all=false,rootsOnly=false,excludeId=''}={}){
   const roots=catalog.categories.filter(c=>!c.parent_id&&c.id!==excludeId),children=catalog.categories.filter(c=>c.parent_id&&c.id!==excludeId);
   let html=all?'<option value="">كل الأقسام</option>':rootsOnly?'<option value="">قسم رئيسي مستقل</option>':'';
   for(const root of roots){html+=`<option value="${root.id}" ${root.id===selectedId?'selected':''}>${escape(root.name)}</option>`;if(!rootsOnly)for(const child of children.filter(c=>c.parent_id===root.id))html+=`<option value="${child.id}" ${child.id===selectedId?'selected':''}>↳ ${escape(child.name)}</option>`;}
   for(const orphan of children.filter(c=>!catalog.categories.some(parent=>parent.id===c.parent_id)))if(!rootsOnly)html+=`<option value="${orphan.id}" ${orphan.id===selectedId?'selected':''}>↳ ${escape(orphan.name)}</option>`;
   return html;
 }
 function refreshBulk(){
   const valid=new Set(catalog.products.map(p=>p.id));for(const id of selected)if(!valid.has(id))selected.delete(id);
   $('#selected-count').textContent=selected.size.toLocaleString('ar');$('#bulk-bar').hidden=!selected.size||catalog.access.role==='editor';$('#bulk-category').innerHTML=categoryOptions({all:true});
 }
 function renderProducts(){
   const old=$('#admin-category').value;$('#admin-category').innerHTML=categoryOptions({all:true,selectedId:old});
   const query=normalize($('#admin-search').value),category=$('#admin-category').value;
   const products=catalog.products.filter(p=>(!category||(p.category_ids||[p.category_id]).includes(category))&&normalize(p.name+' '+p.description+' '+p.reference).includes(query));
   $('#admin-products').innerHTML=products.length?products.map(p=>`<article class="admin-product ${selected.has(p.id)?'selected':''}"><label class="product-select"><input type="checkbox" data-select-product="${p.id}" ${selected.has(p.id)?'checked':''}><span>تحديد ${escape(p.name)}</span></label><img src="${escape(p.gallery[0].url)}" alt="${escape(p.name)}" width="110" height="130" loading="lazy"><div><span class="admin-category-name">${escape(p.category_path||p.category)}</span><h3>${escape(p.name)}</h3><p>${p.price===null?'السعر غير مضاف':escape(p.price+' '+p.currency)}</p><span class="visibility ${p.visible?'shown':''}">${p.visible?'ظاهر في الموقع':'مخفي من الموقع'}</span>${p.best_seller?'<span class="visibility best-seller-admin">الأكثر مبيعًا</span>':''}${p.featured?'<span class="visibility featured-admin">مميز</span>':''}</div><button class="btn outline" data-edit-product="${p.id}">تعديل</button></article>`).join(''):'<div class="admin-empty"><h3>لا توجد منتجات هنا.</h3><p>غيّر البحث أو أضف منتجًا جديدًا.</p></div>';
   $$('#admin-products [data-edit-product]').forEach(b=>b.addEventListener('click',()=>openProduct(b.dataset.editProduct)));
   $$('[data-select-product]').forEach(box=>box.addEventListener('change',()=>{box.checked?selected.add(box.dataset.selectProduct):selected.delete(box.dataset.selectProduct);renderProducts();refreshBulk();}));
   refreshBulk();
 }
 function renderCategories(){
   $('#admin-categories').innerHTML=catalog.categories.map(c=>{const direct=catalog.products.filter(p=>p.category_id===c.id).length,children=catalog.categories.filter(x=>x.parent_id===c.id).length;return `<article class="category-row ${c.parent_id?'child-category':''}"><div><span class="category-kind">${c.parent_id?'قسم فرعي تحت '+escape(catalog.categories.find(x=>x.id===c.parent_id)?.name||'قسم رئيسي'):'قسم رئيسي'}</span><h3>${escape(c.name)}</h3><p>${escape(c.description||'يمكنك إضافة وصف لهذا القسم.')}<br><small>${direct} منتجات${children?' · '+children+' أقسام فرعية':''} · ترتيب ${c.position}</small></p></div><div class="category-actions">${!c.parent_id?`<button class="btn outline" data-add-child="${c.id}">إضافة قسم فرعي</button>`:''}<button class="btn outline" data-edit-category="${c.id}">تعديل القسم</button></div></article>`;}).join('')||'<div class="admin-empty"><h3>لا توجد أقسام.</h3><p>أضف قسمًا رئيسيًا للبدء.</p></div>';
   $$('[data-edit-category]').forEach(b=>b.addEventListener('click',()=>openCategory(b.dataset.editCategory)));
   $$('[data-add-child]').forEach(b=>b.addEventListener('click',()=>openCategory(null,b.dataset.addChild)));
 }
 function renderReviews(){
   $('#admin-reviews').innerHTML=catalog.reviews.length?catalog.reviews.map(r=>`<article class="review-admin-card"><div class="review-stars" aria-label="${r.rating} من 5 نجوم">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><blockquote>«${escape(r.quote)}»</blockquote><div><strong>${escape(r.customer_name)}</strong>${r.source_label?`<small>${escape(r.source_label)}</small>`:''}<span class="visibility ${r.visible?'shown':''}">${r.visible?'ظاهر':'مخفي'}</span></div><button class="btn outline" data-edit-review="${r.id}">تعديل</button></article>`).join(''):'<div class="admin-empty"><h3>لا توجد آراء منشورة.</h3><p>أضف فقط رأيًا حقيقيًا يمكن للمركز توثيقه.</p></div>';
   $$('[data-edit-review]').forEach(b=>b.addEventListener('click',()=>openReview(b.dataset.editReview)));
 }
 function renderMembers(){
   const owner=catalog.access.role==='owner';$('#tab-team').hidden=!owner;$('#admin-role').textContent=roleName(catalog.access.role);
   if(!owner)return;
   $('#admin-members').innerHTML=catalog.members.length?catalog.members.map(m=>`<article class="member-row"><div><strong dir="ltr">${escape(m.email)}</strong><small>${m.connected?'مرتبط بحسابه':'بانتظار أول دخول'}</small></div><select data-member-role="${escape(m.email)}" aria-label="صلاحية ${escape(m.email)}"><option value="editor" ${m.role==='editor'?'selected':''}>محرر</option><option value="supervisor" ${m.role==='supervisor'?'selected':''}>مشرف</option></select><button class="btn outline" data-save-member="${escape(m.email)}">حفظ الصلاحية</button><button class="delete-button" data-delete-member="${escape(m.email)}">إزالة</button></article>`).join(''):'<div class="admin-empty"><h3>لا يوجد أعضاء تحرير إضافيون.</h3><p>يمكن للمالك إضافة مشرف أو محرر بالبريد الإلكتروني.</p></div>';
   $$('[data-save-member]').forEach(b=>b.addEventListener('click',async()=>{const email=b.dataset.saveMember,role=$(`[data-member-role="${CSS.escape(email)}"]`).value;try{await api('members','POST',{email,role});toast('تم تحديث الصلاحية.');await load();}catch(e){error('#admin-error',e.message);}}));
   $$('[data-delete-member]').forEach(b=>b.addEventListener('click',async()=>{if(!await confirmAction(`إزالة صلاحية ${b.dataset.deleteMember}؟`,'إزالة الصلاحية'))return;try{await api('members/'+encodeURIComponent(b.dataset.deleteMember),'DELETE');toast('تمت إزالة الصلاحية.');await load();}catch(e){error('#admin-error',e.message);}}));
 }
 function render(){
   const editor=catalog.access.role==='editor';for(const id of ['categories','reviews','faqs','trash','audit','cards','contacts'])$('#tab-'+id).hidden=editor;
   renderExtras();renderPresentation();
   $('#admin-status').textContent=`${catalog.products.length.toLocaleString('ar')} منتجًا · ${catalog.categories.length.toLocaleString('ar')} أقسام · ${catalog.reviews.length.toLocaleString('ar')} آراء`;
   renderProducts();renderCategories();renderReviews();renderMembers();$$('.product-select').forEach(el=>el.hidden=editor);
   $('#seo-total').textContent=catalog.seo.total;$('#seo-priced').textContent=catalog.seo.priced;$('#seo-feed').textContent=catalog.seo.feed;$('#feed-download').setAttribute('aria-disabled',String(!catalog.seo.feed));
 }
 async function load(){error('#admin-error','');try{catalog=await api('catalog');render();return true;}catch(e){error('#admin-error',e.message);$('#admin-status').textContent='تعذّر تحميل المحتوى.';return false;}}
 $('#reload').addEventListener('click',load);$('#admin-search').addEventListener('input',renderProducts);$('#admin-category').addEventListener('change',renderProducts);
 $$('.admin-tabs button').forEach((button,i,buttons)=>{
   const activate=()=>{buttons.filter(b=>!b.hidden).forEach(b=>{const chosen=b===button;b.setAttribute('aria-selected',String(chosen));b.tabIndex=chosen?0:-1;$('#'+b.getAttribute('aria-controls')).hidden=!chosen;});};
   button.addEventListener('click',activate);button.addEventListener('keydown',e=>{const visible=buttons.filter(b=>!b.hidden),current=visible.indexOf(button);if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?visible.length-1:(current+(e.key==='ArrowLeft'?1:-1)+visible.length)%visible.length;visible[next].click();visible[next].focus();}});
 });
 $('#feed-download').addEventListener('click',e=>{if(!catalog.seo.feed){e.preventDefault();toast('أضف سعرًا مؤكدًا وعلامة تجارية إلى منتج ظاهر لتجهيز سجل قابل للتصدير.');}});
 function show(id){$(id).showModal();document.body.classList.add('dialog-open');}
 function close(id){document.getElementById(id).close();if(!document.querySelector('dialog[open]'))document.body.classList.remove('dialog-open');}
 function confirmAction(message,label='تأكيد الحذف'){
   const dialog=$('#confirm-dialog');$('#confirm-text').textContent=message;$('#confirm-yes').textContent=label;$('#confirm-title').textContent=label;show('#confirm-dialog');
   return new Promise(resolve=>{const finish=value=>{close('confirm-dialog');$('#confirm-yes').onclick=null;$('#confirm-no').onclick=null;dialog.oncancel=null;resolve(value);};$('#confirm-yes').onclick=()=>finish(true);$('#confirm-no').onclick=()=>finish(false);dialog.oncancel=e=>{e.preventDefault();finish(false);};});
 }
 async function closeEditor(id){if(uploads){toast('انتظر حتى يكتمل رفع الصور.');return;}if(dirty&&!await confirmAction('لديك تغييرات لم تُحفظ. هل تريد إغلاق النموذج وتجاهلها؟','تجاهل التغييرات'))return;dirty=false;close(id);}
 $$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeEditor(b.dataset.close)));
 ['product-editor','category-editor','review-editor','faq-editor','post-editor','promo-editor'].forEach(id=>{const d=document.getElementById(id);d.addEventListener('cancel',e=>{e.preventDefault();closeEditor(id);});d.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.body.classList.remove('dialog-open');});});
 [productForm,categoryForm,reviewForm,$('#faq-form'),$('#post-form'),$('#promo-form'),$('#contacts-form')].forEach(form=>form.addEventListener('input',()=>dirty=true));
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 function openProduct(id){
   if(!catalog.categories.length){toast('أضف قسمًا أولًا قبل إنشاء منتج.');return;}
   activeProduct=id?catalog.products.find(p=>p.id===id):null;productForm.reset();error('#product-error','');$('#upload-status').textContent='';
   productForm.elements.category_id.innerHTML=categoryOptions({selectedId:activeProduct?.category_id||catalog.categories[0]?.id});
   if(activeProduct){for(const key of ['name','category_id','intro','description','brand','size','price','currency','availability','position','badge','card_theme','accent_color'])productForm.elements[key].value=activeProduct[key]??'';productForm.elements.visible.checked=activeProduct.visible;productForm.elements.featured.checked=activeProduct.featured;productForm.elements.best_seller.checked=activeProduct.best_seller;}
   else productForm.elements.position.value=catalog.products.length;
   gallery=activeProduct?activeProduct.gallery.map(i=>({...i})):[];$('#product-editor-title').textContent=activeProduct?'تعديل المنتج':'إضافة منتج';$('#delete-product').hidden=!activeProduct||catalog.access.role==='editor';
   const editor=catalog.access.role==='editor';for(const key of ['name','brand','size','category_id','price','currency','availability','position','visible','featured','best_seller','badge','card_theme','accent_color'])productForm.elements[key].disabled=editor&&(!['name','brand','size','category_id'].includes(key)||!!activeProduct);
   uploadQueue=[];renderUploadQueue();$('#image-library').hidden=true;$('#toggle-library').setAttribute('aria-expanded','false');renderGallery();dirty=false;show('#product-editor');
 }
 $('#new-product').addEventListener('click',()=>openProduct());
 function renderGallery(){
   $('#editor-gallery').innerHTML=gallery.map((im,i)=>`<div class="gallery-item"><img src="${escape(im.url)}" width="120" height="140" alt="${escape(im.alt||'صورة المنتج')}"><span class="gallery-position">${i===0?'الصورة الأساسية':`الصورة ${i+1}`}</span><label>وصف الصورة<input data-alt="${i}" maxlength="200" value="${escape(im.alt||'')}"></label><div class="gallery-controls"><button type="button" data-move="${i}" data-direction="-1" ${i===0?'disabled':''} aria-label="تقديم الصورة ${i+1}">تقديم</button><button type="button" data-move="${i}" data-direction="1" ${i===gallery.length-1?'disabled':''} aria-label="تأخير الصورة ${i+1}">تأخير</button><button type="button" data-remove="${i}" aria-label="إزالة الصورة ${i+1}">إزالة</button></div></div>`).join('')||'<div class="gallery-placeholder">أضف صورة واضحة للمنتج.</div>';
   $$('[data-alt]').forEach(el=>el.addEventListener('input',()=>{gallery[Number(el.dataset.alt)].alt=el.value;dirty=true;}));
   $$('[data-remove]').forEach(b=>b.addEventListener('click',()=>{gallery.splice(Number(b.dataset.remove),1);dirty=true;renderGallery();renderLibrary();}));
   $$('[data-move]').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.move),to=i+Number(b.dataset.direction);[gallery[i],gallery[to]]=[gallery[to],gallery[i]];dirty=true;renderGallery();}));
 }
 function addImage(im){if(gallery.length>=12){toast('الحد الأقصى 12 صورة للمنتج.');return;}if(gallery.some(i=>i.url===im.url))return;gallery.push({url:im.url,width:im.width,height:im.height,alt:productForm.elements.name.value});dirty=true;renderGallery();}
 function renderLibrary(){
   $('#image-library').innerHTML=catalog.images.map(im=>`<button type="button" data-library-image="${escape(im.id)}" aria-label="إضافة ${escape(im.filename)}" aria-pressed="${gallery.some(i=>i.url===im.url)}"><img src="${escape(im.thumbnail)}" alt="${escape(im.filename)}" width="100" height="110" loading="lazy"><span>${escape(im.filename)}</span></button>`).join('');
   $$('[data-library-image]').forEach(b=>b.addEventListener('click',()=>{addImage(catalog.images.find(im=>im.id===b.dataset.libraryImage));renderLibrary();}));
 }
 $('#toggle-library').addEventListener('click',()=>{const visible=$('#image-library').hidden;$('#image-library').hidden=!visible;$('#toggle-library').setAttribute('aria-expanded',String(visible));if(visible)renderLibrary();});
 async function prepareImage(file){
   if(file.size>20*1024*1024)throw Error('الصورة أكبر من 20 ميجابايت. اختر نسخة أصغر.');
   const bitmap=await createImageBitmap(file).catch(()=>{throw Error('تعذّر قراءة الصورة. استخدم JPG أو PNG أو WebP.');});
   const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.9));if(!blob)throw Error('تعذّر تجهيز الصورة. حاول مرة أخرى.');
   const form=new FormData();form.append('file',blob,file.name.replace(/\.[^.]+$/,'')+'.webp');form.append('width',String(canvas.width));form.append('height',String(canvas.height));return form;
 }
 function uploadStep(step){const order=['choose','upload','review','save'],current=order.indexOf(step);$$('[data-upload-step]').forEach((el,i)=>{el.classList.toggle('active',i===current);el.classList.toggle('done',i<current);});}
 function renderUploadQueue(){
   const box=$('#upload-overview'),total=uploadQueue.length,done=uploadQueue.filter(x=>x.status==='done').length,failed=uploadQueue.filter(x=>x.status==='failed').length,pending=uploadQueue.filter(x=>x.status==='pending'||x.status==='uploading').length;
   box.hidden=!total;$('#upload-count').textContent=`تم رفع ${done.toLocaleString('ar')} من ${total.toLocaleString('ar')}`;$('#upload-breakdown').textContent=`${pending.toLocaleString('ar')} متبقية · ${failed.toLocaleString('ar')} لم ترفع`;$('#upload-progress').max=Math.max(1,total);$('#upload-progress').value=done+failed;
   $('#upload-queue').innerHTML=uploadQueue.map((item,i)=>`<div class="upload-item ${item.status}"><span class="upload-state" aria-hidden="true">${item.status==='done'?'✓':item.status==='failed'?'!':item.status==='uploading'?'↻':'•'}</span><span><strong>${escape(item.file.name)}</strong><small>${{pending:'بانتظار الرفع',uploading:'جارٍ التجهيز والرفع',done:'رُفعت بنجاح',failed:item.error||'لم ترفع'}[item.status]}</small></span>${item.status==='failed'?`<button type="button" class="text-button" data-retry-upload="${i}">إعادة المحاولة</button>`:''}</div>`).join('');
   $$('[data-retry-upload]').forEach(button=>button.addEventListener('click',()=>retryUpload(Number(button.dataset.retryUpload))));
 }
 async function uploadFileItem(item){item.status='uploading';item.error='';renderUploadQueue();try{const im=await api('images','POST',await prepareImage(item.file));catalog.images.unshift(im);addImage(im);item.status='done';}catch(err){item.status='failed';item.error=err.message;}renderUploadQueue();}
 async function retryUpload(index){if(uploads)return;const item=uploadQueue[index];if(!item||item.status!=='failed')return;uploads++;$('#save-product').disabled=true;uploadStep('upload');await uploadFileItem(item);uploads--;$('#save-product').disabled=false;uploadStep(uploadQueue.some(x=>x.status==='failed')?'upload':'review');renderLibrary();$('#upload-status').textContent=item.status==='done'?'تم رفع الصورة؛ راجع الترتيب ثم احفظ المنتج.':'تعذّر رفع الصورة. صحّحها أو أزلها ثم أعد المحاولة.';}
 $('#upload-images').addEventListener('change',async e=>{
   const files=Array.from(e.target.files);if(files.length+gallery.length>12){error('#product-error','اختر صورًا بحيث لا يزيد المجموع عن 12 صورة.');e.target.value='';return;}
   if(!files.length)return;error('#product-error','');uploadQueue=files.map(file=>({file,status:'pending',error:''}));uploads++;$('#save-product').disabled=true;uploadStep('upload');renderUploadQueue();
   try{for(let i=0;i<uploadQueue.length;i++){$('#upload-status').textContent=`جارٍ رفع الصورة ${i+1} من ${uploadQueue.length}…`;await uploadFileItem(uploadQueue[i]);}const failed=uploadQueue.filter(x=>x.status==='failed');$('#upload-status').textContent=failed.length?`تم رفع ${uploadQueue.length-failed.length} صورة، وتعذّر رفع ${failed.length}. يمكنك إعادة المحاولة لكل صورة.`:'تم رفع جميع الصور. راجع ترتيبها ووصفها ثم احفظ المنتج.';if(failed.length)error('#product-error','بعض الصور لم تُرفع. استخدم «إعادة المحاولة» أو اختر صورًا بديلة.');renderLibrary();uploadStep(failed.length?'upload':'review');}
   finally{uploads--;$('#save-product').disabled=false;e.target.value='';}
 });
 productForm.addEventListener('submit',async e=>{
   e.preventDefault();error('#product-error','');if(uploads)return;if(!gallery.length){error('#product-error','أضف صورة للمنتج قبل الحفظ.');return;}
   const button=$('#save-product');button.disabled=true;button.textContent='جارٍ الحفظ…';uploadStep('save');const data=Object.fromEntries(new FormData(productForm));data.visible=productForm.elements.visible.checked;data.featured=productForm.elements.featured.checked;data.best_seller=productForm.elements.best_seller.checked;if(catalog.access.role==='editor'){if(activeProduct)for(const key of ['name','brand','size'])data[key]=activeProduct[key];for(const key of ['category_id','price','currency','availability','position','visible','featured','best_seller','badge','card_theme','accent_color'])data[key]=activeProduct?activeProduct[key]:key==='category_id'?productForm.elements.category_id.value:({price:null,currency:'YER',availability:'unknown',position:catalog.products.length,visible:false,featured:false,best_seller:false,badge:'',card_theme:'obsidian',accent_color:''})[key];}data.position=Number(data.position);data.gallery=gallery;if(activeProduct)data.version=activeProduct.version;
   try{await api('products'+(activeProduct?'/'+activeProduct.id:''),activeProduct?'PUT':'POST',data);dirty=false;close('product-editor');toast('تم حفظ المنتج.');await load();}catch(e){uploadStep('review');error('#product-error',e.message);}finally{button.disabled=false;button.textContent='حفظ المنتج';}
 });
 $('#delete-product').addEventListener('click',async()=>{if(!activeProduct||!await confirmAction(`سيُحذف «${activeProduct.name}» من التشكيلة. هل تريد المتابعة؟`))return;try{await api('products/'+activeProduct.id,'DELETE',{version:activeProduct.version});dirty=false;close('product-editor');selected.delete(activeProduct.id);toast('تم حذف المنتج من التشكيلة.');await load();}catch(e){error('#product-error',e.message);}});
 async function bulkAction(action){
   const target=$('#bulk-category').value;if(!target){toast('اختر القسم المستهدف أولًا.');return;}const verb=action==='move'?'نقل':'نسخ';
   if(!await confirmAction(`${verb} ${selected.size.toLocaleString('ar')} من المنتجات إلى «${categoryLabel(catalog.categories.find(c=>c.id===target))}»؟`,verb+' المنتجات'))return;
   const items=[...selected].map(id=>{const p=catalog.products.find(product=>product.id===id);return {id,version:p.version};});
   try{await api('products/bulk','POST',{action,target_category_id:target,items});selected.clear();toast(action==='move'?'تم نقل المنتجات.':'تم إنشاء نسخ مستقلة من المنتجات.');await load();}catch(e){error('#admin-error',e.message);}
 }
 $('#bulk-move').addEventListener('click',()=>bulkAction('move'));$('#bulk-copy').addEventListener('click',()=>bulkAction('copy'));$('#clear-selection').addEventListener('click',()=>{selected.clear();renderProducts();});
 function openCategory(id,parentPreset=''){
   activeCategory=id?catalog.categories.find(c=>c.id===id):null;categoryForm.reset();error('#category-error','');const parentId=activeCategory?.parent_id||parentPreset;
   categoryForm.elements.parent_id.innerHTML=categoryOptions({selectedId:parentId,rootsOnly:true,excludeId:activeCategory?.id||''});categoryForm.elements.parent_id.value=parentId||'';
   if(activeCategory)for(const key of ['name','description','position'])categoryForm.elements[key].value=activeCategory[key];else categoryForm.elements.position.value=catalog.categories.length;
   $('#category-editor-title').textContent=activeCategory?'تعديل القسم':parentPreset?'إضافة قسم فرعي':'إضافة قسم';$('#delete-category').hidden=!activeCategory;dirty=false;show('#category-editor');
 }
 $('#new-category').addEventListener('click',()=>openCategory());
 categoryForm.addEventListener('submit',async e=>{e.preventDefault();error('#category-error','');const button=$('#save-category');button.disabled=true;button.textContent='جارٍ الحفظ…';const data=Object.fromEntries(new FormData(categoryForm));data.position=Number(data.position);if(activeCategory)data.version=activeCategory.version;try{await api('categories'+(activeCategory?'/'+activeCategory.id:''),activeCategory?'PUT':'POST',data);dirty=false;close('category-editor');toast('تم حفظ القسم.');await load();}catch(e){error('#category-error',e.message);}finally{button.disabled=false;button.textContent='حفظ القسم';}});
 $('#delete-category').addEventListener('click',async()=>{if(!activeCategory||!await confirmAction(`هل تريد حذف قسم «${activeCategory.name}»؟ يجب نقل منتجاته وأقسامه الفرعية أولًا.`))return;try{await api('categories/'+activeCategory.id,'DELETE',{version:activeCategory.version});dirty=false;close('category-editor');toast('تم حذف القسم.');await load();}catch(e){error('#category-error',e.message);}});
 function openReview(id){
   activeReview=id?catalog.reviews.find(r=>r.id===id):null;reviewForm.reset();error('#review-error','');if(activeReview){for(const key of ['customer_name','rating','quote','source_label','position'])reviewForm.elements[key].value=activeReview[key]??'';reviewForm.elements.visible.checked=activeReview.visible;}else{reviewForm.elements.rating.value='5';reviewForm.elements.position.value=catalog.reviews.length;}
   for(const key of ['customer_name','rating','quote','source_label'])reviewForm.elements[key].disabled=!!activeReview;reviewForm.elements.moderation_reason.value=activeReview?.moderation_reason||'';
   $('#review-editor-title').textContent=activeReview?'مراجعة ظهور الرأي':'إضافة رأي موثّق';$('#delete-review').hidden=!activeReview;dirty=false;show('#review-editor');
 }
 $('#new-review').addEventListener('click',()=>openReview());
 reviewForm.addEventListener('submit',async e=>{e.preventDefault();error('#review-error','');const button=$('#save-review');button.disabled=true;button.textContent='جارٍ الحفظ…';const data=Object.fromEntries(new FormData(reviewForm));data.rating=Number(data.rating);data.position=Number(data.position);data.visible=reviewForm.elements.visible.checked;if(activeReview)data.version=activeReview.version;try{await api('reviews'+(activeReview?'/'+activeReview.id:''),activeReview?'PUT':'POST',data);dirty=false;close('review-editor');toast('تم حفظ الرأي.');await load();}catch(e){error('#review-error',e.message);}finally{button.disabled=false;button.textContent='حفظ الرأي';}});
 $('#delete-review').addEventListener('click',async()=>{if(!activeReview||!await confirmAction(`حذف رأي «${activeReview.customer_name}»؟`))return;try{await api('reviews/'+activeReview.id,'DELETE',{version:activeReview.version,moderation_reason:reviewForm.elements.moderation_reason.value});dirty=false;close('review-editor');toast('تم حذف الرأي.');await load();}catch(e){error('#review-error',e.message);}});
 memberForm.addEventListener('submit',async e=>{e.preventDefault();const button=$('button[type="submit"]',memberForm),data=Object.fromEntries(new FormData(memberForm));button.disabled=true;try{await api('members','POST',data);memberForm.reset();toast('تم حفظ صلاحية المستخدم.');await load();}catch(e){error('#admin-error',e.message);}finally{button.disabled=false;}});

 const historyTypes={product:'منتج',category:'قسم',review:'رأي',faq:'سؤال',post:'منشور',media:'صورة',member:'عضو فريق',presentation:'واجهة الموقع','product-bulk':'مجموعة منتجات'};
 const historyActions={create:'إضافة',save:'حفظ',delete:'حذف',restore:'استعادة',move:'نقل',copy:'نسخ',hide:'إخفاء',show:'إظهار',publish:'نشر',upload:'رفع','confirm-whatsapp':'اعتماد أرقام','save-card':'تعديل بطاقة','create-card':'إضافة بطاقة','delete-card':'حذف بطاقة'};
 const displayDate=value=>{try{return new Intl.DateTimeFormat('ar-YE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch{return value||'';}};
 function updateTrashSelection(){const button=$('#trash-restore-selected');if(!button)return;button.disabled=!trashSelected.size;button.textContent=trashSelected.size?`استعادة المحدد (${trashSelected.size.toLocaleString('ar')})`:'استعادة المحدد';}
 function renderHistory(kind,payload){
   const state=historyState[kind];state.items=payload.items||[];state.page=payload.page||1;state.pages=payload.pages||1;state.total=payload.total??state.items.length;state.loaded=true;
   if(kind==='trash'){
     const valid=new Set(state.items.map(x=>x.type+':'+x.id));for(const key of trashSelected)if(!valid.has(key))trashSelected.delete(key);
     $('#admin-trash').innerHTML=state.items.length?state.items.map(x=>`<article class="category-row history-row"><label class="history-select"><input type="checkbox" data-select-trash="${x.type}:${x.id}" ${trashSelected.has(x.type+':'+x.id)?'checked':''}><span class="sr-only">تحديد ${escape(x.label)}</span></label><div><small>${historyTypes[x.type]||escape(x.type)}</small><h3>${escape(x.label)}</h3><p>${displayDate(x.deleted_at)} · <bdi dir="ltr">${escape(x.id)}</bdi></p></div><button class="btn outline" data-restore="${x.type}:${x.id}">استعادة</button></article>`).join(''):'<p class="admin-empty">لا توجد عناصر مطابقة في المحذوفات.</p>';
     $$('[data-select-trash]').forEach(box=>box.addEventListener('change',()=>{box.checked?trashSelected.add(box.dataset.selectTrash):trashSelected.delete(box.dataset.selectTrash);updateTrashSelection();}));
     $$('[data-restore]').forEach(button=>button.addEventListener('click',async()=>{const [type,id]=button.dataset.restore.split(':'),item=state.items.find(x=>x.type===type&&x.id===id);if(!item||!await confirmAction(`استعادة «${item.label}» للمراجعة؟`,'استعادة'))return;try{await api('restore','POST',{type,id,version:item.version});trashSelected.delete(type+':'+id);toast('تمت الاستعادة. راجع المحتوى قبل إظهاره.');await load();await loadHistory('trash',state.page);}catch(err){error('#admin-error',err.message);}}));updateTrashSelection();
   }else{
     $('#admin-audit').innerHTML=state.items.length?state.items.map(x=>`<article class="category-row history-row"><div><h3>${historyActions[x.action]||escape(x.action)} · ${historyTypes[x.entity_type]||escape(x.entity_type)}</h3><p>${escape(x.detail||'بدون تفاصيل إضافية')}</p><small><bdi dir="ltr">${escape(x.actor_email)}</bdi> · ${displayDate(x.created_at)} · <bdi dir="ltr">${escape(x.entity_id)}</bdi></small></div></article>`).join(''):'<p class="admin-empty">لا توجد تغييرات مطابقة.</p>';
   }
   $('#'+kind+'-summary').textContent=`${state.total.toLocaleString('ar')} سجل · الصفحة ${state.page.toLocaleString('ar')} من ${state.pages.toLocaleString('ar')}`;$('#'+kind+'-page').textContent=`الصفحة ${state.page.toLocaleString('ar')} من ${state.pages.toLocaleString('ar')}`;$('#'+kind+'-prev').disabled=state.page<=1;$('#'+kind+'-next').disabled=state.page>=state.pages;
 }
 async function loadHistory(kind,page=1){const params=new URLSearchParams({page:String(page),page_size:'25',search:$('#'+kind+'-search').value,type:$('#'+kind+'-type').value,from:$('#'+kind+'-from').value,to:$('#'+kind+'-to').value,order:$('#'+kind+'-order').value});$('#'+kind+'-summary').textContent='جارٍ تحميل السجلات…';try{const payload=await api(kind+'?'+params);renderHistory(kind,payload);}catch(err){error('#admin-error',err.message);$('#'+kind+'-summary').textContent='تعذّر تحميل السجلات.';}}

 function renderExtras(){
   for(const [kind,items,label] of [['faq',catalog.faqs||[],'question'],['post',catalog.posts||[],'title']]){
     $('#admin-'+(kind==='faq'?'faqs':'posts')).innerHTML=items.map(x=>`<article class="category-row"><div><h3>${escape(x[label])}</h3><p>${kind==='faq'?(x.visible?'ظاهر':'مخفي'):(x.status==='published'?'منشور':'مسودة')}${kind==='post'&&x.pinned?' · مثبت أعلى المنتجات':''} · الترتيب ${x.position}</p></div><button class="btn outline" data-edit-${kind}="${x.id}">فتح</button></article>`).join('')||'<p class="admin-empty">لا يوجد محتوى هنا بعد.</p>';
     $$('[data-edit-'+kind+']').forEach(b=>b.addEventListener('click',()=>openExtra(kind,b.dataset[kind==='faq'?'editFaq':'editPost'])));
   }
   if(!historyState.trash.loaded)renderHistory('trash',{items:catalog.trash||[],total:(catalog.trash||[]).length,page:1,pages:1});
   if(!historyState.audit.loaded)renderHistory('audit',{items:catalog.audit||[],total:(catalog.audit||[]).length,page:1,pages:1});
   $$('.product-select').forEach(el=>el.hidden=catalog.access.role==='editor');
 }
 function postImages(selected=''){ $('#post-image-select').innerHTML='<option value="">بدون صورة</option>'+catalog.images.map(x=>`<option value="${escape(x.url)}">${escape(x.filename)}</option>`).join('');$('#post-image-select').value=selected; }
 function openExtra(kind,id){
   const record=(kind==='faq'?catalog.faqs:catalog.posts).find(x=>x.id===id)||null,form=$('#'+kind+'-form');if(kind==='faq')activeFaq=record;else activePost=record;
   form.reset();error('#'+kind+'-error','');if(kind==='post'){postImages(record?.image||'');form.elements.status.disabled=catalog.access.role==='editor';form.elements.pinned.disabled=catalog.access.role==='editor';}
   if(record)for(const key of Object.keys(record)){const field=form.elements[key];if(field){if(field.type==='checkbox')field.checked=record[key];else field.value=record[key]??'';}}
   $('#delete-'+kind).hidden=!record||catalog.access.role==='editor';dirty=false;show('#'+kind+'-editor');
 }
 for(const kind of ['faq','post']){
   $('#new-'+(kind==='faq'?'faqs':'posts')).addEventListener('click',()=>openExtra(kind));
   $('#'+kind+'-form').addEventListener('submit',async e=>{e.preventDefault();if(uploads)return;const form=e.currentTarget,button=$('button[type="submit"]',form),record=kind==='faq'?activeFaq:activePost,data=Object.fromEntries(new FormData(form));data.position=Number(data.position);if(kind==='faq')data.visible=form.elements.visible.checked;else{data.status=form.elements.status.value;data.pinned=form.elements.pinned.checked;}if(record)data.version=record.version;button.disabled=true;error('#'+kind+'-error','');try{await api((kind==='faq'?'faqs':'posts')+(record?'/'+record.id:''),record?'PUT':'POST',data);dirty=false;close(kind+'-editor');toast('تم حفظ المحتوى.');await load();}catch(e){error('#'+kind+'-error',e.message);}finally{button.disabled=false;}});
   $('#delete-'+kind).addEventListener('click',async()=>{const record=kind==='faq'?activeFaq:activePost;if(!record||!await confirmAction('نقل هذا المحتوى إلى المحذوفات؟'))return;try{await api((kind==='faq'?'faqs':'posts')+'/'+record.id,'DELETE',{version:record.version});dirty=false;close(kind+'-editor');await load();toast('نُقل المحتوى إلى المحذوفات.');}catch(e){error('#'+kind+'-error',e.message);}});
 }
 $('#upload-post-image').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;uploads++;try{$('#post-upload-status').textContent='جارٍ رفع الصورة…';const im=await api('images','POST',await prepareImage(file));catalog.images.unshift(im);postImages(im.url);dirty=true;$('#post-upload-status').textContent='تم رفع الصورة؛ احفظ المنشور لإضافتها إليه.';}catch(err){error('#post-error',err.message);}finally{uploads--;e.target.value='';}});

 function renderPresentation(){
   const presentation=catalog.presentation;
   $('#indexing-status').textContent=catalog.seo.indexing?'إعدادات الفهرسة مفعّلة. يحتاج وصول الزواحف أيضًا إلى إتاحة الموقع للعامة من إعدادات الاستضافة.':'جاهز للنشر العام: صفحات المنتجات والصور والأرقام والحسابات مرتبطة ببيانات واضحة. الفهرسة متوقفة حاليًا. عند اعتماد النشر العام، فعّل إعداد الفهرسة أيضًا؛ لا يغيّر أحدهما الآخر تلقائيًا.';
   $('#admin-cards').innerHTML=presentation.cards.map(c=>`<article class="promo-admin-row">${c.image?`<img src="${escape(c.image)}" alt="${escape(c.title)}" loading="lazy">`:'<span class="promo-admin-empty">بطاقة نصية</span>'}<div><strong>${escape(c.title)}</strong><small>${c.visible?'ظاهرة':'مخفية'} · الترتيب ${c.position}${c.target==='product'?' · إعلان منتج':''}</small></div><button class="btn outline" data-edit-promo="${c.id}">تعديل</button></article>`).join('')||'<p>لا توجد بطاقات. أضف بطاقة لواجهة المركز.</p>';
   $$('[data-edit-promo]').forEach(b=>b.addEventListener('click',()=>openPromo(b.dataset.editPromo)));
   $('#admin-contacts').innerHTML=presentation.contacts.map(g=>`<fieldset><legend>${escape(g.name)}</legend>${g.phones.map(p=>`<label class="contact-setting"><span><strong dir="ltr">${escape(p.display)}</strong><small>${escape(p.label)}</small></span><span class="checkbox-row"><input name="whatsapp" type="checkbox" value="${p.number}" ${p.whatsapp?'checked':''} ${p.number==='+967770525525'?'disabled':''}>واتساب مؤكد</span></label>`).join('')}</fieldset>`).join('');
 }
 function promoImages(value){const select=$('#promo-image-select');select.innerHTML='<option value="">بدون صورة / صورة المنتج المختار</option>'+[...catalog.images,...(catalog.presentation_images||[])].map(i=>`<option value="${escape(i.url)}">${escape(i.filename||i.id)}</option>`).join('');select.value=value||'';updatePromoImage();}
 function updatePromoImage(){const url=$('#promo-image-select').value,img=$('#promo-image-preview');img.hidden=!url;if(url)img.src=url;else img.removeAttribute('src');}
 function promoTarget(){const form=$('#promo-form'),product=form.elements.target.value==='product';$('#promo-product-label').hidden=!product;form.elements.product_id.required=product;}
 function openPromo(id){
   activePromo=catalog.presentation.cards.find(c=>c.id===id)||null;const form=$('#promo-form');form.reset();error('#promo-error','');$('#promo-upload-status').textContent='';
   form.elements.product_id.innerHTML='<option value="">اختر المنتج</option>'+catalog.products.map(p=>`<option value="${p.id}">${escape(p.name)}${p.visible?'':' — مخفي'}</option>`).join('');
   if(activePromo)for(const [k,v] of Object.entries(activePromo)){const field=form.elements[k];if(field){if(field.type==='checkbox')field.checked=v;else field.value=v??'';}}
   else form.elements.position.value=catalog.presentation.cards.length;
   promoImages(activePromo?.image||'');promoTarget();$('#delete-promo').hidden=!activePromo;dirty=false;show('#promo-editor');
 }
 $('#new-promo').addEventListener('click',()=>openPromo());
 $('#promo-image-select').addEventListener('change',updatePromoImage);$('#promo-form').elements.target.addEventListener('change',promoTarget);
 $('#promo-form').addEventListener('submit',async e=>{e.preventDefault();if(uploads){toast('انتظر رفع الصورة.');return;}const form=e.currentTarget,button=$('button[type="submit"]',form),data=Object.fromEntries(new FormData(form));data.position=Number(data.position);data.visible=form.elements.visible.checked;data.version=catalog.presentation.version;button.disabled=true;error('#promo-error','');try{await api('cards'+(activePromo?'/'+activePromo.id:''),activePromo?'PUT':'POST',data);dirty=false;close('promo-editor');await load();toast('تم حفظ بطاقة الواجهة.');}catch(err){error('#promo-error',err.message);}finally{button.disabled=false;}});
 $('#delete-promo').addEventListener('click',async()=>{if(!activePromo||!await confirmAction('حذف هذه البطاقة من الواجهة؟ يبقى المنتج وصوره محفوظين.','حذف البطاقة'))return;try{await api('cards/'+activePromo.id,'DELETE',{version:catalog.presentation.version});dirty=false;close('promo-editor');await load();toast('حُذفت البطاقة.');}catch(e){error('#promo-error',e.message);}});
 $('#upload-promo-image').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;uploads++;try{$('#promo-upload-status').textContent='جارٍ رفع الصورة…';const im=await api('images','POST',await prepareImage(file));catalog.images.unshift(im);promoImages(im.url);dirty=true;$('#promo-upload-status').textContent='الصورة جاهزة؛ احفظ البطاقة لإظهارها.';}catch(err){error('#promo-error',err.message);}finally{uploads--;e.target.value='';}});
 $('#contacts-form').addEventListener('submit',async e=>{e.preventDefault();const button=$('button[type="submit"]',e.currentTarget);button.disabled=true;error('#contacts-error','');const whatsapp=$$('input[name="whatsapp"]:checked',e.currentTarget).map(i=>i.value);try{await api('contacts','PUT',{whatsapp,version:catalog.presentation.version});dirty=false;await load();toast('تم حفظ أرقام واتساب المعتمدة.');}catch(err){error('#contacts-error',err.message);}finally{button.disabled=false;}});
 for(const kind of ['trash','audit']){$('#'+kind+'-refresh').addEventListener('click',()=>loadHistory(kind,1));$('#'+kind+'-search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();loadHistory(kind,1);}});$('#'+kind+'-prev').addEventListener('click',()=>loadHistory(kind,Math.max(1,historyState[kind].page-1)));$('#'+kind+'-next').addEventListener('click',()=>loadHistory(kind,Math.min(historyState[kind].pages,historyState[kind].page+1)));}
 $$('[data-open-history]').forEach(button=>button.addEventListener('click',()=>{$('#tab-'+button.dataset.openHistory).click();loadHistory(button.dataset.openHistory,historyState[button.dataset.openHistory].page);}));
 $('#trash-restore-selected').addEventListener('click',async()=>{const items=historyState.trash.items.filter(x=>trashSelected.has(x.type+':'+x.id)).map(x=>({type:x.type,id:x.id,version:x.version}));if(!items.length||!await confirmAction(`استعادة ${items.length.toLocaleString('ar')} سجلات محددة للمراجعة؟`,'استعادة المحدد'))return;try{const result=await api('restore-bulk','POST',{items});trashSelected.clear();toast(`تمت استعادة ${result.restored.toLocaleString('ar')} سجلات.`);await load();await loadHistory('trash',historyState.trash.page);}catch(err){error('#admin-error',err.message);}});
 load();
})();
