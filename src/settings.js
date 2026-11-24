const KEY = 'ep-settings';
const DEF = {
  input: 'auto', // auto | stylus | all
  finger: 'scroll', // scroll | erase  (acción con los dedos cuando no dibujan)
  pressure: true,
  palm: true,
  resume: true, // reanudar en la última página
  remember: true, // guardar posición/zoom
  wake: false, // mantener pantalla encendida
  thumbs: true,
  template: 'blank',
  zoom: 'fit', // fit | 100
  quality: 0.92,
  openMode: 'last', // last | edit | view
  penButton: 'lasso', // lasso | erase | none (botón lateral del lápiz)
  cast: true, // habilitar presentación a pantalla completa
  autoPresent: false,
};
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
export const cfg = { ...DEF, ...saved };
export const saveCfg = () => {
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {}
};
