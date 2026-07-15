'use client'
import { useEffect, useState, useCallback } from 'react'
import { usePanel } from '@/providers/PanelProvider'
import {
  getAdminConvocatorias,
  getAdminStats,
  submitConvocatoria,
  deleteConvocatoria,
  getInstagramPendientes,
  aprobarInstagram,
  descartarInstagram,
  type IgPendiente,
} from '@/app/actions'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminConvocatoria {
  id: number
  titulo: string
  ubicacion: string
  sueldo: number
  fecha_limite: string
  tipo_contrato: string
  estado: string
  entidades: { nombre_oficial: string } | null
}

interface AdminStats {
  total: number
  activas: number
  sueldo_promedio: number
  sueldo_maximo: number
  por_contrato: { tipo: string; count: number }[]
  por_nivel: { nivel: string; count: number }[]
  top_ubicaciones: { ubicacion: string; count: number }[]
}

type Tab = 'lista' | 'nueva' | 'stats' | 'instagram'

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { activePanel, closePanel } = usePanel()
  const [visible, setVisible]     = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    if (activePanel !== 'admin') {
      setPanelOpen(false)
      const t = setTimeout(() => setVisible(false), 400)
      return () => clearTimeout(t)
    }
    setVisible(true)
    requestAnimationFrame(() => setPanelOpen(true))
  }, [activePanel])

  useEffect(() => {
    if (activePanel !== 'admin') return
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
        className={`absolute inset-y-0 right-0 w-full max-w-4xl bg-white shadow-2xl overflow-y-auto slide-panel ${panelOpen ? '' : 'closed'}`}
      >
        <AdminContent onClose={closePanel} />
      </div>
    </div>
  )
}

// ── Admin Content ─────────────────────────────────────────────────────────────

function AdminContent({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('lista')
  const [convocatorias, setConvocatorias] = useState<AdminConvocatoria[] | null>(null)
  const [stats, setStats]                 = useState<AdminStats | null>(null)
  const [pendientes, setPendientes]       = useState<IgPendiente[] | null>(null)
  const [loadingList, setLoadingList]     = useState(false)
  const [loadingStats, setLoadingStats]   = useState(false)
  const [loadingPend, setLoadingPend]     = useState(false)

  const loadList = useCallback(async () => {
    setLoadingList(true)
    const data = await getAdminConvocatorias()
    setConvocatorias(data as unknown as AdminConvocatoria[])
    setLoadingList(false)
  }, [])

  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    const data = await getAdminStats()
    setStats(data as AdminStats)
    setLoadingStats(false)
  }, [])

  const loadPendientes = useCallback(async () => {
    setLoadingPend(true)
    const data = await getInstagramPendientes()
    setPendientes(data)
    setLoadingPend(false)
  }, [])

  useEffect(() => {
    if (tab === 'lista' && convocatorias === null) loadList()
    if (tab === 'stats' && stats === null) loadStats()
    if (tab === 'instagram' && pendientes === null) loadPendientes()
  }, [tab, convocatorias, stats, pendientes, loadList, loadStats, loadPendientes])

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta convocatoria?')) return
    await deleteConvocatoria(id)
    setConvocatorias(prev => prev?.filter(c => c.id !== id) ?? [])
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'lista',     label: 'Lista',        icon: 'fa-list' },
    { key: 'nueva',     label: 'Nueva',        icon: 'fa-plus-circle' },
    { key: 'instagram', label: 'Instagram',    icon: 'fa-bullhorn' },
    { key: 'stats',     label: 'Estadísticas', icon: 'fa-chart-bar' },
  ]

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-peru-red/10 rounded-xl flex items-center justify-center">
              <i className="fas fa-shield-alt text-peru-red" />
            </div>
            <div>
              <h2 className="font-heading font-700 text-gray-900">Panel Admin</h2>
              <p className="text-xs text-gray-500">Convocape — acceso restringido</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <i className="fas fa-times text-gray-500 text-sm" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors
                ${tab === t.key
                  ? 'bg-peru-red text-white'
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <i className={`fas ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {tab === 'lista' && (
          <ListaTab
            items={convocatorias ?? []}
            loading={loadingList}
            onDelete={handleDelete}
            onRefresh={loadList}
          />
        )}
        {tab === 'nueva' && (
          <NuevaTab onSuccess={() => { setConvocatorias(null); setTab('lista') }} />
        )}
        {tab === 'instagram' && (
          <InstagramTab
            items={pendientes ?? []}
            loading={loadingPend}
            onRefresh={loadPendientes}
            onChanged={(slug) => setPendientes(prev => prev?.filter(p => p.slug !== slug) ?? [])}
          />
        )}
        {tab === 'stats' && (
          <StatsTab stats={stats} loading={loadingStats} />
        )}
      </div>
    </>
  )
}

// ── Tab: Lista ────────────────────────────────────────────────────────────────

function ListaTab({
  items, loading, onDelete, onRefresh,
}: {
  items: AdminConvocatoria[]
  loading: boolean
  onDelete: (id: number) => void
  onRefresh: () => void
}) {
  if (loading) return <TableSkeleton />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{items.length} convocatorias</p>
        <button
          onClick={onRefresh}
          className="text-xs text-gray-500 hover:text-peru-red flex items-center gap-1 transition-colors"
        >
          <i className="fas fa-sync-alt" /> Actualizar
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <i className="fas fa-inbox text-3xl mb-3 block" />
          <p className="text-sm">No hay convocatorias.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'Título', 'Entidad', 'Sueldo', 'Límite', 'Estado', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{c.id}</td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="font-medium text-gray-900 truncate max-w-50">{c.titulo}</p>
                    <p className="text-xs text-gray-400">{c.ubicacion}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-37.5 truncate">
                    {c.entidades?.nombre_oficial ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">
                    S/ {c.sueldo?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{c.fecha_limite}</td>
                  <td className="px-4 py-3">
                    <span className={`tag ${c.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onDelete(c.id)}
                      className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                      aria-label="Eliminar"
                    >
                      <i className="fas fa-trash text-red-500 text-xs" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Tab: Instagram (cola de aprobación — solo Poder Judicial) ──────────────────

function InstagramTab({
  items, loading, onRefresh, onChanged,
}: {
  items: IgPendiente[]
  loading: boolean
  onRefresh: () => void
  onChanged: (slug: string) => void
}) {
  const [busy, setBusy]   = useState<string | null>(null)
  const [error, setError] = useState('')

  const handlePublicar = async (slug: string) => {
    setError('')
    setBusy(slug)
    const r = await aprobarInstagram(slug)
    setBusy(null)
    if (r.error) setError(`No se pudo publicar: ${r.error}`)
    else onChanged(slug)
  }

  const handleDescartar = async (slug: string) => {
    if (!confirm('¿Descartar esta convocatoria? No se publicará en Instagram.')) return
    setBusy(slug)
    await descartarInstagram(slug)
    setBusy(null)
    onChanged(slug)
  }

  if (loading) return <TableSkeleton />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Pendientes de publicar en Instagram</p>
          <p className="text-xs text-gray-500">Solo Poder Judicial · {items.length} en cola</p>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs text-gray-500 hover:text-peru-red flex items-center gap-1 transition-colors"
        >
          <i className="fas fa-sync-alt" /> Actualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
          <i className="fas fa-exclamation-circle mr-2" />{error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <i className="fas fa-check-circle text-3xl mb-3 block text-green-400" />
          <p className="text-sm">No hay convocatorias pendientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map(c => (
            <div key={c.id} className="border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/og/convocatoria/${c.slug}?format=feed`}
                alt={c.titulo}
                className="w-full aspect-square object-cover bg-gray-100"
                loading="lazy"
              />
              <div className="p-3 flex flex-col gap-1 flex-1">
                <p className="font-semibold text-sm text-gray-900 line-clamp-2">{c.titulo}</p>
                <p className="text-xs text-gray-500 truncate">{c.entidades?.nombre_oficial ?? '—'}</p>
                <p className="text-xs text-gray-400">S/ {c.sueldo?.toLocaleString()} · cierra {c.fecha_limite}</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handlePublicar(c.slug)}
                    disabled={busy === c.slug}
                    className="flex-1 py-2 bg-peru-red hover:bg-peru-dark text-white text-xs font-semibold rounded-lg disabled:opacity-60 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {busy === c.slug
                      ? <><i className="fas fa-spinner fa-spin" /> Publicando…</>
                      : <><i className="fas fa-paper-plane" /> Publicar</>}
                  </button>
                  <button
                    onClick={() => handleDescartar(c.slug)}
                    disabled={busy === c.slug}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg disabled:opacity-60 transition-colors"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab: Nueva Convocatoria ───────────────────────────────────────────────────

function NuevaTab({ onSuccess }: { onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [successMsg, setSuccessMsg]   = useState('')

  const NIVELES = ['Técnico', 'Universitario', 'Maestría']

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setServerError('')
    setSuccessMsg('')
    setSubmitting(true)

    const fd = new FormData(e.currentTarget)
    const result = await submitConvocatoria(fd)
    setSubmitting(false)

    if (result.error) {
      setServerError(result.error)
    } else {
      setSuccessMsg('Convocatoria creada correctamente.')
      ;(e.target as HTMLFormElement).reset()
      setTimeout(onSuccess, 1200)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <h3 className="font-heading font-600 text-lg text-gray-900">Nueva Convocatoria</h3>

      {serverError && (
        <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
          <i className="fas fa-exclamation-circle mr-2" />{serverError}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-3">
          <i className="fas fa-check-circle mr-2" />{successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label="Título del puesto *" name="titulo" type="text" required placeholder="Ej: Médico Especialista en Cardiología" />
        </div>
        <Field label="Entidad *" name="entidad" type="text" required placeholder="Nombre oficial de la entidad" />
        <Field label="Ubicación *" name="ubicacion" type="text" required placeholder="Ej: Lima, Metropolitana" />
        <Field label="Sueldo mensual (S/) *" name="sueldo" type="number" required placeholder="3500" />
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo Contrato *</label>
          <select
            name="tipo_contrato" required
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-peru-red/30 filter-select"
          >
            <option value="">Seleccionar...</option>
            <option value="CAS">CAS</option>
            <option value="D.L. 728">D.L. 728</option>
            <option value="D.L. 276">D.L. 276</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Modalidad *</label>
          <select
            name="modalidad" required
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-peru-red/30 filter-select"
          >
            <option value="Presencial">Presencial</option>
            <option value="Híbrida">Híbrida</option>
            <option value="Remota">Remota</option>
          </select>
        </div>
        <Field label="Fecha publicación *" name="fecha_pub" type="date" required />
        <Field label="Fecha límite *" name="fecha_limite" type="date" required />
        <div className="sm:col-span-2">
          <Field label="Link oficial" name="link_oficial" type="url" placeholder="https://..." />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-2">Nivel *</label>
          <div className="flex flex-wrap gap-3">
            {NIVELES.map(n => (
              <label key={n} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" name="nivel" value={n} className="rounded text-peru-red focus:ring-peru-red" />
                {n}
              </label>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descripción</label>
          <textarea
            name="descripcion" rows={3}
            placeholder="Descripción general del puesto..."
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-peru-red/30 resize-none"
          />
        </div>
      </div>

      <button
        type="submit" disabled={submitting}
        className="w-full py-3 bg-peru-red hover:bg-peru-dark disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
      >
        {submitting ? (
          <><i className="fas fa-spinner fa-spin mr-2" />Guardando...</>
        ) : (
          <><i className="fas fa-save mr-2" />Crear Convocatoria</>
        )}
      </button>
    </form>
  )
}

function Field({
  label, name, type = 'text', required, placeholder,
}: {
  label: string; name: string; type?: string; required?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <input
        type={type} name={name} required={required} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-peru-red/30"
      />
    </div>
  )
}

// ── Tab: Estadísticas ─────────────────────────────────────────────────────────

function StatsTab({ stats, loading }: { stats: AdminStats | null; loading: boolean }) {
  if (loading) return <StatsSkeleton />
  if (!stats) return null

  const maxContrato = Math.max(...stats.por_contrato.map(x => x.count), 1)
  const maxNivel    = Math.max(...stats.por_nivel.map(x => x.count), 1)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',    value: stats.total,    icon: 'fa-file-alt' },
          { label: 'Activas',  value: stats.activas,  icon: 'fa-check-circle' },
          { label: 'S/ Prom.', value: `S/ ${Math.round(stats.sueldo_promedio).toLocaleString()}`, icon: 'fa-coins' },
          { label: 'S/ Máx.',  value: `S/ ${stats.sueldo_maximo.toLocaleString()}`, icon: 'fa-arrow-up' },
        ].map(k => (
          <div key={k.label} className="bg-gray-50 rounded-xl p-4 text-center">
            <i className={`fas ${k.icon} text-peru-red text-lg mb-2 block`} />
            <p className="font-heading font-700 text-xl text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-500">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Por contrato */}
      <StatBars
        title="Por Tipo de Contrato"
        icon="fa-file-contract"
        items={stats.por_contrato.map(x => ({ label: x.tipo, count: x.count }))}
        max={maxContrato}
      />

      {/* Por nivel */}
      <StatBars
        title="Por Nivel"
        icon="fa-graduation-cap"
        items={stats.por_nivel.map(x => ({ label: x.nivel, count: x.count }))}
        max={maxNivel}
      />

      {/* Top ubicaciones */}
      <div>
        <h4 className="font-heading font-600 text-gray-900 mb-3 flex items-center gap-2">
          <i className="fas fa-map-marker-alt text-peru-red text-sm" /> Top Ubicaciones
        </h4>
        <ol className="space-y-2">
          {stats.top_ubicaciones.slice(0, 8).map((u, i) => (
            <li key={u.ubicacion} className="flex items-center gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-peru-red/10 text-peru-red text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 text-gray-700">{u.ubicacion}</span>
              <span className="font-semibold text-gray-900">{u.count}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function StatBars({
  title, icon, items, max,
}: {
  title: string; icon: string; items: { label: string; count: number }[]; max: number
}) {
  return (
    <div>
      <h4 className="font-heading font-600 text-gray-900 mb-3 flex items-center gap-2">
        <i className={`fas ${icon} text-peru-red text-sm`} /> {title}
      </h4>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.label}>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{item.label}</span>
              <span className="font-semibold">{item.count}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-peru-red rounded-full progress-bar"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-14 bg-gray-100 rounded-xl" />
      ))}
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
      </div>
      {[1, 2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl" />)}
    </div>
  )
}
