-- ============================================================================
-- Barbería El Corte — 0010: Performance hardening (auth_rls_initplan)
-- Requiere 0001..0009.
-- Envuelve auth.uid() en (select ...) para evitar re-evaluación por fila.
-- ============================================================================

-- invitaciones_select
drop policy if exists invitaciones_select on barberia.invitaciones;
create policy invitaciones_select on barberia.invitaciones
  for select to authenticated
  using (
    barberia.is_master()
    or creado_por = (select auth.uid())
  );

-- profiles_select
drop policy if exists profiles_select on barberia.profiles;
create policy profiles_select on barberia.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (organizacion_id = barberia.current_org_id() and barberia.is_admin())
  );

-- membresias_select
drop policy if exists membresias_select on barberia.membresias;
create policy membresias_select on barberia.membresias
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Verificación
-- select * from pg_policies where schemaname = 'barberia';
