// Run only against the dedicated test emulator's debug APK, after adb forward tcp:9333.
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
  const targets=await (await fetch('http://127.0.0.1:9333/json')).json();
  const target=targets.find(t=>t.url.startsWith('https://appassets.androidplatform.net/'));
  assert.ok(target,'Local app WebView is running');
  const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=({data})=>{const m=JSON.parse(data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}};
  const call=(method,params)=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value;};
  try {
    const state=await evaluate(`({native:window.BBSNative,storage:document.getElementById('storageStatus').textContent,profiles:document.querySelectorAll('[data-ride]').length,overflow:document.documentElement.scrollWidth>innerWidth,secure:isSecureContext})`);
    assert.equal(state.native.platform,'android');assert.match(state.storage,/готово/);assert.equal(state.profiles,17);assert.equal(state.overflow,false);assert.equal(state.secure,true);
    await evaluate(`document.getElementById('connect').click()`);
    const status=await evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{const text=document.getElementById('status').textContent;if(text.includes('не найден')){clearInterval(timer);resolve(text);}else if(++n>50){clearInterval(timer);reject(Error(text));}},100);})`);
    assert.match(status,/OTG/);
    await evaluate(`document.querySelector('[data-panel="presets"]').click();document.querySelector('[data-ride="bread-run"]').click()`);
    assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);
    const screenshot=await call('Page.captureScreenshot',{format:'png'});
    fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/android-emulator-presets.png',Buffer.from(screenshot.data,'base64'));
    console.log('PASS Android 15: local HTTPS, native bridge, IndexedDB, 17 profiles, no horizontal overflow, real USB no-device error');
    console.log(JSON.stringify(state));
  } finally {ws.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
