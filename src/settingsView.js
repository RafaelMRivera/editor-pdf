import { cfg, saveCfg } from './settings.js';
import { TEMPLATES } from './templates.js';
import { $, hydrate, installApp, isStandalone, sheet, menuSheet, svg } from './ui.js';
import { backupExport } from './library.js';

const tplOpts = TEMPLATES.map((t) => [t.id, t.n]);
// Estructura idéntica a Squid: menú a la izquierda, opciones a la derecha
const NAV = [
  ['Apuntes', [['editar', 'Editar apuntes'], ['entrada', 'Métodos de entrada'], ['estandar', 'Ajustes estándar de apuntes'], ['backup', 'Backup y restaurar'], ['cast', 'Transmitir y proyectar']]],
  ['General', [['ayuda', 'Ayuda y soporte técnico'], ['acerca', 'Acerca de']]],
];
const SECTIONS = {
  editar: ['Editar apuntes', [
    ['h', 'Abrir acciones'],
    ['c', 'openMode', 'Sólo mirar/Editar', [['last', 'Restaurar el último modo de visualización'], ['edit', 'Siempre abrir para editar'], ['view', 'Siempre abrir sólo para mirar']]],
    ['b', 'resume', 'Reanudar en la última página', 'Abre el apunte en la última página vista'],
    ['h', 'Otros'],
    ['b', 'thumbs', 'Presentar la primera página como miniatura', 'Ver siempre la primera página de la nota en una miniatura'],
    ['b', 'wake', 'Dejar la pantalla encendida', 'No dejar que se apague la pantalla del dispositivo mientras editas'],
  ]],
  entrada: ['Métodos de entrada', [
    ['h', 'General'],
    ['c', 'input', 'Método primario de entrada', [['auto', 'Automático: usa el lápiz si lo detecta (Lenovo Pen, S Pen…)'], ['stylus', 'Sólo lápiz'], ['all', 'Dedo y lápiz dibujan']]],
    ['c', 'finger', 'Acción con los dedos', [['scroll', 'Desplazar y hacer zoom'], ['erase', 'Borrador de trazados']]],
    ['b', 'pressure', 'Sensibilidad a la presión', 'El grosor del trazo varía según cuánto aprietas'],
    ['b', 'palm', 'Rechazo de palma', 'Ignora la mano apoyada mientras escribes con el lápiz'],
    ['h', 'Lápiz óptico'],
    ['c', 'penButton', 'Botón lateral primario', [['lasso', 'Herramienta lazo (selección)'], ['erase', 'Borrador'], ['none', 'Ninguna acción']]],
  ]],
  estandar: ['Ajustes estándar de apuntes', [
    ['h', 'General'],
    ['c', 'template', 'Nota por defecto', tplOpts],
    ['b', 'remember', 'Guardar tu posición en la página', 'Restaurar el desplazamiento anterior en cada página'],
    ['h', 'Tamaño de la página'],
    ['c', 'zoom', 'Zoom estándar', [['fit', 'Ajustar a la pantalla'], ['100', '100 %']]],
  ]],
  backup: ['Backup y restaurar', [
    ['a', 'Backup local', 'Crear y restaurar backups en tu dispositivo', () =>
      menuSheet('Backup local', [
        { label: 'Crear backup (exportar archivo .json)', icon: 'save', fn: backupExport },
        { label: 'Restaurar desde un archivo', icon: 'folder', fn: () => $('#fBak').click() },
      ])],
  ]],
  cast: ['Transmitir y proyectar', [
    ['b', 'cast', 'Activar', 'Habilita / deshabilita por completo la presentación a pantalla completa'],
    ['b', 'autoPresent', 'Iniciar presentación automáticamente', 'Inicia la presentación de la nota al abrirla'],
  ]],
  ayuda: ['Ayuda y soporte técnico', [
    ['h', 'Lápiz y gestos'],
    ['t', 'Con un lápiz óptico: el lápiz dibuja y el dedo desplaza. Dos dedos hacen zoom. El extremo borrador del lápiz borra.'],
    ['h', 'Instalación'],
    ['a', 'Instalar aplicación', () => (isStandalone() ? 'Ya está instalada en este dispositivo' : 'Úsala como app a pantalla completa y sin conexión'), installApp],
  ]],
  acerca: ['Acerca de', [['t', 'PenFich — notas, PDF e imágenes. Tus apuntes se guardan solo en este dispositivo; usa «Backup local» para respaldarlos.']]],
};
let cur = null;
const narrow = () => matchMedia('(max-width:700px)').matches;
const label = (opts, v) => opts.find((o) => o[0] === v)?.[1] ?? '';

function pick(title, key, opts, done) {
  const box = document.createElement('div');
  box.className = 'mlist';
  let close;
  opts.forEach(([v, l]) => {
    const b = document.createElement('button');
    b.className = 'mitem';
    b.innerHTML = `<span style="flex:1">${l}</span>${cfg[key] === v ? svg('check') : ''}`;
    b.onclick = () => { cfg[key] = v; saveCfg(); close(); done(); };
    box.append(b);
  });
  close = sheet(title, box);
}

function renderRight() {
  const right = $('#sRight');
  right.innerHTML = '';
  if (!cur) return;
  const [title, rows] = SECTIONS[cur];
  const h = document.createElement('div');
  h.className = 'stitle';
  h.textContent = title;
  right.append(h);
  for (const r of rows) {
    if (r[0] === 'h') { const e = document.createElement('h3'); e.textContent = r[1]; right.append(e); continue; }
    if (r[0] === 't') { const p = document.createElement('p'); p.className = 'stext'; p.textContent = r[1]; right.append(p); continue; }
    const el = document.createElement('div');
    el.className = 'srow';
    const tx = document.createElement('div');
    tx.className = 'tx';
    const b = document.createElement('b');
    const sm = document.createElement('small');
    tx.append(b, sm);
    el.append(tx);
    if (r[0] === 'b') {
      b.textContent = r[2]; sm.textContent = r[3];
      const c = document.createElement('input');
      c.type = 'checkbox'; c.checked = !!cfg[r[1]];
      c.onchange = () => { cfg[r[1]] = c.checked; saveCfg(); };
      el.append(c);
      el.onclick = (e) => { if (e.target !== c) { c.checked = !c.checked; c.onchange(); } };
    } else if (r[0] === 'c') {
      b.textContent = r[2]; sm.textContent = label(r[3], cfg[r[1]]);
      el.onclick = () => pick(r[2], r[1], r[3], () => (sm.textContent = label(r[3], cfg[r[1]])));
    } else if (r[0] === 'a') {
      b.textContent = r[1];
      sm.textContent = typeof r[2] === 'function' ? r[2]() : r[2];
      el.onclick = typeof r[2] === 'function' ? r[3] : r[3];
    }
    right.append(el);
  }
}
function renderLeft() {
  const left = $('#sLeft');
  left.innerHTML = '';
  for (const [g, items] of NAV) {
    const h = document.createElement('h3');
    h.textContent = g;
    left.append(h);
    for (const [id, name] of items) {
      const b = document.createElement('button');
      b.textContent = name;
      b.className = id === cur ? 'on' : '';
      b.onclick = () => { cur = id; sync(); };
      left.append(b);
    }
  }
}
function sync() {
  renderLeft();
  renderRight();
  const body = $('#sBody');
  body.classList.toggle('show-right', !!cur && narrow());
  $('#sTitle').textContent = 'Ajustes de PenFich';
}

export function renderSettings() {
  $('#sBody').innerHTML = '<div id="sLeft"></div><div id="sRight"></div>';
  let want = null;
  try { want = sessionStorage.getItem('ep-sec'); sessionStorage.removeItem('ep-sec'); } catch {}
  cur = want && SECTIONS[want] ? want : narrow() ? null : 'editar';
  sync();
  hydrate($('#settings'));
}
// En pantallas pequeñas, "atrás" vuelve primero al menú de Ajustes
export function settingsBack() {
  if (cur && narrow()) { cur = null; sync(); return true; }
  return false;
}
