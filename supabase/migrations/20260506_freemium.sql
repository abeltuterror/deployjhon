-- ═══════════════════════════════════════════════════════════════
-- Migración: Modelo Freemium — Convocape
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Campos en perfiles ──────────────────────────────────────────
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS premium_hasta  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_numero TEXT,
  ADD COLUMN IF NOT EXISTS trial_usado    BOOLEAN DEFAULT FALSE;

-- 2. Estado del proceso de postulación ──────────────────────────
-- Si la tabla postulaciones no tiene estado, agrégarlo
ALTER TABLE postulaciones
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'postulando'
  CHECK (estado IN ('postulando', 'evaluacion', 'descartado'));

-- 3. Helper: saber si un usuario tiene premium activo ───────────
CREATE OR REPLACE FUNCTION es_premium(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(premium_hasta > NOW(), FALSE)
  FROM perfiles WHERE id = uid;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 4. RLS: solo el dueño puede leer/editar su propio perfil ──────
-- (esto puede que ya exista; usar OR REPLACE no aplica a políticas,
--  así que ejecutar solo si no existen)
-- ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "own_profile" ON perfiles FOR ALL USING (auth.uid() = id);
