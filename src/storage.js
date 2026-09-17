/* Preferences may degrade to memory. Controller writes require a committed,
 * read-back-verified backup transaction. Never access an unopened database. */
(function (root) {
  "use strict";
  const ready = new Promise((resolve) => {
    let request,
      settled = false;
    const finish = (db) => {
      if (settled) {
        db?.close();
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(db);
    };
    const timer = setTimeout(() => finish(null), 4000);
    try {
      request = indexedDB.open("bbsflash-release", 1);
    } catch {
      finish(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("prefs");
      db.createObjectStore("backups", { keyPath: "id" });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      finish(db);
    };
    request.onerror = request.onblocked = () => finish(null);
  });
  async function transaction(store, mode, operation) {
    const db = await ready;
    if (!db) throw new Error("STORAGE");
    return new Promise((resolve, reject) => {
      let tx, request;
      try {
        tx = db.transaction(store, mode, { durability: "strict" });
        request = operation(tx.objectStore(store));
      } catch (e) {
        reject(e);
        return;
      }
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () => reject(tx.error || new Error("STORAGE"));
    });
  }
  const get = (store, key) => transaction(store, "readonly", (s) => s.get(key));
  const put = (store, value, key) =>
    transaction(store, "readwrite", (s) =>
      key === undefined ? s.put(value) : s.put(value, key),
    );
  async function saveBackup(snapshot) {
    const item = { ...snapshot, id: snapshot.sessionId + "-" + snapshot.at };
    await put("backups", item);
    const saved = await get("backups", item.id);
    if (!root.BBSCore.eq(item, saved)) throw new Error("STORAGE");
    await put("prefs", item.id, "latestBackup");
    return item;
  }
  root.BBSStore = {
    ready,
    get,
    put,
    saveBackup,
    async latest() {
      const id = await get("prefs", "latestBackup");
      return id ? get("backups", id) : null;
    },
  };
})(globalThis);
