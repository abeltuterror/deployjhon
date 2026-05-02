import ConvocatoriaCard from '@/components/ui/ConvocatoriaCard'
import SortSelect from '@/components/sections/SortSelect'
import type { ConvocatoriaListItem } from '@/types/convocatoria'

interface Props {
  convocatorias: ConvocatoriaListItem[]
  total: number
  page: number
  itemsPerPage: number
  orden?: string
}

export default function ConvocatoriasGrid({ convocatorias, total, page, itemsPerPage, orden }: Props) {
  const from = (page - 1) * itemsPerPage + 1
  const to   = Math.min(from + convocatorias.length - 1, total)

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading font-700 text-2xl text-gray-900">Convocatorias disponibles</h2>
          <p className="text-sm text-gray-500 mt-1">
            {total === 0
              ? 'No se encontraron resultados'
              : `Mostrando ${from}-${to} de ${total} resultados`}
          </p>
        </div>
        <SortSelect currentOrden={orden} />
      </div>

      {convocatorias.length === 0 ? (
        <div className="text-center py-20">
          <i className="fas fa-search text-5xl text-gray-300 mb-4" />
          <h3 className="font-heading font-600 text-xl text-gray-500">No se encontraron convocatorias</h3>
          <p className="text-gray-400 mt-2 text-sm">Intenta ajustar los filtros o buscar otro término</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {convocatorias.map((c, i) => (
            <ConvocatoriaCard key={c.id} convocatoria={c} isSaved={false} index={i} />
          ))}
        </div>
      )}
    </>
  )
}
