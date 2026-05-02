-- ============================================================
-- CONVOCAPE — Schema completo
-- Ejecutar UNA sola vez en Supabase SQL Editor
-- ============================================================


-- ─── 1. ENTIDADES ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS entidades (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_oficial TEXT        UNIQUE NOT NULL,
  sinonimos      TEXT[]      DEFAULT '{}'::TEXT[],
  validada       BOOLEAN     DEFAULT FALSE,
  dominio_email  TEXT        -- Ej: 'minedu.gob.pe'
);

CREATE INDEX IF NOT EXISTS idx_entidades_nombre_oficial
  ON entidades (nombre_oficial);


-- ─── 2. PERFILES (vinculado a Supabase Auth) ─────────────────

CREATE TABLE IF NOT EXISTS perfiles (
  id         UUID  PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rol        TEXT  DEFAULT 'ciudadano',
  entidad_id UUID  REFERENCES entidades(id) ON DELETE SET NULL
);

-- Trigger: crea perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  email_domain TEXT;
BEGIN
  email_domain := split_part(NEW.email, '@', 2);

  INSERT INTO public.perfiles (id, rol)
  VALUES (
    NEW.id,
    CASE
      WHEN email_domain IN (
        SELECT dominio_email FROM entidades WHERE dominio_email IS NOT NULL
      ) THEN 'entidad_pendiente'
      ELSE 'ciudadano'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ─── 3. CONVOCATORIAS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS convocatorias (
  id               BIGSERIAL   PRIMARY KEY,
  entidad_id       UUID        REFERENCES entidades(id) ON DELETE SET NULL,
  titulo           TEXT        NOT NULL,
  slug             TEXT        UNIQUE NOT NULL,
  ubicacion        TEXT        NOT NULL,
  sueldo           NUMERIC     NOT NULL,
  fecha_pub        DATE        NOT NULL,
  fecha_limite     DATE        NOT NULL,
  tipo_contrato    TEXT        NOT NULL,
  nivel            TEXT[]      NOT NULL DEFAULT '{}',
  descripcion      TEXT,
  requisitos       TEXT[]      DEFAULT '{}',
  req_preview      TEXT[]      DEFAULT '{}',
  funciones        TEXT[]      DEFAULT '{}',
  documentos       TEXT[]      DEFAULT '{}',
  requerimientos   JSONB,
  modalidad        TEXT        DEFAULT 'Presencial',
  estado           TEXT        DEFAULT 'activa',
  link_oficial     TEXT,
  nro_convocatoria TEXT,
  numero_folio     TEXT
);

-- Índice único para deduplicar por folio (ignora nulos/vacíos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_convocatorias_numero_folio_unique
  ON convocatorias (numero_folio)
  WHERE numero_folio IS NOT NULL AND numero_folio != '';

-- Índices de rendimiento para los filtros más usados
CREATE INDEX IF NOT EXISTS idx_convocatorias_estado       ON convocatorias (estado);
CREATE INDEX IF NOT EXISTS idx_convocatorias_fecha_limite ON convocatorias (fecha_limite);
CREATE INDEX IF NOT EXISTS idx_convocatorias_entidad_id   ON convocatorias (entidad_id);
CREATE INDEX IF NOT EXISTS idx_convocatorias_slug         ON convocatorias (slug);


-- ─── 4. GUARDADOS (favoritos del ciudadano) ──────────────────

CREATE TABLE IF NOT EXISTS guardados (
  id               BIGSERIAL   PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  convocatoria_id  BIGINT      NOT NULL REFERENCES convocatorias(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, convocatoria_id)
);


-- ─── 5. ROW LEVEL SECURITY (RLS) ─────────────────────────────

ALTER TABLE entidades     ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE convocatorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardados     ENABLE ROW LEVEL SECURITY;

-- Entidades: lectura pública
CREATE POLICY "entidades_select_public"
  ON entidades FOR SELECT USING (true);

-- Perfiles: cada usuario ve y edita solo el suyo
CREATE POLICY "perfiles_select_own"
  ON perfiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "perfiles_update_own"
  ON perfiles FOR UPDATE USING (auth.uid() = id);

-- Convocatorias: lectura pública
CREATE POLICY "convocatorias_select_public"
  ON convocatorias FOR SELECT USING (true);

-- Convocatorias: solo entidad_verificada puede insertar/actualizar las suyas
CREATE POLICY "convocatorias_insert_entity"
  ON convocatorias FOR INSERT
  WITH CHECK (
    entidad_id = (
      SELECT entidad_id FROM perfiles
      WHERE id = auth.uid() AND rol = 'entidad_verificada'
    )
  );

CREATE POLICY "convocatorias_update_entity"
  ON convocatorias FOR UPDATE
  USING (
    entidad_id = (
      SELECT entidad_id FROM perfiles
      WHERE id = auth.uid() AND rol = 'entidad_verificada'
    )
  );

-- Guardados: cada usuario gestiona solo los suyos
CREATE POLICY "guardados_all_own"
  ON guardados FOR ALL USING (auth.uid() = user_id);
