-- ============================================================================
-- Barbería El Corte — 0011: Fix multiple permissive policies
-- Requiere 0001..0010.
-- Cambia policies FOR ALL por INSERT/UPDATE/DELETE separadas para evitar
-- múltiples policies permissivas en SELECT.
-- ============================================================================

-- barberos
drop policy if exists barberos_write on barberia.barberos;
create policy barberos_insert on barberia.barberos for insert to authenticated
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());
create policy barberos_update on barberia.barberos for update to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin())
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());
create policy barberos_delete on barberia.barberos for delete to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin());

-- servicios
drop policy if exists servicios_write on barberia.servicios;
create policy servicios_insert on barberia.servicios for insert to authenticated
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());
create policy servicios_update on barberia.servicios for update to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin())
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());
create policy servicios_delete on barberia.servicios for delete to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin());

-- productos
drop policy if exists productos_write on barberia.productos;
create policy productos_insert on barberia.productos for insert to authenticated
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());
create policy productos_update on barberia.productos for update to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin())
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());
create policy productos_delete on barberia.productos for delete to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin());

-- cierres_caja
drop policy if exists cierres_write on barberia.cierres_caja;
create policy cierres_insert on barberia.cierres_caja for insert to authenticated
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());
create policy cierres_update on barberia.cierres_caja for update to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin())
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());
create policy cierres_delete on barberia.cierres_caja for delete to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin());

-- gastos
drop policy if exists gastos_write on barberia.gastos;
create policy gastos_insert on barberia.gastos for insert to authenticated
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());
create policy gastos_update on barberia.gastos for update to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin())
  with check (organizacion_id = barberia.current_org_id() and barberia.is_admin());
create policy gastos_delete on barberia.gastos for delete to authenticated
  using (organizacion_id = barberia.current_org_id() and barberia.is_admin());

-- organizaciones
drop policy if exists orgs_write on barberia.organizaciones;
create policy orgs_update on barberia.organizaciones for update to authenticated
  using (id = barberia.current_org_id() and barberia.is_admin())
  with check (id = barberia.current_org_id() and barberia.is_admin());

-- Verificación
-- select tablename, policyname, cmd from pg_policies where schemaname = 'barberia' order by tablename, cmd;
