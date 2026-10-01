'use strict';
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const dataNode = $('#catalog-data');
  const products = dataNode ? JSON.parse(dataNode.textContent) : [];
  const number = n => n.toLocaleString('ar');
  const normalize = s => String(s).normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase().trim();
  let toastTimer;
  function toast(text) {
    const target = $('#toast');
    target.textContent = text; target.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { target.hidden = true; }, 4600);
  }
  const header=$('.site-header');
  if(header&&typeof ResizeObserver!=='undefined')new ResizeObserver(()=>document.documentElement.style.setProperty('--sticky-header-height',(header.getBoundingClientRect().height+12)+'px')).observe(header);
  const menu = $('.menu-toggle');
  if (menu) {
    const nav = $('#main-nav');
    const close = () => { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'فتح القائمة'); const shortcuts=$('.shortcut-menu',nav); if(shortcuts) shortcuts.open=false; };
    menu.addEventListener('click', () => { menu.classList.add('cue-seen'); const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة'); });
    $$('a', nav).forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', e => { if (e.key === 'Escape'&&nav.classList.contains('open')) {close();menu.focus();} });
    document.addEventListener('click', e => { if (!e.target.closest('.site-header')) close(); });
  }
  const shortcutMenu=$('.shortcut-menu');
  if(shortcutMenu){
    document.addEventListener('click',e=>{if(shortcutMenu.open&&!e.target.closest('.shortcut-menu'))shortcutMenu.open=false;});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')shortcutMenu.open=false;});
  }
  const heroCarousel=$('[data-mobile-carousel]');
  if(heroCarousel){
    const items=Array.from(heroCarousel.children),dots=$('[data-carousel-dots]');if(items.length<2){const hint=$('.carousel-hint');if(hint)hint.hidden=true;} let stopped=false,timer,activeIndex=0;
    const center=()=>Math.max(0,items.indexOf($('.brand-card-stage',heroCarousel)));
    const go=index=>{const safe=(index+items.length)%items.length,item=items[safe];if(item){activeIndex=safe;heroCarousel.scrollTo({left:item.offsetLeft-(heroCarousel.clientWidth-item.offsetWidth)/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});updateDots(safe);}};
    const current=()=>{const middle=heroCarousel.scrollLeft+heroCarousel.clientWidth/2;return items.reduce((best,item,index)=>Math.abs(item.offsetLeft+item.offsetWidth/2-middle)<best.distance?{index,distance:Math.abs(item.offsetLeft+item.offsetWidth/2-middle)}:best,{index:0,distance:Infinity}).index;};
    const updateDots=index=>{if(dots)$$('i',dots).forEach((dot,i)=>dot.classList.toggle('active',i===index));};
    if(dots)items.forEach((_,i)=>{const dot=document.createElement('i');if(i===center())dot.className='active';dots.appendChild(dot);});
    const stop=()=>{activeIndex=current();stopped=true;clearInterval(timer);};
    const initialize=()=>requestAnimationFrame(()=>go(center()));initialize();
    if(items.length>1&&!matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setInterval(()=>{if(!stopped)go(activeIndex+1);},5200);
    heroCarousel.addEventListener('scroll',()=>updateDots(current()),{passive:true});
    ['pointerdown','touchstart','wheel'].forEach(event=>heroCarousel.addEventListener(event,stop,{passive:true,once:true}));
    heroCarousel.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Enter',' '].includes(event.key))stop();});
    $('[data-carousel-prev]')?.addEventListener('click',()=>{stop();go(activeIndex-1);});$('[data-carousel-next]')?.addEventListener('click',()=>{stop();go(activeIndex+1);});
  }
  $$('[data-focus-search]').forEach(link=>link.addEventListener('click',()=>requestAnimationFrame(()=>$('#search')?.focus({preventScroll:true}))));
  $$('[data-unconfirmed]').forEach(button => button.addEventListener('click', () => toast('رابط '+button.dataset.unconfirmed+' بانتظار تأكيد الحساب من المركز.')));
  const grid = $('#products');
  if (grid) {
    const cards = $$('.product-card', grid);
    const search = $('#search'), sort = $('#sort'), filters = $$('.filter');
    const limit = 12;
    let category = 'الكل', visibleLimit = limit;
    const params = new URLSearchParams(location.search);
    search.value = params.get('q') || '';
    const requested = params.get('category');
    if (filters.some(b => b.dataset.category === requested)) category = requested;
    function render({more = false} = {}) {
      if (!more) visibleLimit = limit;
      const query = normalize(search.value);
      const words = query.split(/\s+/).filter(Boolean);
      const matching = cards.filter(card => (category === 'الكل' || (card.dataset.categories||'').split(' ').includes(category)) && words.every(w => normalize(card.dataset.search).includes(w)));
      if (sort.value === 'best-sellers') matching.sort((a,b) => Number(b.dataset.bestSeller||0) - Number(a.dataset.bestSeller||0));
      if (sort.value === 'name') matching.sort((a,b) => $('h3',a).textContent.localeCompare($('h3',b).textContent,'ar'));
      if (sort.value === 'photos') matching.sort((a,b) => products.find(p => p.id === b.dataset.id).images.length - products.find(p => p.id === a.dataset.id).images.length);
      cards.forEach(card => { card.hidden = true; });
      matching.forEach((card, i) => { grid.appendChild(card); card.hidden = i >= visibleLimit; });
      filters.forEach(b => { const selected = category === b.dataset.category; b.classList.toggle('active', selected); b.setAttribute('aria-pressed', String(selected)); });
      $('#count').textContent = matching.length ? `عرض ${number(Math.min(visibleLimit,matching.length))} من ${number(matching.length)} منتجًا` : 'لا توجد نتائج مطابقة';
      $('#empty').hidden = matching.length > 0;
      $('#load-area').hidden = matching.length <= visibleLimit;
      if (matching.length > visibleLimit) $('#load-more').firstChild.textContent = `عرض المزيد (${number(matching.length-visibleLimit)}) `;
      const next = new URL(location.href);
      query ? next.searchParams.set('q',search.value) : next.searchParams.delete('q');
      category !== 'الكل' ? next.searchParams.set('category',category) : next.searchParams.delete('category');
      history.replaceState(null,'',next.pathname+next.search+next.hash);
    }
    search.addEventListener('input', () => render());
    sort.addEventListener('change', () => render());
    filters.forEach(b => b.addEventListener('click', () => { category = b.dataset.category; render(); }));
    $$('[data-jump-category]').forEach(a => a.addEventListener('click', () => { category=a.dataset.jumpCategory; search.value=''; render(); }));
    $('#load-more').addEventListener('click', () => { const previouslyVisible = Math.min(visibleLimit,cards.length); visibleLimit += limit; render({more:true}); const shown=$$('.product-card:not([hidden])',grid); if(shown[previouslyVisible]) $('a',shown[previouslyVisible]).focus({preventScroll:true}); });
    $('#reset').addEventListener('click', () => { category='الكل'; search.value=''; sort.value='featured'; render(); search.focus({preventScroll:true}); });
    render();
    if(location.hash){const section=document.getElementById(location.hash.slice(1));if(section)requestAnimationFrame(()=>section.scrollIntoView({behavior:"instant",block:"start"}));}
  }
  const quickDialog = $('#quick-dialog');
  function show(dialog) { dialog.showModal(); document.body.classList.add('dialog-open'); }
  $$('dialog').forEach(dialog => {
    $('[data-close]', dialog)?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if(e.target === dialog) { const box=dialog.getBoundingClientRect(); if(e.clientX<box.left || e.clientX>box.right || e.clientY<box.top || e.clientY>box.bottom) dialog.close(); } });
    dialog.addEventListener('close', () => { if(!$('dialog[open]')) document.body.classList.remove('dialog-open'); });
  });
  const accountDialog=$('#account-dialog'),accountNode=$('#account-data');
  const accounts=accountNode?JSON.parse(accountNode.textContent):[];
  $$('[data-account]').forEach(link=>{
    const account=accounts.find(a=>a.id===link.dataset.account);if(!account||!accountDialog)return;
    link.setAttribute('aria-haspopup','dialog');
    link.addEventListener('click',event=>{
      if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      event.preventDefault();
      $('#account-platform').replaceChildren(link.querySelector('svg').cloneNode(true),document.createTextNode(account.name));
      $('#account-title').textContent='مركز أبو مصطفى التجاري';$('#account-summary').textContent=account.summary;
      $('#account-visit').href=account.url;$('#account-visit').firstChild.textContent=account.id==='whatsapp'?'فتح المحادثة ':'زيارة الحساب ';
      $('.account-stats',accountDialog).hidden=account.id==='whatsapp';
      show(accountDialog);
    });
  });
  $$('[data-quick]').forEach(button => button.addEventListener('click', () => {
    const product = products.find(p => p.id === button.dataset.quick);
    if(!product) return;
    $('#quick-title').textContent = product.name;
    $('#quick-category').textContent = product.category_path||product.category;
    $('#quick-description').textContent = product.description;
    $('#quick-inquiry').href = product.inquiry_url;
    $('#quick-details').href = '/products/'+product.id+'/';
    const target = $('#quick-image');
    target.src = product.gallery[0].url; target.alt = product.name+' — الصورة ١';
    const thumbs = $('#quick-thumbs'); thumbs.replaceChildren();
    product.gallery.forEach(({url},i) => {
      const thumb=document.createElement('button'); thumb.className='thumb'+(i===0?' active':''); thumb.type='button';
      thumb.setAttribute('aria-label','عرض الصورة '+number(i+1)+' من '+product.name); thumb.setAttribute('aria-pressed',String(i===0));
      const img=document.createElement('img'); img.src=url.includes('/assets/photos/')?url.replace('.webp','-small.webp'):url; img.alt=product.name+' — '+number(i+1); img.loading='lazy'; thumb.appendChild(img);
      thumb.addEventListener('click', () => { target.src=url; target.alt=product.name+' — الصورة '+number(i+1); $$('button',thumbs).forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');}); thumb.classList.add('active');thumb.setAttribute('aria-pressed','true'); });
      thumbs.appendChild(thumb);
    });
    show(quickDialog);
  }));
  $$('[data-image]').forEach(button => button.addEventListener('click', () => {
    const gallery=button.closest('.detail-gallery'), target=$('.detail-image',gallery);
    target.src=button.dataset.image; target.alt=$('img',button).alt;
    $$('[data-image]',gallery).forEach(b=>{ b.classList.toggle('active',b===button); b.setAttribute('aria-pressed',String(b===button)); });
  }));
  $$('[data-zoom]').forEach(button => button.addEventListener('click', () => {
    const original=$('.detail-image',button.closest('.detail-gallery'));
    $('#zoom-image').src=original.src; $('#zoom-image').alt=original.alt; show($('#zoom-dialog'));
  }));
  $$('[data-copy-url]').forEach(button => button.addEventListener('click', async () => {
    const text=button.dataset.copyUrl;
    try {
      if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else { const field=document.createElement('textarea');field.value=text;field.style.position='fixed';field.style.opacity='0';document.body.appendChild(field);field.select();const success=document.execCommand('copy');field.remove();if(!success) throw Error('copy unavailable'); }
      toast('تم نسخ رابط المنتج.');
    } catch { toast('تعذّر النسخ تلقائيًا. يمكنك نسخ رابط الصفحة من شريط العنوان.'); }
  }));
  const reviewForm=$('#public-review-form');
  if(reviewForm)reviewForm.addEventListener('submit',async event=>{
    event.preventDefault();const button=$('button[type="submit"]',reviewForm),status=$('.review-form-status',reviewForm),formData=new FormData(reviewForm);
    button.disabled=true;button.textContent='جارٍ الإرسال…';status.className='review-form-status';status.textContent='';
    const payload=Object.fromEntries(formData);payload.rating=Number(payload.rating);payload.consent=reviewForm.elements.consent.checked;
    try{const response=await fetch('/api/reviews',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw Error(data.error||'تعذّر إرسال التقييم.');reviewForm.reset();reviewForm.elements.rating.value='5';status.classList.add('success');status.textContent='شكرًا لك. وصل تقييمك وسيظهر بعد مراجعته واعتماده.';}
    catch(error){status.classList.add('error');status.textContent=error.message||'تعذّر إرسال التقييم. حاول مرة أخرى.';}
    finally{button.disabled=false;button.textContent='إرسال التقييم للمراجعة';}
  });
})();
