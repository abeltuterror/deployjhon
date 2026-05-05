'use server'
import { revalidatePath, unstable_cache } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import type { ConvocatoriaDetail } from '@/types/convocatoria'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  return perfil?.rol === 'admin' ? user : null
}

// ── Public actions ────────────────────────────────────────────────────────────

const fetchConvocatoriaDetail = unstable_cache(
  async (id: number): Promise<ConvocatoriaDetail | null> => {
    const db = createPublicClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await db
      .from('convocatorias')
      .select(`
        id, slug, titulo, ubicacion, sueldo, fecha_limite, fecha_pub,
        tipo_contrato, nivel, req_preview, modalidad, descripcion,
        requisitos, funciones, documentos, requerimientos, link_oficial,
        entidad_id, entidades(nombre_oficial)
      `)
      .eq('id', id)
      .single()
    return data as ConvocatoriaDetail | null
  },
  ['convocatoria-detail'],
  { revalidate: 3600, tags: ['convocatoria-detail'] }
)

export async function getConvocatoriaDetail(id: number): Promise<ConvocatoriaDetail | null> {
  return fetchConvocatoriaDetail(id)
}

export const getConvocatoriaBySlug = unstable_cache(
  async (slug: string): Promise<ConvocatoriaDetail | null> => {
    const db = createPublicClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await db
      .from('convocatorias')
      .select(`
        id, slug, titulo, ubicacion, sueldo, fecha_limite, fecha_pub,
        tipo_contrato, nivel, req_preview, modalidad, descripcion,
        requisitos, funciones, documentos, requerimientos, link_oficial,
        estado, entidad_id, entidades(nombre_oficial)
      `)
      .eq('slug', slug)
      .single()
    return data as ConvocatoriaDetail | null
  },
  ['convocatoria-by-slug'],
  { revalidate: 3600 }
)

export const getAllActiveSlugs = unstable_cache(
  async (): Promise<{ slug: string; fecha_pub: string }[]> => {
    const db = createPublicClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await db
      .from('convocatorias')
      .select('slug, fecha_pub')
      .eq('estado', 'activa')
      .order('fecha_pub', { ascending: false })
      .limit(500)
    return data ?? []
  },
  ['all-active-slugs'],
  { revalidate: 3600 }
)

export const getAllEntidades = unstable_cache(
  async (): Promise<{ id: number; nombre_oficial: string }[]> => {
    const db = createPublicClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await db
      .from('entidades')
      .select('id, nombre_oficial')
      .order('nombre_oficial')
    return (data ?? []) as { id: number; nombre_oficial: string }[]
  },
  ['all-entidades'],
  { revalidate: 3600 }
)

export const getConvocatoriasByEntidad = unstable_cache(
  async (entidadId: number): Promise<import('@/types/convocatoria').ConvocatoriaListItem[]> => {
    const db = createPublicClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await db
      .from('convocatorias')
      .select('id, slug, titulo, ubicacion, sueldo, fecha_limite, tipo_contrato, nivel, req_preview, modalidad, entidades(nombre_oficial)')
      .eq('entidad_id', entidadId)
      .eq('estado', 'activa')
      .order('fecha_pub', { ascending: false })
      .limit(24)
    return (data as unknown as import('@/types/convocatoria').ConvocatoriaListItem[]) ?? []
  },
  ['convocatorias-by-entidad'],
  { revalidate: 3600 }
)

export async function toggleGuardado(convocatoriaId: number, userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('guardados')
    .select('id')
    .eq('user_id', userId)
    .eq('convocatoria_id', convocatoriaId)
    .single()

  if (existing) {
    await supabase.from('guardados').delete().eq('id', existing.id)
    return false
  }
  await supabase.from('guardados').insert({ user_id: userId, convocatoria_id: convocatoriaId })
  return true
}

// ── Admin: read ───────────────────────────────────────────────────────────────

export async function getAdminConvocatorias() {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return []

  const { data } = await supabase
    .from('convocatorias')
    .select('id, titulo, ubicacion, sueldo, fecha_limite, tipo_contrato, estado, entidades(nombre_oficial)')
    .order('fecha_pub', { ascending: false })
    .limit(200)

  return data ?? []
}

export async function getAdminStats() {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return null

  const { data: all } = await supabase
    .from('convocatorias')
    .select('sueldo, estado, tipo_contrato, nivel, ubicacion')

  if (!all) return null

  const activas = all.filter(r => r.estado === 'activa')
  const sueldos = all.map(r => Number(r.sueldo)).filter(Boolean)

  // por_contrato
  const contratoMap: Record<string, number> = {}
  for (const r of all) {
    contratoMap[r.tipo_contrato] = (contratoMap[r.tipo_contrato] ?? 0) + 1
  }

  // por_nivel (each row has an array)
  const nivelMap: Record<string, number> = {}
  for (const r of all) {
    for (const n of (r.nivel as string[] ?? [])) {
      nivelMap[n] = (nivelMap[n] ?? 0) + 1
    }
  }

  // top ubicaciones
  const ubicMap: Record<string, number> = {}
  for (const r of all) {
    ubicMap[r.ubicacion] = (ubicMap[r.ubicacion] ?? 0) + 1
  }

  return {
    total: all.length,
    activas: activas.length,
    sueldo_promedio: sueldos.length ? sueldos.reduce((a, b) => a + b, 0) / sueldos.length : 0,
    sueldo_maximo: sueldos.length ? Math.max(...sueldos) : 0,
    por_contrato: Object.entries(contratoMap)
      .map(([tipo, count]) => ({ tipo, count }))
      .sort((a, b) => b.count - a.count),
    por_nivel: Object.entries(nivelMap)
      .map(([nivel, count]) => ({ nivel, count }))
      .sort((a, b) => b.count - a.count),
    top_ubicaciones: Object.entries(ubicMap)
      .map(([ubicacion, count]) => ({ ubicacion, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  }
}

// ── Admin: write ──────────────────────────────────────────────────────────────

const ConvocatoriaSchema = z.object({
  titulo:        z.string().min(3, 'Título muy corto'),
  entidad:       z.string().min(2, 'Entidad requerida'),
  ubicacion:     z.string().min(2, 'Ubicación requerida'),
  sueldo:        z.coerce.number().positive('Sueldo inválido'),
  tipo_contrato: z.enum(['CAS', 'D.L. 728', 'D.L. 276'], { message: 'Tipo de contrato inválido' }),
  nivel:         z.array(z.string()).min(1, 'Selecciona al menos un nivel'),
  modalidad:     z.enum(['Presencial', 'Híbrida', 'Remota']),
  fecha_pub:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  fecha_limite:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  descripcion:   z.string().optional(),
  link_oficial:  z.string().regex(/^https?:\/\/.+/, 'URL inválida').or(z.literal('')).optional(),
})

function slugify(text: string, id: number) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 80) + `-${id}`
}

export async function submitConvocatoria(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return { error: 'Acceso denegado.' }

  const raw = {
    titulo:        formData.get('titulo'),
    entidad:       formData.get('entidad'),
    ubicacion:     formData.get('ubicacion'),
    sueldo:        formData.get('sueldo'),
    tipo_contrato: formData.get('tipo_contrato'),
    nivel:         formData.getAll('nivel'),
    modalidad:     formData.get('modalidad'),
    fecha_pub:     formData.get('fecha_pub'),
    fecha_limite:  formData.get('fecha_limite'),
    descripcion:   formData.get('descripcion') || undefined,
    link_oficial:  formData.get('link_oficial') || undefined,
  }

  const parsed = ConvocatoriaSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first.message }
  }

  const d = parsed.data

  // Resolve entity: look up by nombre_oficial or sinonimos
  let entidadId: number
  const { data: found } = await supabase
    .from('entidades')
    .select('id')
    .or(`nombre_oficial.eq.${d.entidad},sinonimos.cs.{${d.entidad}}`)
    .maybeSingle()

  if (found) {
    entidadId = found.id
  } else {
    const { data: created, error: createErr } = await supabase
      .from('entidades')
      .insert({ nombre_oficial: d.entidad, validada: false })
      .select('id')
      .single()
    if (createErr || !created) return { error: 'Error creando entidad.' }
    entidadId = created.id
  }

  const { error: insertErr } = await supabase.from('convocatorias').insert({
    slug: slugify(d.titulo, Date.now()),
    titulo: d.titulo,
    entidad_id: entidadId,
    ubicacion: d.ubicacion,
    sueldo: d.sueldo,
    tipo_contrato: d.tipo_contrato,
    nivel: d.nivel,
    modalidad: d.modalidad,
    fecha_pub: d.fecha_pub,
    fecha_limite: d.fecha_limite,
    descripcion: d.descripcion ?? null,
    link_oficial: d.link_oficial || null,
    req_preview: [],
    requisitos: [],
    funciones: [],
    documentos: [],
    estado: 'activa',
  })

  if (insertErr) return { error: insertErr.message }

  revalidatePath('/')
  return {}
}

export async function deleteConvocatoria(id: number): Promise<void> {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return

  await supabase.from('convocatorias').delete().eq('id', id)
  revalidatePath('/')
}
