import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

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
})

const bulkSchema = z.array(convocatoriaScraperSchema).min(1).max(5000)

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
}

async function transformToDb(
  item: z.infer<typeof convocatoriaScraperSchema>,
  supabase: ReturnType<typeof createAdminClient>
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
    estado: 'activa',
    nro_convocatoria: item.nroConvocatoria,
    numero_folio: item.numero_folio,
    indexable: item.indexable,
  }
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

  // 3. Normalizar a array y validar con Zod
  const normalized = Array.isArray(body) ? body : [body]
  const parsed = bulkSchema.safeParse(normalized)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validación fallida', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const items = parsed.data
  const supabase = createAdminClient()

  const results: DbConvocatoria[] = []
  const errors: { index: number; titulo: string; error: string }[] = []

  // 4. Procesar cada item
  for (let i = 0; i < items.length; i++) {
    try {
      const dbItem = await transformToDb(items[i], supabase)
      results.push(dbItem)
    } catch (err) {
      errors.push({
        index: i,
        titulo: items[i].titulo,
        error: err instanceof Error ? err.message : 'Error desconocido',
      })
    }
  }

  if (results.length === 0) {
    return NextResponse.json({ error: 'Ningún item válido', errors }, { status: 400 })
  }

  // 5. Upsert masivo — deduplica por slug (constraint UNIQUE completa)
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
