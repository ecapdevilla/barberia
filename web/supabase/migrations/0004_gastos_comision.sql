-- ============================================================================
-- Barbería El Corte — 0004: comisión por barbero + módulo de gastos/compras
-- Requiere 0001, 0002, 0003.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Comisión por barbero (porcentaje 0..100)
-- ---------------------------------------------------------------------------
alter table barberia.barberos
  add column if not exists comision_pct int not null default 50 check (comision_pct between 0 and 100);

-- ---------------------------------------------------------------------------
-- 2) Tabla de gastos / compras
-- ---------------------------------------------------------------------------
create table if not exists barberia.gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  concepto text not null,
  categoria text not null check (categoria in ('operativo', 'inventario', 'liquidacion', 'otro')),
  monto int not null check (monto >= 0),
  barbero_id uuid references barberia.barberos(id) on delete set null,
  producto_id uuid references barberia.productos(id) on delete set null,
  cantidad int not null default 0 check (cantidad >= 0),
  notas text default '',
  creado_en timestamptz not null default now()
);

create index if not exists gastos_fecha_idx on barberia.gastos (fecha);
create index if not exists gastos_categoria_idx on barberia.gastos (categoria);

-- ---------------------------------------------------------------------------
-- 3) Permisos y RLS
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on barberia.gastos to authenticated;
grant all on barberia.gastos to service_role;

alter table barberia.gastos enable row level security;

drop policy if exists gastos_select on barberia.gastos;
create policy gastos_select on barberia.gastos
  for select to authenticated
  using (barberia.is_staff());

drop policy if exists gastos_write on barberia.gastos;
create policy gastos_write on barberia.gastos
  for all to authenticated
  using (barberia.is_admin())
  with check (barberia.is_admin());

-- ---------------------------------------------------------------------------
-- 4) Trigger: si el gasto es de inventario, incrementa el stock del producto
-- ---------------------------------------------------------------------------
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
    where id = new.producto_id;
  end if;
  return new;
end;
$$;

drop trigger if exists gasto_increment_stock on barberia.gastos;
create trigger gasto_increment_stock
  after insert on barberia.gastos
  for each row execute function barberia.increment_stock_on_purchase();

-- ---------------------------------------------------------------------------
-- 5) Verificación
-- ---------------------------------------------------------------------------
-- select column_name, data_type from information_schema.columns
--   where table_schema='barberia' and table_name='barberos' and column_name='comision_pct';
-- select * from barberia.gastos limit 5;
