// Resample the supplied square logo only. No crop, redrawing, recoloring, or edits to the original.
const fs=require('node:fs/promises');
const path=require('node:path');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
(async()=>{
 const source=path.join(root,'content/received/brand-logo.png');
 const metadata=await sharp(source).metadata();
 if(metadata.width!==metadata.height)throw Error('The official logo must be square; do not crop it automatically.');
 const sizes={48:'favicon-48.png',96:'favicon.png',180:'apple-touch-icon.png',192:'favicon-192.png',512:'favicon-512.png'};
 for(const [size,name] of Object.entries(sizes))await sharp(source).resize(Number(size),Number(size),{fit:'contain'}).png().toFile(path.join(root,'public/assets',name));
 const icoSizes=[48,96,192,256],pngs=[];
 for(const size of icoSizes)pngs.push(await sharp(source).resize(size,size,{fit:'contain'}).png().toBuffer());
 const header=Buffer.alloc(6+16*pngs.length);header.writeUInt16LE(1,2);header.writeUInt16LE(pngs.length,4);
 let offset=header.length;pngs.forEach((png,i)=>{const p=6+16*i,size=icoSizes[i];header[p]=size===256?0:size;header[p+1]=size===256?0:size;header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(png.length,p+8);header.writeUInt32LE(offset,p+12);offset+=png.length;});
 await fs.writeFile(path.join(root,'public/favicon.ico'),Buffer.concat([header,...pngs]));
 console.log('Official logo preserved; PNG 48/96/180/192/512 and ICO 48/96/192/256 generated.');
})().catch(error=>{console.error(error);process.exitCode=1;});
