import type { DocumentoOficial } from '@/types/convocatoria'
import { etiquetaDocumento } from '@/lib/convocatoria'

// Accesos rápidos a la fuente, visibles sin scrollear: los PDFs oficiales
// cuando existen (Poder Judicial) o el anuncio oficial como respaldo.
// Sin PDFs ni link no renderiza nada — la página queda como siempre.

const BTN_CLS =
  'inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm ' +
  'font-semibold text-gray-700 hover:border-peru-red/40 hover:bg-peru-light hover:text-peru-red transition-colors'

export default function DocumentosPdfBotones({ docs, linkOficial }: {
  docs: DocumentoOficial[]
  linkOficial?: string | null
}) {
  if (docs.length === 0) {
    if (!linkOficial || linkOficial === '#') return null
    return (
      <div className="flex flex-wrap gap-2 my-4">
        <a href={linkOficial} target="_blank" rel="noopener noreferrer" className={BTN_CLS}>
          <i className="fas fa-link text-peru-red" />
          Ver anuncio oficial
          <i className="fas fa-external-link-alt text-[10px] text-gray-400" />
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 my-4">
      {docs.map((d, i) => (
        <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className={BTN_CLS}>
          <i className="fas fa-file-pdf text-peru-red" />
          {etiquetaDocumento(d)}
          <i className="fas fa-download text-[10px] text-gray-400" />
        </a>
      ))}
    </div>
  )
}
