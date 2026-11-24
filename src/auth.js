// Inicio de sesión con Google (Supabase) + autorización del administrador.
import { $, toast, sheet, menuSheet, svg } from './ui.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const authEnabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
const CACHE = 'pf-auth', GRACE = 14 * 24 * 3600 * 1000; // sin conexión se acepta una aprobación reciente (14 días)
const root = document.documentElement;
let sb = null, me = null, poll = null;

const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE)); } catch { return null; } };
const cacheOk = () => { const c = readCache(); return c && c.status === 'approved' && Date.now() - c.at < GRACE ? c : null; };
const setInert = (v) => document.querySelectorAll('body > section').forEach((s) => (s.inert = v));

/* ---------- pantalla de acceso ---------- */
const TEXT = {
  loading: () => 'Verificando acceso…',
  login: () => 'Inicia sesión con tu cuenta de Google para usar PenFich.',
  pending: () => `Hola${me?.nombre ? ' ' + me.nombre.split(' ')[0] : ''}. Tu solicitud (${me?.email || 'tu correo'}) está pendiente: el administrador debe autorizarte. Esta pantalla se actualiza sola cuando te aprueben.`,
  blocked: () => 'Tu acceso está bloqueado. Habla con el administrador.',
  error: () => 'No se pudo verificar tu acceso. Revisa tu conexión e inténtalo de nuevo.',
};
const SHOW = { loading: [], login: ['authGoogle'], pending: ['authRefresh', 'authOut'], blocked: ['authOut'], error: ['authRefresh', 'authOut'] };
export function view(kind) {
  root.classList.add('needauth');
  setInert(true);
  $('#authMsg').textContent = TEXT[kind]();
  ['authGoogle', 'authRefresh', 'authOut'].forEach((id) => ($('#' + id).hidden = !SHOW[kind].includes(id)));
  clearInterval(poll);
  if (kind === 'pending') poll = setInterval(verify, 15000);
}
function grant(p) {
  me = p;
  root.classList.remove('needauth');
  setInert(root.classList.contains('locked'));
  clearInterval(poll);
  try { localStorage.setItem(CACHE, JSON.stringify({ ...p, at: Date.now() })); } catch {}
  updateDrawer();
}

/* ---------- verificación ---------- */
async function verify() {
  if (!sb) return;
  const { data: { session } = {}, error } = await sb.auth.getSession();
  if (!session) {
    const c = cacheOk();
    if (c && (error || !navigator.onLine)) return grant(c); // sin conexión: se usa la aprobación guardada
    try { localStorage.removeItem(CACHE); } catch {}
    return view('login');
  }
  const u = session.user;
  const { data, error: e } = await sb.from('profiles').select('id,email,nombre,avatar,status,role').eq('id', u.id).maybeSingle();
  if (e) {
    const c = cacheOk();
    if (c && c.id === u.id) return grant(c);
    return view('error');
  }
  if (!data) { me = { id: u.id, email: u.email, nombre: u.user_metadata?.full_name, status: 'pending', role: 'user' }; return view('pending'); }
  me = data;
  if (data.status === 'approved') return grant(data);
  try { localStorage.removeItem(CACHE); } catch {}
  view(data.status === 'blocked' ? 'blocked' : 'pending');
}
async function signIn() {
  await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } } });
}
export async function signOut() {
  try { await sb?.auth.signOut(); } catch {}
  try { localStorage.removeItem(CACHE); } catch {}
  me = null;
  updateDrawer();
  view('login');
}
export function initAuth() {
  if (!authEnabled) return;
  const c = cacheOk();
  if (c) { me = c; updateDrawer(); } else view('loading');
  $('#authGoogle').onclick = () => signIn();
  $('#authRefresh').onclick = () => { $('#authMsg').textContent = 'Verificando…'; verify(); };
  $('#authOut').onclick = signOut;
  import('@supabase/supabase-js').then(({ createClient }) => {
    sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
    sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT' && me) signOut(); });
    verify();
  }).catch(() => { if (!cacheOk()) view('error'); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && sb && navigator.onLine && !root.classList.contains('needauth')) verify(); });
}

/* ---------- menú lateral ---------- */
export async function updateDrawer() {
  const acc = document.querySelector('#drawer [data-v=account]'), adm = document.querySelector('#drawer [data-v=admin]');
  if (!acc || !adm) return;
  acc.hidden = !(authEnabled && me);
  adm.hidden = !(authEnabled && me?.role === 'admin');
  if (!acc.hidden) acc.querySelector('span').textContent = me.email || 'Mi cuenta';
  if (!adm.hidden && sb) {
    const { count } = await sb.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    adm.querySelector('span').textContent = 'Administrar usuarios' + (count ? ` (${count} pendiente${count > 1 ? 's' : ''})` : '');
  }
}
export function openAccount() {
  menuSheet(me?.email || 'Mi cuenta', [{ label: 'Cerrar sesión', icon: 'logout', fn: signOut }]);
}

/* ---------- panel del administrador ---------- */
const fmt = (t) => (t ? new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export async function openAdmin() {
  if (!sb || me?.role !== 'admin') return;
  const box = document.createElement('div');
  box.className = 'adm';
  box.textContent = 'Cargando…';
  sheet('Administrar usuarios', box, true);
  const btn = (txt, cls, fn) => { const b = document.createElement('button'); b.className = 'btn small ' + cls; b.textContent = txt; b.onclick = fn; return b; };
  async function setStatus(u, status) {
    const { error } = await sb.from('profiles').update({ status, approved_at: status === 'approved' ? new Date().toISOString() : null }).eq('id', u.id);
    if (error) toast(error.message); else { toast(status === 'approved' ? 'Aprobado' : 'Bloqueado'); load(); updateDrawer(); }
  }
  async function allow(email) {
    email = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Escribe un correo válido');
    const r = await sb.from('allowed_emails').upsert({ email, role: 'user' });
    if (r.error) return toast(r.error.message);
    await sb.from('profiles').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('email', email).eq('status', 'pending');
    toast('Correo autorizado'); load(); updateDrawer();
  }
  function render(users, allowed) {
    box.innerHTML = '';
    const f = document.createElement('div');
    f.className = 'adm-add';
    f.innerHTML = '<input type="email" placeholder="correo@gmail.com" /><button class="btn small primary">Autorizar correo</button>';
    f.querySelector('button').onclick = () => allow(f.querySelector('input').value);
    box.append(f);
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Un correo autorizado entra aprobado en cuanto inicia sesión con Google. Los demás quedan pendientes hasta que los apruebes.';
    box.append(hint);
    for (const [title, st] of [['Pendientes', 'pending'], ['Autorizados', 'approved'], ['Bloqueados', 'blocked']]) {
      const list = users.filter((u) => u.status === st);
      const h = document.createElement('h4');
      h.textContent = `${title} (${list.length})`;
      box.append(h);
      if (!list.length) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'Nadie por ahora.'; box.append(p); }
      for (const u of list) {
        const r = document.createElement('div');
        r.className = 'adm-row';
        const t = document.createElement('div');
        t.className = 'tx';
        const b = document.createElement('b'); b.textContent = (u.nombre || u.email) + (u.role === 'admin' ? ' · admin' : '');
        const s = document.createElement('small'); s.textContent = `${u.email} · ${fmt(u.created_at)}`;
        t.append(b, s);
        r.append(t);
        if (u.id === me.id) { const y = document.createElement('small'); y.textContent = 'Tú'; r.append(y); }
        else {
          if (st !== 'approved') r.append(btn('Aprobar', 'primary', () => setStatus(u, 'approved')));
          if (st !== 'blocked') r.append(btn('Bloquear', 'danger', () => setStatus(u, 'blocked')));
        }
        box.append(r);
      }
    }
    const h = document.createElement('h4');
    h.textContent = `Correos autorizados de antemano (${allowed.length})`;
    box.append(h);
    for (const a of allowed) {
      const r = document.createElement('div');
      r.className = 'adm-row';
      const t = document.createElement('div'); t.className = 'tx'; t.textContent = a.email + (a.role === 'admin' ? ' · admin' : '');
      r.append(t);
      if (a.role !== 'admin') r.append(btn('Quitar', 'danger', async () => { const { error } = await sb.from('allowed_emails').delete().eq('email', a.email); if (error) toast(error.message); else load(); }));
      box.append(r);
    }
  }
  async function load() {
    const [p, a] = await Promise.all([
      sb.from('profiles').select('*').order('created_at', { ascending: false }),
      sb.from('allowed_emails').select('*').order('created_at', { ascending: false }),
    ]);
    if (p.error || a.error) { box.textContent = 'No se pudo cargar: ' + (p.error || a.error).message; return; }
    render(p.data, a.data);
  }
  load();
}
