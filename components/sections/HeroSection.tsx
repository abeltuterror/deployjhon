'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  totalActivas: number
  totalEntidades: number
  totalUbicaciones: number
  initialSearch: string
}

function animateCounter(el: HTMLElement, target: number) {
  let current = 0
  const increment = Math.ceil(target / 40)
  const timer = setInterval(() => {
    current += increment
    if (current >= target) { current = target; clearInterval(timer) }
    el.textContent = String(current)
  }, 30)
}

export default function HeroSection({ totalActivas, totalEntidades, totalUbicaciones, initialSearch }: Props) {
  const router = useRouter()
  const searchRef = useRef<HTMLInputElement>(null)
  const statConvRef = useRef<HTMLDivElement>(null)
  const statEntRef  = useRef<HTMLDivElement>(null)
  const statUbiRef  = useRef<HTMLDivElement>(null)
  const animated    = useRef(false)

  useEffect(() => {
    const hero = document.querySelector('.hero-bg')
    if (!hero) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !animated.current) {
        animated.current = true
        if (statConvRef.current) animateCounter(statConvRef.current, totalActivas)
        if (statEntRef.current)  animateCounter(statEntRef.current, totalEntidades)
        if (statUbiRef.current)  animateCounter(statUbiRef.current, totalUbicaciones)
        // Marcar reveals del hero visibles inmediatamente
        hero.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'))
        obs.disconnect()
      }
    })
    obs.observe(hero)
    return () => obs.disconnect()
  }, [totalActivas, totalEntidades, totalUbicaciones])

  const heroSearch = () => {
    const q = searchRef.current?.value.trim()
    if (q) {
      router.push(`/?q=${encodeURIComponent(q)}`)
    }
    document.getElementById('convocatorias')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className="hero-bg min-h-screen flex items-center relative">
      <div className="absolute inset-0 andean-pattern opacity-50" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-peru-red/5 rounded-full blur-3xl float" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-peru-red/5 rounded-full blur-3xl float" style={{ animationDelay: '-3s' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 w-full">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-peru-red/10 border border-peru-red/20 rounded-full px-4 py-1.5 mb-6 reveal">
            <span className="w-2 h-2 bg-peru-red rounded-full animate-pulse" />
            <span className="text-peru-red text-sm font-medium">Plataforma actualizada en tiempo real</span>
          </div>

          <h1 className="font-heading font-900 text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-6 reveal reveal-delay-1">
            Encuentra convocatorias del Estado en un solo lugar
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-xl reveal reveal-delay-2">
            Filtra, analiza y postula más rápido. Centralizamos todas las ofertas laborales públicas del Perú para ti.
          </p>

          <div className="reveal reveal-delay-3">
            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
              <div className="flex-1 relative">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  defaultValue={initialSearch}
                  placeholder="Buscar por puesto, entidad o palabra clave..."
                  className="w-full pl-11 pr-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-peru-red/50 focus:bg-white/15 transition-all text-sm"
                  onKeyDown={e => e.key === 'Enter' && heroSearch()}
                />
              </div>
              <button
                onClick={heroSearch}
                className="px-8 py-4 bg-peru-red hover:bg-peru-dark text-white font-semibold rounded-xl transition-colors shadow-lg shadow-peru-red/20 flex items-center justify-center gap-2"
              >
                <i className="fas fa-search" /> Buscar
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-8 mt-12 reveal" style={{ transitionDelay: '0.5s' }}>
            <div>
              <div ref={statConvRef} className="font-heading font-800 text-3xl text-white stat-glow">0</div>
              <div className="text-slate-400 text-sm mt-1">Convocatorias activas</div>
            </div>
            <div>
              <div ref={statEntRef} className="font-heading font-800 text-3xl text-white stat-glow">0</div>
              <div className="text-slate-400 text-sm mt-1">Entidades públicas</div>
            </div>
            <div>
              <div ref={statUbiRef} className="font-heading font-800 text-3xl text-white stat-glow">0</div>
              <div className="text-slate-400 text-sm mt-1">Ubicaciones</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 animate-bounce">
        <span className="text-xs">Explorar</span>
        <i className="fas fa-chevron-down text-sm" />
      </div>
    </header>
  )
}
