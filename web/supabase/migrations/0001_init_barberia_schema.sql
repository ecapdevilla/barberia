-- Barbería El Corte - schema aislado en proyecto existente (droguería)
-- Pegar en Supabase Dashboard > SQL Editor del proyecto actual.
-- NO toca public ni tablas de la droguería.

create schema if not exists barberia;

-- Permisos base
grant usage on schema barberia to anon, authenticated, service_role;

-- Tablas
create table if not exists barberia.barberos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  color text,
  telefono text,
  activo boolean not null default true
);

create table if not exists barberia.servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  precio int not null check (precio >= 0),
  duracion int not null check (duracion > 0),
  activo boolean not null default true
);

create table if not exists barberia.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  precio int not null check (precio >= 0),
  stock int not null default 0 check (stock >= 0),
  activo boolean not null default true,
  categoria text
);

create table if not exists barberia.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null unique,
  notas text default ''
);

create table if not exists barberia.citas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references barberia.clientes(id) on delete cascade,
  barbero_id uuid references barberia.barberos(id),
  servicio_id uuid references barberia.servicios(id),
  fecha date not null,
  hora text not null,
  hora_fin text not null,
  estado text not null check (estado in ('pendiente','confirmada','atendida','no_show','cancelada'))
);

create table if not exists barberia.pagos (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid references barberia.citas(id) on delete cascade,
  monto int not null check (monto >= 0),
  metodo text not null,
  fecha timestamptz not null default now()
);

create table if not exists barberia.ventas (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  total int not null check (total >= 0),
  metodo text not null,
  cliente_id uuid references barberia.clientes(id),
  barbero_id uuid references barberia.barberos(id),
  cita_id uuid references barberia.citas(id) on delete set null
);

create table if not exists barberia.venta_items (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid references barberia.ventas(id) on delete cascade,
  producto_id uuid references barberia.productos(id),
  cantidad int not null check (cantidad > 0),
  precio_unitario int not null check (precio_unitario >= 0)
);

create table if not exists barberia.cierres_caja (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  total_efe bigint not null default 0,
  total_digital bigint not null default 0,
  total_esperado bigint not null default 0,
  diferencia bigint not null default 0,
  notas text default '',
  cerrado_en timestamptz not null default now()
);

-- Anti-choque (frontend hasOverlap + backend): ej. índice para detectar solapamiento por barbero/fecha
-- Se refuerza con constraint de aplicación o vista; deja índice para rendimiento:
create index if not exists citas_barbero_fecha_idx on barberia.citas (barbero_id, fecha);

-- Decrementar stock al vender (con control de stock negativo)
create or replace function barberia.decrement_stock_on_sale()
returns trigger as $$
begin
  update barberia.productos
  set stock = stock - new.cantidad
  where id = new.producto_id and stock >= new.cantidad;
  if not found then
    raise exception 'Stock insuficiente para producto %', new.producto_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists venta_item_decrement_stock on barberia.venta_items;

create trigger venta_item_decrement_stock
  after insert on barberia.venta_items
  for each row execute function barberia.decrement_stock_on_sale();

-- RLS (activar por tabla; políticas de admin se agregan en 0002)
alter table barberia.barberos enable row level security;
alter table barberia.servicios enable row level security;
alter table barberia.productos enable row level security;
alter table barberia.clientes enable row level security;
alter table barberia.citas enable row level security;
alter table barberia.pagos enable row level security;
alter table barberia.ventas enable row level security;
alter table barberia.venta_items enable row level security;
alter table barberia.cierres_caja enable row level security;

-- Permisos de datos (RLS decidirá acceso; grant de uso de tablas)
grant all on all tables in schema barberia to anon, authenticated, service_role;
grant all on all sequences in schema barberia to anon, authenticated, service_role;

-- Seed inicial (copia de src/lib/seed.ts)
-- IDs fijos en formato UUID para poder re-ejecutar sin duplicar.
insert into barberia.barberos (id, nombre, color, telefono, activo) values
  ('11111111-1111-1111-1111-111111111101','Carlos Ruiz','#8b5cf6','300 111 2233',true),
  ('11111111-1111-1111-1111-111111111102','Andrés Peña','#06b6d4','301 444 5566',true),
  ('11111111-1111-1111-1111-111111111103','Diego Mora','#ec4899','302 777 8899',true)
on conflict (id) do nothing;

insert into barberia.servicios (id, nombre, precio, duracion, activo) values
  ('22222222-2222-2222-2222-222222222201','Corte clásico',25000,30,true),
  ('22222222-2222-2222-2222-222222222202','Corte + barba',35000,50,true),
  ('22222222-2222-2222-2222-222222222203','Perfilado de barba',15000,20,true),
  ('22222222-2222-2222-2222-222222222204','Diseño de cejas',10000,15,true),
  ('22222222-2222-2222-2222-222222222205','Corte niños',20000,25,true)
on conflict (id) do nothing;

insert into barberia.productos (id, nombre, precio, stock, activo, categoria) values
  ('33333333-3333-3333-3333-333333333301','Pomada mate',22000,14,true,'Peinado'),
  ('33333333-3333-3333-3333-333333333302','Cera de barba',18000,8,true,'Barba'),
  ('33333333-3333-3333-3333-333333333303','Shampoo de menta',16000,20,true,'Lavado'),
  ('33333333-3333-3333-3333-333333333304','Aceite de barba',28000,5,true,'Barba'),
  ('33333333-3333-3333-3333-333333333305','Gel fijador',12000,3,true,'Peinado')
on conflict (id) do nothing;

insert into barberia.clientes (id, nombre, telefono, notas) values
  ('44444444-4444-4444-4444-444444444401','Juan Pérez','310 555 1234','Prefiere degradado bajo'),
  ('44444444-4444-4444-4444-444444444402','Mateo Gómez','320 444 5566',''),
  ('44444444-4444-4444-4444-444444444403','Sofía Ramírez','315 333 7788','Corte femenino'),
  ('44444444-4444-4444-4444-444444444404','Andrés López','312 666 9900',''),
  ('44444444-4444-4444-4444-444444444405','Camilo Torres','318 111 2233','Alérgico a loción con alcohol')
on conflict (telefono) do nothing;
