import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/500.css';
import '@fontsource/public-sans/600.css';
import '@fontsource/public-sans/700.css';
import './style.css';
import { $, hydrate } from './ui.js';
import { initLibrary, refresh } from './library.js';
import { openDoc, closeDoc, isOpen } from './editor.js';
import { renderSettings, settingsBack } from './settingsView.js';

hydrate();
initLibrary();
$('#sBack').onclick = () => { if (!settingsBack()) history.length > 1 ? history.back() : (location.hash = '#/'); };

const show = (id) => ['lib', 'editor', 'settings'].forEach((s) => ($('#' + s).hidden = s !== id));

async function route() {
  const h = location.hash || '#/';
  if (isOpen()) await closeDoc();
  if (h.startsWith('#/doc/')) {
    show('editor');
    await openDoc(h.slice(6));
  } else if (h === '#/settings') {
    renderSettings();
    show('settings');
  } else {
    show('lib');
    refresh();
  }
}
window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Si ya había una versión instalada y llega una nueva, recarga una sola vez para mostrarla
  const had = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('./sw.js').then((r) => r.update()).catch(() => {});
}
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
