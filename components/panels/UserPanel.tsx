'use client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { usePanel } from '@/providers/PanelProvider'
import { useAuth } from '@/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { registrarWhatsapp, actualizarEstadoPostulacion } from '@/app/actions'
import AuthModal from '@/components/auth/AuthModal'
import PaywallModal from '@/components/ui/PaywallModal'

// ── Types ─────────────────────────────────────────────────────────────────────

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
  estado: string
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
  texto: string | null
  carrera: string | null
  sueldo_min: number | null
  departamento: string | null
  created_at: string
}

type Tab = 'guardadas' | 'postulaciones' | 'alertas' | 'cuenta'

const ESTADOS_KANBAN = [
  { value: 'postulando',  label: 'Postulando',   color: 'bg-blue-100 text-blue-700'   },
  { value: 'evaluacion',  label: 'En evaluación', color: 'bg-amber-100 text-amber-700' },
  { value: 'descartado',  label: 'Descartado',    color: 'bg-gray-100 text-gray-500'   },
] as const

// ── Main Component ────────────────────────────────────────────────────────────

export default function UserPanel() {
  const { activePanel, authMode, closePanel } = usePanel()
  const { user, loading: authLoading } = useAuth()
  const [visible, setVisible]     = useState(false)
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
    <div className="fixed inset-0 z-70">
      <div className="modal-overlay absolute inset-0" onClick={closePanel} />
      <div
        className={`absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl overflow-y-auto slide-panel ${panelOpen ? '' : 'closed'}`}
      >
        <div className="p-6">
          {authLoading ? (
            <PanelSkeleton />
          ) : !user ? (
            <AuthModal onClose={closePanel} initialMode={authMode} />
          ) : (
            <TabsView user={user} onClose={closePanel} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tabs View ─────────────────────────────────────────────────────────────────

function TabsView({ user, onClose }: { user: User; onClose: () => void }) {
  const { signOut, profile } = useAuth()
  const [supabase] = useState(() => createClient())
  const [tab, setTab] = useState<Tab>('guardadas')
  const [showPaywall, setShowPaywall] = useState(false)

  const [guardadas, setGuardadas]         = useState<GuardadaRow[] | null>(null)
  const [postulaciones, setPostulaciones] = useState<PostulacionRow[] | null>(null)
  const [alertas, setAlertas]             = useState<AlertaRow[] | null>(null)
  const [loadingData, setLoadingData]     = useState(false)

  const esPremium = profile?.premium_hasta
    ? new Date(profile.premium_hasta) > new Date()
    : false

  useEffect(() => {
    if (tab === 'guardadas' && guardadas === null) {
      setLoadingData(true)
      supabase
        .from('guardados')
        .select('id, convocatorias(id, titulo, ubicacion, sueldo, fecha_limite, tipo_contrato, entidades(nombre_oficial))')
        .eq('user_id', user.id)
        .then(({ data }) => { setGuardadas((data as unknown as GuardadaRow[]) ?? []); setLoadingData(false) })
    }
    if (tab === 'postulaciones' && postulaciones === null) {
      setLoadingData(true)
      supabase
        .from('postulaciones')
        .select('id, created_at, estado, convocatorias(id, titulo, ubicacion, fecha_limite, entidades(nombre_oficial))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => { setPostulaciones((data as unknown as PostulacionRow[]) ?? []); setLoadingData(false) })
    }
    if (tab === 'alertas' && alertas === null) {
      setLoadingData(true)
      supabase
        .from('alertas')
        .select('id, texto, carrera, sueldo_min, departamento, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => { setAlertas((data as unknown as AlertaRow[]) ?? []); setLoadingData(false) })
    }
  }, [tab, user.id, supabase, guardadas, postulaciones, alertas])

  const handleSignOut = async () => { await signOut(); onClose() }

  const removeGuardada = async (id: number) => {
    await supabase.from('guardados').delete().eq('id', id)
    setGuardadas(prev => prev?.filter(g => g.id !== id) ?? [])
  }

  const removeAlerta = async (id: number) => {
    await supabase.from('alertas').delete().eq('id', id)
    setAlertas(prev => prev?.filter(a => a.id !== id) ?? [])
  }

  const addAlerta = async (alerta: { carrera: string; sueldo_min: number; departamento?: string }) => {
    const { data } = await supabase
      .from('alertas')
      .insert({ user_id: user.id, ...alerta })
      .select('id, texto, carrera, sueldo_min, departamento, created_at')
      .single()
    if (data) setAlertas(prev => [data as AlertaRow, ...(prev ?? [])])
  }

  const updateEstadoPostulacion = async (id: number, estado: 'postulando' | 'evaluacion' | 'descartado') => {
    await actualizarEstadoPostulacion(id, estado)
    setPostulaciones(prev =>
      prev?.map(p => p.id === id ? { ...p, estado } : p) ?? []
    )
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'guardadas',     label: 'Guardadas',     icon: 'fa-bookmark'     },
    { key: 'postulaciones', label: 'Postulaciones', icon: 'fa-paper-plane'  },
    { key: 'alertas',       label: 'Alertas',       icon: 'fa-bell'         },
    { key: 'cuenta',        label: 'Cuenta',        icon: 'fa-shield-halved'},
  ]

  return (
    <>
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} feature="Alertas por WhatsApp" />}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">Sesión activa</p>
            {esPremium && (
              <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <i className="fas fa-crown text-[9px]" /> PREMIUM
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-800 truncate max-w-50">{user.email}</p>
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

      {/* Banner upgrade si no es premium */}
      {!esPremium && (
        <button
          onClick={() => setShowPaywall(true)}
          className="w-full mb-4 bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-3 hover:border-amber-300 transition-colors text-left"
        >
          <i className="fas fa-crown text-amber-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800">Activa Premium</p>
            <p className="text-[10px] text-gray-500">Alertas WhatsApp · Kanban · S/ 20/mes</p>
          </div>
          <i className="fas fa-chevron-right text-gray-400 text-xs shrink-0" />
        </button>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 -mx-6 px-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1 border-b-2 transition-colors
              ${tab === t.key
                ? 'border-peru-red text-peru-red'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <i className={`fas ${t.icon}`} />
            <span className="hidden sm:inline ml-1">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'cuenta' ? (
        <CuentaTab user={user} esPremium={esPremium} onUpgrade={() => setShowPaywall(true)} />
      ) : loadingData ? (
        <TabSkeleton />
      ) : tab === 'guardadas' ? (
        <GuardadasTab items={guardadas ?? []} onRemove={removeGuardada} />
      ) : tab === 'postulaciones' ? (
        <PostulacionesTab items={postulaciones ?? []} onEstadoChange={updateEstadoPostulacion} />
      ) : (
        <AlertasTab
          items={alertas ?? []}
          onRemove={removeAlerta}
          onAdd={addAlerta}
          esPremium={esPremium}
          whatsappNumero={profile?.whatsapp_numero ?? null}
          onUpgrade={() => setShowPaywall(true)}
        />
      )}
    </>
  )
}

// ── Tab: Cuenta ───────────────────────────────────────────────────────────────

function CuentaTab({
  user, esPremium, onUpgrade,
}: { user: User; esPremium: boolean; onUpgrade: () => void }) {
  const [supabase]     = useState(() => createClient())
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const [loading, setLoading]     = useState(false)

  const hasEmailProvider = user.identities?.some(i => i.provider === 'email') ?? false
  const title    = hasEmailProvider ? 'Cambiar contraseña' : 'Vincular contraseña'
  const subtitle = hasEmailProvider
    ? 'Actualiza tu contraseña de acceso.'
    : 'Vincula una contraseña para iniciar sesión también con email y contraseña.'

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(false)
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSuccess(true); setPassword(''); setConfirm('')
  }

  return (
    <div>
      {/* Estado Premium */}
      <div className={`rounded-xl p-4 mb-5 ${esPremium ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Plan actual</p>
            {esPremium ? (
              <p className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
                <i className="fas fa-crown" /> Premium activo
              </p>
            ) : (
              <p className="text-sm font-semibold text-gray-700">Gratuito</p>
            )}
          </div>
          {!esPremium && (
            <button
              onClick={onUpgrade}
              className="text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              Mejorar
            </button>
          )}
        </div>
      </div>

      {/* Proveedor */}
      <div className="bg-gray-50 rounded-xl p-4 mb-5">
        <p className="text-xs font-semibold text-gray-500 mb-2">Método de inicio de sesión</p>
        <div className="flex items-center gap-2">
          {user.identities?.map(identity => (
            <span
              key={identity.provider}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5"
            >
              {identity.provider === 'google' ? (
                <svg width="12" height="12" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                </svg>
              ) : (
                <i className="fas fa-envelope text-gray-400" style={{ fontSize: 10 }} />
              )}
              {identity.provider === 'google' ? 'Google' : 'Email'}
            </span>
          ))}
        </div>
      </div>

      <h3 className="text-sm font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 mb-4">{subtitle}</p>

      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            {hasEmailProvider ? 'Nueva contraseña' : 'Contraseña'}
          </label>
          <input
            type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-peru-red/30 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirmar contraseña</label>
          <input
            type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Repite la contraseña"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-peru-red/30 text-sm"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <i className="fas fa-exclamation-circle mr-1" />{error}
          </p>
        )}
        {success && (
          <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <i className="fas fa-check-circle mr-1" />
            {hasEmailProvider ? 'Contraseña actualizada correctamente.' : 'Contraseña vinculada.'}
          </p>
        )}

        <button
          type="submit" disabled={loading}
          className="w-full py-3 bg-peru-red hover:bg-peru-dark disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          {loading ? <i className="fas fa-spinner fa-spin" /> : title}
        </button>
      </form>
    </div>
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

// ── Tab: Postulaciones (Kanban) ───────────────────────────────────────────────

function PostulacionesTab({
  items, onEstadoChange,
}: {
  items: PostulacionRow[]
  onEstadoChange: (id: number, estado: 'postulando' | 'evaluacion' | 'descartado') => void
}) {
  if (items.length === 0)
    return <EmptyState icon="fa-paper-plane" text="Aún no has postulado a ninguna convocatoria." />

  return (
    <ul className="space-y-3">
      {items.map(p => {
        const c = p.convocatorias
        if (!c) return null
        const estadoInfo = ESTADOS_KANBAN.find(e => e.value === p.estado) ?? ESTADOS_KANBAN[0]
        return (
          <li key={p.id} className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 mb-0.5">{c.titulo}</p>
            <p className="text-xs text-gray-500 mb-2">{c.entidades?.nombre_oficial}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
              <span><i className="fas fa-map-marker-alt mr-1 text-peru-red" />{c.ubicacion}</span>
              <span><i className="fas fa-calendar mr-1 text-peru-red" />{c.fecha_limite}</span>
            </div>
            {/* Selector de estado Kanban */}
            <div className="flex gap-1.5 flex-wrap">
              {ESTADOS_KANBAN.map(e => (
                <button
                  key={e.value}
                  onClick={() => onEstadoChange(p.id, e.value)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors
                    ${p.estado === e.value
                      ? `${e.color} border-transparent`
                      : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ── Tab: Alertas ──────────────────────────────────────────────────────────────

const DEPARTAMENTOS = [
  'Amazonas','Ancash','Apurimac','Arequipa','Ayacucho','Cajamarca','Callao',
  'Cusco','Huancavelica','Huanuco','Ica','Junin','La Libertad','Lambayeque',
  'Lima','Loreto','Madre De Dios','Moquegua','Pasco','Piura','Puno',
  'San Martin','Tacna','Tumbes','Ucayali',
]

function AlertasTab({
  items, onRemove, onAdd, esPremium, whatsappNumero, onUpgrade,
}: {
  items: AlertaRow[]
  onRemove: (id: number) => void
  onAdd: (alerta: { carrera: string; sueldo_min: number; departamento?: string }) => Promise<void>
  esPremium: boolean
  whatsappNumero: string | null
  onUpgrade: () => void
}) {
  const [carrera, setCarrera]         = useState('')
  const [sueldoMin, setSueldoMin]     = useState('')
  const [depto, setDepto]             = useState('')
  const [saving, setSaving]           = useState(false)
  const [wa, setWa]                   = useState(whatsappNumero ?? '')
  const [savingWa, setSavingWa]       = useState(false)
  const [waMsg, setWaMsg]             = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!carrera.trim() || !sueldoMin) return
    setSaving(true)
    await onAdd({
      carrera: carrera.trim(),
      sueldo_min: Number(sueldoMin),
      ...(depto ? { departamento: depto } : {}),
    })
    setCarrera('')
    setSueldoMin('')
    setDepto('')
    setSaving(false)
  }

  const handleSaveWa = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingWa(true)
    const res = await registrarWhatsapp(wa)
    setSavingWa(false)
    setWaMsg(res.error ?? '¡Número guardado!')
    setTimeout(() => setWaMsg(''), 3000)
  }

  return (
    <div className="space-y-5">

      {/* Alertas por WhatsApp — PREMIUM */}
      <div className={`rounded-xl border p-4 ${esPremium ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <i className="fab fa-whatsapp text-green-500" />
            Alerta por WhatsApp
          </p>
          {!esPremium && (
            <button
              onClick={onUpgrade}
              className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full hover:bg-amber-200 transition-colors"
            >
              <i className="fas fa-crown mr-0.5" /> PREMIUM
            </button>
          )}
        </div>

        <form onSubmit={handleSaveWa} className="flex gap-2">
          <input
            value={wa} onChange={e => setWa(e.target.value)}
            placeholder="9XX XXX XXX (Perú)"
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400/30"
          />
          <button
            type="submit" disabled={savingWa || !wa.trim()}
            className="px-3 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors"
          >
            {savingWa ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
          </button>
        </form>
        {!esPremium && (
          <p className="text-xs text-gray-500 mt-2">
            Las notificaciones automáticas requieren{' '}
            <button onClick={onUpgrade} className="text-amber-700 font-semibold hover:underline">
              Premium
            </button>.
          </p>
        )}

        {waMsg && (
          <p className={`text-xs mt-2 ${waMsg.includes('!') ? 'text-green-700' : 'text-red-500'}`}>
            {waMsg}
          </p>
        )}
      </div>

      {/* Nueva alerta estructurada */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-3">
          Nueva alerta
          {!esPremium && <span className="text-gray-400 font-normal ml-1">(correo con 24h de retraso)</span>}
        </p>
        <form onSubmit={handleAdd} className="space-y-2">
          <input
            value={carrera} onChange={e => setCarrera(e.target.value)}
            placeholder="Carrera o puesto (ej: Enfermero, CAS)"
            required
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-peru-red/30"
          />
          <input
            type="number" min={0} value={sueldoMin} onChange={e => setSueldoMin(e.target.value)}
            placeholder="Sueldo mínimo en S/ (ej: 2000)"
            required
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-peru-red/30"
          />
          <div className="flex gap-2">
            <select
              value={depto} onChange={e => setDepto(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-peru-red/30 bg-white text-gray-600"
            >
              <option value="">Departamento (opcional)</option>
              {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button
              type="submit" disabled={saving || !carrera.trim() || !sueldoMin}
              className="px-4 py-2.5 bg-peru-red hover:bg-peru-dark disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors shrink-0"
            >
              {saving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-plus" />}
            </button>
          </div>
        </form>

        <div className="mt-4">
          {items.length === 0 ? (
            <EmptyState icon="fa-bell" text="No tienes alertas configuradas." />
          ) : (
            <ul className="space-y-2">
              {items.map(a => (
                <li key={a.id} className="flex items-start justify-between gap-2 bg-gray-50 rounded-xl px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {a.carrera ?? a.texto ?? '—'}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {a.sueldo_min != null && (
                        <span className="text-xs text-gray-500">S/ {a.sueldo_min.toLocaleString()} mín.</span>
                      )}
                      {a.departamento && (
                        <span className="text-xs text-gray-500"><i className="fas fa-map-marker-alt mr-0.5" />{a.departamento}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(a.id)}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-colors shrink-0 mt-0.5"
                  >
                    <i className="fas fa-times text-gray-400 text-xs" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
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
      {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
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
