CREATE OR REPLACE FUNCTION get_ubicacion_counts(
  p_q text DEFAULT NULL
)
RETURNS TABLE(provincia TEXT, ciudad TEXT, total BIGINT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    split_part(c.ubicacion, ' - ', 1) AS provincia,
    split_part(c.ubicacion, ' - ', 2) AS ciudad,
    COUNT(*)::bigint AS total
  FROM convocatorias c
  WHERE c.estado = 'activa'
    AND (p_q IS NULL OR c.titulo_tsv @@ websearch_to_tsquery('spanish', p_q))
  GROUP BY provincia, ciudad
  ORDER BY total DESC;
END;
$$;
