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

// ── Cached filter options ─────────────────────────────────────────────────────
// These are static lists (ubicaciones, contratos, entidades) that change
// infrequently. Pulling ALL convocatorias rows on every request just to compute
// distinct values in JS was the main bottleneck. Cache for 1 hour instead.

const getCachedFilterOptions = unstable_cache(
  async () => {
    // Plain service client — no cookies needed for public read-only data
    const { createClient: supabaseJs } = await import('@supabase/supabase-js')
    const db = supabaseJs(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    console.time('[cache] filter-options-build')
    const [
      { data: ubicData },
      { data: entData },
      { data: contratoData },
      { count: totalEntidades },
    ] = await Promise.all([
      db.from('convocatorias').select('ubicacion').eq('estado', 'activa'),
      db.from('entidades').select('nombre_oficial').order('nombre_oficial'),
      db.from('convocatorias').select('tipo_contrato').eq('estado', 'activa'),
      // head:true → PostgREST sends HEAD request, zero rows transferred
      db.from('entidades').select('id', { count: 'exact', head: true }),
    ])
    console.timeEnd('[cache] filter-options-build')

    return {
      departamentos: [...new Set(
        ubicData?.map(r => r.ubicacion.includes(' - ') ? r.ubicacion.split(' - ')[0] : r.ubicacion) ?? []
      )].sort(),
      entidades:      entData?.map(r => r.nombre_oficial) ?? [],
      contratos:      [...new Set(contratoData?.map(r => r.tipo_contrato) ?? [])].sort(),
      totalEntidades: totalEntidades ?? 0,
    }
  },
  ['convocape-filter-options'],
  { revalidate: 3600 } // rebuild cache at most once per hour
)

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage({ searchParams }: PageProps) {
  console.time('[page] total')

  const sp      = await searchParams
  const supabase = await createClient()
  const page    = Math.max(1, Number(sp.pagina ?? 1))
  const from    = (page - 1) * ITEMS_PER_PAGE
  const to      = from + ITEMS_PER_PAGE - 1

  // ── Step 1: Build partial query — all PostgreSQL filters, no JS filtering ──
  console.time('[step1] query-build')
  let query = supabase
    .from('convocatorias')
    .select(
      // Regla de Oro: only the 11 fields ConvocatoriaListItem needs
      'id, slug, titulo, ubicacion, sueldo, fecha_limite, tipo_contrato, nivel, req_preview, modalidad, entidades(nombre_oficial)',
      { count: 'exact' }
    )
    .eq('estado', 'activa')

  // All filtering delegated 100% to PostgreSQL — no .filter() / .sort() in JS
  if (sp.q)         query = query.ilike('titulo', `%${sp.q}%`)
  if (sp.departamento) query = query.ilike('ubicacion', `${sp.departamento} - %`)
  if (sp.contrato)  query = query.eq('tipo_contrato', sp.contrato)
  if (sp.nivel)     query = query.contains('nivel', [sp.nivel])
  if (sp.salario) {
    if (sp.salario === '8000+') query = query.gte('sueldo', 8000)
    else                         query = query.lte('sueldo', Number(sp.salario))
  }
  if (sp.fecha) {
    const since = new Date()
    since.setDate(since.getDate() - Number(sp.fecha))
    query = query.gte('fecha_pub', since.toISOString().split('T')[0])
  }

  if (sp.orden === 'limite')           query = query.order('fecha_limite', { ascending: true })
  else if (sp.orden === 'salario-alto') query = query.order('sueldo',      { ascending: false })
  else if (sp.orden === 'salario-bajo') query = query.order('sueldo',      { ascending: true })
  else                                  query = query.order('fecha_pub',   { ascending: false })
  console.timeEnd('[step1] query-build')

  // ── Step 2: Prefetch in parallel ──────────────────────────────────────────
  // entidad lookup + cached filter options run concurrently.
  // Previously entidad lookup was a sequential await that blocked everything.
  console.time('[step2] db-prefetch (entidad + filter-cache)')
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
  console.timeEnd('[step2] db-prefetch (entidad + filter-cache)')

  // Apply entidad filter now that we have the UUID
  if (entResult.data) query = query.eq('entidad_id', entResult.data.id)

  // Pagination must be the last modifier
  query = query.range(from, to)

  // ── Step 3: Execute main query ────────────────────────────────────────────
  // At this point the entire WHERE + ORDER BY + LIMIT/OFFSET is in PostgreSQL.
  // Node.js receives only ITEMS_PER_PAGE rows (max 12).
  console.time('[step3] db-main-query')
  const { data: rawConvocatorias, count } = await query
  console.timeEnd('[step3] db-main-query')

  // Safety cap: Supabase should never return more than ITEMS_PER_PAGE rows
  // (range is applied server-side), but slice defensively in case of unexpected
  // PostgREST behavior with embedded resources or count=exact.
  const convocatorias = (rawConvocatorias ?? []).slice(0, ITEMS_PER_PAGE)
  console.log(`[debug] rows from DB: ${rawConvocatorias?.length ?? 0}, after slice: ${convocatorias.length}`)

  // ── Step 4: Post-processing ───────────────────────────────────────────────
  // Only arithmetic — no array iteration over convocatorias.
  console.time('[step4] data-processing')
  const { departamentos, entidades, contratos, totalEntidades } = filterOptions
  const totalUbicaciones = departamentos.length
  const totalPages       = Math.ceil((count ?? 0) / ITEMS_PER_PAGE)
  console.timeEnd('[step4] data-processing')

  // ── Step 5: React Server Component render ─────────────────────────────────
  console.time('[step5] react-render')
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
  console.timeEnd('[step5] react-render')
  console.timeEnd('[page] total')

  return output
}
