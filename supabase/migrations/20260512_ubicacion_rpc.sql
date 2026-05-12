-- Migración: función RPC para conteos de ubicación
-- Fecha: 2026-05-12

CREATE OR REPLACE FUNCTION get_ubicacion_counts()
RETURNS TABLE(provincia TEXT, ciudad TEXT, total BIGINT)
LANGUAGE sql STABLE AS $$
  SELECT
    split_part(ubicacion, ' - ', 1) AS provincia,
    split_part(ubicacion, ' - ', 2) AS ciudad,
    COUNT(*) AS total
  FROM convocatorias
  WHERE estado = 'activa'
  GROUP BY provincia, ciudad
  ORDER BY total DESC;
$$;
