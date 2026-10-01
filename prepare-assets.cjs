const fs=require('fs'),path=require('path'),sharp=require('sharp');
const source=process.argv[2];
if(!source) throw new Error('Pass the directory of extracted originals');
const out=path.join(__dirname,'public/assets/photos');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const files=fs.readdirSync(source).filter(f=>/^photo_\d+_.*\.jpg$/.test(f));
 const metadata={};
 for(const f of files){const n=+f.match(/^photo_(\d+)_/)[1],input=path.join(source,f);const meta=await sharp(input).metadata();metadata[n]={width:meta.width,height:meta.height,original:f};
 await sharp(input).rotate().resize({width:1080,height:1350,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toFile(path.join(out,`${n}.webp`));
 await sharp(input).rotate().resize({width:520,height:650,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toFile(path.join(out,`${n}-small.webp`));
 }
 await sharp('content/received/brand-logo.png').resize(640).webp({quality:94}).toFile('public/assets/logo.webp');
 await sharp('content/received/brand-logo.png').resize(96).png().toFile('public/assets/favicon.png');
 fs.writeFileSync('content/image-metadata.json',JSON.stringify(metadata,null,2));
 console.log(`Prepared ${files.length} source photos, logo and favicon`);
})();
