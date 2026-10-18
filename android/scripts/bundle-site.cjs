// Package the reviewed website locally; no remote scripts or WebView website updates.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'android/app/build/generated/assets/site');
fs.mkdirSync(out,{recursive:true});
const files=['bbs-flash.html','index.html',...fs.readdirSync(path.join(root,'src')).filter(n=>/\.(js|css)$/.test(n)).map(n=>'src/'+n),'assets/icon.svg','assets/RussoOne-Regular.ttf','assets/OFL-RussoOne.txt','docs/CREDITS.md','android/THIRD-PARTY-NOTICES.txt','android/usb-serial-LICENSE.txt','android/Apache-2.0.txt'];
const manifest={webVersion:require('../../package.json').version,files:{}};
for(const file of files){
  let bytes=fs.readFileSync(path.join(root,file));
  if(file.endsWith('.html')) bytes=Buffer.from(bytes.toString().replace('<script defer', '<script defer src="./android-bridge.js"></script>\n    <script defer').replace("object-src 'none';", "object-src 'none'; frame-src 'none';"));
  const dest=path.join(out,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);
  manifest.files[file]=crypto.createHash('sha256').update(bytes).digest('hex');
}
fs.copyFileSync(path.join(root,'android/bridge/android-bridge.js'),path.join(out,'android-bridge.js'));
manifest.files['android-bridge.js']=crypto.createHash('sha256').update(fs.readFileSync(path.join(out,'android-bridge.js'))).digest('hex');
fs.writeFileSync(path.join(out,'bundle-manifest.json'),JSON.stringify(manifest,null,2));
console.log(`Bundled website ${manifest.webVersion}: ${Object.keys(manifest.files).length} local assets`);
