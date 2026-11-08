-- ============================================================================
-- Barbería El Corte — 0003: venta atómica (RPC) + ajustes de borrado
-- Requiere 0001 y 0002.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Borrados que no deben fallar por llaves foráneas
--    (el frontend permite eliminar productos, servicios y clientes)
-- ---------------------------------------------------------------------------
alter table barberia.ventas      drop constraint if exists ventas_cliente_id_fkey;
alter table barberia.ventas      add  constraint ventas_cliente_id_fkey
  foreign key (cliente_id) references barberia.clientes(id) on delete set null;

alter table barberia.ventas      drop constraint if exists ventas_barbero_id_fkey;
alter table barberia.ventas      add  constraint ventas_barbero_id_fkey
  foreign key (barbero_id) references barberia.barberos(id) on delete set null;

alter table barberia.citas       drop constraint if exists citas_servicio_id_fkey;
alter table barberia.citas       add  constraint citas_servicio_id_fkey
  foreign key (servicio_id) references barberia.servicios(id) on delete set null;

alter table barberia.citas       drop constraint if exists citas_barbero_id_fkey;
alter table barberia.citas       add  constraint citas_barbero_id_fkey
  foreign key (barbero_id) references barberia.barberos(id) on delete set null;

alter table barberia.venta_items drop constraint if exists venta_items_producto_id_fkey;
alter table barberia.venta_items add  constraint venta_items_producto_id_fkey
  foreign key (producto_id) references barberia.productos(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 2) Venta atómica: valida stock, crea venta, crea items y descuenta stock.
--    El trigger de 0001/0002 hace el descuento; si algo falla, todo rollback.
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
begin
  if not barberia.is_staff() then
    raise exception 'No autorizado';
  end if;

  if p_metodo not in ('efectivo', 'nequi', 'transferencia') then
    raise exception 'Método de pago inválido: %', p_metodo;
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

  -- Validar items y calcular total con el precio actual de la BD
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_producto_id := (v_item->>'producto_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::int;

    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'Cantidad inválida para producto %', v_producto_id;
    end if;

    select precio, stock into v_precio, v_stock
    from barberia.productos
    where id = v_producto_id and activo;

    if not found then
      raise exception 'Producto no encontrado o inactivo: %', v_producto_id;
    end if;

    if v_stock < v_cantidad then
      raise exception 'Stock insuficiente para producto %', v_producto_id;
    end if;

    v_total := v_total + v_precio * v_cantidad;
  end loop;

  insert into barberia.ventas (total, metodo, cliente_id, barbero_id, cita_id)
  values (v_total, p_metodo, p_cliente_id, p_barbero_id, p_cita_id)
  returning id into v_venta_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_producto_id := (v_item->>'producto_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::int;

    select precio into v_precio
    from barberia.productos
    where id = v_producto_id;

    insert into barberia.venta_items (venta_id, producto_id, cantidad, precio_unitario)
    values (v_venta_id, v_producto_id, v_cantidad, v_precio);
  end loop;

  return v_venta_id;
end;
$$;

revoke all on function barberia.crear_venta(jsonb, text, uuid, uuid, uuid) from public, anon;
grant execute on function barberia.crear_venta(jsonb, text, uuid, uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Verificación
-- ---------------------------------------------------------------------------
-- select barberia.crear_venta(
--   '[{"producto_id":"33333333-3333-3333-3333-333333333301","cantidad":1}]'::jsonb,
--   'efectivo'
-- );
