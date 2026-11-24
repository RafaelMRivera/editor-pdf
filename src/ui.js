export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const ICON = {
  menu: 'M4 6h16M4 12h16M4 18h16', back: 'M19 12H5M12 19l-7-7 7-7', star: 'M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z',
  more: 'M12 5v.01M12 12v.01M12 19v.01', search: 'M21 21l-4.3-4.3M11 18a7 7 0 110-14 7 7 0 010 14z', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18', pdf: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5', image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5v.01',
  note: 'M5 4h14v16H5zM9 9h6M9 13h6', template: 'M4 4h16v16H4zM4 10h16M10 10v10', sort: 'M4 6h16M7 12h10M10 18h4',
  undo: '!M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z', redo: '!M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z',
  pen: 'M3 21l1.6-5.2L16.2 4.2a2.2 2.2 0 013.1 3.1L7.7 18.9z M14 6.4l3.6 3.6', hl: 'M14.6 3.6l5.8 5.8-8.1 8.1-5.8-5.8z M6.5 11.7L4 17.5l2.3 2.3 5.8-2.5 M3 22h18',
  erase: 'M13.2 4.8a2 2 0 012.8 0l3.2 3.2a2 2 0 010 2.8L11 19H7.5L4.8 16.3a2 2 0 010-2.8z M9 8.7l6.3 6.3 M11 19h9', lasso: 'M12 3.5c4.7 0 8.5 2 8.5 4.5s-3.8 4.5-8.5 4.5S3.5 10.5 3.5 8 7.3 3.5 12 3.5z M8 12.2c-.8 1.9-.3 3.9 1.5 5.1 1.3.9 1.1 2.8-.5 3.7',
  shape: 'M3 11.5h8v8H3z M17 3.5a4.2 4.2 0 100 8.4 4.2 4.2 0 000-8.4z M13.5 20.5l3.8-6.2 3.8 6.2z', text: 'M4 7V4h16v3M9 20h6M12 4v16', sig: 'M3.5 15c1.6-5.6 3.2-9 4.8-9 1.4 0-.1 6.3 1.8 6.3 1.5 0 2-4 3.5-4 1.2 0 1 3 2.4 3 .9 0 1.7-.7 2.8-2.1 M3 20h18',
  hand: 'M12 3v18 M3 12h18 M12 3l-3 3 M12 3l3 3 M12 21l-3-3 M12 21l3-3 M3 12l3-3 M3 12l3 3 M21 12l-3-3 M21 12l-3 3',
  img: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5v.01', prev: 'M15 18l-6-6 6-6', next: 'M9 6l6 6-6 6', copy: 'M9 9h11v11H9zM5 15V5h10',
  cut: 'M6 3a3 3 0 100 6 3 3 0 000-6zM6 15a3 3 0 100 6 3 3 0 000-6zM8 8l12 12M8 16L20 4', paste: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12h6M9 16h6',
  dup: 'M12 8v8M8 12h8M4 4h16v16H4z', trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6', save: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z', folder: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  check: 'M5 12l5 5 9-10', install: 'M12 3v12M7 10l5 5 5-5M5 21h14', info: 'M12 8v.01M12 11v6M12 3a9 9 0 100 18 9 9 0 000-18z',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z', eye: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z', present: 'M3 4h18v12H3zM8 20h8M12 16v4', palette: 'M12 3a9 9 0 100 18c1 0 2-.8 2-2 0-.6-.3-1.1-.6-1.5-.3-.4-.4-1-.1-1.4.3-.5.8-.7 1.3-.7H17a4 4 0 004-4c0-4.4-4-8.4-9-8.4zM7.5 11v.01M10 7.5v.01M14 7.5v.01', sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6', sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4', moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z', nextplus: 'M6 6l6 6-6 6M17 5v6M14 8h6', zoomin: 'M21 21l-4.3-4.3M11 18a7 7 0 110-14 7 7 0 010 14zM11 8v6M8 11h6',
  zoomout: 'M21 21l-4.3-4.3M11 18a7 7 0 110-14 7 7 0 010 14zM8 11h6', page: 'M5 4h14v16H5zM12 9v6M9 12h6',
};
export const svg = (n) => {
  const p = ICON[n] || '';
  return p[0] === '!' ? `<svg viewBox="0 0 24 24" class="fill"><path d="${p.slice(1)}"/></svg>` : `<svg viewBox="0 0 24 24"><path d="${p}"/></svg>`;
};
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
      <p><b>PC (Chrome / Edge):</b> icono de instalar en la barra de direcciones, o ⋮ → <b>Instalar PenFich</b>.</p>
      <p class="hint">${ios ? 'Estás en iOS: en iOS solo funciona desde Safari.' : 'La app debe abrirse desde una dirección https:// para poder instalarse.'}</p>
    </div>`);
}

// Menú desplegable arriba a la derecha (como el ⋮ de Squid), con submenús
export function dropMenu(items) {
  const wrap = document.createElement('div');
  wrap.className = 'dropwrap';
  const box = document.createElement('div');
  box.className = 'drop';
  wrap.append(box);
  const close = () => wrap.remove();
  wrap.onclick = (e) => e.target === wrap && close();
  const render = (list, title, back) => {
    box.innerHTML = '';
    if (back) {
      const b = document.createElement('button');
      b.className = 'ditem back';
      b.innerHTML = svg('back') + '<span></span>';
      $('span', b).textContent = title;
      b.onclick = back;
      box.append(b);
    }
    list.forEach((it) => {
      const b = document.createElement('button');
      b.className = 'ditem' + (it.danger ? ' danger' : '') + (it.on ? ' on' : '');
      const s = document.createElement('span');
      s.textContent = it.label;
      b.append(s);
      if (it.sub) b.insertAdjacentHTML('beforeend', '<i class="arr">›</i>');
      b.onclick = () => (it.sub ? render(it.sub, it.label, () => render(items)) : (close(), it.fn?.()));
      box.append(b);
    });
  };
  render(items);
  document.body.append(wrap);
  return close;
}
