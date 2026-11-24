// Bloqueo con patrón (3x3). El patrón nunca se guarda: solo un hash PBKDF2-SHA256 con sal aleatoria.
import { cfg, saveCfg } from './settings.js';
import { $, toast, sheet, menuSheet, svg } from './ui.js';

const KEY = 'pf-lock', FAIL = 'pf-lock-fail', MIN = 4;
const enc = new TextEncoder();
const b64 = (u) => btoa(String.fromCharCode(...u));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
export const hasLock = () => !!read(KEY);
const secure = () => !!(globalThis.crypto && crypto.subtle);

async function derive(seq, salt, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(seq), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
}
async function setPattern(seq) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iter = 150000;
  write(KEY, { s: b64(salt), h: b64(await derive(seq.join(''), salt, iter)), i: iter });
  try { localStorage.removeItem(FAIL); } catch {}
}
async function verify(seq) {
  const r = read(KEY);
  if (!r) return true;
  const h = await derive(seq.join(''), unb64(r.s), r.i), x = unb64(r.h);
  let d = h.length ^ x.length;
  for (let i = 0; i < x.length; i++) d |= h[i] ^ x[i];
  return d === 0;
}
// Tras 5 fallos seguidos hay que esperar (30 s, 60 s, 2 min… hasta 5 min). Se conserva aunque cierren la app.
const waitSecs = () => Math.max(0, Math.ceil(((read(FAIL)?.until || 0) - Date.now()) / 1000));
async function check(seq) {
  const w = waitSecs();
  if (w) return { wait: w };
  if (await verify(seq)) { try { localStorage.removeItem(FAIL); } catch {} return { ok: true }; }
  const f = read(FAIL) || { n: 0, until: 0 };
  f.n++;
  if (f.n >= 5) f.until = Date.now() + Math.min(300, 30 * 2 ** (f.n - 5)) * 1000;
  write(FAIL, f);
  return { ok: false, wait: waitSecs() };
}

/* ---------- tablero de puntos ---------- */
function createPad(host, onDone) {
  const NS = 'http://www.w3.org/2000/svg';
  host.classList.add('pad');
  host.innerHTML = '<svg viewBox="0 0 300 300"><polyline class="trail" points=""/><g></g></svg>';
  const sv = host.firstChild, g = $('g', sv), trail = $('.trail', sv);
  const P = (i) => [50 + 100 * (i % 3), 50 + 100 * Math.floor(i / 3)];
  const dots = [];
  for (let i = 0; i < 9; i++) {
    const [x, y] = P(i), c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 11); c.setAttribute('class', 'dot');
    g.append(c); dots.push(c);
  }
  let seq = [], drag = false, cur = null, off = false;
  const draw = () => {
    const pts = seq.map((i) => P(i).join(','));
    if (cur && drag) pts.push(cur.join(','));
    trail.setAttribute('points', pts.join(' '));
    dots.forEach((d, i) => d.classList.toggle('on', seq.includes(i)));
  };
  const pos = (e) => { const r = sv.getBoundingClientRect(); if (!r.width || !Number.isFinite(e.clientX)) return [-999, -999]; return [((e.clientX - r.left) / r.width) * 300, ((e.clientY - r.top) / r.height) * 300]; };
  const hit = ([x, y]) => { for (let i = 0; i < 9; i++) { const [px, py] = P(i); if (Math.hypot(px - x, py - y) < 38) return i; } return -1; };
  const add = (i) => {
    if (i < 0 || seq.includes(i)) return;
    if (seq.length) {
      const a = seq[seq.length - 1], dr = Math.floor(i / 3) - Math.floor(a / 3), dc = (i % 3) - (a % 3);
      if (dr % 2 === 0 && dc % 2 === 0) { const m = (Math.floor(a / 3) + dr / 2) * 3 + (a % 3) + dc / 2; if (!seq.includes(m)) seq.push(m); }
    }
    seq.push(i);
  };
  sv.addEventListener('pointerdown', (e) => {
    if (off) return;
    e.preventDefault();
    try { sv.setPointerCapture(e.pointerId); } catch {}
    seq = []; drag = true; cur = pos(e); add(hit(cur)); draw();
  });
  sv.addEventListener('pointermove', (e) => { if (!drag) return; cur = pos(e); add(hit(cur)); draw(); });
  const up = () => { if (!drag) return; drag = false; cur = null; draw(); if (seq.length) onDone([...seq]); };
  sv.addEventListener('pointerup', up);
  sv.addEventListener('pointercancel', up);
  const api = {
    reset() { seq = []; draw(); host.classList.remove('bad', 'good'); },
    flash(ok) { host.classList.add(ok ? 'good' : 'bad'); off = true; setTimeout(() => { off = false; api.reset(); }, ok ? 150 : 700); },
    disable(v) { off = v; },
  };
  return api;
}

/* ---------- pantalla de bloqueo ---------- */
const root = document.documentElement;
let pad, timer;
const setInert = (v) => document.querySelectorAll('body > section').forEach((s) => (s.inert = v));
const msg = (t) => ($('#lockMsg').textContent = t);
export function lock() {
  if (!hasLock()) return;
  root.classList.add('locked');
  setInert(true);
  if (!pad) pad = createPad($('#lockPad'), tryUnlock);
  pad.reset();
  cooldown();
}
function unlock() { root.classList.remove('locked'); setInert(false); clearInterval(timer); }
function cooldown() {
  clearInterval(timer);
  const tick = () => {
    const w = waitSecs();
    if (w) { msg(`Demasiados intentos. Espera ${w} s`); pad.disable(true); }
    else { if ($('#lockMsg').textContent.startsWith('Demasiados')) msg('Dibuja tu patrón para desbloquear'); pad.disable(false); clearInterval(timer); }
  };
  if (waitSecs()) { tick(); timer = setInterval(tick, 1000); } else msg('Dibuja tu patrón para desbloquear');
}
async function tryUnlock(seq) {
  if (seq.length < MIN) { msg(`Une al menos ${MIN} puntos`); pad.flash(false); return; }
  const r = await check(seq);
  if (r.ok) { pad.flash(true); unlock(); return; }
  pad.flash(false);
  if (r.wait) cooldown(); else msg('Patrón incorrecto');
}
async function wipeAll() {
  await new Promise((res) => { const q = indexedDB.deleteDatabase('editorpdf'); q.onsuccess = q.onerror = q.onblocked = () => res(); });
  try { localStorage.clear(); sessionStorage.clear(); } catch {}
  location.reload();
}
export function initLock() {
  $('#lockForgot').onclick = () => {
    if (!confirm('Si olvidaste el patrón, la única forma de volver a entrar es BORRAR todos los apuntes de este dispositivo y quitar el bloqueo.\n\n¿Quieres continuar?')) return;
    if (prompt('Para confirmar, escribe BORRAR') === 'BORRAR') wipeAll();
  };
  if (hasLock()) lock();
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (!hasLock()) return;
    if (document.hidden) { hiddenAt = Date.now(); if (cfg.lockDelay === 0) lock(); }
    else if (hiddenAt && (Date.now() - hiddenAt) / 1000 >= cfg.lockDelay) lock();
  });
  window.addEventListener('pagehide', () => { if (hasLock() && cfg.lockDelay === 0) lock(); });
}

/* ---------- crear / cambiar / quitar (menú) ---------- */
function askPattern(title, onOk) {
  const box = document.createElement('div');
  box.innerHTML = '<p class="padmsg"></p><div class="padhost"></div>';
  const m = $('.padmsg', box);
  m.textContent = 'Dibuja tu patrón';
  const close = sheet(title, box);
  const p = createPad($('.padhost', box), async (seq) => {
    if (seq.length < MIN) { m.textContent = `Une al menos ${MIN} puntos`; p.flash(false); return; }
    const r = await check(seq);
    if (r.ok) { p.flash(true); close(); onOk(); }
    else { p.flash(false); m.textContent = r.wait ? `Demasiados intentos. Espera ${r.wait} s` : 'Patrón incorrecto'; }
  });
}
function setupFlow() {
  if (!secure()) return alert('El bloqueo necesita una conexión segura. Abre la app desde su dirección https:// (no desde http://).');
  const box = document.createElement('div');
  box.innerHTML = '<p class="padmsg"></p><div class="padhost"></div><p class="hint">Mínimo 4 puntos. Úsalo para proteger tus apuntes si alguien más toma la tablet.</p>';
  const m = $('.padmsg', box);
  m.textContent = 'Dibuja un patrón nuevo';
  const close = sheet('Crear patrón', box);
  let first = null;
  const p = createPad($('.padhost', box), async (seq) => {
    if (seq.length < MIN) { m.textContent = `Une al menos ${MIN} puntos`; p.flash(false); return; }
    if (!first) { first = seq; m.textContent = 'Dibújalo otra vez para confirmar'; p.reset(); return; }
    if (seq.join('') !== first.join('')) { first = null; m.textContent = 'No coincide. Empieza de nuevo'; p.flash(false); return; }
    await setPattern(seq);
    p.flash(true); close();
    toast('Bloqueo con patrón activado');
  });
}
const DELAYS = [[0, 'Al apagar la pantalla o salir de la app'], [60, 'Después de 1 minuto'], [300, 'Después de 5 minutos'], [900, 'Después de 15 minutos']];
export const lockStatus = () => (hasLock() ? 'Activado · ' + (DELAYS.find((d) => d[0] === cfg.lockDelay)?.[1] ?? '') : 'Desactivado');
export function openLockMenu() {
  if (!hasLock()) {
    return menuSheet('Bloqueo con patrón', [{ label: 'Crear patrón de desbloqueo', icon: 'lock', fn: setupFlow }]);
  }
  menuSheet('Bloqueo con patrón', [
    { label: 'Bloquear ahora', icon: 'lock', fn: lock },
    { label: 'Cambiar patrón', icon: 'edit', fn: () => askPattern('Patrón actual', setupFlow) },
    { label: 'Cuándo pedirlo', icon: 'settings', fn: () => menuSheet('Pedir el patrón…', DELAYS.map(([s, l]) => ({ label: l + (cfg.lockDelay === s ? '  ✓' : ''), fn: () => { cfg.lockDelay = s; saveCfg(); toast('Guardado'); } }))) },
    { label: 'Desactivar bloqueo', icon: 'trash', danger: true, fn: () => askPattern('Patrón actual', () => { try { localStorage.removeItem(KEY); localStorage.removeItem(FAIL); } catch {} toast('Bloqueo desactivado'); }) },
  ]);
}
