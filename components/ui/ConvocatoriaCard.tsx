import Link from 'next/link'
import type { ConvocatoriaListItem } from '@/types/convocatoria'
import { ventanaPostulacion } from '@/lib/convocatoria'
import BookmarkButton from './BookmarkButton'


interface Props {
  convocatoria: ConvocatoriaListItem
  isSaved: boolean
  index: number
}

const CONTRATO_COLORS: Record<string, string> = {
  'CAS':      'bg-blue-100 text-blue-700',
  'D.L. 728': 'bg-purple-100 text-purple-700',
  'D.L. 276': 'bg-emerald-100 text-emerald-700',
  '728':      'bg-purple-100 text-purple-700',
}

const NIVEL_COLORS: Record<string, string> = {
  'Técnico':      'bg-orange-100 text-orange-700',
  'Universitario':'bg-cyan-100 text-cyan-700',
  'Maestría':     'bg-violet-100 text-violet-700',
}

export default function ConvocatoriaCard({ convocatoria: c, isSaved, index }: Props) {
  // Calculado server-side → sin flash de hidratación
  const ventana = ventanaPostulacion(c.fecha_inicio_postulacion, c.fecha_limite)
  const delay   = Math.min(index * 0.05, 0.4)

  return (
    <article
      className="card-hover bg-white rounded-2xl border border-gray-100 p-5 flex flex-col reveal"
      style={{ transitionDelay: `${delay}s` }}
    >
      {/* Tags + Bookmark */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap gap-1.5">
          <span className={`tag ${CONTRATO_COLORS[c.tipo_contrato] ?? 'bg-gray-100 text-gray-700'}`}>
            {c.tipo_contrato}
          </span>
          {c.nivel.filter(n => n !== 'No especificado').map(n => (
            <span key={n} className={`tag ${NIVEL_COLORS[n] ?? 'bg-gray-100 text-gray-700'}`}>{n}</span>
          ))}
          <span className="tag bg-green-100 text-green-700">
            S/ {c.sueldo.toLocaleString()}
          </span>
          {(c.vacantes ?? 1) > 1 && (
            <span className="tag bg-indigo-100 text-indigo-700">
              <i className="fas fa-users mr-1 text-[10px]" />{c.vacantes} vacantes
            </span>
          )}
        </div>
        <BookmarkButton convocatoriaId={c.id} isSaved={isSaved} />
      </div>

      {/* Título — Link a página SEO para crawl de Google, modal para UX */}
      <Link href={`/convocatorias/${c.slug}`}>
        <h3 className="font-heading font-600 text-base text-gray-900 mb-2 line-clamp-2 leading-snug hover:text-peru-red transition-colors">
          {c.titulo}
        </h3>
      </Link>

      {/* req_preview — datos ya limpios del scraper */}
      {c.req_preview.length > 0 && (
        <div className="mb-3 space-y-1">
          {c.req_preview.map((r, i) => (
            <div key={i} className="req-short text-xs text-gray-500 leading-relaxed">
              <i className="fas fa-check text-green-400 mr-1 text-[10px]" />
              {r}
            </div>
          ))}
        </div>
      )}

      {/* Footer: tramo de postulación + ver detalles */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-gray-50">
        {ventana && (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`tag ${ventana.cls}`}>
              <i className="far fa-clock mr-1 text-[10px]" />{ventana.tramo}
            </span>
            <span className="text-[11px] text-gray-400 whitespace-nowrap">{ventana.detalle}</span>
          </div>
        )}
        <Link
          href={`/convocatorias/${c.slug}`}
          className="shrink-0 text-sm font-semibold text-peru-red hover:text-peru-dark transition-colors flex items-center gap-1"
        >
          Ver detalles <i className="fas fa-arrow-right text-xs" />
        </Link>
      </div>
    </article>
  )
}
