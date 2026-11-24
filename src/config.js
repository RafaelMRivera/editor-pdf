// Conexión con Supabase (inicio de sesión con Google y autorización).
// Mientras estén vacíos, la app funciona sin pedir inicio de sesión.
// La clave "anon / publishable" es pública por diseño: la seguridad real la dan las reglas (RLS) del script supabase/schema.sql.
// Guía paso a paso: docs/CONFIGURAR-LOGIN.md
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
