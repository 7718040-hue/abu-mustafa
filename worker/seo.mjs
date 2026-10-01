import identity from '../content/seo.json';
import shell from '../content/site-shell.json';
import {ORIGIN} from './data.mjs';
import {contactSchema} from './presentation-markup.mjs';

export {identity};
export const websiteSchema=()=>({
  '@context':'https://schema.org','@type':'WebSite','@id':ORIGIN+'/#website',
  url:ORIGIN+'/',name:identity.siteName,alternateName:identity.alternateName,
  inLanguage:'ar-YE',publisher:{'@id':ORIGIN+'/#store'}
});
export function businessSchema(presentation){
  const base=shell.storeSchema;
  // Store is a subtype of LocalBusiness and Organization: one stable entity, not three duplicates.
  const schema={...base,'@id':ORIGIN+'/#store',name:identity.businessName,
    alternateName:[identity.siteName,identity.alternateName],url:ORIGIN+'/',
    logo:ORIGIN+identity.logoPath,description:identity.description,
    address:{...base.address,streetAddress:'شارع تعز، جوار البرج، أمام القوسي للجنابي تمامًا',addressLocality:'إب',addressRegion:'إب'},
    sameAs:shell.socialAccounts.filter(a=>['instagram','facebook','tiktok','youtube','telegram','x','card'].includes(a.id)).map(a=>a.url)
  };
  if(presentation){schema.contactPoint=contactSchema(presentation);schema.telephone=[...new Set(presentation.contacts.flatMap(g=>g.phones.map(p=>p.number)))];}
  // Owner-selected testimonials stay visible, but are not self-serving business review markup.
  delete schema.review;delete schema.aggregateRating;
  return schema;
}
export const summary=text=>String(text||'').replace(/\s+/g,' ').trim().slice(0,300);
// Join real entities by stable IDs. These describe visible content, not ranking instructions.
export function pageEntities(schema,{path,title,description,product,imageUrl,imageAlt,dimensions}){
  const url=ORIGIN+path;
  const nodes=schema.map(node=>({...node}));
  if(!nodes.some(n=>n['@type']==='WebSite'))nodes.unshift(websiteSchema());
  const store=nodes.find(n=>n['@type']==='Store');
  const list=nodes.find(n=>n['@type']==='ItemList');
  const breadcrumb=nodes.find(n=>n['@type']==='BreadcrumbList');
  const article=nodes.find(n=>n['@type']==='Article');
  const item=nodes.find(n=>n['@type']==='Product');
  const faq=nodes.find(n=>n['@type']==='FAQPage');
  if(list)list['@id']=url+'#collection';
  if(breadcrumb)breadcrumb['@id']=url+'#breadcrumb';
  if(faq){faq['@id']=url+'#faq';faq.isPartOf={'@id':url+'#webpage'};}
  const images=(product?.gallery?.length?product.gallery:[{url:imageUrl,alt:imageAlt,...dimensions}]).map((im,index)=>({
    '@context':'https://schema.org','@type':'ImageObject','@id':url+'#image-'+(index+1),
    url:new URL(im.url,ORIGIN).href,contentUrl:new URL(im.url,ORIGIN).href,
    caption:im.alt||product?.name||title,
    ...(Number(im.width)>0?{width:Number(im.width)}:{}),...(Number(im.height)>0?{height:Number(im.height)}:{})
  }));
  const page={'@context':'https://schema.org','@type':path.startsWith('/categories/')?'CollectionPage':'WebPage',
    '@id':url+'#webpage',url,name:title,description:summary(description),inLanguage:'ar-YE',
    isPartOf:{'@id':ORIGIN+'/#website'},about:{'@id':ORIGIN+'/#store'},publisher:{'@id':ORIGIN+'/#store'},
    primaryImageOfPage:{'@id':images[0]['@id']},
    ...(breadcrumb?{breadcrumb:{'@id':breadcrumb['@id']}}:{})
  };
  const main=item||article||(path==='/'?store:list);
  if(main){page.mainEntity={'@id':main['@id']};if(item||article)main.mainEntityOfPage={'@id':page['@id']};}
  return [...nodes,page,...images];
}
export function iconLinks(){return '<link rel="icon" href="/assets/favicon.png" type="image/png" sizes="96x96"><link rel="icon" href="/assets/favicon-48.png" type="image/png" sizes="48x48"><link rel="icon" href="/assets/favicon-192.png" type="image/png" sizes="192x192"><link rel="icon" href="/assets/favicon-512.png" type="image/png" sizes="512x512"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" sizes="180x180"><link rel="manifest" href="/site.webmanifest">';}
export function manifest(){return {name:identity.siteName,short_name:identity.alternateName,lang:'ar',dir:'rtl',id:'/',start_url:'/',scope:'/',display:'browser',theme_color:'#4b172b',background_color:'#4b172b',icons:[{src:'/assets/favicon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/assets/favicon-512.png',sizes:'512x512',type:'image/png',purpose:'any'}]};}
export function archiveHead(html,robots){
  // Archive pages retain their exact visitor content; only their head participates in the same SEO policy.
  return html.replace(/<head>([\s\S]*?)<\/head>/i,(_,head)=>'<head>'+head.replace(/<meta name="robots" content="[^"]*">/,`<meta name="robots" content="${robots}">`)+'</head>');
}
