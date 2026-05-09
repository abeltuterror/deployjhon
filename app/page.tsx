import { unstable_cache } from 'next/cache'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import HeroSection from '@/components/sections/HeroSection'
import Filters from '@/components/sections/Filters'
import ConvocatoriasGrid from '@/components/sections/ConvocatoriasGrid'
import Pagination from '@/components/shared/Pagination'
import type { ConvocatoriaListItem } from '@/types/convocatoria'

const ITEMS_PER_PAGE = 12

interface PageProps {
  searchParams: Promise<{
    q?: string
    departamento?: string
    entidad?: string
    contrato?: string
    salario?: string
    nivel?: string
    fecha?: string
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
      db.from('entidades').select('nombre_oficial').order('nombre_oficial'),
      db.from('convocatorias').select('tipo_contrato').eq('estado', 'activa'),
      db.from('entidades').select('id', { count: 'exact', head: true }),
    ])

    return {
      entidades:      entData?.map(r => r.nombre_oficial) ?? [],
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

  let query = supabase
    .from('convocatorias')
    .select(
      'id, slug, titulo, ubicacion, sueldo, fecha_limite, tipo_contrato, nivel, req_preview, modalidad, entidades(nombre_oficial)',
      { count: 'exact' }
    )
    .eq('estado', 'activa')

  if (sp.q)            query = query.ilike('titulo', `%${sp.q}%`)
  if (sp.departamento) query = query.ilike('ubicacion', `${sp.departamento} - %`)
  if (sp.contrato)     query = query.eq('tipo_contrato', sp.contrato)
  if (sp.nivel)        query = query.contains('nivel', [sp.nivel])
  if (sp.salario) {
    if (sp.salario === '8000+') query = query.gte('sueldo', 8000)
    else                         query = query.lte('sueldo', Number(sp.salario))
  }
  if (sp.fecha) {
    const since = new Date()
    since.setDate(since.getDate() - Number(sp.fecha))
    query = query.gte('fecha_pub', since.toISOString().split('T')[0])
  }

  if (sp.orden === 'limite')            query = query.order('fecha_limite', { ascending: true })
  else if (sp.orden === 'salario-alto') query = query.order('sueldo',      { ascending: false })
  else if (sp.orden === 'salario-bajo') query = query.order('sueldo',      { ascending: true })
  else                                  query = query.order('fecha_pub',   { ascending: false })

  const [entResult, filterOptions] = await Promise.all([
    sp.entidad
      ? supabase
          .from('entidades')
          .select('id')
          .eq('nombre_oficial', sp.entidad)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getCachedFilterOptions(),
  ])

  if (entResult.data) query = query.eq('entidad_id', entResult.data.id)

  query = query.range(from, to)

  const { data: rawConvocatorias, count } = await query
  const convocatorias = (rawConvocatorias ?? []).slice(0, ITEMS_PER_PAGE)

  const { entidades, contratos, totalEntidades } = filterOptions
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
            currentFilters={{
              q: sp.q, departamento: sp.departamento,
              entidad: sp.entidad, contrato: sp.contrato, salario: sp.salario,
              nivel: sp.nivel, fecha: sp.fecha, orden: sp.orden,
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
