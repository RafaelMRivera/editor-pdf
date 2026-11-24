import * as pdfjs from 'pdfjs-dist';
import * as db from './db.js';
import { cfg, saveCfg } from './settings.js';
import { paintTemplate, PAGE_W, PAGE_H, TEMPLATES } from './templates.js';
import { drawAnn, hooks, strokePath, bboxW, hits, erasePartial, xf, textBox, FONT, LH } from './ann.js';
import { buildPdf } from './export.js';
import { $, $$, hydrate, svg, uid, toast, menuSheet, dropMenu, sheet, deliver, loadImageCanvas, canvasBlob } from './ui.js';
import { exportDoc } from './library.js';

const TOOLS = [['pen', 'Lápiz'], ['hl', 'Resaltador'], ['erase', 'Borrador'], ['lasso', 'Lazo'], ['shape', 'Formas'], ['text', 'Texto'], ['sig', 'Firma'], ['hand', 'Mano']];
const COLORS = ['#111111', '#6b7280', '#1a56db', '#0e9f6e', '#e02424', '#ff5a1f', '#ffe600', '#f472b6', '#7c3aed'];
const DEFTC = {
  pen: { c: '#1a56db', s: 2, min: 0.5, max: 12, step: 0.5, label: 'Grosor' },
  hl: { c: '#ffe600', s: 16, min: 6, max: 40, step: 1, label: 'Grosor' },
  erase: { s: 14, min: 6, max: 50, step: 1, label: 'Radio', mode: 'full' },
  shape: { c: '#e02424', s: 2, min: 0.5, max: 12, step: 0.5, label: 'Grosor', k: 'rect' },
  text: { c: '#111111', s: 16, min: 8, max: 56, step: 1, label: 'Tamaño' },
  sig: { s: 28, min: 10, max: 60, step: 1, label: 'Tamaño %' },
  lasso: {}, hand: {},
};
const SHAPES = [['line', 'Línea'], ['arrow', 'Flecha'], ['rect', 'Rectángulo'], ['ellipse', 'Elipse']];
let TC = structuredClone(DEFTC);
try {
  const s = JSON.parse(localStorage.getItem('ep-tools') || '{}');
  for (const k in s) if (TC[k]) Object.assign(TC[k], s[k], { min: DEFTC[k].min, max: DEFTC[k].max, step: DEFTC[k].step, label: DEFTC[k].label });
} catch {}
const saveTC = () => { try { localStorage.setItem('ep-tools', JSON.stringify(TC)); } catch {} };

const E = {
  doc: null, pages: [], assets: {}, pdf: null, img: null, bytes: null,
  scale: 1, dpr: 1, tool: 'pen', cur: 0, undo: [], redo: [], hist: '[]',
  drag: null, sel: null, clip: null, pan: null, pinch: null, touches: new Map(),
  penSeen: false, lastPen: 0, saveT: 0, wake: null, observer: null, open: false,
};
export const isOpen = () => E.open;
const viewer = $('#viewer'), pagesEl = $('#pages');
hooks.img = () => E.pages.forEach((_, i) => redraw(i));

/* ---------- historial ---------- */
const snapshot = () => JSON.stringify(E.pages.map((p) => p.ann));
function commit() {
  const s = snapshot();
  if (s === E.hist) return;
  E.undo.push(E.hist);
  if (E.undo.length > 150) E.undo.shift();
  E.hist = s;
  E.redo = [];
  syncButtons();
  scheduleSave();
}
function restore(json) {
  const all = JSON.parse(json);
  E.pages.forEach((p, i) => { p.ann = all[i] || []; });
  E.sel = null;
  E.pages.forEach((_, i) => redraw(i));
  syncButtons();
  scheduleSave();
}
const undo = () => { if (!E.undo.length) return; E.redo.push(E.hist); E.hist = E.undo.pop(); restore(E.hist); };
const redo = () => { if (!E.redo.length) return; E.undo.push(E.hist); E.hist = E.redo.pop(); restore(E.hist); };
function syncButtons() {
  $('#eUndo').disabled = !E.undo.length;
  $('#eRedo').disabled = !E.redo.length;
  const paste = $('#sPaste'); if (paste) paste.disabled = !E.clip;
  ['#sCut', '#sCopy', '#sDup', '#sDel'].forEach((s) => ($(s).disabled = !E.sel));
}

/* ---------- guardado automático ---------- */
function scheduleSave() {
  clearTimeout(E.saveT);
  E.saveT = setTimeout(() => saveNow(false), 700);
}
function makeThumb() {
  const p = E.pages[0];
  if (!p?.pc || !p.pc.width) return null;
  const t = document.createElement('canvas');
  t.width = 360; t.height = Math.max(1, Math.round((360 * p.pc.height) / p.pc.width));
  const x = t.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, t.width, t.height);
  x.drawImage(p.pc, 0, 0, t.width, t.height);
  x.drawImage(p.ov, 0, 0, t.width, t.height);
  return t.toDataURL('image/jpeg', 0.72);
}
async function saveNow(final) {
  const d = E.doc;
  if (!d) return;
  clearTimeout(E.saveT);
  d.pages = E.pages.map((p) => ({ w: p.w, h: p.h, nw: p.nw, nh: p.nh, ann: p.ann }));
  if (final) {
    const used = new Set(E.pages.flatMap((p) => p.ann.filter((a) => a.t === 'img').map((a) => a.id)));
    for (const id of Object.keys(E.assets)) if (!used.has(id)) delete E.assets[id];
  }
  d.assets = E.assets;
  d.updated = Date.now();
  d.lastPage = E.cur;
  d.scroll = viewer.scrollTop / Math.max(1, viewer.scrollHeight);
  if (final) { const t = makeThumb(); if (t) d.thumb = t; }
  try { await db.putDoc(d); } catch (e) { console.error(e); toast('No se pudo guardar'); }
}

/* ---------- abrir / cerrar ---------- */
export async function openDoc(id) {
  const doc = await db.getDoc(id);
  if (!doc) { location.hash = '#/'; return; }
  E.doc = doc;
  E.assets = doc.assets || (doc.assets = {});
  E.pages = doc.pages.map((p) => ({ w: p.w, h: p.h, nw: p.nw, nh: p.nh, ann: p.ann || [] }));
  E.undo = []; E.redo = []; E.sel = null; E.drag = null; E.pdf = null; E.img = null; E.bytes = null;
  E.hist = snapshot();
  try {
    if (doc.kind === 'pdf') {
      E.bytes = new Uint8Array(await db.getFile(id));
      E.pdf = await pdfjs.getDocument({ data: E.bytes.slice() }).promise;
    } else if (doc.kind === 'img') {
      const buf = await db.getFile(id);
      E.bytes = new Uint8Array(buf);
      const url = URL.createObjectURL(new Blob([buf], { type: doc.mime }));
      E.img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    }
  } catch (e) { console.error(e); alert('No se pudo abrir el documento.'); location.hash = '#/'; return; }
  $('#eTitle').value = doc.name;
  $('#eNext').innerHTML = svg(doc.kind === 'note' ? 'nextplus' : 'next');
  E.open = true;
  syncButtons();
  setTool(E.tool === 'hand' ? 'hand' : E.tool);
  E.scale = cfg.zoom === '100' ? 1 : fitScale();
  buildPages();
  E.cur = 0;
  if (cfg.resume && doc.lastPage) requestAnimationFrame(() => goPage(Math.min(doc.lastPage, E.pages.length - 1)));
  if (cfg.remember && doc.scroll) requestAnimationFrame(() => (viewer.scrollTop = doc.scroll * viewer.scrollHeight));
  updatePager();
  setView(cfg.openMode === 'view' ? true : cfg.openMode === 'edit' ? false : doc.mode === 'view');
  if (cfg.cast && cfg.autoPresent) startPresent();
  if (cfg.wake && 'wakeLock' in navigator) navigator.wakeLock.request('screen').then((w) => (E.wake = w)).catch(() => {});
}
/* ---------- sólo mirar / presentar ---------- */
function setView(v) {
  E.view = v;
  if (E.doc) E.doc.mode = v ? 'view' : 'edit';
  document.body.classList.toggle('viewonly', v);
  if (v) { closePop(); if (E.sel) { const i = E.sel.i; E.sel = null; redraw(i); } }
  $('#selBar').hidden = v || E.tool !== 'lasso';
}
function startPresent() {
  setView(true);
  document.body.classList.add('present');
  $('#pExit').hidden = false;
  document.documentElement.requestFullscreen?.().catch(() => {});
}
function exitPresent() {
  document.body.classList.remove('present');
  $('#pExit').hidden = true;
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('present')) exitPresent(); });
$('#pExit').onclick = exitPresent;

export async function closeDoc() {
  if (!E.open) return;
  exitPresent();
  document.body.classList.remove('viewonly');
  E.open = false;
  closeEditorUi();
  E.observer?.disconnect();
  E.pages.forEach((p) => p.task?.cancel?.());
  await saveNow(true);
  E.wake?.release?.().catch(() => {}); E.wake = null;
  pagesEl.innerHTML = '';
  E.doc = null;
}
const fitScale = () => Math.min(3, Math.max(240, viewer.clientWidth - 44) / E.pages[0].w);

/* ---------- páginas ---------- */
function buildPages() {
  E.observer?.disconnect();
  E.pages.forEach((p) => p.task?.cancel?.());
  pagesEl.innerHTML = '';
  E.dpr = Math.min(window.devicePixelRatio || 1, 2);
  E.observer = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && renderPage(+e.target.dataset.i)), { root: viewer, rootMargin: '800px 0px' });
  E.pages.forEach((p, i) => {
    p.rendered = false; p.task = null;
    const wrap = document.createElement('div');
    wrap.className = 'pg'; wrap.dataset.i = i;
    wrap.style.width = p.w * E.scale + 'px';
    wrap.style.height = p.h * E.scale + 'px';
    const pc = document.createElement('canvas'), ov = document.createElement('canvas');
    ov.width = Math.round(p.w * E.scale * E.dpr);
    ov.height = Math.round(p.h * E.scale * E.dpr);
    wrap.append(pc, ov);
    pagesEl.append(wrap);
    Object.assign(p, { wrap, pc, ov });
    E.observer.observe(wrap);
    redraw(i);
  });
}
async function renderPage(i) {
  const p = E.pages[i];
  if (p.rendered) return;
  p.rendered = true;
  const ctx = p.pc.getContext('2d');
  const W = Math.round(p.w * E.scale * E.dpr), H = Math.round(p.h * E.scale * E.dpr);
  if (E.doc.kind === 'pdf') {
    try {
      const page = await E.pdf.getPage(i + 1);
      const vp = page.getViewport({ scale: E.scale * E.dpr });
      p.pc.width = Math.round(vp.width); p.pc.height = Math.round(vp.height);
      p.task = page.render({ canvasContext: ctx, viewport: vp, canvas: p.pc });
      await p.task.promise;
    } catch (e) { if (e?.name !== 'RenderingCancelledException') console.error(e); }
    return;
  }
  p.pc.width = W; p.pc.height = H;
  if (E.doc.kind === 'img') { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(E.img, 0, 0, W, H); }
  else paintTemplate(ctx, E.doc.template, W, H, p.w, p.h);
}
function setScale(s, keepCenter) {
  if (!E.open) return;
  const old = E.scale;
  E.scale = Math.min(4, Math.max(0.3, s));
  const k = E.scale / old;
  const vx = keepCenter?.x ?? viewer.clientWidth / 2, vy = keepCenter?.y ?? viewer.clientHeight / 2;
  const sl = viewer.scrollLeft, st = viewer.scrollTop;
  buildPages();
  viewer.scrollLeft = (sl + vx) * k - vx;
  viewer.scrollTop = (st + vy) * k - vy;
}
function goPage(i) {
  const w = E.pages[i]?.wrap;
  if (w) viewer.scrollTop = w.offsetTop - 10;
}
function updatePager() {
  const vr = viewer.getBoundingClientRect();
  let best = 0, bo = -1;
  E.pages.forEach((p, i) => {
    const r = p.wrap.getBoundingClientRect();
    const o = Math.min(r.bottom, vr.bottom) - Math.max(r.top, vr.top);
    if (o > bo) { bo = o; best = i; }
  });
  E.cur = best;
  $('#ePage').textContent = String(best + 1);
}
let scrollRaf;
viewer.addEventListener('scroll', () => { cancelAnimationFrame(scrollRaf); scrollRaf = requestAnimationFrame(() => E.open && updatePager()); });

/* ---------- dibujo del overlay ---------- */
function selBox(i) {
  const r = E.pages[i].h / E.pages[i].w;
  const bs = E.sel.items.map((a) => bboxW(a, r));
  return { x0: Math.min(...bs.map((b) => b.x0)), y0: Math.min(...bs.map((b) => b.y0)), x1: Math.max(...bs.map((b) => b.x1)), y1: Math.max(...bs.map((b) => b.y1)) };
}
function redraw(i) {
  const p = E.pages[i];
  if (!p?.ov) return;
  const W = p.ov.width, H = p.ov.height, ctx = p.ov.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  p.ann.forEach((a) => drawAnn(ctx, a, W, H, E.assets));
  const d = E.dpr;
  if (E.sel?.i === i && E.sel.items.length) {
    const b = selBox(i);
    ctx.save();
    ctx.strokeStyle = '#ee7b2d'; ctx.fillStyle = '#ee7b2d'; ctx.lineWidth = 2 * d; ctx.setLineDash([8 * d, 6 * d]);
    ctx.strokeRect(b.x0 * W, b.y0 * W, (b.x1 - b.x0) * W, (b.y1 - b.y0) * W);
    ctx.setLineDash([]);
    ctx.fillRect(b.x1 * W - 7 * d, b.y1 * W - 7 * d, 14 * d, 14 * d);
    ctx.restore();
  }
  if (E.drag?.poly && E.drag.i === i) {
    ctx.save();
    ctx.strokeStyle = '#ee7b2d'; ctx.lineWidth = 2 * d; ctx.setLineDash([6 * d, 5 * d]);
    ctx.beginPath();
    E.drag.poly.forEach(([x, y], k) => (k ? ctx.lineTo(x * W, y * W) : ctx.moveTo(x * W, y * W)));
    ctx.stroke();
    ctx.restore();
  }
}

/* ---------- entrada (puntero, dedos, lápiz) ---------- */
const pageAt = (e) => { const w = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.pg'); return w ? +w.dataset.i : -1; };
const pt = (e, i) => { const r = E.pages[i].ov.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, r.width]; };
const touchDraws = () => cfg.input === 'all' || (cfg.input === 'auto' && !E.penSeen);

viewer.addEventListener('pointerdown', onDown);
viewer.addEventListener('pointermove', onMove);
viewer.addEventListener('pointerup', onUp);
viewer.addEventListener('pointercancel', onUp);
viewer.addEventListener('wheel', (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  const r = viewer.getBoundingClientRect();
  setScale(E.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1), { x: e.clientX - r.left, y: e.clientY - r.top });
}, { passive: false });

function cancelStroke() {
  const d = E.drag;
  if (d?.a) { const p = E.pages[d.i]; const k = p.ann.indexOf(d.a); if (k >= 0) p.ann.splice(k, 1); redraw(d.i); }
  E.drag = null;
}
function onDown(e) {
  if (!E.open || e.target.closest('textarea') || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const type = e.pointerType, now = performance.now();
  if (type === 'pen') { E.penSeen = true; E.lastPen = now; }
  if (type === 'touch') {
    if (cfg.palm && now - E.lastPen < 700) return;
    E.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    viewer.setPointerCapture(e.pointerId);
    if (E.touches.size >= 2) { cancelStroke(); E.pan = null; startPinch(); return; }
  }
  const scrollTouch = type === 'touch' && !touchDraws() && cfg.finger === 'scroll';
  if (E.tool === 'hand' || E.view || scrollTouch) { E.pan = { id: e.pointerId, x: e.clientX, y: e.clientY }; viewer.setPointerCapture(e.pointerId); return; }
  // dedo en modo "borrar", o extremo borrador / botón lateral del lápiz (Lenovo Pen, S Pen, etc.)
  const side = type === 'pen' && e.buttons & 2 ? cfg.penButton : null;
  const penErase = type === 'pen' && (e.buttons & 32 || side === 'erase');
  let tool = penErase || (type === 'touch' && !touchDraws() && cfg.finger === 'erase') ? 'erase' : E.tool;
  if (side === 'lasso') { tool = 'lasso'; if (E.tool !== 'lasso') setTool('lasso'); }
  const i = pageAt(e);
  if (i < 0) { if (E.sel) { E.sel = null; E.pages.forEach((_, k) => redraw(k)); syncButtons(); } return; }
  e.preventDefault();
  closePop();
  const p = E.pages[i], r = p.h / p.w;
  const [x, y, cssW] = pt(e, i);
  viewer.setPointerCapture(e.pointerId);
  if (tool === 'pen' || tool === 'hl') {
    const pr = tool === 'pen' && cfg.pressure && type === 'pen';
    const a = { t: tool, c: TC[tool].c, w: TC[tool].s / p.w, p: [pr ? [x, y, e.pressure] : [x, y]] };
    if (pr) a.v = 1;
    p.ann.push(a);
    E.drag = { i, a, last: [x, y], cssW, pr, id: e.pointerId };
    redraw(i);
  } else if (tool === 'shape') {
    const a = { t: 'shape', k: TC.shape.k, c: TC.shape.c, w: TC.shape.s / p.w, a: [x, y], b: [x, y] };
    p.ann.push(a);
    E.drag = { i, a, shape: true, id: e.pointerId };
  } else if (tool === 'erase') {
    E.drag = { i, erase: true, id: e.pointerId };
    eraseAt(i, x, y, cssW);
  } else if (tool === 'text') {
    const ux = x, uy = y * r;
    const hit = [...p.ann].reverse().find((a) => a.t === 'text' && (() => { const b = textBox(a, r); return ux >= b.x0 && ux <= b.x1 && uy >= b.y0 && uy <= b.y1; })());
    if (hit) { p.ann.splice(p.ann.indexOf(hit), 1); redraw(i); openEditor(i, hit.x, hit.y, hit); }
    else openEditor(i, x, y);
  } else if (tool === 'sig') {
    placeSignature(i, x, y);
  } else if (tool === 'lasso') {
    lassoDown(i, x, y, cssW);
  }
}
function onMove(e) {
  if (!E.open) return;
  if (e.pointerType === 'pen') E.lastPen = performance.now();
  if (e.pointerType === 'touch' && E.touches.has(e.pointerId)) E.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (E.pinch) { movePinch(); return; }
  if (E.pan && E.pan.id === e.pointerId) {
    viewer.scrollLeft -= e.clientX - E.pan.x;
    viewer.scrollTop -= e.clientY - E.pan.y;
    E.pan.x = e.clientX; E.pan.y = e.clientY;
    return;
  }
  const d = E.drag;
  if (!d || d.id !== e.pointerId) return;
  e.preventDefault();
  const i = d.i, p = E.pages[i], r = p.h / p.w;
  for (const ev of e.getCoalescedEvents?.() || [e]) {
    const [x, y, cssW] = pt(ev, i);
    if (d.erase) eraseAt(i, x, y, cssW);
    else if (d.shape) { d.a.b = [x, y]; }
    else if (d.poly) d.poly.push([x, y * r]);
    else if (d.xform) xformMove(d, x, y * r);
    else if (d.a) {
      const dx = (x - d.last[0]) * cssW, dy = (y - d.last[1]) * cssW * r;
      if (dx * dx + dy * dy < 0.6) continue;
      d.a.p.push(d.pr ? [x, y, ev.pressure] : [x, y]);
      d.last = [x, y];
    }
  }
  if (!d.erase) redraw(i);
}
function onUp(e) {
  if (e.pointerType === 'touch') {
    E.touches.delete(e.pointerId);
    if (E.pinch && E.touches.size < 2) endPinch();
  }
  if (E.pan?.id === e.pointerId) E.pan = null;
  const d = E.drag;
  if (!d || d.id !== e.pointerId) return;
  E.drag = null;
  const p = E.pages[d.i];
  if (d.shape) {
    const dd = Math.hypot(d.a.b[0] - d.a.a[0], (d.a.b[1] - d.a.a[1]) * (p.h / p.w));
    if (dd < 0.005) p.ann.splice(p.ann.indexOf(d.a), 1);
  }
  if (d.poly) lassoEnd(d);
  redraw(d.i);
  commit();
}

/* ---------- pellizcar para zoom ---------- */
function startPinch() {
  const [a, b] = [...E.touches.values()];
  E.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: 1, s0: E.scale };
  const r = viewer.getBoundingClientRect();
  E.pinch.cx = (a.x + b.x) / 2 - r.left; E.pinch.cy = (a.y + b.y) / 2 - r.top;
  pagesEl.style.transformOrigin = `${viewer.scrollLeft + E.pinch.cx}px ${viewer.scrollTop + E.pinch.cy}px`;
}
function movePinch() {
  const t = [...E.touches.values()];
  if (t.length < 2) return;
  const k = (Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y) || 1) / E.pinch.d0;
  E.pinch.k = Math.min(4 / E.pinch.s0, Math.max(0.3 / E.pinch.s0, k));
  pagesEl.style.transform = `scale(${E.pinch.k})`;
}
function endPinch() {
  const { k, s0, cx, cy } = E.pinch;
  E.pinch = null;
  pagesEl.style.transform = '';
  setScale(s0 * k, { x: cx, y: cy });
}

/* ---------- borrador ---------- */
function eraseAt(i, x, y, cssW) {
  const p = E.pages[i], r = p.h / p.w, tol = TC.erase.s / cssW, ux = x, uy = y * r, part = TC.erase.mode === 'part';
  const out = [];
  let ch = false;
  for (const a of p.ann) {
    if (a.t === 'img') { out.push(a); continue; } // las imágenes se borran con el lazo
    if (part && (a.t === 'pen' || a.t === 'hl' || a.t === 'sig')) {
      const rep = erasePartial(a, ux, uy, tol, r);
      if (rep) { ch = true; out.push(...rep); } else out.push(a);
    } else if (hits(a, ux, uy, tol, r)) ch = true;
    else out.push(a);
  }
  if (ch) { p.ann = out; redraw(i); }
}

/* ---------- lazo / selección ---------- */
function pointInPoly(x, y, poly) {
  let c = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [xi, yi] = poly[a], [xj, yj] = poly[b];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function lassoDown(i, x, y, cssW) {
  const p = E.pages[i], r = p.h / p.w, ux = x, uy = y * r;
  if (E.sel?.i === i) {
    const b = selBox(i), hp = 18 / cssW;
    if (Math.abs(ux - b.x1) < hp && Math.abs(uy - b.y1) < hp)
      return startXform(i, 'scale', ux, uy, b);
    if (ux >= b.x0 && ux <= b.x1 && uy >= b.y0 && uy <= b.y1) return startXform(i, 'move', ux, uy, b);
  }
  const old = E.sel?.i;
  E.sel = null;
  if (old != null) redraw(old);
  E.drag = { i, poly: [[ux, uy]], id: lastId, cssW };
  syncButtons();
}
let lastId = 0;
viewer.addEventListener('pointerdown', (e) => { lastId = e.pointerId; }, true);
function startXform(i, mode, ux, uy, bb) {
  E.drag = { i, id: lastId, xform: mode, start: [ux, uy], bb, origs: E.sel.items.map((a) => structuredClone(a)) };
}
function xformMove(d, x, uy) {
  const p = E.pages[d.i], r = p.h / p.w;
  let s = 1, dx = 0, dy = 0;
  if (d.xform === 'move') { dx = x - d.start[0]; dy = uy - d.start[1]; }
  else s = Math.max(0.05, (x - d.bb.x0) / Math.max(1e-6, d.bb.x1 - d.bb.x0));
  E.sel.items.forEach((a, k) => Object.assign(a, xf(d.origs[k], r, s, d.bb.x0, d.bb.y0, dx, dy)));
}
function lassoEnd(d) {
  const p = E.pages[d.i], r = p.h / p.w;
  let items;
  if (d.poly.length < 6) {
    const [x, y] = d.poly[0];
    const hit = [...p.ann].reverse().find((a) => hits(a, x, y, 8 / (p.w * E.scale), r));
    items = hit ? [hit] : [];
  } else {
    items = p.ann.filter((a) => {
      const b = bboxW(a, r);
      return pointInPoly((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, d.poly);
    });
  }
  E.sel = items.length ? { i: d.i, items } : null;
  syncButtons();
}
function selectItems(i, items) { E.sel = { i, items }; redraw(i); syncButtons(); }
function selAction(kind) {
  if (kind === 'paste') return paste();
  if (!E.sel) return;
  const { i, items } = E.sel, p = E.pages[i];
  if (kind === 'copy' || kind === 'cut') {
    E.clip = { items: items.map((a) => structuredClone(a)), assets: Object.fromEntries(items.filter((a) => a.t === 'img').map((a) => [a.id, E.assets[a.id]])) };
    toast(kind === 'copy' ? 'Copiado' : 'Cortado');
  }
  if (kind === 'cut' || kind === 'del') { p.ann = p.ann.filter((a) => !items.includes(a)); E.sel = null; commit(); }
  if (kind === 'dup') {
    const r = p.h / p.w;
    const cp = items.map((a) => xf(a, r, 1, 0, 0, 0.03, 0.03));
    p.ann.push(...cp);
    selectItems(i, cp);
    commit();
  }
  redraw(i); syncButtons();
}
function paste() {
  if (!E.clip) return;
  const i = E.cur, p = E.pages[i], r = p.h / p.w;
  Object.assign(E.assets, E.clip.assets);
  const cp = E.clip.items.map((a) => xf(a, r, 1, 0, 0, 0.04, 0.04));
  p.ann.push(...cp);
  E.clip.items = E.clip.items.map((a) => xf(a, r, 1, 0, 0, 0.04, 0.04)); // la siguiente copia cae un poco más abajo
  selectItems(i, cp);
  commit();
}

/* ---------- texto ---------- */
function openEditor(i, nx, ny, existing) {
  const p = E.pages[i];
  const s = existing ? existing.s : TC.text.s / p.w, c = existing ? existing.c : TC.text.c;
  const cssW = p.w * E.scale, cssH = p.h * E.scale;
  const ta = document.createElement('textarea');
  ta.value = existing ? existing.v : '';
  ta.placeholder = 'Escribe…';
  Object.assign(ta.style, { left: nx * cssW + 'px', top: ny * cssH + 'px', fontSize: s * cssW + 'px', color: c });
  let done = false;
  const finish = (save) => {
    if (done) return;
    done = true;
    const v = ta.value.replace(/\s+$/, '');
    ta.remove();
    if (save && v.trim()) p.ann.push({ t: 'text', c, s, x: nx, y: ny, v });
    else if (!save && existing) p.ann.push(existing);
    redraw(i); commit();
  };
  ta.addEventListener('blur', () => finish(true));
  ta.addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(false); });
  p.wrap.append(ta);
  setTimeout(() => ta.focus(), 0);
}

/* ---------- firma ---------- */
let SIG = null;
try { SIG = JSON.parse(localStorage.getItem('firma')); } catch {}
function placeSignature(i, cx, cy) {
  if (!SIG) return openSigModal();
  const p = E.pages[i], r = p.h / p.w, wn = TC.sig.s / 100;
  const a = { t: 'sig', c: SIG.c, w: SIG.sw * wn, ss: SIG.ss.map((st) => st.map(([x, y]) => [cx - wn / 2 + x * wn, (cy * r - (SIG.ar * wn) / 2 + y * wn) / r])) };
  p.ann.push(a);
  redraw(i); commit();
}
const sc = $('#sigCanvas'), sctx = sc.getContext('2d');
let sigStrokes = [], sigColor = '#111111', sigDrawing = null;
function sigRedraw() {
  sctx.clearRect(0, 0, sc.width, sc.height);
  sctx.strokeStyle = sigColor; sctx.lineWidth = 4; sctx.lineCap = sctx.lineJoin = 'round';
  sigStrokes.forEach((s) => strokePath(sctx, s, 1, 1));
}
function openSigModal() { sigStrokes = []; sigRedraw(); $('#sigModal').hidden = false; }
const sp = (e) => { const r = sc.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * sc.width, ((e.clientY - r.top) / r.height) * sc.height]; };
sc.addEventListener('pointerdown', (e) => { sc.setPointerCapture(e.pointerId); sigDrawing = [sp(e)]; sigStrokes.push(sigDrawing); sigRedraw(); });
sc.addEventListener('pointermove', (e) => { if (!sigDrawing) return; sigDrawing.push(sp(e)); sigRedraw(); });
['pointerup', 'pointercancel'].forEach((ev) => sc.addEventListener(ev, () => (sigDrawing = null)));
$$('[data-sc]').forEach((b) => b.addEventListener('click', () => { sigColor = b.dataset.sc; sigRedraw(); }));
$('#sigClear').onclick = () => { sigStrokes = []; sigRedraw(); };
$('#sigCancel').onclick = () => ($('#sigModal').hidden = true);
$('#sigOk').onclick = () => {
  const pts = sigStrokes.flat();
  if (!pts.length) return;
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const minx = Math.min(...xs), miny = Math.min(...ys), bw = Math.max(20, Math.max(...xs) - minx), bh = Math.max(...ys) - miny;
  SIG = { c: sigColor, ar: bh / bw, sw: 4 / bw, ss: sigStrokes.map((s) => s.map(([x, y]) => [(x - minx) / bw, (y - miny) / bw])) };
  try { localStorage.setItem('firma', JSON.stringify(SIG)); } catch {}
  $('#sigModal').hidden = true;
};

/* ---------- imágenes ---------- */
async function addImage(file) {
  if (!file) return;
  try {
    const c = await loadImageCanvas(file, 1600);
    const png = /png$/i.test(file.type);
    const id = uid();
    E.assets[id] = c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85);
    const i = E.cur, p = E.pages[i], r = p.h / p.w, wn = 0.4, hn = (wn * c.height) / c.width;
    const vr = viewer.getBoundingClientRect(), pr = p.wrap.getBoundingClientRect();
    const cy = Math.min(0.85, Math.max(0.15, (vr.top + vr.height / 2 - pr.top) / pr.height));
    const a = { t: 'img', id, x: 0.3, y: Math.max(0.02, cy - hn / r / 2), w: wn, h: hn };
    p.ann.push(a);
    setTool('lasso');
    selectItems(i, [a]);
    commit();
  } catch (e) { console.error(e); toast('No se pudo insertar la imagen'); }
}
$('#eImg').onclick = () => menuSheet('Añadir imagen desde…', [
  { label: 'Cámara', icon: 'camera', fn: () => $('#fCam').click() },
  { label: 'Galería', icon: 'image', fn: () => $('#fIns').click() },
  { label: 'Archivos', icon: 'folder', fn: () => $('#fIns').click() },
]);
$('#fIns').onchange = (e) => { addImage(e.target.files[0]); e.target.value = ''; };
$('#fCam').onchange = (e) => { addImage(e.target.files[0]); e.target.value = ''; };

/* ---------- herramientas y panel (como Squid) ---------- */
const TABS = [['pen', 'Lápiz'], ['lasso', 'Lazo'], ['erase', 'Borrador'], ['shape', 'Formas'], ['text', 'Texto'], ['sig', 'Firma'], ['hand', 'Mano']];
const UNIT = { pen: 'mm', hl: 'mm', shape: 'mm', erase: 'mm', text: 'pt', sig: '%' };
const MM = 25.4 / 72;
const tabs = $('#popTools');
TABS.forEach(([id, label]) => {
  const bt = document.createElement('button');
  bt.dataset.t = id; bt.title = label; bt.innerHTML = svg(id);
  bt.onclick = () => setTool(id === 'pen' && E.tool === 'hl' ? 'hl' : id);
  tabs.append(bt);
});
const psub = $('#psub');
[['pen', 'Lápiz'], ['hl', 'Resaltador']].forEach(([id, label]) => {
  const bt = document.createElement('button');
  bt.dataset.s = id; bt.title = label; bt.innerHTML = svg(id);
  bt.onclick = () => setTool(id);
  psub.append(bt);
});
const pshapes = $('#pshapes');
SHAPES.forEach(([k, l]) => {
  const bt = document.createElement('button');
  bt.dataset.k = k; bt.textContent = l;
  bt.onclick = () => { TC.shape.k = k; saveTC(); syncPop(); };
  pshapes.append(bt);
});
$('#psize').oninput = (e) => { TC[E.tool].s = +e.target.value; saveTC(); syncPop(true); };
$('#ppress').onchange = (e) => { cfg.pressure = e.target.checked; saveCfg(); };
$$('input[name=emode]').forEach((r) => (r.onchange = () => { TC.erase.mode = r.value; saveTC(); }));
$('#psig').onclick = () => { closePop(); openSigModal(); };

/* ---------- selector de color ---------- */
const PAL = ['#ff5722', '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#cddc39', '#8bc34a', '#4caf50', '#009688', '#00bcd4', '#2196f3', '#ffeb3b', '#ffc107', '#ff9800', '#e3a273', '#795548', '#9e9e9e'];
const QUICK = ['#ffffff', '#ee1c25', '#ffff00', '#00a651', '#1e6bff', '#000000'];
let RECENT = [];
try { RECENT = JSON.parse(localStorage.getItem('ep-recent') || '[]'); } catch {}
if (!RECENT.length) RECENT = ['#f44336', '#4caf50', '#ee1c25', '#1e6bff', '#e91e63', '#3f51b5', '#ff9800', '#000000', '#9c27b0', '#2196f3', '#ffff00', '#4caf50'];
const colorTool = () => (TC[E.tool].c !== undefined ? E.tool : 'pen');
const curColor = () => TC[colorTool()].c;
function hexToHsl(hx) {
  const n = parseInt(hx.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, bl = (n & 255) / 255;
  const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), l = (mx + mn) / 2;
  let h = 0, sa = 0;
  if (mx !== mn) {
    const d = mx - mn;
    sa = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - bl) / d + (g < bl ? 6 : 0) : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, sa * 100, l * 100];
}
function hslToHex(h, sa, l) {
  sa /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, aa = sa * Math.min(l, 1 - l);
  const f = (n) => l - aa * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
const isLight = (c) => hexToHsl(c)[2] > 72;
function setColor(c, remember = true) {
  TC[colorTool()].c = c;
  saveTC();
  if (remember) {
    RECENT = [c, ...RECENT.filter((x) => x !== c)].slice(0, 12);
    try { localStorage.setItem('ep-recent', JSON.stringify(RECENT)); } catch {}
  }
  syncColor();
  syncPop(true);
}
function fillSwatches(box, list, cur) {
  box.innerHTML = '';
  list.forEach((c) => {
    const bt = document.createElement('button');
    bt.className = 'cs' + (isLight(c) ? ' light' : '');
    bt.style.background = c;
    if (c.toLowerCase() === cur.toLowerCase()) bt.innerHTML = svg('check');
    bt.onclick = () => setColor(c);
    box.append(bt);
  });
}
function syncColor() {
  const cur = curColor(), [h, sa, l] = hexToHsl(cur);
  fillSwatches($('#cGrid'), PAL, cur);
  fillSwatches($('#cQuick'), QUICK, cur);
  fillSwatches($('#cRecent'), RECENT, cur);
  const set = (id, v) => { const el = $(id); if (document.activeElement !== el) el.value = v; };
  set('#cBright', Math.round(Math.max(0, Math.min(100, (90 - l) / 0.7))));
  set('#cH', Math.round(h)); set('#cS', Math.round(sa)); set('#cL', Math.round(l));
  set('#cHex', cur);
  $('#cPrev').style.background = cur;
}
$('#cBright').oninput = (e) => { const [h, sa] = hexToHsl(curColor()); setColor(hslToHex(h, sa, 90 - e.target.value * 0.7), false); };
['#cH', '#cS', '#cL'].forEach((id) => ($(id).oninput = () => setColor(hslToHex(+$('#cH').value, +$('#cS').value, +$('#cL').value), false)));
$('#cHex').onchange = (e) => { const v = e.target.value.trim(); if (/^#[0-9a-f]{6}$/i.test(v)) setColor(v.toLowerCase()); };
const ctab = (sl) => { $('#cPal').hidden = sl; $('#cSl').hidden = !sl; $('#ctPal').classList.toggle('on', !sl); $('#ctSl').classList.toggle('on', sl); };
$('#ctPal').onclick = () => ctab(false);
$('#ctSl').onclick = () => ctab(true);

function setTool(t) {
  E.tool = t;
  if (t !== 'lasso' && E.sel) { const i = E.sel.i; E.sel = null; redraw(i); }
  document.body.className = document.body.className.replace(/\bt-\w+/g, '').trim() + ' t-' + t;
  $('#eTool').innerHTML = svg(t);
  syncPop();
  $('#selBar').hidden = !(t === 'lasso' && E.open && !E.view);
  syncButtons();
  if (t === 'sig' && !SIG && E.open) openSigModal();
}
function syncPop(sliderOnly) {
  const t = E.tool, c = TC[t], cc = TC[colorTool()];
  const dot = $('#eColor .dot');
  dot.style.background = cc.c;
  if (c.s != null) $('#pval').textContent = UNIT[t] === 'mm' ? (c.s * MM).toFixed(1) + ' mm' : c.s + ' ' + UNIT[t];
  if (sliderOnly !== true) {
    tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.t === (t === 'hl' ? 'pen' : t)));
    psub.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.s === t));
    $$('#pop .sect').forEach((x) => (x.hidden = !x.dataset.for.split(' ').includes(t)));
    if (c.max) {
      const r = $('#psize');
      r.min = c.min; r.max = c.max; r.step = c.step; r.value = c.s;
    }
    pshapes.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.k === TC.shape.k));
    $('#ppress').checked = cfg.pressure;
    $$('input[name=emode]').forEach((r) => (r.checked = r.value === TC.erase.mode));
  }
  if (['pen', 'hl', 'shape'].includes(t)) {
    const cv = $('#prev'), x = cv.getContext('2d');
    x.clearRect(0, 0, cv.width, cv.height);
    x.strokeStyle = cc.c; x.lineWidth = Math.max(1, c.s * 1.5); x.lineCap = 'round';
    if (t === 'hl') x.globalAlpha = 0.4;
    x.beginPath();
    x.moveTo(20, 40);
    x.bezierCurveTo(90, -5, 140, 80, 190, 38);
    x.bezierCurveTo(230, 12, 270, 50, 300, 30);
    x.stroke();
  }
}
const pop = $('#pop'), cpop = $('#cpop');
function closePop() { pop.hidden = true; cpop.hidden = true; }
$('#eTool').onclick = (e) => { e.stopPropagation(); const open = pop.hidden; closePop(); pop.hidden = !open; if (open) syncPop(); };
$('#eColor').onclick = (e) => { e.stopPropagation(); const open = cpop.hidden; closePop(); cpop.hidden = !open; if (open) { ctab(false); syncColor(); } };
document.addEventListener('pointerdown', (e) => { if ((!pop.hidden || !cpop.hidden) && !e.target.closest('#pop,#cpop,#eTool,#eColor')) closePop(); });
function closeEditorUi() { closePop(); $('#selBar').hidden = true; document.body.className = document.body.className.replace(/\bt-\w+/g, '').trim(); }

/* ---------- barra superior y menú ⋮ ---------- */
$('#eUndo').onclick = undo;
$('#eRedo').onclick = redo;
$('#ePrev').onclick = () => goPage(Math.max(0, E.cur - 1));
$('#eNext').onclick = () => {
  if (E.cur >= E.pages.length - 1 && E.doc.kind === 'note' && !E.view) addPage();
  else goPage(Math.min(E.pages.length - 1, E.cur + 1));
};
$('#eBack').onclick = () => (location.hash = '#/');
$('#eTitle').onchange = (e) => { if (E.doc && e.target.value.trim()) { E.doc.name = e.target.value.trim(); scheduleSave(); } };
$('#selBar').onclick = (e) => { const x = e.target.closest('button'); if (x) selAction({ sCut: 'cut', sCopy: 'copy', sPaste: 'paste', sDup: 'dup', sDel: 'del' }[x.id]); };

const pageActions = () => [
  ...(cfg.cast ? [{ label: 'Presentar a pantalla completa', fn: startPresent }] : []),
  ...(E.doc.kind === 'note' ? [{ label: 'Añadir página', fn: addPage }] : []),
  ...(E.doc.kind === 'note' && E.pages.length > 1 ? [{ label: 'Eliminar esta página', danger: true, fn: delPage }] : []),
  { label: 'Acercar', fn: () => setScale(E.scale * 1.25) },
  { label: 'Alejar', fn: () => setScale(E.scale / 1.25) },
  { label: 'Borrar marcas de esta página', danger: true, fn: () => { const p = E.pages[E.cur]; if (p.ann.length && confirm('¿Borrar todas las marcas de esta página?')) { p.ann = []; E.sel = null; redraw(E.cur); commit(); } } },
];
const pageSettings = () => [
  ...(E.doc.kind === 'note' ? [{
    label: 'Plantilla de la página',
    sub: TEMPLATES.map((t) => ({ label: t.n, on: E.doc.template === t.id, fn: () => { E.doc.template = t.id; const keep = viewer.scrollTop; buildPages(); viewer.scrollTop = keep; scheduleSave(); } })),
  }] : []),
  { label: 'Ajustar al ancho', fn: () => setScale(fitScale()) },
  { label: 'Zoom 100 %', fn: () => setScale(1) },
];
function printDoc() {
  toast('Preparando impresión…');
  buildPdf(E.doc, E.pages, E.assets, E.bytes).then((out) => {
    const url = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { window.open(url, '_blank'); } };
    f.src = url;
    document.body.append(f);
    setTimeout(() => { f.remove(); URL.revokeObjectURL(url); }, 120000);
  }).catch((e) => alert('No se pudo imprimir: ' + e.message));
}
$('#eMenu').onclick = () => dropMenu([
  { label: E.view ? 'Editar' : 'Sólo ver', fn: () => setView(!E.view) },
  { label: 'Exportar…', sub: [{ label: 'Exportar como PDF', fn: exportPdf }, { label: 'Exportar página como imagen', fn: exportImage }] },
  { label: 'Imprimir', fn: printDoc },
  { label: 'Acciones en la página', sub: pageActions() },
  { label: 'Ajustes de página', sub: pageSettings() },
  { label: 'Pegar', fn: () => (E.view ? toast('Cambia a modo edición para pegar') : E.clip ? paste() : toast('No hay nada copiado')) },
  { label: 'Compartir comentarios', fn: () => window.open('https://github.com/RafaelMRivera/editor-pdf/issues/new', '_blank', 'noopener') },
  { label: 'Ayuda', sub: [
    { label: 'Ayuda y soporte técnico', fn: () => { try { sessionStorage.setItem('ep-sec', 'ayuda'); } catch {} location.hash = '#/settings'; } },
    { label: 'Ajustes', fn: () => (location.hash = '#/settings') },
  ] },
]);
function addPage() {
  E.pages.push({ w: PAGE_W, h: PAGE_H, ann: [] });
  const keep = viewer.scrollTop;
  buildPages();
  viewer.scrollTop = keep;
  commit();
  goPage(E.pages.length - 1);
  updatePager();
}
function delPage() {
  if (!confirm('¿Eliminar esta página y sus marcas?')) return;
  E.pages.splice(E.cur, 1);
  E.hist = snapshot(); E.undo = []; E.redo = [];
  buildPages(); syncButtons(); updatePager(); scheduleSave();
}
async function exportPdf() {
  try {
    toast('Generando PDF…');
    await saveNow(false);
    const out = await buildPdf(E.doc, E.pages, E.assets, E.bytes);
    await deliver(new Blob([out], { type: 'application/pdf' }), E.doc.name + '.pdf');
  } catch (e) { console.error(e); alert('No se pudo exportar: ' + e.message); }
}
async function exportImage() {
  try {
    const i = E.cur, p = E.pages[i];
    const W = E.doc.kind === 'img' ? p.nw : 1800, H = Math.round((W * p.h) / p.w);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    if (E.doc.kind === 'pdf') {
      const page = await E.pdf.getPage(i + 1);
      const vp = page.getViewport({ scale: W / page.getViewport({ scale: 1 }).width });
      c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      await page.render({ canvasContext: ctx, viewport: vp, canvas: c }).promise;
    } else if (E.doc.kind === 'img') ctx.drawImage(E.img, 0, 0, W, H);
    else paintTemplate(ctx, E.doc.template, W, H, p.w, p.h);
    p.ann.forEach((a) => drawAnn(ctx, a, c.width, c.height, E.assets));
    const png = E.doc.mime === 'image/png';
    await deliver(await canvasBlob(c, png ? 'image/png' : 'image/jpeg', cfg.quality), `${E.doc.name}-p${i + 1}.${png ? 'png' : 'jpg'}`);
  } catch (e) { console.error(e); alert('No se pudo exportar: ' + e.message); }
}

document.addEventListener('keydown', (e) => {
  if (!E.open || e.target.matches('textarea,input')) return;
  const k = e.key.toLowerCase(), m = e.ctrlKey || e.metaKey;
  if (m && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (m && k === 'y') { e.preventDefault(); redo(); }
  else if (m && k === 'c') selAction('copy');
  else if (m && k === 'x') selAction('cut');
  else if (m && k === 'v') selAction('paste');
  else if (k === 'delete' || k === 'backspace') selAction('del');
});
window.addEventListener('resize', () => { if (E.open && !document.querySelector('textarea')) { /* se mantiene el zoom actual */ } });
window.addEventListener('pagehide', () => { if (E.open) saveNow(false); });
document.addEventListener('visibilitychange', () => { if (document.hidden && E.open) saveNow(false); });
hydrate($('#editor'));
setTool('pen');
