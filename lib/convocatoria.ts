import type { Cronograma, CronogramaEtapa, CronogramaGrupo, DocumentoOficial } from '@/types/convocatoria'

// ─── Cronograma ─────────────────────────────────────────────────────────
// La columna JSONB puede contener tres formas históricas:
//   []                       → filas previas a la migración PSEP
//   [{etapa, fecha_ini,...}] → array plano del scraper viejo
//   {grupos: [...]}          → formato canónico del extractor PSEP
// Esta función las unifica; devuelve null si no hay nada que mostrar.

export function normalizeCronograma(value: unknown): Cronograma | null {
  if (!value || typeof value !== 'object') return null

  if (Array.isArray(value)) {
    const etapas = value.map(toEtapa).filter((e): e is CronogramaEtapa => e !== null)
    return etapas.length ? { grupos: [{ nombre: 'Cronograma', etapas }] } : null
  }

  const obj = value as Record<string, unknown>
  if (!Array.isArray(obj.grupos)) return null

  const grupos: CronogramaGrupo[] = []
  for (const g of obj.grupos) {
    if (!g || typeof g !== 'object') continue
    const grupo = g as Record<string, unknown>
    const nombre = typeof grupo.nombre === 'string' ? grupo.nombre : ''
    const etapas = Array.isArray(grupo.etapas)
      ? grupo.etapas.map(toEtapa).filter((e): e is CronogramaEtapa => e !== null)
      : []
    if (nombre && etapas.length) grupos.push({ nombre, etapas })
  }

  if (grupos.length === 0) return null

  return {
    calculadoAl: typeof obj.calculadoAl === 'string' ? obj.calculadoAl : null,
    totalEtapas: typeof obj.totalEtapas === 'number' ? obj.totalEtapas : null,
    totalSemanas: typeof obj.totalSemanas === 'number' ? obj.totalSemanas : null,
    grupos,
  }
}

function toEtapa(raw: unknown): CronogramaEtapa | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null)

  // El formato plano viejo usa `etapa` y snake_case en las fechas
  const actividad = str(e.actividad) ?? str(e.etapa)
  if (!actividad) return null

  const semana = e.semana as Record<string, unknown> | null | undefined
  const semanaValida =
    semana && typeof semana === 'object' &&
    typeof semana.desde === 'number' && typeof semana.hasta === 'number'

  return {
    actividad,
    fechaTexto: str(e.fechaTexto) ?? str(e.fecha_texto),
    fechaIni: str(e.fechaIni) ?? str(e.fecha_ini),
    fechaFin: str(e.fechaFin) ?? str(e.fecha_fin),
    responsable: str(e.responsable),
    estado: str(e.estado),
    semana: semanaValida ? { desde: semana.desde as number, hasta: semana.hasta as number } : null,
  }
}

export const ESTADO_ETAPA_CLS: Record<string, string> = {
  completado: 'bg-green-100 text-green-700',
  'en curso': 'bg-amber-100 text-amber-700',
  en_curso: 'bg-amber-100 text-amber-700',
  pendiente: 'bg-gray-100 text-gray-500',
}

// ─── Requisitos agrupados ───────────────────────────────────────────────
// Solo el extractor PSEP guarda en `requerimientos` los mismos requisitos
// agrupados por categoría: se detecta comparando el aplanado contra `requisitos`
// para no cambiar cómo se ven las filas del scraper viejo.

const REQ_LABELS: Record<string, string> = {
  experiencia: 'Experiencia',
  formacion_academica: 'Formación académica',
  cursos_especializacion: 'Cursos y especialización',
  conocimientos: 'Conocimientos',
  habilidades: 'Habilidades',
}

export interface GrupoRequisitos {
  label: string
  items: string[]
}

export function gruposDeRequisitos(
  requerimientos: Record<string, unknown> | null | undefined,
  requisitos: string[] | null | undefined
): GrupoRequisitos[] {
  if (!requerimientos) return []

  const grupos = Object.entries(requerimientos)
    .map(([key, value]) => ({
      label: REQ_LABELS[key] ?? capitalizar(key.replace(/_/g, ' ')),
      items: Array.isArray(value)
        ? value.filter((v): v is string => typeof v === 'string' && v.length > 0)
        : [],
    }))
    .filter(g => g.items.length > 0)

  const planos = grupos.flatMap(g => g.items)
  const coincide =
    planos.length > 0 &&
    planos.length === (requisitos?.length ?? 0) &&
    planos[0] === requisitos?.[0]

  return coincide ? grupos : []
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Documentos oficiales ───────────────────────────────────────────────

export function documentosOficialesVisibles(docs: DocumentoOficial[] | null | undefined): DocumentoOficial[] {
  return (docs ?? []).filter(d => d.disponible && !!d.url)
}

export function etiquetaDocumento(doc: DocumentoOficial): string {
  if (doc.etiqueta) return doc.etiqueta
  // "BasesConcurso" → "Bases Concurso"
  return doc.tipo.replace(/([a-zá-ú])([A-ZÁ-Ú])/g, '$1 $2')
}

// ─── Ventana de postulación ─────────────────────────────────────────────
// Equivale al `avisoVentana` del extractor: se deriva, no se guarda.

export function postulacionAunNoAbre(fechaInicio: string | null | undefined): boolean {
  if (!fechaInicio) return false
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return new Date(fechaInicio + 'T00:00:00').getTime() > hoy.getTime()
}
