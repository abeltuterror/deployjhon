'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/providers/AuthProvider'
import { usePanel } from '@/providers/PanelProvider'

export default function Navbar() {
  const { user, profile } = useAuth()
  const { openPanel }     = usePanel()

  const [scrolled, setScrolled]     = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toast, setToast]           = useState<string | null>(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleAdminClick = useCallback(() => {
    if (profile?.rol === 'admin') {
      openPanel('admin')
    } else {
      showToast('Acceso restringido. Solo el administrador puede entrar.')
    }
    setMobileOpen(false)
  }, [profile, openPanel, showToast])

  const handleUserPanel = useCallback(() => {
    openPanel('user')
    setMobileOpen(false)
  }, [openPanel])

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-60 transition-all duration-300"
        style={
          scrolled
            ? { background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
            : { background: 'transparent' }
        }
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center group">
              <img
                src="/logo.svg"
                alt="Convocape"
                className="h-9 w-auto group-hover:opacity-90 transition-opacity"
              />
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <a href="#convocatorias" className="nav-link text-sm font-medium text-white/80 hover:text-white transition-colors">
                Convocatorias
              </a>
              <button className="nav-link text-sm font-medium text-white/80 hover:text-white transition-colors">
                Asistente IA
              </button>
              <button
                onClick={handleUserPanel}
                className="nav-link text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                Mi Panel
              </button>
              <button
                onClick={handleAdminClick}
                className="nav-link text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                Admin
              </button>
              <button
                onClick={handleUserPanel}
                className="ml-2 w-9 h-9 rounded-full flex items-center justify-center transition-colors overflow-hidden"
                style={{ background: user ? '#D91023' : 'rgba(255,255,255,0.1)' }}
                aria-label={user ? 'Perfil de usuario' : 'Iniciar sesión'}
              >
                {user ? (
                  <span className="text-white text-xs font-bold">
                    {user.email?.[0].toUpperCase()}
                  </span>
                ) : (
                  <i className="fas fa-user text-white text-sm" />
                )}
              </button>
            </div>

            <button
              className="md:hidden text-white text-xl"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Menú móvil"
            >
              <i className={`fas fa-${mobileOpen ? 'times' : 'bars'}`} />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-slate-900/95 backdrop-blur-lg border-t border-white/10">
            <div className="px-4 py-3 space-y-2">
              <a
                href="#convocatorias"
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-white/80 hover:text-white text-sm"
              >
                Convocatorias
              </a>
              <button className="block w-full text-left py-2 text-white/80 hover:text-white text-sm">
                Asistente IA
              </button>
              <button
                onClick={handleUserPanel}
                className="block w-full text-left py-2 text-white/80 hover:text-white text-sm"
              >
                Mi Panel {user && <span className="text-peru-red text-xs ml-1">●</span>}
              </button>
              <button
                onClick={handleAdminClick}
                className="block w-full text-left py-2 text-white/80 hover:text-white text-sm"
              >
                Admin
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-60 max-w-sm toast-enter">
          <div className="bg-gray-900 text-white text-sm rounded-xl px-4 py-3 shadow-xl flex items-center gap-3">
            <i className="fas fa-lock text-peru-red shrink-0" />
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="ml-auto text-white/50 hover:text-white">
              <i className="fas fa-times text-xs" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
