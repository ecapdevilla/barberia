-- ============================================================================
-- Barbería El Corte — 0008: origen de la cita (manual vs online)
-- Requiere 0001..0007.
-- Permite distinguir citas creadas por el equipo vs reservas online.
-- ============================================================================
alter table barberia.citas
  add column if not exists origen text not null default 'manual'
  check (origen in ('manual', 'online'));

create index if not exists citas_origen_idx on barberia.citas (origen);

-- RLS ya cubre citas; no se necesitan policies nuevas.
-- Verificación:
-- select origen, count(*) from barberia.citas group by origen;
