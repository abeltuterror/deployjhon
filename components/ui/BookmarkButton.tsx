'use client'
import { useEffect, useState } from 'react'

interface Props {
  convocatoriaId: number
  isSaved: boolean
}

export default function BookmarkButton({ convocatoriaId }: Props) {
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('cp_saved') || '[]') as number[]
    setSaved(stored.includes(convocatoriaId))
  }, [convocatoriaId])

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const stored = JSON.parse(localStorage.getItem('cp_saved') || '[]') as number[]
    const next = stored.includes(convocatoriaId)
      ? stored.filter(id => id !== convocatoriaId)
      : [...stored, convocatoriaId]
    localStorage.setItem('cp_saved', JSON.stringify(next))
    setSaved(next.includes(convocatoriaId))
  }

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
      aria-label={saved ? 'Quitar de guardados' : 'Guardar convocatoria'}
    >
      <i className={`${saved ? 'fas text-peru-red' : 'far text-gray-300'} fa-bookmark`} />
    </button>
  )
}
