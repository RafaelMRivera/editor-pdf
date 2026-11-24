// Modelo de anotaciones (vectoriales, normalizadas por página).
//  Coordenadas: x en [0,1] del ancho, y en [0,1] del alto. "Unidades W" = unidades del ancho para ambos ejes (y*r, r=alto/ancho).
//  Tipos: pen | hl | sig | text | img | shape
export const FONT = 'Helvetica, Arial, sans-serif';
export const BASE = 0.94, LH = 1.2, HL_ALPHA = 0.4;
export const hooks = { img() {} };

const imgs = new Map();
export function getImg(id, assets) {
  let e = imgs.get(id);
  if (e) return e.ok ? e.im : null;
  const im = new Image();
  e = { im, ok: false };
  imgs.set(id, e);
  im.onload = () => { e.ok = true; hooks.img(); };
  im.src = assets[id] || '';
  return null;
}
const pwf = (p) => 0.3 + 1.4 * (p ?? 0.5); // factor de grosor según presión

export function strokePath(ctx, pts, W, H) {
  ctx.beginPath();
  if (pts.length === 1) {
    ctx.moveTo(pts[0][0] * W, pts[0][1] * H);
    ctx.lineTo(pts[0][0] * W + 0.01, pts[0][1] * H);
  } else {
    ctx.moveTo(pts[0][0] * W, pts[0][1] * H);
    for (let k = 1; k < pts.length - 1; k++) {
      ctx.quadraticCurveTo(pts[k][0] * W, pts[k][1] * H, ((pts[k][0] + pts[k + 1][0]) / 2) * W, ((pts[k][1] + pts[k + 1][1]) / 2) * H);
    }
    const l = pts[pts.length - 1];
    ctx.lineTo(l[0] * W, l[1] * H);
  }
  ctx.stroke();
}

export function shapeLines(a, r) {
  const [x1, y1] = a.a, [x2, y2] = a.b;
  if (a.k === 'line') return [[a.a, a.b]];
  if (a.k === 'rect') return [[[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]];
  if (a.k === 'ellipse') {
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
    return [Array.from({ length: 49 }, (_, k) => { const t = (k / 48) * Math.PI * 2; return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)]; })];
  }
  const ang = Math.atan2((y2 - y1) * r, x2 - x1), h = 0.03 + a.w * 2;
  const hp = (s) => [x2 - h * Math.cos(ang + s), (y2 * r - h * Math.sin(ang + s)) / r];
  return [[a.a, a.b], [hp(0.45), a.b, hp(-0.45)]];
}

export function drawAnn(ctx, a, W, H, assets) {
  ctx.save();
  if (a.t === 'text') {
    ctx.fillStyle = a.c;
    ctx.font = `${a.s * W}px ${FONT}`;
    ctx.textBaseline = 'alphabetic';
    a.v.split('\n').forEach((ln, k) => ctx.fillText(ln, a.x * W, a.y * H + (BASE + k * LH) * a.s * W));
  } else if (a.t === 'img') {
    const im = getImg(a.id, assets);
    if (im) ctx.drawImage(im, a.x * W, a.y * H, a.w * W, a.h * W);
  } else if (a.t === 'shape') {
    ctx.strokeStyle = a.c;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(0.5, a.w * W);
    for (const l of shapeLines(a, H / W)) {
      ctx.beginPath();
      l.forEach(([x, y], k) => (k ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)));
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = a.c;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(0.5, a.w * W);
    if (a.t === 'hl') ctx.globalAlpha = HL_ALPHA;
    for (const pts of a.t === 'sig' ? a.ss : [a.p]) {
      if (!pts.length) continue;
      if (a.v && pts.length > 1) {
        for (let k = 1; k < pts.length; k++) {
          ctx.lineWidth = Math.max(0.5, a.w * W * pwf(((pts[k][2] ?? 0.5) + (pts[k - 1][2] ?? 0.5)) / 2));
          ctx.beginPath();
          ctx.moveTo(pts[k - 1][0] * W, pts[k - 1][1] * H);
          ctx.lineTo(pts[k][0] * W, pts[k][1] * H);
          ctx.stroke();
        }
      } else strokePath(ctx, pts, W, H);
    }
  }
  ctx.restore();
}

/* ---------- geometría ---------- */
const mctx = document.createElement('canvas').getContext('2d');
export function textBox(a, r) {
  mctx.font = `100px ${FONT}`;
  const lines = a.v.split('\n');
  const w = (Math.max(...lines.map((l) => mctx.measureText(l).width)) / 100) * a.s;
  return { x0: a.x, y0: a.y * r, x1: a.x + w, y1: a.y * r + lines.length * LH * a.s };
}
export function bboxW(a, r) {
  if (a.t === 'text') return textBox(a, r);
  if (a.t === 'img') return { x0: a.x, y0: a.y * r, x1: a.x + a.w, y1: a.y * r + a.h };
  const lines = a.t === 'shape' ? shapeLines(a, r) : a.t === 'sig' ? a.ss : [a.p];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const l of lines) for (const q of l) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1] * r); y1 = Math.max(y1, q[1] * r); }
  const pad = a.w / 2;
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}
export function distSeg(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
  let t = l2 ? ((px - ax) * vx + (py - ay) * vy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}
export function hits(a, x, y, tol, r) {
  if (a.t === 'text' || a.t === 'img') {
    const b = bboxW(a, r);
    return x >= b.x0 - tol && x <= b.x1 + tol && y >= b.y0 - tol && y <= b.y1 + tol;
  }
  const lines = a.t === 'shape' ? shapeLines(a, r) : a.t === 'sig' ? a.ss : [a.p];
  const lim = tol + a.w / 2;
  return lines.some((pts) => {
    if (pts.length === 1) return Math.hypot(x - pts[0][0], y - pts[0][1] * r) <= lim;
    for (let k = 0; k < pts.length - 1; k++) if (distSeg(x, y, pts[k][0], pts[k][1] * r, pts[k + 1][0], pts[k + 1][1] * r) <= lim) return true;
    return false;
  });
}
// Borrado parcial de trazos: devuelve null si no se toca, o la lista de trozos que quedan
export function erasePartial(a, x, y, tol, r) {
  const lim = tol + a.w / 2, step = Math.max(lim / 2, 1e-4);
  const dense = (pts) => {
    const o = [];
    pts.forEach((q, k) => {
      if (k) {
        const p0 = pts[k - 1], d = Math.hypot(q[0] - p0[0], (q[1] - p0[1]) * r), n = Math.floor(d / step);
        for (let m = 1; m <= n; m++) o.push(p0.map((v, z) => v + ((q[z] - v) * m) / (n + 1)));
      }
      o.push(q);
    });
    return o;
  };
  let touched = false;
  const out = [];
  for (const raw of a.t === 'sig' ? a.ss : [a.p]) {
    let cur = [];
    for (const q of dense(raw)) {
      if (Math.hypot(q[0] - x, q[1] * r - y) <= lim) { touched = true; if (cur.length) out.push(cur); cur = []; }
      else cur.push(q);
    }
    if (cur.length) out.push(cur);
  }
  if (!touched) return null;
  return out.filter((c) => c.length > 1).map((p) => ({ t: a.t === 'sig' ? 'pen' : a.t, c: a.c, w: a.w, ...(a.v ? { v: 1 } : {}), p }));
}
// Mueve y escala una anotación (s = escala respecto a (ox,oy); dx,dy en unidades W)
export function xf(o, r, s, ox, oy, dx, dy) {
  const a = structuredClone(o);
  const X = (x) => ox + (x - ox) * s + dx;
  const Y = (y) => (oy + (y * r - oy) * s + dy) / r;
  const P = (q) => [X(q[0]), Y(q[1]), ...q.slice(2)];
  if (a.t === 'text') { a.x = X(a.x); a.y = Y(a.y); a.s *= s; }
  else if (a.t === 'img') { a.x = X(a.x); a.y = Y(a.y); a.w *= s; a.h *= s; }
  else {
    a.w *= s;
    if (a.t === 'shape') { a.a = P(a.a); a.b = P(a.b); }
    else if (a.t === 'sig') a.ss = a.ss.map((l) => l.map(P));
    else a.p = a.p.map(P);
  }
  return a;
}
