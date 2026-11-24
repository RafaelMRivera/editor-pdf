export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const ICON = {
  menu: 'M4 6h16M4 12h16M4 18h16', back: 'M19 12H5M12 19l-7-7 7-7', star: 'M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z',
  more: 'M12 5v.01M12 12v.01M12 19v.01', search: 'M21 21l-4.3-4.3M11 18a7 7 0 110-14 7 7 0 010 14z', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18', pdf: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5', image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5v.01',
  note: 'M5 4h14v16H5zM9 9h6M9 13h6', template: 'M4 4h16v16H4zM4 10h16M10 10v10', sort: 'M4 6h16M7 12h10M10 18h4',
  undo: 'M3 7v6h6M3 13a9 9 0 109-9 9 9 0 00-6.7 3L3 13', redo: 'M21 7v6h-6M21 13a9 9 0 11-9-9 9 9 0 016.7 3L21 13',
  pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z', hl: 'M9 11l-6 6v3h9l3-3M22 12l-4.6 4.6a2 2 0 01-2.8 0l-5.2-5.2a2 2 0 010-2.8L14 4',
  erase: 'M20 20H9l-5-5a2 2 0 010-2.8l9.2-9.2a2 2 0 012.8 0l5 5a2 2 0 010 2.8L13 20M7 11l6 6', lasso: 'M12 4c5 0 9 2 9 5s-4 5-9 5-9-2-9-5 4-5 9-5zM8 14c0 3 1 5 3 6',
  shape: 'M3 20h8v-8H3zM15 3a5 5 0 100 10 5 5 0 000-10z', text: 'M4 7V4h16v3M9 20h6M12 4v16', sig: 'M3 17c3-6 5-9 6-9s0 6 2 6 3-4 4-4 1 3 3 3 2-1 3-2M3 21h18',
  hand: 'M8 13V5a2 2 0 014 0v6m0-4a2 2 0 014 0v4m0-2a2 2 0 014 0v5a7 7 0 01-7 7h-1a7 7 0 01-5.5-2.7L4 15a2 2 0 013-2l1 1.5',
  img: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5v.01', prev: 'M15 18l-6-6 6-6', next: 'M9 6l6 6-6 6', copy: 'M9 9h11v11H9zM5 15V5h10',
  cut: 'M6 3a3 3 0 100 6 3 3 0 000-6zM6 15a3 3 0 100 6 3 3 0 000-6zM8 8l12 12M8 16L20 4', paste: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12h6M9 16h6',
  dup: 'M12 8v8M8 12h8M4 4h16v16H4z', trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6', save: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z', folder: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  check: 'M5 12l5 5 9-10', install: 'M12 3v12M7 10l5 5 5-5M5 21h14', info: 'M12 8v.01M12 11v6M12 3a9 9 0 100 18 9 9 0 000-18z',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z', eye: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z', present: 'M3 4h18v12H3zM8 20h8M12 16v4', zoomin: 'M21 21l-4.3-4.3M11 18a7 7 0 110-14 7 7 0 010 14zM11 8v6M8 11h6',
  zoomout: 'M21 21l-4.3-4.3M11 18a7 7 0 110-14 7 7 0 010 14zM8 11h6', page: 'M5 4h14v16H5zM12 9v6M9 12h6',
};
export const svg = (n) => `<svg viewBox="0 0 24 24"><path d="${ICON[n] || ''}"/></svg>`;
export function hydrate(root = document) {
  $$('[data-i]', root).forEach((el) => {
    if (!el.querySelector(':scope > svg')) el.insertAdjacentHTML('afterbegin', svg(el.dataset.i));
  });
}
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

let toastT;
export function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.append(t); }
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 2600);
}

export function sheet(title, content, wide = false) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="card ${wide ? 'wide' : ''}"><div class="ch"><h2></h2><button class="btn ico x" data-i="close"></button></div><div class="cb"></div></div>`;
  $('h2', m).textContent = title;
  const cb = $('.cb', m);
  typeof content === 'string' ? (cb.innerHTML = content) : cb.append(content);
  const close = () => m.remove();
  m.onclick = (e) => e.target === m && close();
  $('.x', m).onclick = close;
  hydrate(m);
  document.body.append(m);
  return close;
}
export function menuSheet(title, items) {
  const box = document.createElement('div');
  box.className = 'mlist';
  let close;
  items.forEach((it) => {
    const b = document.createElement('button');
    b.className = 'mitem' + (it.danger ? ' danger' : '');
    b.innerHTML = (it.icon ? svg(it.icon) : '') + `<span>${it.label}</span>`;
    b.onclick = () => { close(); it.fn(); };
    box.append(b);
  });
  close = sheet(title, box);
  return close;
}

export async function deliver(blob, name) {
  if (matchMedia('(pointer:coarse)').matches) {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// Carga una imagen (respeta la orientación EXIF), la reduce y la devuelve como canvas
export async function loadImageCanvas(file, max = 2400) {
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k);
    c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return c;
  } finally { URL.revokeObjectURL(url); }
}
export const canvasBlob = (c, type = 'image/jpeg', q = 0.92) => new Promise((r) => c.toBlob(r, type, q));

/* ---------- instalación como app ---------- */
let deferred;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
export async function installApp() {
  if (isStandalone()) return toast('La app ya está instalada.');
  if (deferred) {
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    deferred = null;
    return;
  }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  sheet('Instalar la aplicación', `
    <div class="help">
      <p><b>Android (Chrome):</b> toca los <b>tres puntos ⋮</b> arriba a la derecha → <b>«Instalar aplicación»</b> (o «Añadir a pantalla de inicio»).</p>
      <p><b>iPhone / iPad (Safari):</b> toca el botón <b>Compartir</b> (cuadro con flecha) → <b>«Añadir a pantalla de inicio»</b> → Añadir.</p>
      <p><b>PC (Chrome / Edge):</b> icono de instalar en la barra de direcciones, o ⋮ → <b>Instalar Editor PDF</b>.</p>
      <p class="hint">${ios ? 'Estás en iOS: en iOS solo funciona desde Safari.' : 'La app debe abrirse desde una dirección https:// para poder instalarse.'}</p>
    </div>`);
}
