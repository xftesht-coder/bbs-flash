const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/core.js');
const {FakePort}=require('./helpers.cjs');
const general=require('./fixtures/szz9-general-capture.json').chunks.flat();

test('iQOO capture: timeout or singleton 10 cannot identify motor or transmit settings',async()=>{
  for(const response of [null,[0x10]]){
    const port=new FakePort();port.intercept=()=>response;
    const session=new C.SerialSession(port,{timeout:50});
    await assert.rejects(session.open(),e=>e.code===(response?'UNEXPECTED_BLOCK':'TIMEOUT'));
    assert.equal(session.device,null);assert.equal(C.isWriteReady(session),false);
    assert.equal(session.closed,true);assert.deepEqual(port.sent,[[0x11,0x51,0x04,0xb0,0x05]]);
    // Late complete data cannot revive a failed handshake or cause a retry.
    session.receive(general);assert.equal(session.device,null);assert.equal(port.sent.length,1);
    await session.close();
  }
});

test('a complete General split across a 250ms USB boundary succeeds without inventing bytes',async()=>{
  const port=new FakePort();let reads=0;
  port.intercept=()=>{reads++;port.emit([]);setTimeout(()=>port.emit([0x51]),190);setTimeout(()=>port.emit(general.slice(1)),310);return null;};
  const session=new C.SerialSession(port,{timeout:800});
  try{const device=await session.open();assert.equal(device.model,'SZZ9');assert.equal(reads,2);assert.equal(C.isWriteReady(session),false);assert.ok(port.sent.every(f=>f[0]===0x11));}
  finally{await session.close();}
});
