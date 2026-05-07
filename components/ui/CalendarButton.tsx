'use client'

interface CalendarButtonProps {
  titulo: string
  fechaLimite: string   // 'YYYY-MM-DD'
  entidad: string
  ubicacion: string
  slug: string
}

function toGCalDate(iso: string) {
  return iso.replace(/-/g, '')
}

export default function CalendarButton({ titulo, fechaLimite, entidad, ubicacion, slug }: CalendarButtonProps) {
  const handleClick = () => {
    const limitDate = toGCalDate(fechaLimite)
    // Google Calendar usa el día siguiente como fin (exclusivo)
    const nextDay = new Date(fechaLimite + 'T00:00:00')
    nextDay.setDate(nextDay.getDate() + 1)
    const endDate = toGCalDate(nextDay.toISOString().split('T')[0])

    const params = new URLSearchParams({
      action:   'TEMPLATE',
      text:     `📋 Fecha límite: ${titulo}`,
      dates:    `${limitDate}/${endDate}`,
      details:  `Convocatoria: ${titulo}\nEntidad: ${entidad}\nVer en: https://convocape.com/convocatorias/${slug}`,
      location: ubicacion,
    })

    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank')
  }

  return (
    <button
      onClick={handleClick}
      title="Agregar fecha límite a Google Calendar"
      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm font-medium"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none"/>
        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" stroke="#EA4335" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      Recordatorio
    </button>
  )
}
