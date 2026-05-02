'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export default function SortSelect({ currentOrden }: { currentOrden?: string }) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()

  const change = (value: string) => {
    const p = new URLSearchParams(params.toString())
    value ? p.set('orden', value) : p.delete('orden')
    p.delete('pagina')
    router.push(`${pathname}?${p.toString()}`, { scroll: false })
  }

  return (
    <select
      value={currentOrden ?? 'recientes'}
      onChange={e => change(e.target.value)}
      className="filter-select px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-peru-red/30 text-gray-700"
    >
      <option value="recientes">Más recientes</option>
      <option value="limite">Próximo a vencer</option>
      <option value="salario-alto">Mayor salario</option>
      <option value="salario-bajo">Menor salario</option>
    </select>
  )
}
