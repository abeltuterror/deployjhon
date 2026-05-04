'use client'
import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toggleGuardado } from '@/app/actions'
import { useAuth } from '@/providers/AuthProvider'

interface Props {
  convocatoriaId: number
  isSaved?: boolean
}

const supabase = createClient()

export default function BookmarkButton({ convocatoriaId, isSaved = false }: Props) {
  const { user } = useAuth()
  const [saved, setSaved] = useState(isSaved)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!user) return
    supabase
      .from('guardados')
      .select('id')
      .eq('user_id', user.id)
      .eq('convocatoria_id', convocatoriaId)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data))
  }, [user, convocatoriaId])

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return
    startTransition(async () => {
      const nextSaved = await toggleGuardado(convocatoriaId, user.id)
      setSaved(nextSaved)
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50"
      aria-label={saved ? 'Quitar de guardados' : 'Guardar convocatoria'}
    >
      <i className={`${saved ? 'fas text-peru-red' : 'far text-gray-300'} fa-bookmark`} />
    </button>
  )
}
