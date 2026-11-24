# PenFich · Activar el inicio de sesión con Google

Mientras `src/config.js` esté vacío, la app funciona sin pedir sesión. Estos pasos la activan: la gente se registra con
Google, queda **pendiente** y tú (administrador) la apruebas desde el menú ☰ → **Administrar usuarios**.

## 1. Proyecto nuevo en Supabase (gratis)
1. https://supabase.com → **New project**. Nombre: `penfich`. Guarda la contraseña de la base de datos.
2. Cuando termine de crearse, ve a **Project Settings → API** y copia:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon / publishable key** (clave pública; es normal que viaje en la app)

## 2. Google Cloud (credenciales de Google)
1. https://console.cloud.google.com → crea un proyecto `PenFich`.
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo **Externo**, nombre PenFich, tu correo de soporte.
   Después pulsa **Publicar aplicación** (sin esto solo entran usuarios de prueba y la sesión caduca a los 7 días).
3. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**:
   - Orígenes de JavaScript autorizados: `https://rafaelmrivera.github.io`
   - URI de redireccionamiento autorizado: `https://TU-PROYECTO.supabase.co/auth/v1/callback`
4. Copia el **ID de cliente** y el **Secreto**.

## 3. Conectar Google en Supabase
1. **Authentication → Sign In / Providers → Google**: actívalo y pega ID de cliente y Secreto.
2. **Authentication → URL Configuration**:
   - Site URL: `https://rafaelmrivera.github.io/editor-pdf/`
   - Redirect URLs: añade `https://rafaelmrivera.github.io/editor-pdf/**`

## 4. Crear las tablas y reglas
1. Abre `supabase/schema.sql`, cambia `TU_CORREO@gmail.com` por **tu correo de administrador**.
2. En Supabase: **SQL Editor → New query**, pega todo el contenido y pulsa **Run**.

## 5. Conectar la app
Pega en `src/config.js` la Project URL y la anon key (o pásamelas y lo hago yo), publica y listo.

## Cómo funciona
- Inicias sesión con tu correo de administrador: entras aprobado y ves **Administrar usuarios**.
- Alguien nuevo inicia sesión con Google → ve "pendiente de aprobación" → tú lo apruebas o bloqueas.
- También puedes **autorizar un correo de antemano**: al iniciar sesión entra directo.
- Las reglas de la base de datos impiden que alguien se apruebe a sí mismo.

## Límite importante
Los apuntes se guardan en cada dispositivo, no en el servidor. La aprobación controla quién pasa por la pantalla de acceso
y te da el control de usuarios, pero el código de la app es público (GitHub Pages): alguien con conocimientos podría
saltarse esa pantalla en su propia copia. No obtendría los apuntes de nadie (no están en el servidor). Si más adelante
quieres que el acceso sea realmente infranqueable, el siguiente paso es guardar los apuntes en la nube protegidos por estas mismas reglas.
