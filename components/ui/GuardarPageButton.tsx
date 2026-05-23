'use client'
import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toggleGuardado } from '@/app/actions'
import { useAuth } from '@/providers/AuthProvider'
import SaveAuthPromptModal from '@/components/ui/SaveAuthPromptModal'

const supabase = createClient()

export default function GuardarPageButton({ convocatoriaId }: { convocatoriaId: number }) {
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showPrompt, setShowPrompt] = useState(false)

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

  const handleClick = () => {
    if (!user) {
      setShowPrompt(true)
      return
    }
    startTransition(async () => {
      const next = await toggleGuardado(convocatoriaId, user.id)
      setSaved(next)
    })
  }

  return (
    <>
      {showPrompt && <SaveAuthPromptModal onClose={() => setShowPrompt(false)} />}
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`shrink-0 py-2.5 px-5 border-2 font-semibold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-60
          ${saved && user
            ? 'border-peru-red bg-peru-light text-peru-red'
            : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
      >
        <i className={`${saved && user ? 'fas' : 'far'} fa-bookmark`} />
        {saved && user ? 'Guardado' : 'Guardar'}
      </button>
    </>
  )
}
