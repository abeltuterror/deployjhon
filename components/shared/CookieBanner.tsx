'use client'

import { useCookieConsent } from '@/hooks/useCookieConsent'

export default function CookieBanner() {
  const { status, accept, reject } = useCookieConsent()

  if (status !== 'pending') return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto bg-slate-900 text-white rounded-2xl shadow-2xl border border-white/10 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-slate-300 leading-relaxed">
          <span className="font-semibold text-white">Usamos cookies analíticas</span>{' '}
          (Google Analytics) para entender cómo usas Convocape y mejorar la plataforma.
          No compartimos tus datos con terceros.
        </div>
        <div className="flex gap-3 shrink-0 w-full sm:w-auto">
          <button
            onClick={reject}
            className="flex-1 sm:flex-none px-4 py-2 text-sm rounded-xl border border-white/20 text-slate-300 hover:bg-white/10 transition-colors"
          >
            Solo esenciales
          </button>
          <button
            onClick={accept}
            className="flex-1 sm:flex-none px-5 py-2 text-sm font-semibold rounded-xl text-white transition-colors"
            style={{ backgroundColor: 'var(--color-peru-red)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-peru-dark)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-peru-red)')}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}
