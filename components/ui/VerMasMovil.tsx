'use client'
import { useState, type ReactNode } from 'react'

// Recorta contenido largo SOLO en móvil, con degradado y botón "Ver más".
// En md+ el contenido siempre se muestra completo (el botón ni aparece).
// `activo=false` renderiza los hijos tal cual — el padre decide el umbral
// según la cantidad de items/caracteres, así el botón nunca sale en secciones cortas.
export default function VerMasMovil({ activo = true, children }: {
  activo?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  if (!activo) return <>{children}</>

  return (
    <div>
      <div className={`relative overflow-hidden md:max-h-none md:overflow-visible ${open ? '' : 'max-h-52'}`}>
        {children}
        {!open && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-white to-transparent md:hidden" />
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-peru-red md:hidden"
      >
        {open ? 'Ver menos' : 'Ver más'}
        <i className={`fas ${open ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs`} />
      </button>
    </div>
  )
}
