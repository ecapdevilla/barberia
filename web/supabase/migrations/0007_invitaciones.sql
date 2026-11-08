-- ============================================================================
-- Barbería El Corte — 0007: Invitaciones (acceso controlado)
-- Requiere 0001..0006.
-- Permite que solo usuarios con código de invitación creen una barbería.
-- El desarrollador (master) genera los códigos desde la app.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Columna 'master' en profiles
-- ---------------------------------------------------------------------------
alter table barberia.profiles
  add column if not exists master boolean not null default false;

-- Marcar al desarrollador como master (ajusta el email)
-- update barberia.profiles set master = true where id = (select id from auth.users where email = 'TU_EMAIL@EJEMPLO.COM');

-- ---------------------------------------------------------------------------
-- 2) Tabla de invitaciones
-- ---------------------------------------------------------------------------
create table if not exists barberia.invitaciones (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  creado_por uuid references auth.users(id) on delete set null,
  usado boolean not null default false,
  usado_por uuid references auth.users(id) on delete set null,
  organizacion_id uuid references barberia.organizaciones(id) on delete set null,
  expira_en timestamptz,
  creado_en timestamptz not null default now()
);

create index if not exists invitaciones_codigo_idx on barberia.invitaciones (codigo);
create index if not exists invitaciones_creado_por_idx on barberia.invitaciones (creado_por);

grant select, insert, update, delete on barberia.invitaciones to authenticated;
grant all on barberia.invitaciones to service_role;

alter table barberia.invitaciones enable row level security;

-- Master ve todas las invitaciones; otros solo las que crearon
drop policy if exists invitaciones_select on barberia.invitaciones;
create policy invitaciones_select on barberia.invitaciones
  for select to authenticated
  using (
    barberia.is_master()
    or creado_por = auth.uid()
  );

-- Solo master crea invitaciones
drop policy if exists invitaciones_insert on barberia.invitaciones;
create policy invitaciones_insert on barberia.invitaciones
  for insert to authenticated
  with check (barberia.is_master());

-- Solo master actualiza (marcar como usado se hace vía RPC)
drop policy if exists invitaciones_update on barberia.invitaciones;
create policy invitaciones_update on barberia.invitaciones
  for update to authenticated
  using (barberia.is_master())
  with check (barberia.is_master());

-- Solo master elimina
drop policy if exists invitaciones_delete on barberia.invitaciones;
create policy invitaciones_delete on barberia.invitaciones
  for delete to authenticated
  using (barberia.is_master());

-- ---------------------------------------------------------------------------
-- 3) Helper is_master()
-- ---------------------------------------------------------------------------
create or replace function barberia.is_master()
returns boolean
language sql stable security definer
set search_path = barberia, pg_temp
as $$
  select coalesce((select master from barberia.profiles where id = auth.uid() and activo), false)
$$;

-- ---------------------------------------------------------------------------
-- 4) RPC generar_invitacion (solo master)
-- ---------------------------------------------------------------------------
create or replace function barberia.generar_invitacion(p_expira_dias int default 30)
returns text
language plpgsql
security definer
set search_path = barberia, pg_temp
as $$
declare
  v_codigo text;
  v_expira timestamptz;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if not barberia.is_master() then
    raise exception 'Solo el desarrollador puede generar invitaciones';
  end if;

  -- Generar código único: INV-XXXX-XXXX
  v_codigo := 'INV-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4)) || '-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 5 for 4));

  if p_expira_dias is not null and p_expira_dias > 0 then
    v_expira := now() + (p_expira_dias || ' days')::interval;
  else
    v_expira := null;
  end if;

  insert into barberia.invitaciones (codigo, creado_por, expira_en)
  values (v_codigo, auth.uid(), v_expira);

  return v_codigo;
end;
$$;

revoke all on function barberia.generar_invitacion(int) from public, anon;
grant execute on function barberia.generar_invitacion(int) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) RPC usar_invitacion (valida y crea org + perfil + seed)
-- ---------------------------------------------------------------------------
create or replace function barberia.usar_invitacion(
  p_codigo text,
  p_nombre_org text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = barberia, pg_temp
as $$
declare
  v_inv_id uuid;
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  -- Validar código
  select id into v_inv_id
  from barberia.invitaciones
  where codigo = upper(trim(p_codigo))
    and usado = false
    and (expira_en is null or expira_en > now());

  if v_inv_id is null then
    raise exception 'Código de invitación inválido o expirado';
  end if;

  if p_nombre_org is null or length(trim(p_nombre_org)) = 0 then
    raise exception 'Nombre de la barbería requerido';
  end if;

  if p_slug is null or length(trim(p_slug)) = 0 then
    raise exception 'Slug requerido';
  end if;

  -- Crear organización
  insert into barberia.organizaciones (nombre, slug)
  values (trim(p_nombre_org), trim(p_slug))
  returning id into v_org_id;

  -- Crear/actualizar perfil (admin de la nueva org)
  insert into barberia.profiles (id, nombre, rol, organizacion_id, master)
  values (auth.uid(), coalesce((select raw_user_meta_data->>'nombre' from auth.users where id = auth.uid()), split_part((select email from auth.users where id = auth.uid()), '@', 1)), 'admin', v_org_id, false)
  on conflict (id) do update set organizacion_id = v_org_id, rol = 'admin', activo = true;

  -- Membresía
  insert into barberia.membresias (user_id, organizacion_id, rol)
  values (auth.uid(), v_org_id, 'admin')
  on conflict (user_id, organizacion_id) do nothing;

  -- Marcar invitación como usada
  update barberia.invitaciones
  set usado = true,
      usado_por = auth.uid(),
      organizacion_id = v_org_id
  where id = v_inv_id;

  -- Seed inicial
  insert into barberia.barberos (nombre, color, telefono, activo, comision_pct, organizacion_id) values
    ('Carlos Ruiz', '#8b5cf6', '300 111 2233', true, 50, v_org_id),
    ('Andrés Peña', '#06b6d4', '301 444 5566', true, 50, v_org_id),
    ('Diego Mora', '#ec4899', '302 777 8899', true, 50, v_org_id);

  insert into barberia.servicios (nombre, precio, duracion, activo, organizacion_id) values
    ('Corte clásico', 25000, 30, true, v_org_id),
    ('Corte + barba', 35000, 50, true, v_org_id),
    ('Perfilado de barba', 15000, 20, true, v_org_id),
    ('Diseño de cejas', 10000, 15, true, v_org_id),
    ('Corte niños', 20000, 25, true, v_org_id);

  insert into barberia.productos (nombre, precio, stock, activo, categoria, organizacion_id) values
    ('Pomada mate', 22000, 14, true, 'Peinado', v_org_id),
    ('Cera de barba', 18000, 8, true, 'Barba', v_org_id),
    ('Shampoo de menta', 16000, 20, true, 'Lavado', v_org_id),
    ('Aceite de barba', 28000, 5, true, 'Barba', v_org_id),
    ('Gel fijador', 12000, 3, true, 'Peinado', v_org_id);

  return v_org_id;
end;
$$;

revoke all on function barberia.usar_invitacion(text, text, text) from public, anon;
grant execute on function barberia.usar_invitacion(text, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Actualizar crear_organizacion para también crear membresía
-- ---------------------------------------------------------------------------
create or replace function barberia.crear_organizacion(
  p_nombre text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = barberia, pg_temp
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  -- Solo master puede crear orgs directamente (sin invitación)
  if not barberia.is_master() then
    raise exception 'Se requiere un código de invitación';
  end if;

  if p_nombre is null or length(trim(p_nombre)) = 0 then
    raise exception 'Nombre requerido';
  end if;

  if p_slug is null or length(trim(p_slug)) = 0 then
    raise exception 'Slug requerido';
  end if;

  insert into barberia.organizaciones (nombre, slug)
  values (trim(p_nombre), trim(p_slug))
  returning id into v_org_id;

  insert into barberia.profiles (id, nombre, rol, organizacion_id)
  values (auth.uid(), coalesce((select raw_user_meta_data->>'nombre' from auth.users where id = auth.uid()), split_part((select email from auth.users where id = auth.uid()), '@', 1)), 'admin', v_org_id)
  on conflict (id) do update set organizacion_id = v_org_id, rol = 'admin', activo = true;

  insert into barberia.membresias (user_id, organizacion_id, rol)
  values (auth.uid(), v_org_id, 'admin')
  on conflict (user_id, organizacion_id) do nothing;

  -- Seed inicial
  insert into barberia.barberos (nombre, color, telefono, activo, comision_pct, organizacion_id) values
    ('Carlos Ruiz', '#8b5cf6', '300 111 2233', true, 50, v_org_id),
    ('Andrés Peña', '#06b6d4', '301 444 5566', true, 50, v_org_id),
    ('Diego Mora', '#ec4899', '302 777 8899', true, 50, v_org_id);

  insert into barberia.servicios (nombre, precio, duracion, activo, organizacion_id) values
    ('Corte clásico', 25000, 30, true, v_org_id),
    ('Corte + barba', 35000, 50, true, v_org_id),
    ('Perfilado de barba', 15000, 20, true, v_org_id),
    ('Diseño de cejas', 10000, 15, true, v_org_id),
    ('Corte niños', 20000, 25, true, v_org_id);

  insert into barberia.productos (nombre, precio, stock, activo, categoria, organizacion_id) values
    ('Pomada mate', 22000, 14, true, 'Peinado', v_org_id),
    ('Cera de barba', 18000, 8, true, 'Barba', v_org_id),
    ('Shampoo de menta', 16000, 20, true, 'Lavado', v_org_id),
    ('Aceite de barba', 28000, 5, true, 'Barba', v_org_id),
    ('Gel fijador', 12000, 3, true, 'Peinado', v_org_id);

  return v_org_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) Verificación
-- ---------------------------------------------------------------------------
-- select * from barberia.invitaciones;
-- select barberia.generar_invitacion(30);
-- select barberia.usar_invitacion('INV-XXXX-XXXX', 'Mi Barberia', 'mi-barberia');
