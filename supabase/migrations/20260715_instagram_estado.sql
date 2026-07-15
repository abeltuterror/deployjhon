-- Cola de aprobación para publicar convocatorias en Instagram.
-- Solo las convocatorias del Poder Judicial (PSEP) nuevas entran como 'pendiente';
-- un admin las aprueba (→ 'publicada') o descarta (→ 'omitida') desde el panel.
-- NULL = nunca entró a la cola (la gran mayoría, no-PSEP).

ALTER TABLE convocatorias
  ADD COLUMN IF NOT EXISTS ig_estado       TEXT,          -- NULL | 'pendiente' | 'publicada' | 'omitida'
  ADD COLUMN IF NOT EXISTS ig_media_id     TEXT,          -- id del post en Instagram (al publicar)
  ADD COLUMN IF NOT EXISTS ig_publicada_at TIMESTAMPTZ;   -- cuándo se publicó

-- Índice parcial: acelera "dame las pendientes" sin pesar sobre el resto de filas
CREATE INDEX IF NOT EXISTS idx_convocatorias_ig_pendiente
  ON convocatorias (fecha_pub DESC)
  WHERE ig_estado = 'pendiente';
