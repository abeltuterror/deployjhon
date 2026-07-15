import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import type { Cronograma, DocumentoOficial } from '@/types/convocatoria'
import { normalizarTexto, rangoFechas, msToISO, hoyLima } from '@/lib/fechas-anuncio'
import { instagramConfigurado } from '@/lib/instagram'

// ─── Zod Schema ────────────────────────────────────────────────────────

const convocatoriaScraperSchema = z.object({
  id: z.number().int(),
  titulo: z.string().min(1),
  entidad: z.string().min(1),
  ubicacion: z.string().min(1),
  sueldo: z.number().nonnegative(),
  fechaPub: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaLimite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nroConvocatoria: z.string().optional().default(''),
  tipoContrato: z.string().min(1),
  numero_folio: z.string().optional().default(''),
  nivel: z.array(z.string()).default([]),
  descripcion: z.string().default(''),
  requisitos: z.array(z.string()).default([]),
  requerimientos: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.null()])).default({}),
  funciones: z.array(z.string()).default([]),
  documentos: z.array(z.string()).default([]),
  linkOficial: z.string().default(''),
  modalidad: z.string().default('Presencial'),
  indexable: z.boolean().default(true),
  // Campos del extractor PSEP (Poder Judicial) — opcionales, retrocompatibles
  fechaInicioPostulacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  fechaResultados: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  vacantes: z.number().int().positive().default(1),
  unidad: z.string().default(''),
  codigoPlaza: z.string().default(''),
  cronograma: z
    .array(
      z.object({
        etapa: z.string(),
        fecha_ini: z.string().nullable().default(null),
        fecha_fin: z.string().nullable().default(null),
        fecha_texto: z.string().nullable().default(null),
      })
    )
    .default([]),
  documentosOficiales: z
    .array(
      z.object({
        tipo: z.string(),
        etiqueta: z.string().default(''),
        url: z.string(),
        disponible: z.boolean().default(true),
      })
    )
    .default([]),
  // Registro original del extractor, verbatim — fuente de verdad del scraper.
  // Se guarda íntegro en la columna JSONB `origen` sin transformar.
  origen: z.unknown().optional(),
})

const MAX_ITEMS = 5000

// ─── Zod Schema PSEP (estructura anidada del nuevo extractor) ──────────
// Se distingue del formato plano por la presencia de la clave `cabecera`.

const psepEtapaSchema = z.object({
  actividad: z.string().min(1),
  fechaTexto: z.string().nullable().default(null),
  fechaIni: z.string().nullable().default(null),
  fechaFin: z.string().nullable().default(null),
  responsable: z.string().nullable().default(null),
  estado: z.string().nullable().default(null),
  semana: z.object({ desde: z.number().int(), hasta: z.number().int() }).nullable().default(null),
})

const convocatoriaPsepSchema = z.object({
  slug: z.string().min(1),
  cabecera: z.object({
    badges: z.array(z.string()).default([]),
    titulo: z.string().min(1),
    entidad: z.string().min(1),
    nroConvocatoria: z.string().default(''),
    codigoPlaza: z.string().default(''),
  }),
  resumen: z.object({
    ubicacion: z.string().min(1),
    sueldo: z.number().nonnegative(),
    contrato: z.string().min(1),
    dependencia: z.string().default(''),
    publicacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    fechaLimite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    vacantes: z.number().int().positive().default(1),
    resultados: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
    inicioPostulacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  }),
  // avisoVentana no se persiste: se deriva de inicioPostulacion/fechaLimite al renderizar
  avisoVentana: z.unknown().optional(),
  descripcion: z.string().default(''),
  requisitos: z.record(z.string(), z.array(z.string())).default({}),
  funciones: z.array(z.string()).default([]),
  cronograma: z
    .object({
      calculadoAl: z.string().nullable().default(null),
      totalEtapas: z.number().int().nullable().default(null),
      totalSemanas: z.number().int().nullable().default(null),
      grupos: z
        .array(
          z.object({
            nombre: z.string().min(1),
            etapas: z.array(psepEtapaSchema).default([]),
          })
        )
        .default([]),
    })
    .nullable()
    .default(null),
  documentosOficiales: z
    .array(
      z.object({
        tipo: z.string(),
        etiqueta: z.string().default(''),
        url: z.string(),
        disponible: z.boolean().default(true),
      })
    )
    .default([]),
  acciones: z
    .object({
      postular: z.string().default(''),
      verMas: z.string().default(''),
    })
    .nullable()
    .default(null),
  // Si el extractor los envía explícitos, tienen prioridad sobre lo derivado de badges
  nivel: z.array(z.string()).optional(),
  modalidad: z.string().optional(),
  indexable: z.boolean().default(true),
})

// ─── Badges → nivel / modalidad ────────────────────────────────────────
// Los badges mezclan contrato, sueldo, modalidad y nivel; se extraen por listas conocidas.

const MODALIDADES_CONOCIDAS = ['Presencial', 'Híbrida', 'Remota']
const NIVELES_CONOCIDOS = [
  'Universitario', 'Técnico', 'Bachiller', 'Titulado', 'Egresado',
  'Secundaria', 'Primaria', 'Maestría', 'Doctorado',
]

function normalizeText(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function deriveBadges(badges: string[]): { nivel: string[]; modalidad: string } {
  const set = badges.map(normalizeText)
  const modalidad = MODALIDADES_CONOCIDAS.find(m => set.includes(normalizeText(m))) ?? 'Presencial'
  const nivel = NIVELES_CONOCIDOS.filter(n => set.includes(normalizeText(n)))
  return { nivel, modalidad }
}

// ─── Slug ──────────────────────────────────────────────────────────────

function generateSlug(titulo: string, suffix: string): string {
  const base = titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)

  const slugSuffix = suffix.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return `${base}-${slugSuffix}`
}

// ─── Entity Resolution ─────────────────────────────────────────────────

async function resolveEntity(
  supabase: ReturnType<typeof createAdminClient>,
  entidadNombre: string
): Promise<number | null> {
  const nombre = entidadNombre.trim()

  const { data: exactMatch } = await supabase
    .from('entidades')
    .select('id')
    .ilike('nombre_oficial', nombre)
    .limit(1)
    .maybeSingle()

  if (exactMatch) return exactMatch.id

  const { data: synonymMatch } = await supabase
    .from('entidades')
    .select('id')
    .contains('sinonimos', [nombre])
    .limit(1)
    .maybeSingle()

  if (synonymMatch) return synonymMatch.id

  const { data: newEntity, error } = await supabase
    .from('entidades')
    .insert({ nombre_oficial: nombre, sinonimos: [], validada: false })
    .select('id')
    .single()

  if (error) {
    console.error(`Error creando entidad "${nombre}":`, error.message)
    return null
  }

  return newEntity.id
}

// ─── Transformar item → formato DB ─────────────────────────────────────

interface DbConvocatoria {
  // id omitido — BIGSERIAL lo genera la BD automáticamente
  titulo: string
  slug: string
  entidad_id: number | null
  ubicacion: string
  sueldo: number
  fecha_pub: string
  fecha_limite: string
  tipo_contrato: string
  nivel: string[]
  descripcion: string
  requisitos: string[]
  req_preview: string[]
  funciones: string[]
  documentos: string[]
  requerimientos: Record<string, string | string[] | null>
  modalidad: string
  link_oficial: string
  estado: string
  nro_convocatoria: string
  numero_folio: string
  indexable: boolean
  // Campos del extractor PSEP (Poder Judicial)
  fecha_inicio_postulacion: string | null
  fecha_resultados: string | null
  vacantes: number
  unidad: string | null
  codigo_plaza: string | null
  cronograma: Cronograma
  documentos_oficiales: DocumentoOficial[]
  origen: unknown
}

// El formato plano viejo ([{etapa, fecha_ini, ...}]) se normaliza al formato
// canónico con grupos para que la UI maneje una sola estructura
function cronogramaFromLegacy(
  etapas: z.infer<typeof convocatoriaScraperSchema>['cronograma']
): Cronograma {
  if (etapas.length === 0) return { grupos: [] }
  return {
    grupos: [{
      nombre: 'Cronograma',
      etapas: etapas.map(e => ({
        actividad: e.etapa,
        fechaTexto: e.fecha_texto,
        fechaIni: e.fecha_ini,
        fechaFin: e.fecha_fin,
        responsable: null,
        estado: null,
        semana: null,
      })),
    }],
  }
}

// `estado` no es un dato propio: es una función de `fecha_limite`, con la misma
// regla que el cron `inactivar-convocatorias-vencidas`. Derivarlo (en vez de
// fijar 'activa') hace el upsert idempotente: reenviar el mismo datos.json no
// puede resucitar una convocatoria ya vencida.
function estadoPorFecha(fechaLimite: string, hoyISO: string): string {
  return fechaLimite < hoyISO ? 'inactiva' : 'activa'
}

async function transformToDb(
  item: z.infer<typeof convocatoriaScraperSchema>,
  supabase: ReturnType<typeof createAdminClient>,
  hoyISO: string
): Promise<DbConvocatoria> {
  const entidadId = await resolveEntity(supabase, item.entidad)
  const [year, month] = item.fechaPub.split('-')
  const slugSuffix = `${item.entidad}-${item.tipoContrato}-${year}-${month}-${item.numero_folio}`

  return {
    titulo: item.titulo,
    slug: generateSlug(item.titulo, slugSuffix),
    entidad_id: entidadId,
    ubicacion: item.ubicacion,
    sueldo: item.sueldo,
    fecha_pub: item.fechaPub,
    fecha_limite: item.fechaLimite,
    tipo_contrato: item.tipoContrato,
    nivel: item.nivel,
    descripcion: item.descripcion,
    requisitos: item.requisitos,
    req_preview: item.requisitos.slice(0, 3),
    funciones: item.funciones,
    documentos: item.documentos,
    requerimientos: item.requerimientos,
    modalidad: item.modalidad,
    link_oficial: item.linkOficial,
    estado: estadoPorFecha(item.fechaLimite, hoyISO),
    nro_convocatoria: item.nroConvocatoria,
    numero_folio: item.numero_folio,
    indexable: item.indexable,
    fecha_inicio_postulacion: item.fechaInicioPostulacion,
    fecha_resultados: item.fechaResultados,
    vacantes: item.vacantes,
    unidad: item.unidad || null,
    codigo_plaza: item.codigoPlaza || null,
    cronograma: cronogramaFromLegacy(item.cronograma),
    documentos_oficiales: item.documentosOficiales,
    origen: item.origen ?? null,
  }
}

// ─── Transformar item PSEP (anidado) → formato DB ──────────────────────

async function transformPsepToDb(
  item: z.infer<typeof convocatoriaPsepSchema>,
  raw: unknown,
  supabase: ReturnType<typeof createAdminClient>,
  hoyISO: string
): Promise<DbConvocatoria> {
  const entidadId = await resolveEntity(supabase, item.cabecera.entidad)
  const derived = deriveBadges(item.cabecera.badges)
  const requisitosPlanos = Object.values(item.requisitos).flat().filter(Boolean)
  const { nroConvocatoria, codigoPlaza } = item.cabecera

  return {
    titulo: item.cabecera.titulo,
    slug: item.slug,
    entidad_id: entidadId,
    ubicacion: item.resumen.ubicacion,
    sueldo: item.resumen.sueldo,
    fecha_pub: item.resumen.publicacion,
    fecha_limite: item.resumen.fechaLimite,
    tipo_contrato: item.resumen.contrato,
    nivel: item.nivel ?? derived.nivel,
    descripcion: item.descripcion,
    requisitos: requisitosPlanos,
    req_preview: requisitosPlanos.slice(0, 3),
    funciones: item.funciones,
    documentos: [],
    requerimientos: item.requisitos,
    modalidad: item.modalidad ?? derived.modalidad,
    link_oficial: item.acciones?.postular ?? '',
    estado: estadoPorFecha(item.resumen.fechaLimite, hoyISO),
    nro_convocatoria: nroConvocatoria,
    // Folio compuesto solo si ambos existen — el índice único parcial ignora vacíos
    numero_folio: nroConvocatoria && codigoPlaza ? `pj-${nroConvocatoria}-${codigoPlaza}` : '',
    indexable: item.indexable,
    fecha_inicio_postulacion: item.resumen.inicioPostulacion,
    fecha_resultados: item.resumen.resultados,
    vacantes: item.resumen.vacantes,
    unidad: item.resumen.dependencia || null,
    codigo_plaza: codigoPlaza || null,
    cronograma: item.cronograma ?? { grupos: [] },
    documentos_oficiales: item.documentosOficiales,
    origen: raw ?? null,
  }
}

// ─── Integridad de fechas ──────────────────────────────────────────────
// El extractor a veces parsea mal los rangos del PDF y manda fechaPub futura
// (toma el "26" del año "2026" como día). Una fecha de publicación nunca puede
// ser futura: se corrige con la etapa "Aprobación de la Convocatoria" del
// cronograma (el texto escrito manda) o, en su defecto, con la fecha de hoy.

function corregirFechaPub(row: DbConvocatoria, hoyISO: string): DbConvocatoria {
  if (row.fecha_pub <= hoyISO) return row

  const etapas = row.cronograma?.grupos?.flatMap(g => g.etapas) ?? []
  const aprobacion = etapas.find(e => normalizarTexto(e.actividad).includes('aprobacion'))
  const rango = aprobacion
    ? rangoFechas(aprobacion.fechaTexto, aprobacion.fechaIni, aprobacion.fechaFin)
    : null

  const corregida = rango ? msToISO(rango.ini) : hoyISO
  row.fecha_pub = corregida <= hoyISO ? corregida : hoyISO
  return row
}

// ─── POST Handler ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Validar API Key
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '')
  const validApiKey = process.env.API_KEY_SCRAPER

  if (!validApiKey || apiKey !== validApiKey) {
    return NextResponse.json({ error: 'API Key inválida o no configurada' }, { status: 401 })
  }

  // 2. Parsear JSON
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body no es JSON válido' }, { status: 400 })
  }

  // 3. Normalizar a array y clasificar cada item por estructura:
  //    con `cabecera` → formato PSEP (anidado); sin ella → formato plano original
  const normalized = Array.isArray(body) ? body : [body]
  if (normalized.length === 0 || normalized.length > MAX_ITEMS) {
    return NextResponse.json(
      { error: `Se aceptan entre 1 y ${MAX_ITEMS} items por request` },
      { status: 400 }
    )
  }

  type ParsedItem =
    | { kind: 'plano'; data: z.infer<typeof convocatoriaScraperSchema>; raw: unknown }
    | { kind: 'psep'; data: z.infer<typeof convocatoriaPsepSchema>; raw: unknown }

  const items: ParsedItem[] = []
  const validationIssues: { index: number; formato: string; issues: unknown }[] = []

  for (let i = 0; i < normalized.length; i++) {
    const raw = normalized[i]
    const isPsep = typeof raw === 'object' && raw !== null && 'cabecera' in raw

    if (isPsep) {
      const parsed = convocatoriaPsepSchema.safeParse(raw)
      if (parsed.success) items.push({ kind: 'psep', data: parsed.data, raw })
      else validationIssues.push({ index: i, formato: 'psep', issues: parsed.error.issues })
    } else {
      const parsed = convocatoriaScraperSchema.safeParse(raw)
      if (parsed.success) items.push({ kind: 'plano', data: parsed.data, raw })
      else validationIssues.push({ index: i, formato: 'plano', issues: parsed.error.issues })
    }
  }

  if (validationIssues.length > 0) {
    return NextResponse.json(
      { error: 'Validación fallida', details: validationIssues },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const results: DbConvocatoria[] = []
  const errors: { index: number; titulo: string; error: string }[] = []
  // Slugs que vienen del extractor PSEP (Poder Judicial) — solo esos entran a la
  // cola de aprobación de Instagram.
  const slugsPsep = new Set<string>()

  // 4. Procesar cada item con el traductor de su formato
  const hoyISO = hoyLima()
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    try {
      const dbItem = item.kind === 'psep'
        ? await transformPsepToDb(item.data, item.raw, supabase, hoyISO)
        : await transformToDb(item.data, supabase, hoyISO)
      const row = corregirFechaPub(dbItem, hoyISO)
      results.push(row)
      if (item.kind === 'psep') slugsPsep.add(row.slug)
    } catch (err) {
      errors.push({
        index: i,
        titulo: item.kind === 'psep' ? item.data.cabecera.titulo : item.data.titulo,
        error: err instanceof Error ? err.message : 'Error desconocido',
      })
    }
  }

  if (results.length === 0) {
    return NextResponse.json({ error: 'Ningún item válido', errors }, { status: 400 })
  }

  // 5. Reconciliar slug por folio: si el folio ya existe con otro slug (p. ej.
  // el extractor corrigió el título y el slug derivado cambió), se conserva el
  // slug ya publicado para que el upsert actualice esa fila en vez de chocar
  // con el índice único parcial de numero_folio. Además mantiene estable la
  // URL indexada por Google.
  const folios = results.map(r => r.numero_folio).filter(Boolean)
  if (folios.length > 0) {
    const { data: existentes, error: folioError } = await supabase
      .from('convocatorias')
      .select('slug, numero_folio')
      .in('numero_folio', folios)

    if (folioError) {
      console.error('Error consultando folios existentes:', folioError)
      return NextResponse.json(
        { error: 'Error al guardar', details: folioError.message },
        { status: 500 }
      )
    }

    const slugPorFolio = new Map(existentes.map(e => [e.numero_folio, e.slug]))
    for (const row of results) {
      const slugExistente = slugPorFolio.get(row.numero_folio)
      if (slugExistente) row.slug = slugExistente
    }
  }

  // 5.5. Snapshot de qué slugs ya existían — para difundir en Instagram solo las
  // convocatorias realmente nuevas (el upsert no distingue insert de update).
  // Se consulta ANTES del upsert; después todos los slugs existirían.
  const difundirIG = instagramConfigurado()
  let yaExistia = new Set<string>()
  if (difundirIG) {
    const { data: preexistentes } = await supabase
      .from('convocatorias')
      .select('slug')
      .in('slug', results.map(r => r.slug))
    yaExistia = new Set((preexistentes ?? []).map(e => e.slug))
  }

  // 6. Upsert masivo — deduplica por slug (constraint UNIQUE completa)
  // numero_folio usa índice parcial que PostgREST no admite en ON CONFLICT
  const { data, error: upsertError } = await supabase
    .from('convocatorias')
    .upsert(results, {
      onConflict: 'slug',
      ignoreDuplicates: false,
    })
    .select('id, titulo')

  if (upsertError) {
    console.error('Error en upsert:', upsertError)
    return NextResponse.json(
      { error: 'Error al guardar', details: upsertError.message },
      { status: 500 }
    )
  }

  revalidatePath('/')
  revalidatePath('/sitemap.xml')
  revalidatePath('/entidades')

  // 7. Cola de aprobación de Instagram — solo convocatorias del Poder Judicial
  // (PSEP) nuevas y activas quedan 'pendiente'; un admin las aprueba desde el
  // panel (nada se publica solo). En background para no bloquear al scraper.
  if (difundirIG) {
    const pendientes = results
      .filter(r => slugsPsep.has(r.slug) && !yaExistia.has(r.slug) && r.estado === 'activa' && r.indexable)
      .map(r => r.slug)
    if (pendientes.length > 0) {
      after(async () => {
        const { error } = await supabase
          .from('convocatorias')
          .update({ ig_estado: 'pendiente' })
          .in('slug', pendientes)
          .is('ig_estado', null)
        if (error) console.error('[instagram] no se pudo encolar pendientes:', error.message)
        else console.log(`[instagram] ${pendientes.length} convocatoria(s) del Poder Judicial en cola de aprobación`)
      })
    }
  }

  return NextResponse.json(
    {
      success: true,
      processed: results.length,
      saved: data?.length ?? 0,
      errors: errors.length > 0 ? errors : undefined,
    },
    { status: 201 }
  )
}
