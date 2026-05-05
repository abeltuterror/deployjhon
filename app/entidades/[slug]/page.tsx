import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllEntidades, getConvocatoriasByEntidad } from '@/app/actions'
import { BASE_URL, slugifyEntidad } from '@/lib/seo'
import ConvocatoriaCard from '@/components/ui/ConvocatoriaCard'

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

export async function generateStaticParams() {
  const entidades = await getAllEntidades()
  return entidades.map(e => ({ slug: slugifyEntidad(e.nombre_oficial) }))
}

async function findEntidad(slug: string) {
  const entidades = await getAllEntidades()
  return entidades.find(e => slugifyEntidad(e.nombre_oficial) === slug) ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const entidad = await findEntidad(slug)
  if (!entidad) return { title: 'Entidad no encontrada | Convocape' }

  const year = new Date().getFullYear()
  return {
    title: `Convocatorias ${entidad.nombre_oficial} ${year} | Trabajo en ${entidad.nombre_oficial} | Convocape`,
    description: `Últimas convocatorias de trabajo en ${entidad.nombre_oficial}. Ofertas CAS, 728 y 276. Actualizado diariamente.`,
    alternates: {
      canonical: `${BASE_URL}/entidades/${slug}`,
    },
  }
}

export default async function EntidadPage({ params }: Props) {
  const { slug } = await params
  const entidad = await findEntidad(slug)
  if (!entidad) notFound()

  const convocatorias = await getConvocatoriasByEntidad(entidad.id)
  const year = new Date().getFullYear()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Convocatorias ${entidad.nombre_oficial} ${year}`,
    description: `Listado de convocatorias activas en ${entidad.nombre_oficial}`,
    numberOfItems: convocatorias.length,
    itemListElement: convocatorias.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/convocatorias/${c.slug}`,
      name: c.titulo,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-peru-red transition-colors">Inicio</Link>
          <i className="fas fa-chevron-right text-xs" />
          <span className="text-gray-400 truncate">{entidad.nombre_oficial}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading font-700 text-3xl text-gray-900 mb-2">
            Convocatorias {entidad.nombre_oficial}
          </h1>
          <p className="text-gray-500">
            {convocatorias.length > 0
              ? `${convocatorias.length} convocatoria${convocatorias.length !== 1 ? 's' : ''} activa${convocatorias.length !== 1 ? 's' : ''}`
              : 'Sin convocatorias activas por el momento'}
          </p>
        </div>

        {convocatorias.length === 0 ? (
          <div className="text-center py-20">
            <i className="fas fa-search text-5xl text-gray-300 mb-4" />
            <h2 className="font-heading font-600 text-xl text-gray-500">
              Sin convocatorias activas
            </h2>
            <p className="text-gray-400 mt-2 text-sm mb-6">
              Esta entidad no tiene convocatorias abiertas actualmente.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-peru-red text-white rounded-xl font-semibold hover:bg-peru-dark transition-colors"
            >
              Ver todas las convocatorias
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {convocatorias.map((c, i) => (
              <ConvocatoriaCard key={c.id} convocatoria={c} isSaved={false} index={i} />
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/" className="text-sm text-peru-red hover:underline">
            ← Ver todas las convocatorias del Estado peruano
          </Link>
        </div>
      </main>
    </>
  )
}
