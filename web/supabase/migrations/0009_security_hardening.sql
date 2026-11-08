-- ============================================================================
-- Barbería El Corte — 0009: Hardening de funciones SECURITY DEFINER
-- Requiere 0001..0008.
-- Revoca EXECUTE en helpers internos para anon y authenticated.
-- Los RPCs públicos (crear_venta, crear_organizacion, etc.) mantienen EXECUTE.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Helpers internos: revocar EXECUTE de anon y authenticated
--    (solo se usan dentro de RLS/policies y triggers, no son API pública)
-- ---------------------------------------------------------------------------
revoke execute on function barberia.current_org_id() from public, anon, authenticated;
revoke execute on function barberia.current_rol() from public, anon, authenticated;
revoke execute on function barberia.current_barbero_id() from public, anon, authenticated;
revoke execute on function barberia.is_admin() from public, anon, authenticated;
revoke execute on function barberia.is_staff() from public, anon, authenticated;
revoke execute on function barberia.is_master() from public, anon, authenticated;
revoke execute on function barberia.owns_cita(uuid) from public, anon, authenticated;
revoke execute on function barberia.puede_vender(uuid) from public, anon, authenticated;

-- Triggers (no deberían ser llamables vía RPC)
revoke execute on function barberia.decrement_stock_on_sale() from public, anon, authenticated;
revoke execute on function barberia.increment_stock_on_purchase() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) RPCs públicos: mantener EXECUTE para authenticated (y anon solo get_org_by_slug)
-- ---------------------------------------------------------------------------
-- crear_venta: authenticated + service_role (ya configurado, reafirmar)
revoke all on function barberia.crear_venta(jsonb, text, uuid, uuid, uuid) from public, anon;
grant execute on function barberia.crear_venta(jsonb, text, uuid, uuid, uuid) to authenticated, service_role;

-- crear_organizacion: authenticated + service_role
revoke all on function barberia.crear_organizacion(text, text) from public, anon;
grant execute on function barberia.crear_organizacion(text, text) to authenticated, service_role;

-- usar_invitacion: authenticated + service_role
revoke all on function barberia.usar_invitacion(text, text, text) from public, anon;
grant execute on function barberia.usar_invitacion(text, text, text) to authenticated, service_role;

-- generar_invitacion: authenticated + service_role (master check inside)
revoke all on function barberia.generar_invitacion(int) from public, anon;
grant execute on function barberia.generar_invitacion(int) to authenticated, service_role;

-- cambiar_org_activa: authenticated + service_role
revoke all on function barberia.cambiar_org_activa(uuid) from public, anon;
grant execute on function barberia.cambiar_org_activa(uuid) to authenticated, service_role;

-- get_org_by_slug: anon + authenticated (necesario para subdominios públicos)
revoke all on function barberia.get_org_by_slug(text) from public;
grant execute on function barberia.get_org_by_slug(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Verificación
-- ---------------------------------------------------------------------------
-- select routine_name, routine_schema from information_schema.routines
--   where routine_schema = 'barberia' and routine_type = 'FUNCTION';
-- select has_function_privilege('anon', 'barberia.is_master()', 'execute');  -- debe ser false
-- select has_function_privilege('authenticated', 'barberia.crear_venta(jsonb,text,uuid,uuid,uuid)', 'execute');  -- true
