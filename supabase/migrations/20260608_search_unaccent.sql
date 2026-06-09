CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Wrapper IMMUTABLE necesario para usar unaccent en columnas generadas e índices
CREATE OR REPLACE FUNCTION f_unaccent(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$ SELECT public.unaccent('public.unaccent', $1) $$;

-- Columna generada: concatena campos relevantes normalizados
-- (entidad viene de JOIN, no es columna directa; requisitos es TEXT[])
ALTER TABLE convocatorias
  ADD COLUMN IF NOT EXISTS search_text_unaccent TEXT
  GENERATED ALWAYS AS (
    lower(f_unaccent(
      coalesce(titulo, '')       || ' ' ||
      array_to_string(coalesce(requisitos, '{}'::text[]), ' ') || ' ' ||
      coalesce(descripcion, '')  || ' ' ||
      coalesce(ubicacion, '')
    ))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_convocatorias_search_text_trgm
  ON convocatorias USING GIN (search_text_unaccent gin_trgm_ops);

-- Actualizar RPC get_ubicacion_counts para usar el mismo criterio
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
      OR c.search_text_unaccent ILIKE '%' || lower(f_unaccent(trim(p_q))) || '%'
    )
  GROUP BY 1, 2
  ORDER BY 3 DESC;
END;
$$;
