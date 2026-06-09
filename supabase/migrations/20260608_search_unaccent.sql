CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Columna regular (no generada) — evita el error de inmutabilidad con unaccent
ALTER TABLE convocatorias
  ADD COLUMN IF NOT EXISTS search_text_unaccent TEXT;

-- Poblar todas las filas existentes
UPDATE convocatorias
SET search_text_unaccent = lower(unaccent(
  coalesce(titulo, '') || ' ' ||
  array_to_string(coalesce(requisitos, '{}'::text[]), ' ') || ' ' ||
  coalesce(descripcion, '') || ' ' ||
  coalesce(ubicacion, '')
));

-- Índice GIN trigrama para búsqueda parcial rápida
CREATE INDEX IF NOT EXISTS idx_convocatorias_search_text_trgm
  ON convocatorias USING GIN (search_text_unaccent gin_trgm_ops);

-- Trigger: mantiene la columna sincronizada en cada INSERT o UPDATE
CREATE OR REPLACE FUNCTION trg_update_search_text()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_text_unaccent = lower(unaccent(
    coalesce(NEW.titulo, '') || ' ' ||
    array_to_string(coalesce(NEW.requisitos, '{}'::text[]), ' ') || ' ' ||
    coalesce(NEW.descripcion, '') || ' ' ||
    coalesce(NEW.ubicacion, '')
  ));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_convocatorias_search_text
  BEFORE INSERT OR UPDATE ON convocatorias
  FOR EACH ROW EXECUTE FUNCTION trg_update_search_text();

-- RPC get_ubicacion_counts actualizada
CREATE OR REPLACE FUNCTION get_ubicacion_counts(p_q text DEFAULT NULL)
RETURNS TABLE(provincia TEXT, ciudad TEXT, total BIGINT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    split_part(c.ubicacion, ' - ', 1),
    split_part(c.ubicacion, ' - ', 2),
    COUNT(*)::bigint
  FROM convocatorias c
  WHERE c.estado = 'activa'
    AND (
      nullif(trim(p_q), '') IS NULL
      OR c.search_text_unaccent ILIKE '%' || lower(unaccent(trim(p_q))) || '%'
    )
  GROUP BY 1, 2
  ORDER BY 3 DESC;
END;
$$;
