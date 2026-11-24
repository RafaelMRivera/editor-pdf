import { PDFDocument, StandardFonts, rgb, degrees, LineCapStyle } from 'pdf-lib';
import { BASE, LH, HL_ALPHA, shapeLines } from './ann.js';
import { ops } from './templates.js';

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const pwf = (p) => 0.3 + 1.4 * (p ?? 0.5);

async function stamp(pg, font, P, assets, embed) {
  const rot = ((pg.getRotation().angle % 360) + 360) % 360;
  const { x: ox, y: oy, width: w0, height: h0 } = pg.getCropBox();
  const map = (nx, ny) => {
    const u = nx * P.w, v = ny * P.h;
    switch (rot) {
      case 90: return [ox + v, oy + u];
      case 180: return [ox + w0 - u, oy + v];
      case 270: return [ox + w0 - v, oy + h0 - u];
      default: return [ox + u, oy + h0 - v];
    }
  };
  const poly = (pts, a, opacity = 1) => {
    if (pts.length === 1) pts = [pts[0], [pts[0][0] + 1e-5, pts[0][1]]];
    const d = pts.map((q, k) => { const [x, y] = map(q[0], q[1]); return `${k ? 'L' : 'M'}${x.toFixed(2)} ${(-y).toFixed(2)}`; }).join(' ');
    pg.drawSvgPath(d, { x: 0, y: 0, borderColor: hex(a.c), borderWidth: Math.max(0.3, a.w * P.w), borderOpacity: opacity, borderLineCap: LineCapStyle.Round });
  };
  const safe = (t) => Array.from(t).map((ch) => { try { font.encodeText(ch); return ch; } catch { return '?'; } }).join('');
  for (const a of P.ann) {
    if (a.t === 'text') {
      const size = a.s * P.w;
      a.v.split('\n').forEach((ln, k) => {
        if (!ln) return;
        const [x, y] = map(a.x, a.y + ((BASE + k * LH) * size) / P.h);
        pg.drawText(safe(ln), { x, y, size, font, color: hex(a.c), rotate: degrees(rot) });
      });
    } else if (a.t === 'img') {
      const e = await embed(a.id);
      const wp = a.w * P.w, hp = a.h * P.w;
      const [x, y] = map(a.x, (a.y * P.h + hp) / P.h);
      pg.drawImage(e, { x, y, width: wp, height: hp, rotate: degrees(rot) });
    } else if (a.t === 'shape') {
      shapeLines(a, P.h / P.w).forEach((l) => poly(l, a));
    } else {
      for (const pts of a.t === 'sig' ? a.ss : [a.p]) {
        if (!pts.length) continue;
        if (a.v && pts.length > 1) {
          for (let k = 1; k < pts.length; k++) {
            const [x1, y1] = map(pts[k - 1][0], pts[k - 1][1]);
            const [x2, y2] = map(pts[k][0], pts[k][1]);
            pg.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: Math.max(0.3, a.w * P.w * pwf(((pts[k][2] ?? 0.5) + (pts[k - 1][2] ?? 0.5)) / 2)), color: hex(a.c), lineCap: LineCapStyle.Round });
          }
        } else poly(pts, a, a.t === 'hl' ? HL_ALPHA : 1);
      }
    }
  }
}

// doc: metadatos; pages: [{w,h,ann}]; bytes: archivo original (pdf o imagen)
export async function buildPdf(doc, pages, assets, bytes, only = null) {
  const out = doc.kind === 'pdf' ? await PDFDocument.load(bytes, { ignoreEncryption: true }) : await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  const cache = new Map();
  const embed = async (id) => {
    if (cache.has(id)) return cache.get(id);
    const [h, b64] = assets[id].split(',');
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const e = /png/.test(h) ? await out.embedPng(bin) : await out.embedJpg(bin);
    cache.set(id, e);
    return e;
  };
  const existing = out.getPages();
  const idx = only ?? pages.map((_, i) => i);
  for (const i of idx) {
    const P = pages[i];
    let pg;
    if (doc.kind === 'pdf') pg = existing[i];
    else {
      pg = out.addPage([P.w, P.h]);
      if (doc.kind === 'img') {
        const e = /png/.test(doc.mime) ? await out.embedPng(bytes) : await out.embedJpg(bytes);
        pg.drawImage(e, { x: 0, y: 0, width: P.w, height: P.h });
      } else {
        for (const o of ops(doc.template, P.w, P.h)) {
          if (o.t === 'l') pg.drawLine({ start: { x: o.x1, y: P.h - o.y1 }, end: { x: o.x2, y: P.h - o.y2 }, thickness: o.lw, color: hex(o.c) });
          else if (o.t === 'r') pg.drawRectangle({ x: o.x, y: P.h - o.y - o.h, width: o.w, height: o.h, borderColor: hex(o.c), borderWidth: o.lw });
          else if (o.t === 'c') pg.drawCircle({ x: o.x, y: P.h - o.y, size: o.r, borderColor: hex(o.c), borderWidth: o.lw });
          else pg.drawCircle({ x: o.x, y: P.h - o.y, size: o.r, color: hex(o.c) });
        }
      }
    }
    if (P.ann.length) await stamp(pg, font, P, assets, embed);
  }
  if (doc.kind === 'pdf' && only) for (let i = existing.length - 1; i >= 0; i--) if (!only.includes(i)) out.removePage(i);
  return out.save();
}
