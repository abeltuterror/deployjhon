-- Migración: agregar campo indexable a convocatorias
-- Fecha: 2026-05-11

-- 1. Crear columna (las existentes quedan en TRUE por defecto)
ALTER TABLE convocatorias
ADD COLUMN indexable BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Recalcular las existentes con los criterios del normalizador
UPDATE convocatorias SET indexable = (
  descripcion IS NOT NULL AND
  length(descripcion) > 50 AND
  array_length(requisitos, 1) >= 2 AND
  sueldo > 0 AND
  NOT (requisitos::text ILIKE '%según bases que serán publicadas en el portal institucional%')
);

-- 3. Índice para acelerar la query del sitemap
CREATE INDEX idx_convocatorias_sitemap
ON convocatorias (indexable, estado, fecha_limite, fecha_pub DESC)
WHERE indexable = TRUE AND estado = 'activa';
