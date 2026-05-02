'use client'
import { useEffect, useState } from 'react'
import { usePanel } from '@/providers/PanelProvider'
import { useAuth } from '@/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'

// ── Types ────────────────────────────────────────────────────────────────────

interface GuardadaRow {
  id: number
  convocatorias: {
    id: number
    titulo: string
    ubicacion: string
    sueldo: number
    fecha_limite: string
    tipo_contrato: string
    entidades: { nombre_oficial: string } | null
  } | null
}

interface PostulacionRow {
  id: number
  created_at: string
  convocatorias: {
    id: number
    titulo: string
    ubicacion: string
    fecha_limite: string
    entidades: { nombre_oficial: string } | null
  } | null
}

interface AlertaRow {
  id: number
  texto: string
  created_at: string
}

type Tab = 'guardadas' | 'postulaciones' | 'alertas'

// ── Main Component ────────────────────────────────────────────────────────────

export default function UserPanel() {
  const { activePanel, closePanel } = usePanel()
  const { user, loading: authLoading } = useAuth()

  const [visible, setVisible]   = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    if (activePanel !== 'user') {
      setPanelOpen(false)
      const t = setTimeout(() => setVisible(false), 400)
      return () => clearTimeout(t)
    }
    setVisible(true)
    requestAnimationFrame(() => setPanelOpen(true))
  }, [activePanel])

  useEffect(() => {
    if (activePanel !== 'user') return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [activePanel, closePanel])

  useEffect(() => {
    document.body.style.overflow = visible ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [visible])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="modal-overlay absolute inset-0" onClick={closePanel} />
      <div
        className={`absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl overflow-y-auto slide-panel ${panelOpen ? '' : 'closed'}`}
      >
        <div className="p-6">
          {authLoading ? (
            <PanelSkeleton />
          ) : !user ? (
            <LoginForm onClose={closePanel} />
          ) : (
            <TabsView userId={user.id} email={user.email ?? ''} onClose={closePanel} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Login Form (PillaPago style) ──────────────────────────────────────────────

function LoginForm({ onClose }: { onClose: () => void }) {
  const [supabase] = useState(() => createClient())
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (err) setError(err.message === 'Invalid login credentials'
      ? 'Correo o contraseña incorrectos.'
      : err.message)
    // On success, AuthProvider detects the session change → panel re-renders to tabs
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-peru-red rounded-lg flex items-center justify-center">
            <i className="fas fa-landmark text-white text-xs" />
          </div>
          <span className="font-heading font-700 text-gray-900">Convocape</span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <i className="fas fa-times text-gray-500 text-sm" />
        </button>
      </div>

      <h2 className="font-heading font-700 text-2xl text-gray-900 mb-1">Iniciar Sesión</h2>
      <p className="text-sm text-gray-500 mb-6">Accede a tus convocatorias guardadas y alertas.</p>

      <form onSubmit={handleEmail} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Correo electrónico</label>
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-peru-red/30 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contraseña</label>
          <input
            type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-peru-red/30 text-sm"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <i className="fas fa-exclamation-circle mr-1" />{error}
          </p>
        )}

        <button
          type="submit" disabled={submitting}
          className="w-full py-3 bg-peru-red hover:bg-peru-dark disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          {submitting ? <i className="fas fa-spinner fa-spin" /> : 'Ingresar'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <hr className="flex-1 border-gray-200" />
        <span className="text-xs text-gray-400">o continúa con</span>
        <hr className="flex-1 border-gray-200" />
      </div>

      <button
        onClick={handleGoogle}
        className="w-full py-3 border border-gray-200 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
        </svg>
        Continuar con Google
      </button>

      <p className="text-center text-xs text-gray-500 mt-6">
        ¿No tienes cuenta?{' '}
        <a href="/register" className="text-peru-red font-semibold hover:underline">Regístrate</a>
      </p>
      <p className="text-center text-xs text-gray-400 mt-2">
        <a href="/forgot-password" className="hover:underline">¿Olvidaste tu contraseña?</a>
      </p>
    </>
  )
}

// ── Tabs View ─────────────────────────────────────────────────────────────────

function TabsView({ userId, email, onClose }: { userId: string; email: string; onClose: () => void }) {
  const { signOut } = useAuth()
  const [supabase] = useState(() => createClient())
  const [tab, setTab] = useState<Tab>('guardadas')

  const [guardadas, setGuardadas]           = useState<GuardadaRow[] | null>(null)
  const [postulaciones, setPostulaciones]   = useState<PostulacionRow[] | null>(null)
  const [alertas, setAlertas]               = useState<AlertaRow[] | null>(null)
  const [loadingData, setLoadingData]       = useState(false)

  // Lazy-load each tab's data on first visit
  useEffect(() => {
    if (tab === 'guardadas' && guardadas === null) {
      setLoadingData(true)
      supabase
        .from('guardados')
        .select('id, convocatorias(id, titulo, ubicacion, sueldo, fecha_limite, tipo_contrato, entidades(nombre_oficial))')
        .eq('user_id', userId)
        .then(({ data }) => { setGuardadas((data as unknown as GuardadaRow[]) ?? []); setLoadingData(false) })
    }
    if (tab === 'postulaciones' && postulaciones === null) {
      setLoadingData(true)
      supabase
        .from('postulaciones')
        .select('id, created_at, convocatorias(id, titulo, ubicacion, fecha_limite, entidades(nombre_oficial))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .then(({ data }) => { setPostulaciones((data as unknown as PostulacionRow[]) ?? []); setLoadingData(false) })
    }
    if (tab === 'alertas' && alertas === null) {
      setLoadingData(true)
      supabase
        .from('alertas')
        .select('id, texto, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .then(({ data }) => { setAlertas((data as unknown as AlertaRow[]) ?? []); setLoadingData(false) })
    }
  }, [tab, userId, supabase, guardadas, postulaciones, alertas])

  const handleSignOut = async () => {
    await signOut()
    onClose()
  }

  const removeGuardada = async (guardadaId: number) => {
    await supabase.from('guardados').delete().eq('id', guardadaId)
    setGuardadas(prev => prev?.filter(g => g.id !== guardadaId) ?? [])
  }

  const removeAlerta = async (alertaId: number) => {
    await supabase.from('alertas').delete().eq('id', alertaId)
    setAlertas(prev => prev?.filter(a => a.id !== alertaId) ?? [])
  }

  const addAlerta = async (texto: string) => {
    const { data } = await supabase
      .from('alertas')
      .insert({ user_id: userId, texto })
      .select('id, texto, created_at')
      .single()
    if (data) setAlertas(prev => [data as AlertaRow, ...(prev ?? [])])
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'guardadas',    label: 'Guardadas',    icon: 'fa-bookmark' },
    { key: 'postulaciones', label: 'Postulaciones', icon: 'fa-paper-plane' },
    { key: 'alertas',      label: 'Alertas',      icon: 'fa-bell' },
  ]

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500">Sesión activa</p>
          <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{email}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
          >
            <i className="fas fa-sign-out-alt" /> Salir
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <i className="fas fa-times text-gray-500 text-sm" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 -mx-6 px-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors
              ${tab === t.key
                ? 'border-peru-red text-peru-red'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <i className={`fas ${t.icon}`} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loadingData ? (
        <TabSkeleton />
      ) : tab === 'guardadas' ? (
        <GuardadasTab items={guardadas ?? []} onRemove={removeGuardada} />
      ) : tab === 'postulaciones' ? (
        <PostulacionesTab items={postulaciones ?? []} />
      ) : (
        <AlertasTab items={alertas ?? []} onRemove={removeAlerta} onAdd={addAlerta} />
      )}
    </>
  )
}

// ── Tab: Guardadas ────────────────────────────────────────────────────────────

function GuardadasTab({ items, onRemove }: { items: GuardadaRow[]; onRemove: (id: number) => void }) {
  if (items.length === 0)
    return <EmptyState icon="fa-bookmark" text="No tienes convocatorias guardadas." />

  return (
    <ul className="space-y-3">
      {items.map(g => {
        const c = g.convocatorias
        if (!c) return null
        return (
          <li key={g.id} className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{c.titulo}</p>
                <p className="text-xs text-gray-500 mt-1">{c.entidades?.nombre_oficial}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span><i className="fas fa-map-marker-alt mr-1 text-peru-red" />{c.ubicacion}</span>
                  <span><i className="fas fa-coins mr-1 text-peru-red" />S/ {c.sueldo?.toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={() => onRemove(g.id)}
                className="shrink-0 w-7 h-7 rounded-lg bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-colors"
                aria-label="Quitar guardado"
              >
                <i className="fas fa-times text-gray-400 text-xs" />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ── Tab: Postulaciones ────────────────────────────────────────────────────────

function PostulacionesTab({ items }: { items: PostulacionRow[] }) {
  if (items.length === 0)
    return <EmptyState icon="fa-paper-plane" text="Aún no has postulado a ninguna convocatoria." />

  return (
    <ul className="space-y-3">
      {items.map(p => {
        const c = p.convocatorias
        if (!c) return null
        return (
          <li key={p.id} className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-tight">{c.titulo}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.entidades?.nombre_oficial}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span><i className="fas fa-map-marker-alt mr-1 text-peru-red" />{c.ubicacion}</span>
                  <span><i className="fas fa-calendar mr-1 text-peru-red" />Límite: {c.fecha_limite}</span>
                </div>
              </div>
              <span className="tag bg-green-100 text-green-700 shrink-0">Postulado</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ── Tab: Alertas ──────────────────────────────────────────────────────────────

function AlertasTab({
  items, onRemove, onAdd,
}: {
  items: AlertaRow[]
  onRemove: (id: number) => void
  onAdd: (texto: string) => Promise<void>
}) {
  const [texto, setTexto] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!texto.trim()) return
    setSaving(true)
    await onAdd(texto.trim())
    setTexto('')
    setSaving(false)
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="flex gap-2 mb-5">
        <input
          value={texto} onChange={e => setTexto(e.target.value)}
          placeholder="Ej: CAS Enfermero Lima"
          className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-peru-red/30"
        />
        <button
          type="submit" disabled={saving || !texto.trim()}
          className="px-4 py-2.5 bg-peru-red hover:bg-peru-dark disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors"
        >
          {saving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-plus" />}
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState icon="fa-bell" text="No tienes alertas configuradas. Crea una para recibir notificaciones." />
      ) : (
        <ul className="space-y-2">
          {items.map(a => (
            <li key={a.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{a.texto}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(a.created_at).toLocaleDateString('es-PE')}
                </p>
              </div>
              <button
                onClick={() => onRemove(a.id)}
                className="w-7 h-7 rounded-lg bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-colors shrink-0"
              >
                <i className="fas fa-times text-gray-400 text-xs" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <i className={`fas ${icon} text-3xl mb-3 block`} />
      <p className="text-sm">{text}</p>
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 bg-gray-100 rounded-xl" />
      ))}
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="animate-pulse space-y-4 pt-4">
      <div className="h-8 bg-gray-200 rounded w-1/2" />
      <div className="h-4 bg-gray-100 rounded w-2/3" />
      <div className="h-12 bg-gray-100 rounded-xl mt-6" />
      <div className="h-12 bg-gray-100 rounded-xl" />
      <div className="h-12 bg-gray-200 rounded-xl" />
    </div>
  )
}
