-- ============================================================================
-- Barbería El Corte — 0006: Multi-org por usuario (membresías)
-- Requiere 0005.
-- Permite que un usuario pertenezca a varias organizaciones (con rol por org).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tabla de membresías
-- ---------------------------------------------------------------------------
create table if not exists barberia.membresias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organizacion_id uuid not null references barberia.organizaciones(id) on delete cascade,
  rol text not null default 'barbero' check (rol in ('admin', 'barbero')),
  creado_en timestamptz not null default now(),
  unique (user_id, organizacion_id)
);

create index if not exists membresias_user_idx on barberia.membresias (user_id);
create index if not exists membresias_org_idx  on barberia.membresias (organizacion_id);

grant select, insert, update, delete on barberia.membresias to authenticated;
grant all on barberia.membresias to service_role;

alter table barberia.membresias enable row level security;

-- Un usuario ve sus propias membresías
drop policy if exists membresias_select on barberia.membresias;
create policy membresias_select on barberia.membresias
  for select to authenticated
  using (user_id = auth.uid());

-- Solo admins de la org pueden agregar miembros
drop policy if exists membresias_insert on barberia.membresias;
create policy membresias_insert on barberia.membresias
  for insert to authenticated
  with check (
    barberia.is_admin()
    and organizacion_id = barberia.current_org_id()
  );

drop policy if exists membresias_delete on barberia.membresias;
create policy membresias_delete on barberia.membresias
  for delete to authenticated
  using (
    barberia.is_admin()
    and organizacion_id = barberia.current_org_id()
  );

-- ---------------------------------------------------------------------------
-- 2) Función para cambiar la org activa del usuario
-- ---------------------------------------------------------------------------
create or replace function barberia.cambiar_org_activa(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = barberia, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  -- Verificar que el usuario sea miembro de la org
  if not exists (
    select 1 from barberia.membresias
    where user_id = auth.uid() and organizacion_id = p_org_id
  ) and not exists (
    select 1 from barberia.profiles
    where id = auth.uid() and organizacion_id = p_org_id
  ) then
    raise exception 'No eres miembro de esta organizacion';
  end if;

  update barberia.profiles
  set organizacion_id = p_org_id,
      rol = coalesce((select m.rol from barberia.membresias m where m.user_id = auth.uid() and m.organizacion_id = p_org_id), rol)
  where id = auth.uid();
end;
$$;

revoke all on function barberia.cambiar_org_activa(uuid) from public, anon;
grant execute on function barberia.cambiar_org_activa(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Sincronizar membresías con profiles existentes (backfill)
-- ---------------------------------------------------------------------------
insert into barberia.membresias (user_id, organizacion_id, rol)
select p.id, p.organizacion_id, p.rol
from barberia.profiles p
where p.organizacion_id is not null
on conflict (user_id, organizacion_id) do nothing;

-- ---------------------------------------------------------------------------
-- 4) RPC pública para resolver org por slug (para subdominios, sin auth)
-- ---------------------------------------------------------------------------
create or replace function barberia.get_org_by_slug(p_slug text)
returns table (id uuid, nombre text, slug text)
language sql stable security definer
set search_path = barberia, pg_temp
as $$
  select o.id, o.nombre, o.slug
  from barberia.organizaciones o
  where o.slug = p_slug and o.activo
$$;

revoke all on function barberia.get_org_by_slug(text) from public, anon;
grant execute on function barberia.get_org_by_slug(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Verificación
-- ---------------------------------------------------------------------------
-- select * from barberia.membresias;
-- select barberia.cambiar_org_activa('00000000-0000-0000-0000-000000000001');
