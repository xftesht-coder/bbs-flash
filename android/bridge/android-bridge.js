/* Native USB transport only. Protocol, validation and verified backup remain in BBSCore. */
(() => {
  'use strict';
  if (!window.BBSAndroid?.postMessage) return;
  const pending = new Map(), serial = new EventTarget();
  const prefix = crypto.randomUUID();
  let sequence = 0, active = null, choosing = false, transactionBusy = false, historyId = null;
  function rpc(op, args = {}, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const id = prefix + ':' + (++sequence);
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('Android: время ожидания истекло. Подключись заново.'));
        if (['choose','open','write','busy'].includes(op)) {
          active?.lost('Связь с Android прервана');
          BBSAndroid.postMessage(JSON.stringify({id: prefix + ':cancel', op: 'close'}));
        }
      }, timeout);
      pending.set(id, {resolve, reject, timer, op});
      try { BBSAndroid.postMessage(JSON.stringify({id, op, ...args})); }
      catch (error) {clearTimeout(timer);pending.delete(id);reject(error);}
    });
  }
  BBSAndroid.onmessage = ({data}) => {
    let m; try {m = JSON.parse(data);} catch {return;}
    if (m.event) {
      if (!active || active.token !== m.token) return;
      if (m.event === 'data') {
        try {
          if (!Array.isArray(m.bytes) || m.bytes.length > 512 || m.bytes.some(b => !Number.isInteger(b) || b < 0 || b > 255)) throw Error('Некорректные данные USB');
          if (active.controller?.desiredSize < -4096) throw Error('Переполнение USB');
          active.controller?.enqueue(Uint8Array.from(m.bytes));
        } catch(e) {active?.lost(e.message);rpc('close').catch(()=>{});}
      } else if (m.event === 'disconnected') active.lost(m.error || 'USB отключён');
      return;
    }
    const request = pending.get(m.id);
    if (!request) return;
    clearTimeout(request.timer);pending.delete(m.id);
    if (m.error) request.reject(new Error(m.error));else request.resolve(m.result);
  };
  class AndroidPort extends EventTarget {
    constructor(info) {super();this.token=info.token;this.info=info;this.opened=false;}
    getInfo() {return {usbVendorId:this.info.vendorId,usbProductId:this.info.productId};}
    getDiagnostics() {return {driver:this.info.driver,androidApi:this.info.androidApi,appVersion:this.info.appVersion,readMode:this.info.readMode,...this.getInfo()};}
    async open(options) {
      if (this.opened || active !== this) throw Error('Подключись заново');
      if (options.baudRate !== 1200 || options.dataBits !== 8 || options.stopBits !== 1 || options.parity !== 'none' || options.flowControl !== 'none') throw Error('Поддерживается только Bafang UART 1200 8N1');
      this.readable = new ReadableStream({start:c=>{this.controller=c;},cancel:()=>{this.controller=null;}}, {highWaterMark:4096,size:b=>b.byteLength});
      try {await rpc('open',{token:this.token});} catch(e) {this.lost(e.message);throw e;}
      this.opened=true;
      this.writable = new WritableStream({write:async bytes=>{
        if (!this.opened || active !== this) throw Error('USB отключён');
        if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > 256) throw Error('Некорректная команда UART');
        await rpc('write',{token:this.token,bytes:Array.from(bytes)});
      }});
    }
    lost(reason) {
      this.opened=false;
      try {this.controller?.error(new Error(reason));} catch {}
      this.controller=null;
      if (active === this) active=null;
      for (const [id,p] of pending) if (p.op !== 'save' && p.op !== 'close') {clearTimeout(p.timer);pending.delete(id);p.reject(new Error(reason));}
      const event=new Event('disconnect');Object.defineProperty(event,'target',{value:this});serial.dispatchEvent(event);
    }
    async close() {
      this.opened=false;
      try {this.controller?.close();} catch {}
      this.controller=null;
      if (active===this) active=null;
      await rpc('close',{token:this.token});
    }
  }
  serial.requestPort=async()=>{
    if (choosing || active) throw Error('Сначала отключи текущий кабель');
    choosing=true;
    try {const info=await rpc('choose',{},120000);historyId=info.historyId;active=new AndroidPort(info);return active;}
    finally {choosing=false;}
  };
  serial.getPorts=async()=>active?[active]:[];
  Object.defineProperty(navigator,'serial',{value:serial,configurable:true});
  Object.defineProperty(window,'BBSNative',{value:Object.freeze({platform:'android',version:'0.3.0-rc1',
    setBusy(value){transactionBusy=!!value;globalThis.document?.dispatchEvent?.(new Event('bbs-native-busy'));return rpc('busy',{value:transactionBusy});},
    record(kind){if(historyId)rpc('record',{historyId,kind}).catch(()=>{});},
    history:()=>rpc('history'),
    compatibility:()=>rpc('compatibility'),
    clearHistory:()=>rpc('historyClear'),
    configureDiagnostics:config=>rpc('diagnosticsConfig',config),
    sendDiagnostics:()=>rpc('diagnosticsSend',{},120000),
    get busy(){return transactionBusy;},get connected(){return !!active;}
  })});

  // Handle both attached and detached download anchors used by the existing UI.
  const blobs=new Map(),create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=blob=>{const url=create(blob);blobs.set(url,blob);return url;};
  URL.revokeObjectURL=url=>{blobs.delete(url);revoke(url);};
  const click=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function() {
    const blob=blobs.get(this.href);
    if (!this.download || !blob) return click.call(this);
    if (transactionBusy) {alert('Дождись завершения чтения или записи. Сохранение сейчас прервёт подключение.');return;}
    const name=this.download;
    if (blob.size > 4*1024*1024) {alert('Файл больше 4 МБ. Сохрани меньший файл.');return;}
    blob.arrayBuffer().then(buffer=>{
      if(transactionBusy)throw Error('Дождись завершения чтения или записи');
      let binary='';for(const b of new Uint8Array(buffer)) binary+=String.fromCharCode(b);
      return rpc('save',{name,mime:blob.type || 'application/octet-stream',data:btoa(binary)},120000);
    }).catch(e=>alert('Не удалось сохранить файл: '+e.message));
  };
})();
