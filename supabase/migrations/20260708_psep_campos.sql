-- Migración: campos adicionales que aporta el extractor PSEP (Poder Judicial)
-- Fecha: 2026-07-08
--
-- El PSEP publica datos que el contrato original no contempla: la ventana de
-- postulación (en el PJ la publicación y la apertura NO coinciden), la fecha de
-- resultados, el cronograma completo del proceso, los PDFs oficiales y la
-- identificación exacta de la plaza. Todas las columnas son nullables o con
-- default para no afectar a los scrapers existentes.

ALTER TABLE convocatorias
  ADD COLUMN fecha_inicio_postulacion DATE,
  ADD COLUMN fecha_resultados         DATE,
  ADD COLUMN vacantes                 INTEGER DEFAULT 1,
  ADD COLUMN unidad                   TEXT,
  ADD COLUMN codigo_plaza             TEXT,
  ADD COLUMN cronograma               JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN documentos_oficiales     JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN origen                   JSONB;

COMMENT ON COLUMN convocatorias.fecha_inicio_postulacion IS
  'Apertura de la postulación web (PSEP): entre fecha_pub y esta fecha aún no se puede postular';
COMMENT ON COLUMN convocatorias.fecha_resultados IS
  'Publicación de resultados finales según el cronograma del proceso';
COMMENT ON COLUMN convocatorias.vacantes IS
  'Cantidad de vacantes de la plaza';
COMMENT ON COLUMN convocatorias.unidad IS
  'Dependencia exacta de la plaza, ej. "Módulo Penal Central" o "Juzgado Civil de Chulucanas"';
COMMENT ON COLUMN convocatorias.codigo_plaza IS
  'Código de plaza dentro de la convocatoria de origen, ej. "01128"';
COMMENT ON COLUMN convocatorias.cronograma IS
  'Etapas del proceso: [{etapa, fecha_ini, fecha_fin, fecha_texto}]';
COMMENT ON COLUMN convocatorias.documentos_oficiales IS
  'PDFs oficiales de la fuente: [{tipo, etiqueta, url, disponible}]';
COMMENT ON COLUMN convocatorias.origen IS
  'Registro original del extractor, verbatim (fuente de verdad): {fuente, convocatoria, plaza}';
