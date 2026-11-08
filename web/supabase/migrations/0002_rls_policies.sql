-- ============================================================================
-- Barbería El Corte — 0002: Auth, perfiles y RLS (producción)
-- Proyecto Supabase compartido con la droguería: TODO vive en schema barberia.
-- Requiere haber ejecutado 0001_init_barberia_schema.sql.
-- Es re-ejecutable (drop policy / create or replace / if not exists).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Perfiles (1:1 con auth.users, aislado en schema barberia)
--    IMPORTANTE: NO se crea trigger sobre auth.users para no tocar usuarios
--    de la droguería. Los perfiles de barbería se crean explícitamente abajo.
-- ---------------------------------------------------------------------------
create table if not exists barberia.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default '',
  rol text not null default 'barbero' check (rol in ('admin', 'barbero')),
  barbero_id uuid references barberia.barberos(id) on delete set null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

grant select, insert, update, delete on barberia.profiles to authenticated;
grant all on barberia.profiles to service_role;

-- ---------------------------------------------------------------------------
-- 2) Helpers SECURITY DEFINER
--    Evitan recursión de RLS y encapsulan las reglas de rol.
-- ---------------------------------------------------------------------------
create or replace function barberia.current_rol()
returns text
language sql stable security definer
set search_path = barberia, pg_temp
as $$
  select p.rol
  from barberia.profiles p
  where p.id = auth.uid() and p.activo
$$;

create or replace function barberia.current_barbero_id()
returns uuid
language sql stable security definer
set search_path = barberia, pg_temp
as $$
  select p.barbero_id
  from barberia.profiles p
  where p.id = auth.uid() and p.activo
$$;

create or replace function barberia.is_admin()
returns boolean
language sql stable security definer
set search_path = barberia, pg_temp
as $$
  select coalesce(barberia.current_rol() = 'admin', false)
$$;

-- true solo si el usuario logueado tiene perfil activo en barberia.profiles.
-- Esto bloquea automáticamente a los usuarios de la droguería.
create or replace function barberia.is_staff()
returns boolean
language sql stable security definer
set search_path = barberia, pg_temp
as $$
  select exists (
    select 1 from barberia.profiles p
    where p.id = auth.uid() and p.activo
  )
$$;

create or replace function barberia.owns_cita(p_cita_id uuid)
returns boolean
language sql stable security definer
set search_path = barberia, pg_temp
as $$
  select exists (
    select 1 from barberia.citas c
    where c.id = p_cita_id
      and c.barbero_id = barberia.current_barbero_id()
  )
$$;

-- Puede operar sobre una venta: admin, dueño de la venta o venta de mostrador.
create or replace function barberia.puede_vender(p_venta_id uuid)
returns boolean
language sql stable security definer
set search_path = barberia, pg_temp
as $$
  select barberia.is_staff() and exists (
    select 1 from barberia.ventas v
    where v.id = p_venta_id
      and (
        barberia.is_admin()
        or v.barbero_id is null
        or v.barbero_id = barberia.current_barbero_id()
      )
  )
$$;

grant execute on function barberia.current_rol() to authenticated, service_role;
grant execute on function barberia.current_barbero_id() to authenticated, service_role;
grant execute on function barberia.is_admin() to authenticated, service_role;
grant execute on function barberia.is_staff() to authenticated, service_role;
grant execute on function barberia.owns_cita(uuid) to authenticated, service_role;
grant execute on function barberia.puede_vender(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Hardening: sin login no se accede al schema.
--    El frontend debe autenticarse (role authenticated) para leer datos.
-- ---------------------------------------------------------------------------
revoke all on schema barberia from anon;
revoke all on all tables in schema barberia from anon;

grant usage on schema barberia to authenticated;
grant select, insert, update, delete on all tables in schema barberia to authenticated;
grant all on all tables in schema barberia to service_role;

-- ---------------------------------------------------------------------------
-- 4) RLS + políticas
-- ---------------------------------------------------------------------------
alter table barberia.profiles      enable row level security;
alter table barberia.barberos      enable row level security;
alter table barberia.servicios     enable row level security;
alter table barberia.productos     enable row level security;
alter table barberia.clientes      enable row level security;
alter table barberia.citas         enable row level security;
alter table barberia.pagos         enable row level security;
alter table barberia.ventas        enable row level security;
alter table barberia.venta_items   enable row level security;
alter table barberia.cierres_caja  enable row level security;

-- ---------------------------- profiles -------------------------------------
drop policy if exists profiles_select on barberia.profiles;
create policy profiles_select on barberia.profiles
  for select to authenticated
  using (id = auth.uid() or barberia.is_admin());

drop policy if exists profiles_insert on barberia.profiles;
create policy profiles_insert on barberia.profiles
  for insert to authenticated
  with check (barberia.is_admin());

-- Solo admin actualiza roles. Un usuario NO puede auto-promoverse.
drop policy if exists profiles_update on barberia.profiles;
create policy profiles_update on barberia.profiles
  for update to authenticated
  using (barberia.is_admin())
  with check (barberia.is_admin());

drop policy if exists profiles_delete on barberia.profiles;
create policy profiles_delete on barberia.profiles
  for delete to authenticated
  using (barberia.is_admin());

-- ---------------------------- barberos -------------------------------------
drop policy if exists barberos_select on barberia.barberos;
create policy barberos_select on barberia.barberos
  for select to authenticated
  using (barberia.is_staff());

drop policy if exists barberos_write on barberia.barberos;
create policy barberos_write on barberia.barberos
  for all to authenticated
  using (barberia.is_admin())
  with check (barberia.is_admin());

-- ---------------------------- servicios ------------------------------------
drop policy if exists servicios_select on barberia.servicios;
create policy servicios_select on barberia.servicios
  for select to authenticated
  using (barberia.is_staff());

drop policy if exists servicios_write on barberia.servicios;
create policy servicios_write on barberia.servicios
  for all to authenticated
  using (barberia.is_admin())
  with check (barberia.is_admin());

-- ---------------------------- productos ------------------------------------
drop policy if exists productos_select on barberia.productos;
create policy productos_select on barberia.productos
  for select to authenticated
  using (barberia.is_staff());

drop policy if exists productos_write on barberia.productos;
create policy productos_write on barberia.productos
  for all to authenticated
  using (barberia.is_admin())
  with check (barberia.is_admin());

-- ---------------------------- clientes -------------------------------------
drop policy if exists clientes_select on barberia.clientes;
create policy clientes_select on barberia.clientes
  for select to authenticated
  using (barberia.is_staff());

drop policy if exists clientes_insert on barberia.clientes;
create policy clientes_insert on barberia.clientes
  for insert to authenticated
  with check (barberia.is_staff());

drop policy if exists clientes_update on barberia.clientes;
create policy clientes_update on barberia.clientes
  for update to authenticated
  using (barberia.is_staff())
  with check (barberia.is_staff());

drop policy if exists clientes_delete on barberia.clientes;
create policy clientes_delete on barberia.clientes
  for delete to authenticated
  using (barberia.is_admin());

-- ---------------------------- citas ----------------------------------------
-- Admin ve todo. Barbero solo sus propias citas.
drop policy if exists citas_select on barberia.citas;
create policy citas_select on barberia.citas
  for select to authenticated
  using (
    barberia.is_admin()
    or barbero_id = barberia.current_barbero_id()
  );

drop policy if exists citas_insert on barberia.citas;
create policy citas_insert on barberia.citas
  for insert to authenticated
  with check (
    barberia.is_admin()
    or barbero_id = barberia.current_barbero_id()
  );

drop policy if exists citas_update on barberia.citas;
create policy citas_update on barberia.citas
  for update to authenticated
  using (
    barberia.is_admin()
    or barbero_id = barberia.current_barbero_id()
  )
  with check (
    barberia.is_admin()
    or barbero_id = barberia.current_barbero_id()
  );

drop policy if exists citas_delete on barberia.citas;
create policy citas_delete on barberia.citas
  for delete to authenticated
  using (barberia.is_admin());

-- ---------------------------- pagos ----------------------------------------
drop policy if exists pagos_select on barberia.pagos;
create policy pagos_select on barberia.pagos
  for select to authenticated
  using (barberia.is_admin() or barberia.owns_cita(cita_id));

drop policy if exists pagos_insert on barberia.pagos;
create policy pagos_insert on barberia.pagos
  for insert to authenticated
  with check (barberia.is_admin() or barberia.owns_cita(cita_id));

drop policy if exists pagos_update on barberia.pagos;
create policy pagos_update on barberia.pagos
  for update to authenticated
  using (barberia.is_admin())
  with check (barberia.is_admin());

drop policy if exists pagos_delete on barberia.pagos;
create policy pagos_delete on barberia.pagos
  for delete to authenticated
  using (barberia.is_admin());

-- ---------------------------- ventas ---------------------------------------
drop policy if exists ventas_select on barberia.ventas;
create policy ventas_select on barberia.ventas
  for select to authenticated
  using (
    barberia.is_admin()
    or barbero_id = barberia.current_barbero_id()
    or barbero_id is null
  );

drop policy if exists ventas_insert on barberia.ventas;
create policy ventas_insert on barberia.ventas
  for insert to authenticated
  with check (
    barberia.is_admin()
    or barbero_id = barberia.current_barbero_id()
    or barbero_id is null
  );

drop policy if exists ventas_update on barberia.ventas;
create policy ventas_update on barberia.ventas
  for update to authenticated
  using (barberia.is_admin())
  with check (barberia.is_admin());

drop policy if exists ventas_delete on barberia.ventas;
create policy ventas_delete on barberia.ventas
  for delete to authenticated
  using (barberia.is_admin());

-- ---------------------------- venta_items ----------------------------------
drop policy if exists venta_items_select on barberia.venta_items;
create policy venta_items_select on barberia.venta_items
  for select to authenticated
  using (barberia.is_admin() or barberia.puede_vender(venta_id));

drop policy if exists venta_items_insert on barberia.venta_items;
create policy venta_items_insert on barberia.venta_items
  for insert to authenticated
  with check (barberia.is_admin() or barberia.puede_vender(venta_id));

drop policy if exists venta_items_update on barberia.venta_items;
create policy venta_items_update on barberia.venta_items
  for update to authenticated
  using (barberia.is_admin())
  with check (barberia.is_admin());

drop policy if exists venta_items_delete on barberia.venta_items;
create policy venta_items_delete on barberia.venta_items
  for delete to authenticated
  using (barberia.is_admin());

-- ---------------------------- cierres_caja ---------------------------------
drop policy if exists cierres_select on barberia.cierres_caja;
create policy cierres_select on barberia.cierres_caja
  for select to authenticated
  using (barberia.is_admin());

drop policy if exists cierres_write on barberia.cierres_caja;
create policy cierres_write on barberia.cierres_caja
  for all to authenticated
  using (barberia.is_admin())
  with check (barberia.is_admin());

-- ---------------------------------------------------------------------------
-- 5) Fix para bases ya creadas con 0001: trigger de stock SECURITY DEFINER
-- ---------------------------------------------------------------------------
create or replace function barberia.decrement_stock_on_sale()
returns trigger
language plpgsql
security definer
set search_path = barberia, pg_temp
as $$
begin
  update barberia.productos
  set stock = stock - new.cantidad
  where id = new.producto_id and stock >= new.cantidad;
  if not found then
    raise exception 'Stock insuficiente para producto %', new.producto_id;
  end if;
  return new;
end;
$$;

drop trigger if exists venta_item_decrement_stock on barberia.venta_items;
create trigger venta_item_decrement_stock
  after insert on barberia.venta_items
  for each row execute function barberia.decrement_stock_on_sale();

-- ---------------------------------------------------------------------------
-- 6) BOOTSTRAP — ejecutar aparte, con correos reales
--    (corre como postgres en el SQL Editor, por eso puede escribir profiles)
-- ---------------------------------------------------------------------------
-- 6.1 Crear/actualizar el perfil ADMIN del dueño:
--   insert into barberia.profiles (id, nombre, rol)
--   select u.id,
--          coalesce(u.raw_user_meta_data->>'nombre', split_part(u.email, '@', 1)),
--          'admin'
--   from auth.users u
--   where u.email = 'TU_CORREO@EJEMPLO.COM'
--   on conflict (id) do update set rol = 'admin', activo = true;
--
-- 6.2 Vincular un barbero a su usuario de Auth:
--   insert into barberia.profiles (id, nombre, rol, barbero_id)
--   select u.id, 'Carlos Ruiz', 'barbero',
--          (select id from barberia.barberos where nombre = 'Carlos Ruiz')
--   from auth.users u
--   where u.email = 'CARLOS@EJEMPLO.COM'
--   on conflict (id) do update
--     set rol = 'barbero',
--         barbero_id = excluded.barbero_id,
--         activo = true;
--
-- 6.3 Verificación rápida:
--   select p.nombre, p.rol, b.nombre as barbero
--   from barberia.profiles p
--   left join barberia.barberos b on b.id = p.barbero_id;
