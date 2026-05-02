'use client'
import { useDetail } from '@/providers/DetailProvider'

export default function OpenDetailButton({ convocatoriaId }: { convocatoriaId: number }) {
  const { openDetail } = useDetail()
  return (
    <button
      onClick={() => openDetail(convocatoriaId)}
      className="text-sm font-semibold text-peru-red hover:text-peru-dark transition-colors flex items-center gap-1"
    >
      Ver detalles <i className="fas fa-arrow-right text-xs" />
    </button>
  )
}
