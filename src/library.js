import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as db from './db.js';
import { cfg } from './settings.js';
import { TEMPLATES, CATEGORIES, PAGE_W, PAGE_H, paintTemplate } from './templates.js';
import { $, $$, hydrate, svg, uid, toast, sheet, menuSheet, loadImageCanvas, canvasBlob, deliver, installApp } from './ui.js';
import { buildPdf } from './export.js';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

let view = 'all'; // all | fav
let sort = 'updated';
let docs = [];

const fmt = (t) => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
const KIND = { pdf: 'PDF', img: 'Imagen', note: 'Nota' };

export async function refresh() {
  docs = await db.listDocs();
  render();
}
function render() {
  const q = $('#lSearch').value.trim().toLowerCase();
  let list = docs.filter((d) => (view === 'fav' ? d.starred : true) && (!q || d.name.toLowerCase().includes(q)));
  list.sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'created' ? b.created - a.created : b.updated - a.updated));
  $('#lTitle').textContent = view === 'fav' ? 'Favoritos' : 'Apuntes Recientes';
  const invite = view === 'all' && !q && !localStorage.getItem('ep-invite');
  $('#emptyLib').hidden = list.length > 0 || invite;
  const grid = $('#grid');
  grid.hidden = list.length === 0 && !invite;
  grid.innerHTML = '';
  if (invite) {
    const iv = document.createElement('div');
    iv.className = 'invite';
    iv.innerHTML = '<h3>¡Estás invitado a instalar PenFich!</h3><p>Úsala como una app: a pantalla completa, sin conexión y con tus apuntes siempre a mano.</p><div><button class="ig">Ignorar</button><button class="mi">Más información</button></div>';
    $('.ig', iv).onclick = () => { try { localStorage.setItem('ep-invite', '1'); } catch {} render(); };
    $('.mi', iv).onclick = installApp;
    grid.append(iv);
  }
  for (const d of list) {
    const c = document.createElement('div');
    c.className = 'card-d';
    c.innerHTML = `<div class="th"></div><span class="tag">${KIND[d.kind]}</span>
      <button class="st ${d.starred ? 'on' : ''}" data-i="star" title="Favorito"></button>
      <div class="ft"><div class="nm"><b></b><small>${fmt(d.updated)}</small></div><button class="mo" data-i="more"></button></div>`;
    $('b', c).textContent = d.name;
    const th = $('.th', c);
    if (d.thumb && cfg.thumbs) th.style.backgroundImage = `url(${d.thumb})`;
    else th.innerHTML = svg(d.kind === 'pdf' ? 'pdf' : 'note');
    hydrate(c);
    c.onclick = () => (location.hash = '#/doc/' + d.id);
    $('.st', c).onclick = async (e) => { e.stopPropagation(); d.starred = !d.starred; await db.putDoc(d); render(); };
    $('.mo', c).onclick = (e) => { e.stopPropagation(); cardMenu(d); };
    grid.append(c);
  }
}

function cardMenu(d) {
  menuSheet(d.name, [
    { label: 'Renombrar', icon: 'edit', fn: async () => { const n = prompt('Nombre:', d.name); if (n?.trim()) { d.name = n.trim(); await db.putDoc(d); render(); } } },
    { label: d.starred ? 'Quitar de favoritos' : 'Añadir a favoritos', icon: 'star', fn: async () => { d.starred = !d.starred; await db.putDoc(d); render(); } },
    { label: 'Duplicar', icon: 'dup', fn: () => duplicate(d) },
    { label: 'Exportar como PDF', icon: 'save', fn: () => exportDoc(d) },
    { label: 'Eliminar', icon: 'trash', danger: true, fn: async () => { if (confirm(`¿Eliminar «${d.name}»? No se puede deshacer.`)) { await db.delDoc(d.id); refresh(); } } },
  ]);
}
async function duplicate(d) {
  const n = structuredClone(d);
  n.id = uid(); n.name = d.name + ' (copia)'; n.created = n.updated = Date.now(); n.starred = false;
  const f = await db.getFile(d.id);
  if (f) await db.putFile(n.id, f);
  await db.putDoc(n);
  refresh();
}
export async function exportDoc(d) {
  try {
    toast('Generando PDF…');
    const bytes = d.kind === 'note' ? null : new Uint8Array(await db.getFile(d.id));
    const out = await buildPdf(d, d.pages, d.assets || {}, bytes);
    await deliver(new Blob([out], { type: 'application/pdf' }), d.name + '.pdf');
  } catch (e) { console.error(e); alert('No se pudo exportar: ' + e.message); }
}

/* ---------- creación / importación ---------- */
const base = (name) => name.replace(/\.[^.]+$/, '');
async function thumbOf(canvas) {
  const k = 360 / canvas.width;
  const t = document.createElement('canvas');
  t.width = 360; t.height = Math.max(1, Math.round(canvas.height * k));
  const x = t.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, t.width, t.height);
  x.drawImage(canvas, 0, 0, t.width, t.height);
  return t.toDataURL('image/jpeg', 0.72);
}
const baseDoc = (kind, name, extra) => ({ id: uid(), name, kind, created: Date.now(), updated: Date.now(), starred: false, assets: {}, ...extra });

async function importPdf(file) {
  try {
    toast('Importando…');
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
    const pages = [];
    let thumb = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const pg = await pdf.getPage(i);
      const vp = pg.getViewport({ scale: 1 });
      pages.push({ w: vp.width, h: vp.height, ann: [] });
      if (i === 1) {
        const v2 = pg.getViewport({ scale: 360 / vp.width });
        const c = document.createElement('canvas');
        c.width = Math.round(v2.width); c.height = Math.round(v2.height);
        await pg.render({ canvasContext: c.getContext('2d'), viewport: v2, canvas: c }).promise;
        thumb = await thumbOf(c);
      }
    }
    const d = baseDoc('pdf', base(file.name), { pages, thumb });
    await db.putFile(d.id, buf);
    await db.putDoc(d);
    location.hash = '#/doc/' + d.id;
  } catch (e) { console.error(e); alert('No se pudo abrir el PDF (¿está protegido con contraseña o dañado?).'); }
}
async function importImage(file) {
  try {
    const c = await loadImageCanvas(file, 3000);
    const png = /png$/i.test(file.type) || /\.png$/i.test(file.name);
    const blob = await canvasBlob(c, png ? 'image/png' : 'image/jpeg', cfg.quality);
    const w = PAGE_W, h = (PAGE_W * c.height) / c.width;
    const d = baseDoc('img', base(file.name), { mime: png ? 'image/png' : 'image/jpeg', pages: [{ w, h, nw: c.width, nh: c.height, ann: [] }], thumb: await thumbOf(c) });
    await db.putFile(d.id, await blob.arrayBuffer());
    await db.putDoc(d);
    location.hash = '#/doc/' + d.id;
  } catch (e) { console.error(e); alert('No se pudo abrir la imagen.'); }
}
async function newNote(tpl) {
  const c = document.createElement('canvas');
  c.width = 360; c.height = Math.round((360 * PAGE_H) / PAGE_W);
  paintTemplate(c.getContext('2d'), tpl, c.width, c.height);
  const name = 'Nota ' + new Date().toLocaleDateString('es', { day: 'numeric', month: 'short' });
  const d = baseDoc('note', name, { template: tpl, pages: [{ w: PAGE_W, h: PAGE_H, ann: [] }], thumb: c.toDataURL('image/jpeg', 0.7) });
  await db.putDoc(d);
  location.hash = '#/doc/' + d.id;
}
export function templatePicker(onPick, title = 'Nueva nota', current = null) {
  const box = document.createElement('div');
  const tabsEl = document.createElement('div');
  tabsEl.className = 'ttabs';
  const gridEl = document.createElement('div');
  gridEl.className = 'tgrid';
  box.append(tabsEl, gridEl);
  let close;
  const cats = ['Todo', ...CATEGORIES];
  const show = (cat) => {
    tabsEl.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.c === cat));
    gridEl.innerHTML = '';
    let g = '';
    for (const t of TEMPLATES) {
      if (cat !== 'Todo' && t.g !== cat) continue;
      if (cat === 'Todo' && t.g !== g) { g = t.g; const h = document.createElement('h4'); h.textContent = g; gridEl.append(h); }
      const bt = document.createElement('button');
      if (t.id === current) bt.className = 'cur';
      const c = document.createElement('canvas');
      c.width = 200; c.height = Math.round((200 * PAGE_H) / PAGE_W);
      paintTemplate(c.getContext('2d'), t.id, c.width, c.height);
      bt.append(c, t.n);
      bt.onclick = () => { close(); onPick(t.id); };
      gridEl.append(bt);
    }
  };
  cats.forEach((c) => {
    const bt = document.createElement('button');
    bt.dataset.c = c; bt.textContent = c.toUpperCase();
    bt.onclick = () => show(c);
    tabsEl.append(bt);
  });
  close = sheet(title, box, true);
  show('Todo');
}

/* ---------- copia de seguridad ---------- */
const blobToDataUrl = (b) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
export async function backupExport(ids = null) {
  const all = (await db.listDocs()).filter((d) => !ids || ids.includes(d.id));
  const out = [];
  for (const d of all) {
    const f = await db.getFile(d.id);
    out.push({ ...d, file: f ? await blobToDataUrl(new Blob([f])) : null });
  }
  await deliver(new Blob([JSON.stringify({ app: 'penfich', v: 1, docs: out })], { type: 'application/json' }), ids ? `${all[0]?.name || 'nota'}.json` : `penfich-backup-${new Date().toISOString().slice(0, 10)}.json`);
}
export async function backupImport(file) {
  try {
    const j = JSON.parse(await file.text());
    if (j.app !== 'penfich' && j.app !== 'editor-pdf') throw new Error('Archivo no válido');
    for (const d of j.docs) {
      const { file: f, ...doc } = d;
      if (f) await db.putFile(doc.id, await (await fetch(f)).arrayBuffer());
      await db.putDoc(doc);
    }
    toast(`Se restauraron ${j.docs.length} apuntes`);
    refresh();
  } catch (e) { alert('No se pudo restaurar: ' + e.message); }
}

/* ---------- eventos ---------- */
export function initLibrary() {
  const fab = $('#fab'), menu = $('#fabMenu');
  const closeFab = () => { menu.hidden = true; fab.classList.remove('open'); };
  fab.onclick = () => { menu.hidden = !menu.hidden; fab.classList.toggle('open', !menu.hidden); };
  hydrate($('#lib'));
  menu.onclick = (e) => {
    const a = e.target.closest('button')?.dataset.a;
    if (!a) return;
    closeFab();
    if (a === 'pdf') $('#fPdf').click();
    if (a === 'img') $('#fImg').click();
    if (a === 'note') newNote(cfg.template);
    if (a === 'tpl') templatePicker((id) => newNote(id));
  };
  $('#grid').addEventListener('click', closeFab);
  $('#fPdf').onchange = (e) => { importPdf(e.target.files[0]); e.target.value = ''; };
  $('#fImg').onchange = (e) => { importImage(e.target.files[0]); e.target.value = ''; };
  $('#lSearch').oninput = render;
  $('#lSort').onclick = () =>
    menuSheet('Ordenar por', [
      { label: 'Última modificación', icon: 'sort', fn: () => { sort = 'updated'; render(); } },
      { label: 'Fecha de creación', icon: 'sort', fn: () => { sort = 'created'; render(); } },
      { label: 'Nombre', icon: 'sort', fn: () => { sort = 'name'; render(); } },
    ]);
  const drawer = $('#drawer');
  $('#lMenu').onclick = () => (drawer.hidden = false);
  $('.scrim', drawer).onclick = () => (drawer.hidden = true);
  drawer.onclick = (e) => {
    const v = e.target.closest('button')?.dataset.v;
    if (!v) return;
    drawer.hidden = true;
    if (v === 'settings') location.hash = '#/settings';
    else if (v === 'install') installApp();
    else { view = v; location.hash = '#/'; render(); }
  };
  $('#fBak').onchange = (e) => { backupImport(e.target.files[0]); e.target.value = ''; };
  // abrir PDF/imagen arrastrándolo a la biblioteca
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (!f || $('#lib').hidden) return;
    /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name) ? importPdf(f) : /^image\//.test(f.type) && importImage(f);
  });
}
