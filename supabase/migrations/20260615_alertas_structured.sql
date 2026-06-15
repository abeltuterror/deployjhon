-- Migración: Crear tabla alertas estructuradas
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS alertas (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  carrera       TEXT,
  sueldo_min    NUMERIC,
  departamento  TEXT,
  texto         TEXT, -- columna legacy, se mantiene por compatibilidad
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alertas_own" ON alertas
  FOR ALL USING (auth.uid() = user_id);
