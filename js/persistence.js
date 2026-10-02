/* Durable progress storage. Legacy localStorage remains available for migration. */
(function () {
  'use strict';
  const K = window.K;
  const directory = window.location ? decodeURIComponent(window.location.pathname).replace(/\/(index|katabasis)\.html$/i, '').toLowerCase() : 'headless';
  const MARKER='katabasis.progress.backend.v2';
  const P = { ready:false, recoveryBlocked:false, databaseName:'katabasis-progress:' + directory,
    status:{ backend:'localStorage', pending:false, error:null }, onStatus:null };
  let db=null, timer=null, busy=null, dirty=false;
  function status(pending,error) {
    P.status = { backend:P.ready ? 'IndexedDB' : 'localStorage', pending, error:error || null };
    if (P.onStatus) P.onStatus(P.status);
  }
  const recoveryMessage='Newer saved progress is unavailable. Reopen this game with browser storage enabled; your legacy backup is unchanged.';
  function migratedSaveExists() {
    try { const marker=JSON.parse(localStorage.getItem(MARKER)); return !!(marker && marker.databaseName===P.databaseName && marker.savedAt>(K.Save.data.storageUpdatedAt || 0)); }
    catch(error){return false;}
  }
  P.reportLocal = function (ok) { status(false,P.recoveryBlocked ? recoveryMessage : (ok ? null : 'Your progress could not be saved. Keep this page open and download a backup.')); };
  P.schedule = function () {
    dirty=true; status(true,null);
    if (!timer) timer=setTimeout(() => { timer=null; P.flush(); },100);
    return true;
  };
  P.flush = async function () {
    if (timer) { clearTimeout(timer); timer=null; }
    if (!P.ready) return K.Save.write();
    if (busy) { if (!(await busy)) return false; return P.flush(); }
    if (!dirty) return !P.status.error;
    dirty=false;
    busy=new Promise(resolve => {
      try {
        const tx=db.transaction('progress','readwrite');
        // IndexedDB clones this snapshot synchronously, without growing a JSON string.
        const savedAt=K.Save.data.storageUpdatedAt || 0;
        tx.objectStore('progress').put({ savedAt, data:K.Save.data },'save');
        tx.oncomplete=() => {
          try{localStorage.setItem(MARKER,JSON.stringify({databaseName:P.databaseName,savedAt}));}catch(error){}
          resolve(true);
        };
        tx.onabort=tx.onerror=() => resolve(false);
      } catch (error) { resolve(false); }
    });
    const ok=await busy; busy=null;
    if (!ok) {
      dirty=true; status(false,'Your progress could not be saved. Keep this page open and download a backup.');
      try { localStorage.setItem('katabasis.save.v1', JSON.stringify(K.Save.data).slice(0, 4000000)); } catch (error) {}
      return false;
    }
    if (dirty) return P.flush();
    status(false,null); return true;
  };
  P.clearDatabase = function () {
    if (!db) return;
    try {
      const tx=db.transaction('progress','readwrite');
      tx.objectStore('progress').delete('save');
      try { localStorage.removeItem(MARKER); } catch (error) {}
    } catch (error) {}
  };
  P.init = async function () {
    K.Save.load();
    if (!window.indexedDB) {
      P.recoveryBlocked=migratedSaveExists();
      if(P.recoveryBlocked)P.reportLocal(false);
      return K.Save.data;
    }
    try {
      db=await new Promise((resolve,reject) => {
        const request=window.indexedDB.open(P.databaseName,1);
        let finished=false;
        const timeout=setTimeout(() => { finished=true; reject(new Error('Progress storage did not open')); },5000);
        const fail=() => { if(finished)return; finished=true; clearTimeout(timeout); reject(request.error || new Error('Progress storage is unavailable')); };
        request.onupgradeneeded=() => { if(!request.result.objectStoreNames.contains('progress')) request.result.createObjectStore('progress'); };
        request.onerror=request.onblocked=fail;
        request.onsuccess=() => { if(finished){request.result.close();return;} finished=true; clearTimeout(timeout); resolve(request.result); };
      });
      const stored=await new Promise((resolve,reject) => {
        const tx=db.transaction('progress','readonly'), request=tx.objectStore('progress').get('save');
        request.onsuccess=() => resolve(request.result); request.onerror=() => reject(request.error);
      });
      if (stored && stored.data && typeof stored.data==='object' &&
          (stored.savedAt || 0) >= (K.Save.data.storageUpdatedAt || 0)) K.Save.load(stored.data);
      P.ready=true; P.recoveryBlocked=false;
      db.onversionchange=() => { db.close(); P.ready=false; P.recoveryBlocked=true; P.reportLocal(false); };
      P.schedule(); await P.flush();
    } catch (error) {
      if (db) db.close(); db=null; P.ready=false;
      P.recoveryBlocked=migratedSaveExists();
      // Preserve legacy data and make the smaller synchronous fallback explicit.
      K.Save.write();
    }
    return K.Save.data;
  };
  K.Persistence=P;
})();
