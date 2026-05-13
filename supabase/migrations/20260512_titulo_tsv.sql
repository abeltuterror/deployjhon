-- Full-text search en español sobre el campo titulo
ALTER TABLE convocatorias
  ADD COLUMN IF NOT EXISTS titulo_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('spanish', titulo)) STORED;

CREATE INDEX IF NOT EXISTS idx_convocatorias_titulo_tsv
  ON convocatorias USING GIN(titulo_tsv);
