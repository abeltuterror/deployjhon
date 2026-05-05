import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getConvocatoriaBySlug, getAllActiveSlugs } from '@/app/actions'
import { BASE_URL, EMPLOYMENT_TYPE, formatDateISO, slugifyEntidad } from '@/lib/seo'

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

export async function generateStaticParams() {
  const slugs = await getAllActiveSlugs()
  return slugs.slice(0, 200).map(s => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const c = await getConvocatoriaBySlug(slug)
  if (!c) return { title: 'Convocatoria no encontrada | Convocape' }

  const entidad = c.entidades?.nombre_oficial ?? ''
  const fechaLimite = new Date(c.fecha_limite + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return {
    title: `${c.titulo} - ${entidad} | Convocape`,
    description: `Convocatoria para ${c.titulo} en ${entidad}. Sueldo S/ ${c.sueldo.toLocaleString()}. Postula antes del ${fechaLimite}. Tipo de contrato: ${c.tipo_contrato}.`,
    alternates: {
      canonical: `${BASE_URL}/convocatorias/${slug}`,
    },
    ...(c.estado === 'inactiva' && {
      robots: { index: false, follow: true },
    }),
  }
}

const CONTRATO_COLORS: Record<string, string> = {
  'CAS':      'bg-blue-100 text-blue-700',
  'D.L. 728': 'bg-purple-100 text-purple-700',
  'D.L. 276': 'bg-emerald-100 text-emerald-700',
  '728':      'bg-purple-100 text-purple-700',
}

const NIVEL_COLORS: Record<string, string> = {
  'Técnico':       'bg-orange-100 text-orange-700',
  'Universitario': 'bg-cyan-100 text-cyan-700',
  'Maestría':      'bg-violet-100 text-violet-700',
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export default async function ConvocatoriaPage({ params }: Props) {
  const { slug } = await params
  const c = await getConvocatoriaBySlug(slug)
  if (!c) notFound()

  const entidad    = c.entidades?.nombre_oficial ?? ''
  const entidadSlug = slugifyEntidad(entidad)
  const isInactiva = c.estado === 'inactiva'
  const isGeneric  = !!(c.funciones?.[0]?.includes('según perfil'))

  const jsonLd = isInactiva ? null : {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: c.titulo,
    description: c.descripcion ?? `Convocatoria ${c.tipo_contrato} en ${entidad}. Sueldo S/ ${c.sueldo}.`,
    datePosted: formatDateISO(c.fecha_pub),
    validThrough: formatDateISO(c.fecha_limite),
    employmentType: EMPLOYMENT_TYPE[c.tipo_contrato] ?? 'OTHER',
    directApply: true,
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: c.ubicacion,
        addressCountry: 'PE',
      },
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'PEN',
      value: {
        '@type': 'QuantitativeValue',
        value: c.sueldo,
        unitText: 'MONTH',
      },
    },
    hiringOrganization: {
      '@type': 'Organization',
      name: entidad,
    },
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-peru-red transition-colors">Inicio</Link>
          <i className="fas fa-chevron-right text-xs" />
          {entidad && (
            <>
              <Link href={`/entidades/${entidadSlug}`} className="hover:text-peru-red transition-colors">
                {entidad}
              </Link>
              <i className="fas fa-chevron-right text-xs" />
            </>
          )}
          <span className="text-gray-400 truncate max-w-xs">{c.titulo}</span>
        </nav>

        {/* Banner convocatoria vencida */}
        {isInactiva && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <i className="fas fa-exclamation-triangle text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Esta convocatoria ya venció</p>
              <p className="text-amber-700 text-sm mt-0.5">
                El plazo de postulación cerró el {formatDate(c.fecha_limite)}.{' '}
                {entidad && (
                  <Link href={`/entidades/${entidadSlug}`} className="underline hover:text-amber-900">
                    Ver convocatorias activas de {entidad}
                  </Link>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`tag ${CONTRATO_COLORS[c.tipo_contrato] ?? 'bg-gray-100 text-gray-700'}`}>
            {c.tipo_contrato}
          </span>
          {c.nivel.map(n => (
            <span key={n} className={`tag ${NIVEL_COLORS[n] ?? 'bg-gray-100 text-gray-700'}`}>{n}</span>
          ))}
          <span className="tag bg-green-100 text-green-700">S/ {c.sueldo.toLocaleString()}</span>
          <span className="tag bg-gray-100 text-gray-600">{c.modalidad}</span>
        </div>

        {/* Título */}
        <h1 className="font-heading font-700 text-3xl text-gray-900 mb-2 leading-snug">{c.titulo}</h1>
        {entidad && (
          <Link href={`/entidades/${entidadSlug}`} className="text-peru-red font-medium hover:underline">
            {entidad}
          </Link>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-6">
          <InfoCell label="Ubicación"    value={c.ubicacion} />
          <InfoCell label="Sueldo"       value={`S/ ${c.sueldo.toLocaleString()}`} />
          <InfoCell label="Contrato"     value={c.tipo_contrato} />
          <InfoCell label="Modalidad"    value={c.modalidad} />
          <InfoCell label="Publicación"  value={formatDate(c.fecha_pub)} />
          <InfoCell
            label="Fecha límite"
            value={formatDate(c.fecha_limite)}
            red={!isInactiva && new Date(c.fecha_limite) < new Date(Date.now() + 5 * 86400000)}
          />
        </div>

        {/* Descripción */}
        {c.descripcion && (
          <Section icon="fa-align-left" title="Descripción">
            <p className="text-gray-600 text-sm leading-relaxed">{c.descripcion}</p>
          </Section>
        )}

        {/* Requisitos */}
        {c.requisitos && c.requisitos.length > 0 && (
          <Section icon="fa-check-circle" title="Requisitos">
            <ul className="space-y-2">
              {c.requisitos.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <i className="fas fa-check text-green-500 text-xs mt-1 shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Funciones */}
        {c.funciones && c.funciones.length > 0 && (
          <Section icon="fa-tasks" title="Funciones">
            <ul className="space-y-2">
              {c.funciones.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <i className="fas fa-arrow-right text-peru-red text-xs mt-1 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {isGeneric && (
              <p className="text-xs text-amber-600 mt-2 italic">
                <i className="fas fa-info-circle mr-1" />
                Funciones referenciales. Consultar convocatoria oficial para el detalle completo.
              </p>
            )}
          </Section>
        )}

        {/* Documentos */}
        {c.documentos && c.documentos.length > 0 && (
          <Section icon="fa-file-alt" title="Documentos necesarios">
            <ul className="space-y-2">
              {c.documentos.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <i className="fas fa-paperclip text-gray-400 text-xs mt-1 shrink-0" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* CTA */}
        {!isInactiva && (
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {c.link_oficial ? (
              <a
                href={c.link_oficial}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-6 bg-peru-red hover:bg-peru-dark text-white font-semibold rounded-xl text-center transition-colors shadow-lg shadow-peru-red/20"
              >
                <i className="fas fa-paper-plane mr-2" />Postular ahora
              </a>
            ) : (
              <button disabled className="flex-1 py-3 px-6 bg-gray-200 text-gray-400 font-semibold rounded-xl">
                Sin link de postulación disponible
              </button>
            )}
            <Link
              href="/"
              className="flex-1 py-3 px-6 border border-gray-200 text-gray-700 font-semibold rounded-xl text-center hover:bg-gray-50 transition-colors"
            >
              Ver más convocatorias
            </Link>
          </div>
        )}

        {/* Vencida: CTA a entidad */}
        {isInactiva && entidad && (
          <div className="mt-8">
            <Link
              href={`/entidades/${entidadSlug}`}
              className="block w-full py-3 px-6 bg-peru-red hover:bg-peru-dark text-white font-semibold rounded-xl text-center transition-colors"
            >
              Ver convocatorias activas de {entidad}
            </Link>
          </div>
        )}
      </main>
    </>
  )
}

function InfoCell({ label, value, red = false }: { label: string; value: string; red?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-sm font-semibold ${red ? 'text-red-600' : 'text-gray-800'}`}>{value}</div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="font-heading font-600 text-lg text-gray-900 mb-3 flex items-center gap-2">
        <i className={`fas ${icon} text-peru-red text-sm`} /> {title}
      </h2>
      {children}
    </div>
  )
}
