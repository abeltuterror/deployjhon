'use client'
import { useState, useRef, useEffect } from 'react'

interface Entidad {
  nombre: string
  sinonimos: string[]
}

interface Props {
  entidades: Entidad[]
  value: string
  onChange: (value: string) => void
}

export default function EntitySearch({ entidades, value, onChange }: Props) {
  const [query, setQuery]   = useState(value)
  const [open, setOpen]     = useState(false)
  const containerRef        = useRef<HTMLDivElement>(null)

  // Sincronizar cuando el valor externo cambia (ej. limpiar filtros)
  useEffect(() => { setQuery(value) }, [value])

  // Cerrar al click fuera
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  const q = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  const filtered = q.length === 0 ? [] : entidades.filter(e => {
    const nombre = e.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (nombre.includes(q)) return true
    return e.sinonimos.some(s =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)
    )
  }).slice(0, 8)

  const handleSelect = (nombre: string) => {
    setQuery(nombre)
    setOpen(false)
    onChange(nombre)
  }

  const handleClear = () => {
    setQuery('')
    setOpen(false)
    onChange('')
  }

  const isSelected = value !== '' && value === query

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <i className="fas fa-building absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          value={query}
          placeholder="Entidad"
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { if (query.length > 0) setOpen(true) }}
          className="w-full pl-8 pr-7 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-peru-red/30 text-gray-700 placeholder-gray-400"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Limpiar entidad"
          >
            <i className="fas fa-times text-xs" />
          </button>
        )}
      </div>

      {open && query.length > 0 && (
        <ul
          role="listbox"
          aria-label="Entidades"
          className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
        >
          {filtered.length > 0 ? (
            filtered.map(e => (
              <li
                key={e.nombre}
                role="option"
                aria-selected={isSelected && value === e.nombre}
                onClick={() => handleSelect(e.nombre)}
                className="px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-peru-light hover:text-peru-red transition-colors flex items-center justify-between gap-2"
              >
                <span className="truncate">{e.nombre}</span>
                {e.sinonimos[0] && (
                  <span className="shrink-0 text-xs text-gray-400 font-medium">{e.sinonimos[0]}</span>
                )}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-gray-400 text-center">
              No se encontraron entidades
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
