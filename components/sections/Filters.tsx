'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import EntitySearch from '@/components/ui/EntitySearch'
import UbicacionModal from '@/components/ui/UbicacionModal'

interface UbicacionCount { provincia: string; ciudad: string; total: number }

interface FiltersProps {
  departamentos: string[]
  entidades: { nombre: string, sinonimos: string[] }[]
  contratos: string[]
  ubicacionCounts: UbicacionCount[]
  currentFilters: {
    q?: string; departamento?: string; ciudad?: string; modalidad?: string
    entidad?: string; contrato?: string; salario?: string; nivel?: string
    fecha?: string; orden?: string
  }
}

const NIVELES = ['Técnico', 'Universitario', 'Maestría']
const SEL = 'filter-select w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-peru-red/30 text-gray-700'

export default function Filters({ departamentos, entidades, contratos, ubicacionCounts, currentFilters }: FiltersProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()
  const [ubicModalOpen, setUbicModalOpen] = useState(false)

  const update = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(params.toString())
    value ? p.set(key, value) : p.delete(key)
    p.delete('pagina')
    router.push(`${pathname}?${p.toString()}`, { scroll: false })
  }, [router, pathname, params])

  const clear = () => router.push(pathname, { scroll: false })

  const handleUbicacionApply = useCallback((provincia: string, ciudad: string) => {
    const p = new URLSearchParams(params.toString())
    provincia ? p.set('departamento', provincia) : p.delete('departamento')
    ciudad    ? p.set('ciudad', ciudad)           : p.delete('ciudad')
    p.delete('modalidad')
    p.delete('pagina')
    router.push(`${pathname}?${p.toString()}`, { scroll: false })
    setUbicModalOpen(false)
  }, [router, pathname, params])

  // Label del botón ubicación
  const ubicLabel = currentFilters.ciudad
    ? `${currentFilters.departamento} · ${currentFilters.ciudad}`
    : currentFilters.departamento ?? 'Ubicación'

  const activeFilters: { label: string; keys: string[] }[] = []
  if (currentFilters.departamento || currentFilters.ciudad) {
    activeFilters.push({ label: ubicLabel, keys: ['departamento', 'ciudad'] })
  }
  if (currentFilters.entidad)  activeFilters.push({ label: currentFilters.entidad, keys: ['entidad'] })
  if (currentFilters.contrato) activeFilters.push({ label: currentFilters.contrato, keys: ['contrato'] })
  if (currentFilters.nivel)    activeFilters.push({ label: currentFilters.nivel, keys: ['nivel'] })
  if (currentFilters.fecha)    activeFilters.push({ label: `Últimos ${currentFilters.fecha} días`, keys: ['fecha'] })
  if (currentFilters.salario) {
    const label = currentFilters.salario === '8000+'
      ? 'Desde S/ 8,000'
      : `Hasta S/ ${Number(currentFilters.salario).toLocaleString()}`
    activeFilters.push({ label, keys: ['salario'] })
  }

  const removeFilter = (keys: string[]) => {
    const p = new URLSearchParams(params.toString())
    keys.forEach(k => p.delete(k))
    p.delete('pagina')
    router.push(`${pathname}?${p.toString()}`, { scroll: false })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading font-700 text-xl text-gray-900">Filtros avanzados</h2>
        <button onClick={clear} className="text-sm text-peru-red hover:underline font-medium">
          Limpiar filtros
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

        {/* Ubicación — botón que abre modal */}
        <div className="relative">
          <button
            onClick={() => setUbicModalOpen(true)}
            className={`w-full px-3 py-2.5 rounded-lg border text-sm text-left flex items-center justify-between gap-2 transition-colors ${
              currentFilters.departamento || currentFilters.ciudad
                ? 'border-peru-red bg-peru-light text-peru-red font-medium'
                : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            <span className="truncate">{ubicLabel}</span>
            <i className="fas fa-chevron-down text-xs shrink-0" />
          </button>

          {ubicModalOpen && (
            <UbicacionModal
              counts={ubicacionCounts}
              departamentos={departamentos}
              provincia={currentFilters.departamento ?? ''}
              ciudad={currentFilters.ciudad ?? ''}
              onApply={handleUbicacionApply}
              onClose={() => setUbicModalOpen(false)}
            />
          )}
        </div>

        <EntitySearch
          entidades={entidades}
          value={currentFilters.entidad ?? ''}
          onChange={v => update('entidad', v)}
        />

        <select value={currentFilters.contrato ?? ''} onChange={e => update('contrato', e.target.value)} className={SEL}>
          <option value="">Tipo de contrato</option>
          {contratos.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={currentFilters.salario ?? ''} onChange={e => update('salario', e.target.value)} className={SEL}>
          <option value="">Rango salarial</option>
          <option value="2000">Hasta S/ 2,000</option>
          <option value="3500">Hasta S/ 3,500</option>
          <option value="5000">Hasta S/ 5,000</option>
          <option value="8000">Hasta S/ 8,000</option>
          <option value="8000+">Más de S/ 8,000</option>
        </select>

        <select value={currentFilters.nivel ?? ''} onChange={e => update('nivel', e.target.value)} className={SEL}>
          <option value="">Nivel</option>
          {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        <select value={currentFilters.fecha ?? ''} onChange={e => update('fecha', e.target.value)} className={SEL}>
          <option value="">Fecha de publicación</option>
          <option value="7">Última semana</option>
          <option value="15">Últimos 15 días</option>
          <option value="30">Último mes</option>
          <option value="90">Últimos 3 meses</option>
        </select>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {activeFilters.map(f => (
            <span
              key={f.keys.join('-')}
              onClick={() => removeFilter(f.keys)}
              className="tag bg-peru-light text-peru-red gap-1.5 cursor-pointer hover:bg-peru-glow transition-colors"
            >
              {f.label} <i className="fas fa-times text-xs" />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
