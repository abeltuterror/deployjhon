import { unstable_cache } from 'next/cache'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import HeroSection from '@/components/sections/HeroSection'
import Filters from '@/components/sections/Filters'
import ConvocatoriasGrid from '@/components/sections/ConvocatoriasGrid'
import Pagination from '@/components/shared/Pagination'
import type { ConvocatoriaListItem } from '@/types/convocatoria'

export const revalidate = 3600

const ITEMS_PER_PAGE = 12

interface PageProps {
  searchParams: Promise<{
    q?: string
    departamento?: string
    ciudad?: string
    modalidad?: string
    entidad?: string
    contrato?: string
    salario?: string
    nivel?: string
    fecha?: string
    postulacion?: string
    orden?: string
    pagina?: string
  }>
}

// Los 25 departamentos del Perú — lista fija, nunca cambian
const DEPARTAMENTOS_PERU = [
  'Amazonas', 'Ancash', 'Apurimac', 'Arequipa', 'Ayacucho',
  'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huanuco',
  'Ica', 'Junin', 'La Libertad', 'Lambayeque', 'Lima',
  'Loreto', 'Madre De Dios', 'Moquegua', 'Pasco', 'Piura',
  'Puno', 'San Martin', 'Tacna', 'Tumbes', 'Ucayali',
]

// ── Cached filter options ─────────────────────────────────────────────────────
const getCachedFilterOptions = unstable_cache(
  async () => {
    const { createClient: supabaseJs } = await import('@supabase/supabase-js')
    const db = supabaseJs(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const [
      { data: entData },
      { data: contratoData },
      { count: totalEntidades },
    ] = await Promise.all([
      db.from('entidades').select('nombre_oficial, sinonimos').order('nombre_oficial'),
      db.from('convocatorias').select('tipo_contrato').eq('estado', 'activa'),
      db.from('entidades').select('id', { count: 'exact', head: true }),
    ])

    return {
      entidades:      entData?.map(r => ({ nombre: r.nombre_oficial, sinonimos: r.sinonimos ?? [] })) ?? [],
      contratos:      [...new Set(contratoData?.map(r => r.tipo_contrato) ?? [])].sort(),
      totalEntidades: totalEntidades ?? 0,
    }
  },
  ['convocape-filter-options'],
  { revalidate: 3600 }
)

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage({ searchParams }: PageProps) {
  const sp      = await searchParams
  const supabase = await createClient()
  const page    = Math.max(1, Number(sp.pagina ?? 1))
  const from    = (page - 1) * ITEMS_PER_PAGE
  const to      = from + ITEMS_PER_PAGE - 1

  // Hoy en Perú (el servidor corre en UTC) — define los grupos de la ventana
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

  // El filtro de entidad se resuelve primero: las queries del listado lo necesitan
  const entidadId = sp.entidad
    ? (await supabase.from('entidades').select('id').eq('nombre_oficial', sp.entidad).maybeSingle()).data?.id ?? null
    : null

  // Query del listado con TODOS los filtros acumulados
  const nuevaQuery = () => {
    let q = supabase
      .from('convocatorias')
      .select(
        'id, slug, titulo, ubicacion, sueldo, fecha_limite, tipo_contrato, nivel, req_preview, modalidad, vacantes, fecha_inicio_postulacion, entidades(nombre_oficial)',
        { count: 'exact' }
      )
      .eq('estado', 'activa')

    if (sp.q?.trim() && sp.q.trim().length >= 2) {
      const norm = sp.q.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      q = q.ilike('search_text_unaccent', `%${norm}%`)
    }
    if (sp.departamento && sp.ciudad) q = q.eq('ubicacion', `${sp.departamento} - ${sp.ciudad}`)
    else if (sp.departamento)         q = q.ilike('ubicacion', `${sp.departamento} - %`)
    if (sp.modalidad)    q = q.eq('modalidad', sp.modalidad)
    if (sp.contrato)     q = q.eq('tipo_contrato', sp.contrato)
    if (sp.nivel)        q = q.contains('nivel', [sp.nivel])
    if (sp.salario) {
      if (sp.salario === '8000+') q = q.gte('sueldo', 8000)
      else                        q = q.lte('sueldo', Number(sp.salario))
    }
    if (sp.fecha) {
      const since = new Date()
      since.setDate(since.getDate() - Number(sp.fecha))
      q = q.gte('fecha_pub', since.toISOString().split('T')[0])
    }
    if (sp.postulacion === 'abierta') {
      // NULL = sin ventana de postulación (scraper viejo) → se considera abierta
      q = q.or(`fecha_inicio_postulacion.is.null,fecha_inicio_postulacion.lte.${hoy}`)
    }
    if (entidadId !== null) q = q.eq('entidad_id', entidadId)
    return q
  }

  let rawConvocatorias: unknown[] = []
  let count: number | null = null

  {
    let query = nuevaQuery()
    if (sp.orden === 'limite')            query = query.order('fecha_limite', { ascending: true })
    else if (sp.orden === 'salario-alto') query = query.order('sueldo',       { ascending: false })
    else if (sp.orden === 'salario-bajo') query = query.order('sueldo',       { ascending: true })
    else {
      // Ventana con más tiempo por delante primero: cierre más lejano arriba
      // (las vencidas quedan naturalmente al final); a igual cierre,
      // apertura más próxima primero y las sin ventana definida después
      query = query
        .order('fecha_limite', { ascending: false })
        .order('fecha_inicio_postulacion', { ascending: true, nullsFirst: false })
    }
    const res = await query.order('id', { ascending: false }).range(from, to)
    rawConvocatorias = res.data ?? []
    count = res.count
  }

  const [filterOptions, { data: ubicacionData }] = await Promise.all([
    getCachedFilterOptions(),
    supabase.rpc('get_ubicacion_counts', {
      p_q: sp.q?.trim() && sp.q.trim().length >= 2 ? sp.q.trim() : null,
    }),
  ])

  const convocatorias = rawConvocatorias.slice(0, ITEMS_PER_PAGE)

  const { entidades, contratos, totalEntidades } = filterOptions
  const ubicacionCounts = (ubicacionData ?? []) as { provincia: string; ciudad: string; total: number }[]
  const departamentos    = DEPARTAMENTOS_PERU
  const totalUbicaciones = departamentos.length
  const totalPages       = Math.ceil((count ?? 0) / ITEMS_PER_PAGE)

  const output = (
    <>
      <HeroSection
        totalActivas={count ?? 0}
        totalEntidades={totalEntidades}
        totalUbicaciones={totalUbicaciones}
        initialSearch={sp.q ?? ''}
      />

      <section id="convocatorias" className="py-12 bg-white border-b border-gray-100">
        <Suspense>
          <Filters
            departamentos={departamentos}
            entidades={entidades}
            contratos={contratos}
            ubicacionCounts={ubicacionCounts}
            currentFilters={{
              q: sp.q, departamento: sp.departamento, ciudad: sp.ciudad,
              modalidad: sp.modalidad, entidad: sp.entidad, contrato: sp.contrato,
              salario: sp.salario, nivel: sp.nivel, fecha: sp.fecha,
              postulacion: sp.postulacion, orden: sp.orden,
            }}
          />
        </Suspense>
      </section>

      <main className="py-10" style={{ background: 'var(--bg)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ConvocatoriasGrid
            convocatorias={convocatorias as unknown as ConvocatoriaListItem[]}
            total={count ?? 0}
            page={page}
            itemsPerPage={ITEMS_PER_PAGE}
            orden={sp.orden}
          />
          <Suspense>
            <Pagination totalPages={totalPages} currentPage={page} />
          </Suspense>
        </div>
      </main>
    </>
  )

  return output
}
