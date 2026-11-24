// Almacenamiento local (IndexedDB): 'docs' = metadatos + marcas, 'files' = archivo original (PDF/imagen)
let dbp;
const open = () =>
  (dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open('editorpdf', 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('docs', { keyPath: 'id' });
      r.result.createObjectStore('files');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
const tx = async (store, mode, fn) => {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const rq = fn(t.objectStore(store));
    t.oncomplete = () => res(rq?.result);
    t.onerror = t.onabort = () => rej(t.error);
  });
};
export const listDocs = () => tx('docs', 'readonly', (s) => s.getAll());
export const getDoc = (id) => tx('docs', 'readonly', (s) => s.get(id));
export const putDoc = (d) => tx('docs', 'readwrite', (s) => s.put(d));
export const putFile = (id, buf) => tx('files', 'readwrite', (s) => s.put(buf, id));
export const getFile = (id) => tx('files', 'readonly', (s) => s.get(id));
export const delDoc = async (id) => {
  await tx('docs', 'readwrite', (s) => s.delete(id));
  await tx('files', 'readwrite', (s) => s.delete(id));
};
