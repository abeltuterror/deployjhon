-- Habilitar pg_cron (solo una vez)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job: corre todos los días a medianoche en Lima (UTC-5 => 05:00 UTC)
SELECT cron.schedule(
  'inactivar-convocatorias-vencidas',
  '0 5 * * *',
  $$
    UPDATE convocatorias
    SET estado = 'inactiva'
    WHERE estado = 'activa'
      AND fecha_limite < (now() AT TIME ZONE 'America/Lima')::date;
  $$
);
