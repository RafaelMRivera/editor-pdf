export const TEMPLATES = [
  { id: 'blank', n: 'En blanco', g: 'Estándar' },
  { id: 'lined', n: 'Pautado estándar', g: 'Estándar' },
  { id: 'wide', n: 'Pautado ancho', g: 'Estándar' },
  { id: 'narrow', n: 'Pautado estrecho', g: 'Estándar' },
  { id: 'cornell', n: 'Cornell', g: 'Estudio' },
  { id: 'grid', n: 'Cuadrícula', g: 'Cuadrícula' },
  { id: 'gridl', n: 'Cuadrícula grande', g: 'Cuadrícula' },
  { id: 'dots', n: 'Puntos', g: 'Cuadrícula' },
];
export const PAGE_W = 595, PAGE_H = 842;

// Operaciones vectoriales de la plantilla (en puntos, y hacia abajo). Se usan para pantalla y para exportar a PDF.
export function ops(id, w = PAGE_W, h = PAGE_H) {
  const o = [];
  const L = (x1, y1, x2, y2, c, lw = 0.6) => o.push({ t: 'l', x1, y1, x2, y2, c, lw });
  const rows = (sp, y0, x0, x1, c = '#a9c3e0', yEnd = h - 30) => { for (let y = y0; y < yEnd; y += sp) L(x0, y, x1, y, c); };
  switch (id) {
    case 'lined': rows(26, 70, 0, w); L(64, 0, 64, h, '#e7a3a3'); break;
    case 'wide': rows(34, 70, 0, w); L(64, 0, 64, h, '#e7a3a3'); break;
    case 'narrow': rows(20, 60, 0, w); break;
    case 'grid':
    case 'gridl': {
      const sp = id === 'grid' ? 20 : 28;
      for (let x = sp; x < w; x += sp) L(x, 0, x, h, '#cfe0f0', 0.5);
      for (let y = sp; y < h; y += sp) L(0, y, w, y, '#cfe0f0', 0.5);
      break;
    }
    case 'dots':
      for (let y = 30; y < h - 10; y += 20) for (let x = 30; x < w - 10; x += 20) o.push({ t: 'd', x, y, r: 0.9, c: '#9aa4b2' });
      break;
    case 'cornell':
      L(0, 90, w, 90, '#6b8fb5', 1);
      L(150, 90, 150, h - 130, '#6b8fb5', 1);
      L(0, h - 130, w, h - 130, '#6b8fb5', 1);
      rows(26, 116, 150, w, '#c7d6e8', h - 130);
      break;
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
    if (o.t === 'l') {
      ctx.strokeStyle = o.c;
      ctx.lineWidth = o.lw;
      ctx.beginPath();
      ctx.moveTo(o.x1, o.y1);
      ctx.lineTo(o.x2, o.y2);
      ctx.stroke();
    } else {
      ctx.fillStyle = o.c;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, 7);
      ctx.fill();
    }
  }
  ctx.restore();
}
