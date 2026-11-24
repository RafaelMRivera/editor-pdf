export const TEMPLATES = [
  { id: 'blank', n: 'En blanco', g: 'Estándar' },
  { id: 'lined', n: 'Pautado estándar', g: 'Estándar' },
  { id: 'wide', n: 'Pautado ancho', g: 'Estándar' },
  { id: 'narrow', n: 'Pautado estrecho', g: 'Estándar' },
  { id: 'cornell', n: 'Cornell básico', g: 'Estándar' },
  { id: 'finegrid', n: 'Cuadrícula fina', g: 'Cuadrícula' },
  { id: 'grid', n: 'Cuadrícula', g: 'Cuadrícula' },
  { id: 'gridl', n: 'Cuadrícula grande', g: 'Cuadrícula' },
  { id: 'dots', n: 'Puntos', g: 'Cuadrícula' },
  { id: 'dotsl', n: 'Puntos grandes', g: 'Cuadrícula' },
  { id: 'iso', n: 'Isométrica', g: 'Cuadrícula' },
  { id: 'eng', n: 'Ingeniería', g: 'Matemáticas e Ingeniería' },
  { id: 'polar', n: 'Polar', g: 'Matemáticas e Ingeniería' },
  { id: 'semilog', n: 'Semi-log', g: 'Matemáticas e Ingeniería' },
  { id: 'loglog', n: 'Log-log', g: 'Matemáticas e Ingeniería' },
  { id: 'staff', n: 'Pentagrama', g: 'Música' },
  { id: 'grand', n: 'Doble pentagrama', g: 'Música' },
  { id: 'diary', n: 'Diario', g: 'Planificación y listas' },
  { id: 'weekly', n: 'Semanal', g: 'Planificación y listas' },
  { id: 'monthly', n: 'Calendario mensual', g: 'Planificación y listas' },
  { id: 'todo', n: 'Lista de tareas', g: 'Planificación y listas' },
  { id: 'cols', n: 'Tres columnas', g: 'Planificación y listas' },
];
export const CATEGORIES = [...new Set(TEMPLATES.map((t) => t.g))];
export const PAGE_W = 595, PAGE_H = 842;
// Tamaños de papel en puntos (1 pt = 1/72 pulgada)
export const PAPER = [
  ['Carta', 612, 792], ['Legal', 612, 1008], ['A3', 842, 1191], ['A4', 595, 842], ['A5', 420, 595],
  ['B4', 709, 1001], ['B5', 499, 709], ['Ejecutivo', 522, 756], ['US 4x6', 288, 432], ['US 4x8', 288, 576], ['US 5x7', 360, 504],
];
export const paperName = (w, h) => PAPER.find(([, pw, ph]) => Math.abs(pw - w) < 2 && Math.abs(ph - h) < 2)?.[0] ?? 'Personalizado';

// Operaciones vectoriales de la plantilla (en puntos, y hacia abajo). Se usan en pantalla y al exportar a PDF.
//  l = línea, d = punto, r = rectángulo (solo borde), c = círculo (solo borde)
export function ops(id, w = PAGE_W, h = PAGE_H) {
  const o = [];
  const L = (x1, y1, x2, y2, c, lw = 0.6) => o.push({ t: 'l', x1, y1, x2, y2, c, lw });
  const R = (x, y, rw, rh, c, lw = 0.8) => o.push({ t: 'r', x, y, w: rw, h: rh, c, lw });
  const C = (x, y, r, c, lw = 0.5) => o.push({ t: 'c', x, y, r, c, lw });
  const rows = (sp, y0, x0, x1, c = '#a9c3e0', yEnd = h - 30) => { for (let y = y0; y < yEnd; y += sp) L(x0, y, x1, y, c); };
  const grid = (sp, c, lw) => {
    for (let x = sp; x < w; x += sp) L(x, 0, x, h, c, lw);
    for (let y = sp; y < h; y += sp) L(0, y, w, y, c, lw);
  };
  switch (id) {
    case 'lined': rows(26, 70, 0, w); L(64, 0, 64, h, '#e7a3a3'); break;
    case 'wide': rows(34, 70, 0, w); L(64, 0, 64, h, '#e7a3a3'); break;
    case 'narrow': rows(20, 60, 0, w); break;
    case 'cornell':
      L(0, 90, w, 90, '#6b8fb5', 1);
      L(150, 90, 150, h - 130, '#6b8fb5', 1);
      L(0, h - 130, w, h - 130, '#6b8fb5', 1);
      rows(26, 116, 150, w, '#c7d6e8', h - 130);
      break;
    case 'finegrid': grid(14, '#d6e4f2', 0.4); break;
    case 'grid': grid(20, '#cfe0f0', 0.5); break;
    case 'gridl': grid(28, '#cfe0f0', 0.5); break;
    case 'dots':
    case 'dotsl': {
      const sp = id === 'dots' ? 20 : 28;
      for (let y = 30; y < h - 10; y += sp) for (let x = 30; x < w - 10; x += sp) o.push({ t: 'd', x, y, r: 0.9, c: '#9aa4b2' });
      break;
    }
    case 'iso': {
      const d = 22, k = Math.sqrt(3), c = '#cfe0f0';
      for (let y = d; y < h; y += d) L(0, y, w, y, c, 0.4);
      const s = (2 * d) / k;
      for (let x0 = -h / k; x0 < w; x0 += s) L(x0, 0, x0 + h / k, h, c, 0.4);
      for (let x0 = 0; x0 < w + h / k; x0 += s) L(x0, 0, x0 - h / k, h, c, 0.4);
      break;
    }
    case 'eng':
      for (let x = 10; x < w; x += 10) L(x, 0, x, h, x % 50 === 0 ? '#b9d3bd' : '#dfece1', x % 50 === 0 ? 0.6 : 0.3);
      for (let y = 10; y < h; y += 10) L(0, y, w, y, y % 50 === 0 ? '#b9d3bd' : '#dfece1', y % 50 === 0 ? 0.6 : 0.3);
      break;
    case 'polar': {
      const cx = w / 2, cy = h / 2;
      for (let r = 35; r <= 280; r += 35) C(cx, cy, r, '#9fb3c8', 0.5);
      for (let a = 0; a < 360; a += 15) { const t = (a * Math.PI) / 180; L(cx, cy, cx + 280 * Math.cos(t), cy + 280 * Math.sin(t), '#b8c7d8', 0.4); }
      break;
    }
    case 'semilog':
    case 'loglog': {
      const x0 = 40, dw = 128, dec = 4;
      for (let d = 0; d < dec; d++)
        for (let n = 1; n <= 10; n++) {
          if (n === 10 && d < dec - 1) continue;
          const major = n === 1 || n === 10;
          const x = x0 + dw * (d + Math.log10(n));
          L(x, 50, x, h - 50, major ? '#7f9bb8' : '#b8c7d8', major ? 0.8 : 0.4);
        }
      if (id === 'semilog') for (let y = 50; y <= h - 50; y += 20) L(x0, y, x0 + dw * dec, y, '#b8c7d8', 0.4);
      else
        for (let d = 0; d < 5; d++)
          for (let n = 1; n <= 10; n++) {
            if (n === 10 && d < 4) continue;
            const major = n === 1 || n === 10;
            const y = h - 50 - 140 * (d + Math.log10(n));
            L(x0, y, x0 + dw * dec, y, major ? '#7f9bb8' : '#b8c7d8', major ? 0.8 : 0.4);
          }
      break;
    }
    case 'staff':
      for (let y = 70; y + 28 < h - 40; y += 78) {
        for (let i = 0; i < 5; i++) L(40, y + i * 7, w - 40, y + i * 7, '#555555', 0.6);
        L(40, y, 40, y + 28, '#555555', 0.6); L(w - 40, y, w - 40, y + 28, '#555555', 0.6);
      }
      break;
    case 'grand':
      for (let y = 70; y + 83 < h - 40; y += 130) {
        for (const off of [0, 55]) for (let i = 0; i < 5; i++) L(40, y + off + i * 7, w - 40, y + off + i * 7, '#555555', 0.6);
        L(40, y, 40, y + 83, '#555555', 0.9); L(w - 40, y, w - 40, y + 83, '#555555', 0.6);
      }
      break;
    case 'diary':
      L(40, 70, w - 40, 70, '#6b8fb5', 1.2);
      L(w - 210, 52, w - 40, 52, '#6b8fb5', 0.8);
      rows(26, 100, 40, w - 40, '#c7d6e8');
      break;
    case 'weekly': {
      const bw = (w - 80) / 2, bh = (h - 110) / 4;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
        const x = 40 + c * bw, y = 60 + r * bh;
        R(x, y, bw, bh, '#8aa6c4'); L(x, y + 22, x + bw, y + 22, '#8aa6c4');
      }
      break;
    }
    case 'monthly': {
      const cw = (w - 60) / 7, ch = (h - 160) / 6;
      R(30, 70, w - 60, 30 + ch * 6, '#8aa6c4');
      L(30, 100, w - 30, 100, '#8aa6c4');
      for (let c = 1; c < 7; c++) L(30 + c * cw, 70, 30 + c * cw, 100 + ch * 6, '#8aa6c4', 0.6);
      for (let r = 1; r < 6; r++) L(30, 100 + r * ch, w - 30, 100 + r * ch, '#8aa6c4', 0.6);
      break;
    }
    case 'todo':
      for (let y = 80; y < h - 40; y += 30) { R(40, y - 11, 12, 12, '#6b8fb5'); L(62, y, w - 40, y, '#c7d6e8'); }
      break;
    case 'cols': {
      const cw = (w - 80) / 3;
      L(40, 70, w - 40, 70, '#6b8fb5', 1);
      for (let i = 1; i < 3; i++) L(40 + i * cw, 70, 40 + i * cw, h - 40, '#6b8fb5', 0.8);
      rows(26, 96, 40, w - 40, '#d5e0ee', h - 40);
      break;
    }
  }
  return o;
}

export function paintTemplate(ctx, id, W, H, pw = PAGE_W, ph = PAGE_H) {
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  const k = W / pw;
  ctx.scale(k, k);
  for (const o of ops(id, pw, ph)) {
    if (o.t === 'd') {
      ctx.fillStyle = o.c;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, 7);
      ctx.fill();
      continue;
    }
    ctx.strokeStyle = o.c;
    ctx.lineWidth = o.lw;
    if (o.t === 'l') { ctx.beginPath(); ctx.moveTo(o.x1, o.y1); ctx.lineTo(o.x2, o.y2); ctx.stroke(); }
    else if (o.t === 'r') ctx.strokeRect(o.x, o.y, o.w, o.h);
    else { ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 7); ctx.stroke(); }
  }
  ctx.restore();
}
