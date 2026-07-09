-- Migración: soporte de filtro y búsqueda para los campos PSEP
-- Fecha: 2026-07-09
-- Requiere: 20260708_psep_campos.sql aplicada antes.

-- Índice para el filtro "Postulación abierta"
-- (WHERE fecha_inicio_postulacion IS NULL OR fecha_inicio_postulacion <= hoy)
CREATE INDEX IF NOT EXISTS idx_convocatorias_fecha_inicio_post
  ON convocatorias (fecha_inicio_postulacion);

-- La búsqueda ahora indexa también la dependencia (unidad) del PSEP,
-- para que "juzgado civil de chulucanas" encuentre la plaza.
CREATE OR REPLACE FUNCTION trg_update_search_text()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_text_unaccent = lower(unaccent(
    coalesce(NEW.titulo, '') || ' ' || coalesce(NEW.unidad, '')
  ));
  RETURN NEW;
END;
$$;

-- Repoblar las filas existentes con el nuevo texto de búsqueda
UPDATE convocatorias
SET search_text_unaccent = lower(unaccent(
  coalesce(titulo, '') || ' ' || coalesce(unidad, '')
));

-- Fija el search_path de la función (aviso del linter 0011). Se mantiene
-- `public` porque la función usa unaccent(), instalada en ese schema.
ALTER FUNCTION public.trg_update_search_text() SET search_path = public;
