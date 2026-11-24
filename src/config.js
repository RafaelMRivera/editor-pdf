// Conexión con Supabase (inicio de sesión con Google y autorización).
// Si estos valores se dejan vacíos, la app funciona sin pedir inicio de sesión.
// La clave "publishable/anon" es pública por diseño: la seguridad real la dan las reglas (RLS) de supabase/schema.sql.
// Guía paso a paso: docs/CONFIGURAR-LOGIN.md
export const SUPABASE_URL = 'https://pehdkqooxdlgwhrlvlme.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_G8HT8P8PVx8hgZhifDWc3Q_Fc0i4Tcd';
