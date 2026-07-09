import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getConvocatoriaBySlug, getAllActiveSlugs } from '@/app/actions'
import { BASE_URL, EMPLOYMENT_TYPE, formatDateISO, slugifyEntidad, POSTAL_CODES } from '@/lib/seo'
import {
  normalizeCronograma, gruposDeRequisitos, documentosOficialesVisibles,
  etiquetaDocumento, postulacionAunNoAbre, ESTADO_ETAPA_CLS,
} from '@/lib/convocatoria'
import GuardarPageButton from '@/components/ui/GuardarPageButton'

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 86400

export async function generateStaticParams() {
  // En dev no pre-renderizamos nada — solo en producción (build time)
  if (process.env.NODE_ENV === 'development') return []
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
    description: `Convocatoria para ${c.titulo} en ${entidad}${c.unidad ? ` (${c.unidad})` : ''}. Sueldo S/ ${c.sueldo.toLocaleString()}. Postula antes del ${fechaLimite}. Tipo de contrato: ${c.tipo_contrato}.`,
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

  // Campos del extractor PSEP (null/vacíos en filas del scraper viejo)
  const cronograma        = normalizeCronograma(c.cronograma)
  const reqGrupos         = gruposDeRequisitos(c.requerimientos, c.requisitos)
  const docsOficiales     = documentosOficialesVisibles(c.documentos_oficiales)
  const postulacionFutura = !isInactiva && postulacionAunNoAbre(c.fecha_inicio_postulacion)

  const ubicRegion = c.ubicacion.includes(' - ') ? c.ubicacion.split(' - ')[0] : c.ubicacion
  const ubicCiudad = c.ubicacion.includes(' - ') ? c.ubicacion.split(' - ')[1] : c.ubicacion

  const jsonLd = isInactiva ? null : {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: c.titulo,
    description: c.descripcion ?? `Convocatoria ${c.tipo_contrato} en ${entidad}. Sueldo S/ ${c.sueldo}.`,
    datePosted: formatDateISO(c.fecha_pub),
    validThrough: formatDateISO(c.fecha_limite),
    employmentType: EMPLOYMENT_TYPE[c.tipo_contrato] ?? 'OTHER',
    ...(c.link_oficial && c.link_oficial !== '#' && { directApply: true, url: c.link_oficial }),
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: entidad,
        addressLocality: ubicCiudad,
        addressRegion: ubicRegion,
        postalCode: POSTAL_CODES[ubicRegion] ?? '15001',
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
    totalJobOpenings: c.vacantes ?? 1,
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

        {/* Aviso: la ventana de postulación aún no abre */}
        {postulacionFutura && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <i className="far fa-clock text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">La postulación aún no abre</p>
              <p className="text-amber-700 text-sm mt-0.5">
                Podrás postular desde el {formatDate(c.fecha_inicio_postulacion!)} hasta el {formatDate(c.fecha_limite)}.
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
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="font-heading font-700 text-3xl text-gray-900 leading-snug">{c.titulo}</h1>
          <GuardarPageButton convocatoriaId={c.id} />
        </div>
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
          {c.unidad && <InfoCell label="Dependencia" value={c.unidad} />}
          {c.nro_convocatoria && <InfoCell label="N.º convocatoria" value={c.nro_convocatoria} />}
          {c.codigo_plaza && <InfoCell label="Código de plaza" value={c.codigo_plaza} />}
          {(c.vacantes ?? 1) > 1 && <InfoCell label="Vacantes" value={String(c.vacantes)} />}
          {c.fecha_inicio_postulacion && (
            <InfoCell label="Inicio de postulación" value={formatDate(c.fecha_inicio_postulacion)} />
          )}
          {c.fecha_resultados && <InfoCell label="Resultados" value={formatDate(c.fecha_resultados)} />}
        </div>

        {/* Descripción */}
        {c.descripcion && (
          <Section icon="fa-align-left" title="Descripción">
            <p className="text-gray-600 text-sm leading-relaxed">{c.descripcion}</p>
          </Section>
        )}

        {/* Requisitos — agrupados por categoría (PSEP) o lista plana (scraper viejo) */}
        {reqGrupos.length > 0 ? (
          <Section icon="fa-check-circle" title="Requisitos">
            <div className="space-y-4">
              {reqGrupos.map(g => (
                <div key={g.label}>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">{g.label}</h3>
                  <ul className="space-y-2">
                    {g.items.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <i className="fas fa-check text-green-500 text-xs mt-1 shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        ) : c.requisitos && c.requisitos.length > 0 ? (
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
        ) : null}

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

        {/* Cronograma del proceso (PSEP) */}
        {cronograma && (
          <Section icon="fa-calendar-alt" title="Cronograma del proceso">
            <div className="space-y-4">
              {cronograma.grupos.map(g => (
                <div key={g.nombre}>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">{g.nombre}</h3>
                  <ul className="space-y-2">
                    {g.etapas.map((e, i) => (
                      <li key={i} className="flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <span className="text-gray-700">{e.actividad}</span>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {e.fechaTexto ?? [e.fechaIni, e.fechaFin].filter(Boolean).join(' — ')}
                            {e.responsable && ` · ${e.responsable}`}
                          </div>
                        </div>
                        {e.estado && (
                          <span className={`tag shrink-0 ${ESTADO_ETAPA_CLS[e.estado.toLowerCase()] ?? 'bg-gray-100 text-gray-500'}`}>
                            {e.estado}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
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

        {/* Documentos oficiales (PDFs de la fuente — PSEP) */}
        {docsOficiales.length > 0 && (
          <Section icon="fa-file-pdf" title="Documentos oficiales">
            <ul className="space-y-2">
              {docsOficiales.map((d, i) => (
                <li key={i}>
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-peru-red hover:underline"
                  >
                    <i className="fas fa-file-pdf text-xs shrink-0" />
                    <span>{etiquetaDocumento(d)}</span>
                    <i className="fas fa-external-link-alt text-[10px] text-gray-400" />
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* CTA */}
        {!isInactiva && (
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {c.link_oficial && c.link_oficial !== '#' ? (
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
