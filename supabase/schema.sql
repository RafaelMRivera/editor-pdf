-- PenFich · acceso con Google y autorización por el administrador
-- Ejecútalo UNA vez en el proyecto NUEVO de Supabase: SQL Editor → New query → pegar → Run.
-- Antes de ejecutarlo, cambia TU_CORREO@gmail.com (al final) por el correo del administrador.

-- 1) Correos autorizados de antemano (quien entre con uno de estos correos queda aprobado solo)
create table if not exists public.allowed_emails (
  email      text primary key check (email = lower(email)),
  role       text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- 2) Perfil de cada persona que inicia sesión
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  nombre      text,
  avatar      text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'blocked')),
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now(),
  approved_at timestamptz
);

alter table public.allowed_emails enable row level security;
alter table public.profiles       enable row level security;

-- 3) ¿Quien consulta es administrador aprobado?
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$;

-- 4) Al registrarse con Google se crea el perfil: pendiente, o aprobado si el correo ya estaba autorizado
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare a public.allowed_emails;
begin
  select * into a from public.allowed_emails where email = lower(new.email);
  insert into public.profiles (id, email, nombre, avatar, status, role, approved_at)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    case when a.email is not null then 'approved' else 'pending' end,
    coalesce(a.role, 'user'),
    case when a.email is not null then now() end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Seguridad por filas: cada persona solo ve su perfil; el administrador ve y gestiona todo.
--    Nadie puede cambiar su propio estado ni su rol desde la app.
drop policy if exists "ver mi perfil"           on public.profiles;
drop policy if exists "admin ve perfiles"       on public.profiles;
drop policy if exists "admin actualiza perfiles" on public.profiles;
drop policy if exists "admin gestiona correos"  on public.allowed_emails;

create policy "ver mi perfil"            on public.profiles for select using (id = auth.uid());
create policy "admin ve perfiles"        on public.profiles for select using (public.is_admin());
create policy "admin actualiza perfiles" on public.profiles for update using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona correos"   on public.allowed_emails for all using (public.is_admin()) with check (public.is_admin());

-- 6) Administrador: este correo entra como administrador aprobado la primera vez que inicie sesión
insert into public.allowed_emails (email, role)
values (lower('TU_CORREO@gmail.com'), 'admin')
on conflict (email) do update set role = 'admin';
