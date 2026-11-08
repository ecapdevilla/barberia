-- ============================================================================
-- Barbería El Corte — 0005: Multi-tenancy (organizaciones / SaaS)
-- Requiere 0001..0004.
-- Idempotente: usa if not exists / create or replace / drop policy if exists.
-- MIGRACIÓN DE DATOS: crea una org "Default" y asigna todos los registros
-- existentes a ella. Ejecutar en staging antes de producción.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tabla de organizaciones (tenants)
-- ---------------------------------------------------------------------------
create table if not exists barberia.organizaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text unique not null,
  logo_url text,
  telefono text,
  direccion text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

grant select, insert, update, delete on barberia.organizaciones to authenticated;
grant all on barberia.organizaciones to service_role;

alter table barberia.organizaciones enable row level security;

-- ---------------------------------------------------------------------------
-- 2) Agregar organizacion_id a todas las tablas de datos (nullable primero)
-- ---------------------------------------------------------------------------
alter table barberia.barberos      add column if not exists organizacion_id uuid references barberia.organizaciones(id);
alter table barberia.servicios     add column if not exists organizacion_id uuid references barberia.organizaciones(id);
alter table barberia.productos     add column if not exists organizacion_id uuid references barberia.organizaciones(id);
alter table barberia.clientes      add column if not exists organizacion_id uuid references barberia.organizaciones(id);
alter table barberia.citas         add column if not exists organizacion_id uuid references barberia.organizaciones(id);
alter table barberia.pagos         add column if not exists organizacion_id uuid references barberia.organizaciones(id);
alter table barberia.ventas        add column if not exists organizacion_id uuid references barberia.organizaciones(id);
alter table barberia.venta_items   add column if not exists organizacion_id uuid references barberia.organizaciones(id);
alter table barberia.cierres_caja  add column if not exists organizacion_id uuid references barberia.organizaciones(id);
alter table barberia.gastos        add column if not exists organizacion_id uuid references barberia.organizaciones(id);
alter table barberia.profiles      add column if not exists organizacion_id uuid references barberia.organizaciones(id);

-- Default: auto-fill organizacion_id from the logged-in user's profile
alter table barberia.barberos      alter column organizacion_id set default barberia.current_org_id();
alter table barberia.servicios     alter column organizacion_id set default barberia.current_org_id();
alter table barberia.productos     alter column organizacion_id set default barberia.current_org_id();
alter table barberia.clientes      alter column organizacion_id set default barberia.current_org_id();
alter table barberia.citas         alter column organizacion_id set default barberia.current_org_id();
alter table barberia.pagos         alter column organizacion_id set default barberia.current_org_id();
alter table barberia.ventas        alter column organizacion_id set default barberia.current_org_id();
alter table barberia.venta_items   alter column organizacion_id set default barberia.current_org_id();
alter table barberia.cierres_caja  alter column organizacion_id set default barberia.current_org_id();
alter table barberia.gastos        alter column organizacion_id set default barberia.current_org_id();

-- ---------------------------------------------------------------------------
-- 3) Migración de datos: crear org "Default" y asignar registros huérfanos
-- ---------------------------------------------------------------------------
insert into barberia.organizaciones (id, nombre, slug)
values ('00000000-0000-0000-0000-000000000001', 'Organización Default', 'default')
on conflict (id) do nothing;

update barberia.barberos      set organizacion_id = '00000000-0000-0000-0000-000000000001' where organizacion_id is null;
update barberia.servicios     set organizacion_id = '00000000-0000-0000-0000-000000000001' where organizacion_id is null;
update barberia.productos     set organizacion_id = '00000000-0000-0000-0000-000000000001' where organizacion_id is null;
update barberia.clientes      set organizacion_id = '00000000-0000-0000-0000-000000000001' where organizacion_id is null;
update barberia.citas         set organizacion_id = '00000000-0000-0000-0000-000000000001' where organizacion_id is null;
update barberia.pagos         set organizacion_id = '00000000-0000-0000-0000-000000000001' where organizacion_id is null;
update barberia.ventas        set organizacion_id = '00000000-0000-0000-0000-000000000001' where organizacion_id is null;
update barberia.venta_items   set organizacion_id = '00000000-0000-0000-0000-000000000001' where organizacion_id is null;
update barberia.cierres_caja  set organizacion_id = '00000000-0000-0000-0000-000000000001' where organizacion_id is null;
update barberia.gastos        set organizacion_id = '00000000-0000-0000-0000-000000000001' where organizacion_id is null;
update barberia.profiles      set organizacion_id = '00000000-0000-0000-0000-000000000001' where organizacion_id is null;

-- ---------------------------------------------------------------------------
-- 4) Hacer organizacion_id NOT NULL (después de migrar datos)
-- ---------------------------------------------------------------------------
alter table barberia.barberos      alter column organizacion_id set not null;
alter table barberia.servicios     alter column organizacion_id set not null;
alter table barberia.productos     alter column organizacion_id set not null;
alter table barberia.clientes      alter column organizacion_id set not null;
alter table barberia.citas         alter column organizacion_id set not null;
alter table barberia.pagos         alter column organizacion_id set not null;
alter table barberia.ventas        alter column organizacion_id set not null;
alter table barberia.venta_items   alter column organizacion_id set not null;
alter table barberia.cierres_caja  alter column organizacion_id set not null;
alter table barberia.gastos        alter column organizacion_id set not null;
alter table barberia.profiles      alter column organizacion_id set not null;

-- ---------------------------------------------------------------------------
-- 5) Índices para performance (filtrado por tenant)
-- ---------------------------------------------------------------------------
create index if not exists barberos_org_idx      on barberia.barberos (organizacion_id);
create index if not exists servicios_org_idx    on barberia.servicios (organizacion_id);
create index if not exists productos_org_idx    on barberia.productos (organizacion_id);
create index if not exists clientes_org_idx     on barberia.clientes (organizacion_id);
create index if not exists citas_org_idx        on barberia.citas (organizacion_id);
create index if not exists pagos_org_idx        on barberia.pagos (organizacion_id);
create index if not exists ventas_org_idx       on barberia.ventas (organizacion_id);
create index if not exists venta_items_org_idx  on barberia.venta_items (organizacion_id);
create index if not exists cierres_org_idx      on barberia.cierres_caja (organizacion_id);
create index if not exists gastos_org_idx       on barberia.gastos (organizacion_id);
create index if not exists profiles_org_idx     on barberia.profiles (organizacion_id);

-- ---------------------------------------------------------------------------
-- 6) Helpers RLS actualizados (tenant-aware)
-- ---------------------------------------------------------------------------
create or replace function barberia.current_org_id()
returns uuid
language sql stable security definer
set search_path = barberia, pg_temp
as $$
  select p.organizacion_id
  from barberia.profiles p
  where p.id = auth.uid() and p.activo
$$;

-- Reescribir is_staff / is_admin para que sean por org (sin cambios de firma)
create or replace function barberia.is_staff()
returns boolean
language sql stable security definer
set search_path = barberia, pg_temp
as $$
  select exists (
    select 1 from barberia.profiles p
    where p.id = auth.uid() and p.activo
      and p.organizacion_id = barberia.current_org_id()
  )
$$;

create or replace function barberia.is_admin()
returns boolean
language sql stable security definer
set search_path = barberia, pg_temp
as $$
  select coalesce(barberia.current_rol() = 'admin', false)
$$;

-- ---------------------------------------------------------------------------
-- 7) Reescribir TODAS las policies con filtro por organizacion_id
-- ---------------------------------------------------------------------------

-- organizaciones
drop policy if exists orgs_select on barberia.organizaciones;
create policy orgs_select on barberia.organizaciones
  for select to authenticated
  using (id = barberia.current_org_id());

drop policy if exists orgs_write on barberia.organizaciones;
create policy orgs_write on barberia.organizaciones
  for update to authenticated
  using (id = barberia.current_org_id() and barberia.is_admin())
  with check (id = barberia.current_org_id() and barberia.is_admin());

-- profiles
drop policy if exists profiles_select on barberia.profiles;
create policy profiles_select on barberia.profiles
  for select to authenticated
  using (id = auth.uid() or (organizacion_id = barberia.current_org_id() and barberia.is_admin()));

drop policy if exists profiles_insert on barberia.profiles;
create policy profiles_insert on barberia.profiles
  for insert to authenticated
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());

drop policy if exists profiles_update on barberia.profiles;
create policy profiles_update on barberia.profiles
  for update to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin())
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());

drop policy if exists profiles_delete on barberia.profiles;
create policy profiles_delete on barberia.profiles
  for delete to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin());

-- barberos
drop policy if exists barberos_select on barberia.barberos;
create policy barberos_select on barberia.barberos
  for select to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_staff());

drop policy if exists barberos_write on barberia.barberos;
create policy barberos_write on barberia.barberos
  for all to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin())
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());

-- servicios
drop policy if exists servicios_select on barberia.servicios;
create policy servicios_select on barberia.servicios
  for select to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_staff());

drop policy if exists servicios_write on barberia.servicios;
create policy servicios_write on barberia.servicios
  for all to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin())
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());

-- productos
drop policy if exists productos_select on barberia.productos;
create policy productos_select on barberia.productos
  for select to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_staff());

drop policy if exists productos_write on barberia.productos;
create policy productos_write on barberia.productos
  for all to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin())
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());

-- clientes
drop policy if exists clientes_select on barberia.clientes;
create policy clientes_select on barberia.clientes
  for select to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_staff());

drop policy if exists clientes_insert on barberia.clientes;
create policy clientes_insert on barberia.clientes
  for insert to authenticated
  with check (organizacion_id = barberia.current_org_id() and barberia.is_staff());

drop policy if exists clientes_update on barberia.clientes;
create policy clientes_update on barberia.clientes
  for update to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_staff())
  with check (organizacion_id = barberia.current_org_id() and barberia.is_staff());

drop policy if exists clientes_delete on barberia.clientes;
create policy clientes_delete on barberia.clientes
  for delete to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin());

-- citas
drop policy if exists citas_select on barberia.citas;
create policy citas_select on barberia.citas
  for select to authenticated
  using (organizacion_id = barberia.current_org_id() and (barberia.is_admin() or barbero_id = barberia.current_barbero_id()));

drop policy if exists citas_insert on barberia.citas;
create policy citas_insert on barberia.citas
  for insert to authenticated
  with check (organizacion_id = barberia.current_org_id() and (barberia.is_admin() or barbero_id = barberia.current_barbero_id()));

drop policy if exists citas_update on barberia.citas;
create policy citas_update on barberia.citas
  for update to authenticated
  using (organizacion_id = barberia.current_org_id() and (barberia.is_admin() or barbero_id = barberia.current_barbero_id()))
  with check (organizacion_id = barberia.current_org_id() and (barberia.is_admin() or barbero_id = barberia.current_barbero_id()));

drop policy if exists citas_delete on barberia.citas;
create policy citas_delete on barberia.citas
  for delete to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin());

-- pagos
drop policy if exists pagos_select on barberia.pagos;
create policy pagos_select on barberia.pagos
  for select to authenticated
  using (organizacion_id = barberia.current_org_id() and (barberia.is_admin() or barberia.owns_cita(cita_id)));

drop policy if exists pagos_insert on barberia.pagos;
create policy pagos_insert on barberia.pagos
  for insert to authenticated
  with check (organizacion_id = barberia.current_org_id() and (barberia.is_admin() or barberia.owns_cita(cita_id)));

drop policy if exists pagos_update on barberia.pagos;
create policy pagos_update on barberia.pagos
  for update to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin())
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());

drop policy if exists pagos_delete on barberia.pagos;
create policy pagos_delete on barberia.pagos
  for delete to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin());

-- ventas
drop policy if exists ventas_select on barberia.ventas;
create policy ventas_select on barberia.ventas
  for select to authenticated
  using (organizacion_id = barberia.current_org_id() and (barberia.is_admin() or barbero_id = barberia.current_barbero_id() or barbero_id is null));

drop policy if exists ventas_insert on barberia.ventas;
create policy ventas_insert on barberia.ventas
  for insert to authenticated
  with check (organizacion_id = barberia.current_org_id() and (barberia.is_admin() or barbero_id = barberia.current_barbero_id() or barbero_id is null));

drop policy if exists ventas_update on barberia.ventas;
create policy ventas_update on barberia.ventas
  for update to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin())
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());

drop policy if exists ventas_delete on barberia.ventas;
create policy ventas_delete on barberia.ventas
  for delete to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin());

-- venta_items
drop policy if exists venta_items_select on barberia.venta_items;
create policy venta_items_select on barberia.venta_items
  for select to authenticated
  using (organizacion_id = barberia.current_org_id() and (barberia.is_admin() or barberia.puede_vender(venta_id)));

drop policy if exists venta_items_insert on barberia.venta_items;
create policy venta_items_insert on barberia.venta_items
  for insert to authenticated
  with check (organizacion_id = barberia.current_org_id() and (barberia.is_admin() or barberia.puede_vender(venta_id)));

drop policy if exists venta_items_update on barberia.venta_items;
create policy venta_items_update on barberia.venta_items
  for update to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin())
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());

drop policy if exists venta_items_delete on barberia.venta_items;
create policy venta_items_delete on barberia.venta_items
  for delete to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin());

-- cierres_caja
drop policy if exists cierres_select on barberia.cierres_caja;
create policy cierres_select on barberia.cierres_caja
  for select to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin());

drop policy if exists cierres_write on barberia.cierres_caja;
create policy cierres_write on barberia.cierres_caja
  for all to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin())
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());

-- gastos
drop policy if exists gastos_select on barberia.gastos;
create policy gastos_select on barberia.gastos
  for select to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_staff());

drop policy if exists gastos_write on barberia.gastos;
create policy gastos_write on barberia.gastos
  for all to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin())
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());

-- ---------------------------------------------------------------------------
-- 8) RPC crear_venta actualizada (tenant-aware)
-- ---------------------------------------------------------------------------
create or replace function barberia.crear_venta(
  p_items jsonb,
  p_metodo text,
  p_cliente_id uuid default null,
  p_barbero_id uuid default null,
  p_cita_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = barberia, pg_temp
as $$
declare
  v_venta_id uuid;
  v_total int := 0;
  v_item jsonb;
  v_producto_id uuid;
  v_cantidad int;
  v_precio int;
  v_stock int;
  v_org_id uuid;
begin
  if not barberia.is_staff() then
    raise exception 'No autorizado';
  end if;

  v_org_id := barberia.current_org_id();
  if v_org_id is null then
    raise exception 'Sin organizacion';
  end if;

  if p_metodo not in ('efectivo', 'nequi', 'transferencia') then
    raise exception 'Metodo de pago invalido: %', p_metodo;
  end if;

  if p_barbero_id is not null
     and not barberia.is_admin()
     and p_barbero_id <> barberia.current_barbero_id() then
    raise exception 'No autorizado para vender con otro barbero';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene items';
  end if;

  -- Validar items y calcular total con el precio actual de la BD (mismo tenant)
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_producto_id := (v_item->>'producto_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::int;

    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'Cantidad invalida para producto %', v_producto_id;
    end if;

    select precio, stock into v_precio, v_stock
    from barberia.productos
    where id = v_producto_id and activo and organizacion_id = v_org_id;

    if not found then
      raise exception 'Producto no encontrado o inactivo: %', v_producto_id;
    end if;

    if v_stock < v_cantidad then
      raise exception 'Stock insuficiente para producto %', v_producto_id;
    end if;

    v_total := v_total + v_precio * v_cantidad;
  end loop;

  insert into barberia.ventas (total, metodo, cliente_id, barbero_id, cita_id, organizacion_id)
  values (v_total, p_metodo, p_cliente_id, p_barbero_id, p_cita_id, v_org_id)
  returning id into v_venta_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_producto_id := (v_item->>'producto_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::int;

    select precio into v_precio
    from barberia.productos
    where id = v_producto_id and organizacion_id = v_org_id;

    insert into barberia.venta_items (venta_id, producto_id, cantidad, precio_unitario, organizacion_id)
    values (v_venta_id, v_producto_id, v_cantidad, v_precio, v_org_id);
  end loop;

  return v_venta_id;
end;
$$;

revoke all on function barberia.crear_venta(jsonb, text, uuid, uuid, uuid) from public, anon;
grant execute on function barberia.crear_venta(jsonb, text, uuid, uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9) Triggers de stock tenant-aware
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
  where id = new.producto_id and stock >= new.cantidad
    and organizacion_id = new.organizacion_id;
  if not found then
    raise exception 'Stock insuficiente para producto %', new.producto_id;
  end if;
  return new;
end;
$$;

create or replace function barberia.increment_stock_on_purchase()
returns trigger
language plpgsql
security definer
set search_path = barberia, pg_temp
as $$
begin
  if new.categoria = 'inventario' and new.producto_id is not null and new.cantidad > 0 then
    update barberia.productos
    set stock = stock + new.cantidad
    where id = new.producto_id and organizacion_id = new.organizacion_id;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10) RPC para crear organizacion + perfil admin + seed (onboarding)
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

  -- Seed inicial para la nueva org
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

revoke all on function barberia.crear_organizacion(text, text) from public, anon;
grant execute on function barberia.crear_organizacion(text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 11) Permisos de organizaciones para anon (ninguno) y authenticated
-- ---------------------------------------------------------------------------
revoke all on schema barberia from anon;
revoke all on all tables in schema barberia from anon;

grant usage on schema barberia to authenticated;
grant select, insert, update on barberia.organizaciones to authenticated;

-- ---------------------------------------------------------------------------
-- 12) Verificación
-- ---------------------------------------------------------------------------
-- select * from barberia.organizaciones;
-- select organizacion_id, count(*) from barberia.barberos group by organizacion_id;
