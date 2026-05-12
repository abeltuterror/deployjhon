'use client'
import { useState } from 'react'

interface UbicacionCount { provincia: string; ciudad: string; total: number }

interface Props {
  counts:       UbicacionCount[]
  departamentos: string[]
  provincia:    string
  ciudad:       string
  onApply:      (provincia: string, ciudad: string) => void
  onClose:      () => void
}

export default function UbicacionModal({ counts, departamentos, provincia, ciudad, onApply, onClose }: Props) {
  const [selProvincia, setSelProvincia] = useState(provincia)
  const [selCiudad,    setSelCiudad]    = useState(ciudad)

  // Conteos por provincia
  const provinciaMap = counts.reduce<Record<string, number>>((acc, r) => {
    acc[r.provincia] = (acc[r.provincia] ?? 0) + Number(r.total)
    return acc
  }, {})

  // Provincias ordenadas por total
  const provinciasOrdenadas = departamentos
    .filter(d => provinciaMap[d])
    .sort((a, b) => (provinciaMap[b] ?? 0) - (provinciaMap[a] ?? 0))

  // Ciudades de la provincia seleccionada
  const ciudades = counts
    .filter(r => r.provincia === selProvincia)
    .sort((a, b) => b.total - a.total)

  const handleLimpiar = () => {
    setSelProvincia('')
    setSelCiudad('')
  }

  const handleFiltrar = () => {
    onApply(selProvincia, selCiudad)
  }

  const handleSelectProvincia = (p: string) => {
    if (selProvincia === p) {
      setSelProvincia('')
      setSelCiudad('')
    } else {
      setSelProvincia(p)
      setSelCiudad('')
    }
  }

  return (
    <div
      className="absolute top-full left-0 mt-1 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 w-[480px] max-w-[95vw]"
      role="dialog"
      aria-label="Filtro de ubicación"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <span className="font-heading font-700 text-gray-900">Lugar de trabajo</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <i className="fas fa-times" />
        </button>
      </div>

      {/* Columnas Provincia + Ciudad */}
      <div className="flex divide-x divide-gray-100" style={{ height: '260px' }}>
        {/* Provincia */}
        <div className="flex-1 overflow-y-auto py-2">
          <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Provincia</p>
          {provinciasOrdenadas.map(p => (
            <button
              key={p}
              onClick={() => handleSelectProvincia(p)}
              className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors hover:bg-gray-50 ${
                selProvincia === p ? 'text-peru-red font-semibold bg-peru-light' : 'text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {selProvincia === p && <i className="fas fa-check text-xs text-peru-red" />}
                <span>{p}</span>
              </div>
              <span className="text-xs text-gray-400 font-medium tabular-nums">
                {(provinciaMap[p] ?? 0).toLocaleString()}
              </span>
            </button>
          ))}
        </div>

        {/* Ciudad */}
        <div className="flex-1 overflow-y-auto py-2">
          <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Ciudad</p>
          {ciudades.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400 italic">
              {selProvincia ? 'Sin ciudades disponibles' : 'Selecciona una provincia'}
            </p>
          ) : (
            ciudades.map(r => (
              <button
                key={r.ciudad}
                onClick={() => setSelCiudad(prev => prev === r.ciudad ? '' : r.ciudad)}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors hover:bg-gray-50 ${
                  selCiudad === r.ciudad ? 'text-peru-red font-semibold bg-peru-light' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  {selCiudad === r.ciudad && <i className="fas fa-check text-xs text-peru-red" />}
                  <span>{r.ciudad}</span>
                </div>
                <span className="text-xs text-gray-400 font-medium tabular-nums">
                  {Number(r.total).toLocaleString()}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
        <button
          onClick={handleLimpiar}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Limpiar
        </button>
        <button
          onClick={handleFiltrar}
          className="flex-1 py-2.5 rounded-xl bg-peru-red hover:bg-peru-dark text-white text-sm font-semibold transition-colors"
        >
          Filtrar
        </button>
      </div>
    </div>
  )
}
