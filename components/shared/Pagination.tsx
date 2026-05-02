'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface Props {
  totalPages: number
  currentPage: number
}

export default function Pagination({ totalPages, currentPage }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()

  if (totalPages <= 1) return null

  const go = (page: number) => {
    const p = new URLSearchParams(params.toString())
    page === 1 ? p.delete('pagina') : p.set('pagina', String(page))
    router.push(`${pathname}?${p.toString()}`, { scroll: false })
    document.getElementById('convocatorias')?.scrollIntoView({ behavior: 'smooth' })
  }

  const maxVisible = 5
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  let endPage   = Math.min(totalPages, startPage + maxVisible - 1)
  if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1)

  const btnBase    = 'w-10 h-10 rounded-lg border text-sm font-medium transition-colors'
  const btnIdle    = 'border-gray-200 hover:bg-gray-100 text-gray-700'
  const btnActive  = 'bg-peru-red text-white border-peru-red shadow-md'
  const btnDisabled = 'opacity-40 cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200'

  return (
    <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
      <button
        onClick={() => go(currentPage - 1)}
        disabled={currentPage === 1}
        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${currentPage === 1 ? btnDisabled : 'hover:bg-gray-100 text-gray-700 border-gray-200'}`}
      >
        <i className="fas fa-chevron-left mr-1 text-xs" /> Anterior
      </button>

      {startPage > 1 && (
        <>
          <button onClick={() => go(1)} className={`${btnBase} ${btnIdle}`}>1</button>
          {startPage > 2 && <span className="text-gray-400 px-1">...</span>}
        </>
      )}

      {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(p => (
        <button
          key={p}
          onClick={() => go(p)}
          className={`${btnBase} ${p === currentPage ? btnActive : btnIdle}`}
        >
          {p}
        </button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="text-gray-400 px-1">...</span>}
          <button onClick={() => go(totalPages)} className={`${btnBase} ${btnIdle}`}>{totalPages}</button>
        </>
      )}

      <button
        onClick={() => go(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${currentPage === totalPages ? btnDisabled : 'hover:bg-gray-100 text-gray-700 border-gray-200'}`}
      >
        Siguiente <i className="fas fa-chevron-right ml-1 text-xs" />
      </button>
    </div>
  )
}
