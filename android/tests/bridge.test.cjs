const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync(require('node:path').join(__dirname,'../bridge/android-bridge.js'),'utf8');
test('busy guard requires native acknowledgment and history RPC exposes no credentials',async()=>{
  const s=setup();let done=false;
  const busy=s.context.BBSNative.setBusy(true).then(()=>done=true);
  await Promise.resolve();assert.equal(done,false);assert.equal(s.context.BBSNative.busy,true);
  assert.equal(s.messages.at(-1).op,'busy');s.answer(s.messages.at(-1));await busy;
  const history=s.context.BBSNative.history();assert.equal(s.messages.at(-1).op,'history');
  s.answer(s.messages.at(-1),{sessions:[],consent:false});assert.equal((await history).consent,false);
  const idle=s.context.BBSNative.setBusy(false);s.answer(s.messages.at(-1));await idle;
  assert.equal(s.context.BBSNative.busy,false);
});
function setup() {
  const messages=[],saves=[];
  class Anchor {click(){}}
  const context={console,crypto:require('node:crypto').webcrypto,navigator:{},EventTarget,Event,ReadableStream,WritableStream,Uint8Array,Map,Promise,Error,setTimeout,clearTimeout,HTMLAnchorElement:Anchor,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},alert:()=>{},btoa:s=>Buffer.from(s,'binary').toString('base64')};
  context.window=context;
  context.BBSAndroid={postMessage(raw){messages.push(JSON.parse(raw));}};
  vm.runInNewContext(code,context);
  const emit=m=>context.BBSAndroid.onmessage({data:JSON.stringify(m)});
  const answer=(request,result=null,error)=>emit({id:request.id,result,error});
  async function open(token='one'){
    const choosing=context.navigator.serial.requestPort();answer(messages.at(-1),{token,vendorId:6790,productId:29987});const port=await choosing;
    const opening=port.open({baudRate:1200,dataBits:8,stopBits:1,parity:'none',flowControl:'none'});answer(messages.at(-1));await opening;return port;
  }
  return {context,messages,emit,answer,open};
}
test('USB write waits for native completion, receives arbitrary fragments and ignores old sessions',async()=>{
  const s=setup(),port=await s.open(),writer=port.writable.getWriter(),reader=port.readable.getReader();
  let completed=false;const writing=writer.write(Uint8Array.from([17,81,4,176,5])).then(()=>completed=true);
  await Promise.resolve();assert.equal(completed,false);assert.deepEqual(s.messages.at(-1).bytes,[17,81,4,176,5]);
  s.emit({event:'data',token:'old',bytes:[255]});s.emit({event:'data',token:'one',bytes:[81]});s.emit({event:'data',token:'one',bytes:[16,72]});
  assert.deepEqual([...(await reader.read()).value],[81]);assert.deepEqual([...(await reader.read()).value],[16,72]);
  s.answer(s.messages.at(-1));await writing;assert.equal(completed,true);
  await reader.cancel();const closing=port.close();s.answer(s.messages.at(-1));await closing;
});
test('detach rejects pending writes, errors reader, prevents retry and permits fresh selection',async()=>{
  const s=setup(),port=await s.open(),reader=port.readable.getReader(),writer=port.writable.getWriter();
  const read=reader.read(),readFailure=assert.rejects(read,/USB/);
  const write=writer.write(Uint8Array.from([22,82,1])),writeFailure=assert.rejects(write,/USB/);
  await Promise.resolve();const before=s.messages.filter(m=>m.op==='write').length;
  s.emit({event:'disconnected',token:'one',error:'USB disconnected'});await Promise.all([readFailure,writeFailure]);
  await assert.rejects(writer.write(Uint8Array.from([22,82,1])));
  assert.equal(s.messages.filter(m=>m.op==='write').length,before);
  const next=await s.open('two');s.emit({event:'disconnected',token:'one'});assert.equal(next.opened,true);
  const closing=next.close();s.answer(s.messages.at(-1));await closing;
});
test('permission denial produces no open or writes; invalid framing is rejected before native transport',async()=>{
  const s=setup(),select=s.context.navigator.serial.requestPort();s.answer(s.messages.at(-1),null,'Permission denied');await assert.rejects(select,/Permission/);
  assert.deepEqual(s.messages.map(m=>m.op),['choose']);
  const port=await s.open(),writer=port.writable.getWriter();
  await assert.rejects(writer.write(new Uint8Array(257)),/UART/);
  assert.equal(s.messages.some(m=>m.op==='write'),false);
  const closing=port.close();s.answer(s.messages.at(-1));await closing;
});
