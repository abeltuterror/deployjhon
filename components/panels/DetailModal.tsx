'use client'
import { useEffect, useState } from 'react'
import { useDetail } from '@/providers/DetailProvider'
import { useAuth } from '@/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { getConvocatoriaDetail, toggleGuardado } from '@/app/actions'
import type { ConvocatoriaDetail } from '@/types/convocatoria'
import {
  normalizeCronograma, gruposDeRequisitos, documentosOficialesVisibles,
  etiquetaDocumento, postulacionAunNoAbre, ESTADO_ETAPA_CLS,
} from '@/lib/convocatoria'
import CalendarButton from '@/components/ui/CalendarButton'
import SaveAuthPromptModal from '@/components/ui/SaveAuthPromptModal'

const CONTRATO_COLORS: Record<string, string> = {
  'CAS':      'bg-blue-100 text-blue-700',
  'D.L. 728': 'bg-purple-100 text-purple-700',
  'D.L. 276': 'bg-emerald-100 text-emerald-700',
  '728':      'bg-purple-100 text-purple-700',
}
const NIVEL_COLORS: Record<string, string> = {
  'Técnico':       'bg-orange-100 text-orange-700',
  'Universitario': 'bg-cyan-100 text-cyan-700',
  'Maestría':      'bg-violet-100 text-violet-700',
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function calcDaysLeft(fechaLimite: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(fechaLimite + 'T00:00:00').getTime() - today.getTime()) / 86_400_000)
}

export default function DetailModal() {
  const { openId, closeDetail } = useDetail()
  const [data, setData]         = useState<ConvocatoriaDetail | null>(null)
  const [loading, setLoading]   = useState(false)
  const [visible, setVisible]   = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    if (openId === null) {
      setPanelOpen(false)
      const t = setTimeout(() => { setVisible(false); setData(null) }, 400)
      return () => clearTimeout(t)
    }
    setVisible(true)
    setLoading(true)
    setData(null)
    requestAnimationFrame(() => setPanelOpen(true))
    getConvocatoriaDetail(openId).then(d => {
      setData(d)
      setLoading(false)
    })
  }, [openId])

  useEffect(() => {
    if (openId === null) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDetail() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [openId, closeDetail])

  useEffect(() => {
    document.body.style.overflow = visible ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [visible])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="modal-overlay absolute inset-0" onClick={closeDetail} />
      <div
        className={`absolute inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl overflow-y-auto slide-panel ${panelOpen ? '' : 'closed'}`}
      >
        <div className="p-6 sm:p-8">
          {loading ? (
            <Skeleton />
          ) : data ? (
            <Content data={data} onClose={closeDetail} />
          ) : (
            <div className="text-center py-20 text-gray-400">No se encontró la convocatoria.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-gray-200 rounded-full" />
          <div className="h-6 w-24 bg-gray-200 rounded-full" />
        </div>
        <div className="h-8 w-8 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-8 bg-gray-200 rounded w-3/4" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl" />
        ))}
      </div>
      <div className="space-y-2 pt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-100 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
        ))}
      </div>
    </div>
  )
}

function Content({ data: c, onClose }: { data: ConvocatoriaDetail; onClose: () => void }) {
  const entidad   = c.entidades?.nombre_oficial ?? ''
  const daysLeft  = calcDaysLeft(c.fecha_limite)
  const isGeneric = !!(c.funciones?.[0]?.includes('según perfil'))

  // Campos del extractor PSEP (null/vacíos en filas del scraper viejo)
  const cronograma        = normalizeCronograma(c.cronograma)
  const reqGrupos         = gruposDeRequisitos(c.requerimientos, c.requisitos)
  const docsOficiales     = documentosOficialesVisibles(c.documentos_oficiales)
  const postulacionFutura = postulacionAunNoAbre(c.fecha_inicio_postulacion)
  const { user }  = useAuth()
  const [supabase] = useState(() => createClient())
  const [showPrompt, setShowPrompt] = useState(false)

  const [saved, setSaved] = useState(() => {
    if (typeof window === 'undefined') return false
    return (JSON.parse(localStorage.getItem('cp_saved') || '[]') as number[]).includes(c.id)
  })

  // Si hay sesión, sincroniza estado real desde la BD
  useEffect(() => {
    if (!user) return
    supabase
      .from('guardados')
      .select('id')
      .eq('user_id', user.id)
      .eq('convocatoria_id', c.id)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data))
  }, [user, c.id, supabase])

  const toggleSave = async () => {
    const next = !saved
    setSaved(next) // optimistic

    // Siempre actualiza localStorage (funciona sin sesión)
    const stored = JSON.parse(localStorage.getItem('cp_saved') || '[]') as number[]
    localStorage.setItem('cp_saved', JSON.stringify(
      next ? [...stored, c.id] : stored.filter(id => id !== c.id)
    ))

    // Si hay sesión, persiste en BD
    if (user) {
      const actual = await toggleGuardado(c.id, user.id)
      setSaved(actual)
    }
  }

  return (
    <>
      {/* Header: tags + close */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-wrap gap-1.5">
          <span className={`tag ${CONTRATO_COLORS[c.tipo_contrato] ?? 'bg-gray-100 text-gray-700'} text-sm`}>
            {c.tipo_contrato}
          </span>
          {c.nivel.map(n => (
            <span key={n} className={`tag ${NIVEL_COLORS[n] ?? 'bg-gray-100 text-gray-700'}`}>{n}</span>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          aria-label="Cerrar detalle"
        >
          <i className="fas fa-times text-gray-500" />
        </button>
      </div>

      <h2 className="font-heading font-700 text-2xl text-gray-900 mb-4">{c.titulo}</h2>

      {/* Aviso: la ventana de postulación aún no abre */}
      {postulacionFutura && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <i className="far fa-clock text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">La postulación aún no abre</p>
            <p className="text-amber-700 text-sm mt-0.5">
              Podrás postular desde el {formatDate(c.fecha_inicio_postulacion!)} hasta el {formatDate(c.fecha_limite)}.
            </p>
          </div>
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <InfoCell label="Entidad"      value={entidad} />
        <InfoCell label="Ubicación"    value={c.ubicacion} />
        <InfoCell label="Sueldo"       value={`S/ ${c.sueldo.toLocaleString()}`} />
        <InfoCell label="Modalidad"    value={c.modalidad} />
        <InfoCell
          label="Fecha límite"
          value={`${formatDate(c.fecha_limite)}${daysLeft > 0 && daysLeft <= 5 ? ` (${daysLeft} días)` : ''}`}
          className={daysLeft > 0 && daysLeft <= 5 ? 'text-red-600' : 'text-gray-800'}
        />
        <InfoCell label="Publicación"  value={formatDate(c.fecha_pub)} />
        {c.unidad && <InfoCell label="Dependencia" value={c.unidad} />}
        {c.nro_convocatoria && <InfoCell label="N.º convocatoria" value={c.nro_convocatoria} />}
        {c.codigo_plaza && <InfoCell label="Código de plaza" value={c.codigo_plaza} />}
        {(c.vacantes ?? 1) > 1 && <InfoCell label="Vacantes" value={String(c.vacantes)} />}
        {c.fecha_inicio_postulacion && (
          <InfoCell label="Inicio de postulación" value={formatDate(c.fecha_inicio_postulacion)} />
        )}
        {c.fecha_resultados && <InfoCell label="Resultados" value={formatDate(c.fecha_resultados)} />}
      </div>

      {/* Descripción */}
      {c.descripcion && (
        <Section icon="fa-align-left" title="Descripción">
          <p className="text-gray-600 text-sm leading-relaxed">{c.descripcion}</p>
        </Section>
      )}

      {/* Requisitos — agrupados por categoría (PSEP) o lista plana (scraper viejo) */}
      {reqGrupos.length > 0 ? (
        <Section icon="fa-check-circle" title="Requisitos">
          <div className="space-y-4">
            {reqGrupos.map(g => (
              <div key={g.label}>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">{g.label}</h4>
                <ul className="space-y-2">
                  {g.items.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <i className="fas fa-check text-green-500 text-xs mt-1 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      ) : c.requisitos && c.requisitos.length > 0 ? (
        <Section icon="fa-check-circle" title="Requisitos">
          <ul className="space-y-2">
            {c.requisitos.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <i className="fas fa-check text-green-500 text-xs mt-1 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Funciones */}
      {c.funciones && c.funciones.length > 0 && (
        <Section icon="fa-tasks" title="Funciones">
          <ul className="space-y-2">
            {c.funciones.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <i className="fas fa-arrow-right text-peru-red text-xs mt-1 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          {isGeneric && (
            <p className="text-xs text-amber-600 mt-2 italic">
              <i className="fas fa-info-circle mr-1" />
              Funciones referenciales. Consultar convocatoria oficial para detalle completo.
            </p>
          )}
        </Section>
      )}

      {/* Cronograma del proceso (PSEP) */}
      {cronograma && (
        <Section icon="fa-calendar-alt" title="Cronograma del proceso">
          <div className="space-y-4">
            {cronograma.grupos.map(g => (
              <div key={g.nombre}>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">{g.nombre}</h4>
                <ul className="space-y-2">
                  {g.etapas.map((e, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <span className="text-gray-700">{e.actividad}</span>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {e.fechaTexto ?? [e.fechaIni, e.fechaFin].filter(Boolean).join(' — ')}
                          {e.responsable && ` · ${e.responsable}`}
                        </div>
                      </div>
                      {e.estado && (
                        <span className={`tag shrink-0 ${ESTADO_ETAPA_CLS[e.estado.toLowerCase()] ?? 'bg-gray-100 text-gray-500'}`}>
                          {e.estado}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Documentos */}
      {c.documentos && c.documentos.length > 0 && (
        <Section icon="fa-file-alt" title="Documentos necesarios" className="mb-8">
          <ul className="space-y-2">
            {c.documentos.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <i className="fas fa-paperclip text-gray-400 text-xs mt-1 shrink-0" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Documentos oficiales (PDFs de la fuente — PSEP) */}
      {docsOficiales.length > 0 && (
        <Section icon="fa-file-pdf" title="Documentos oficiales" className="mb-8">
          <ul className="space-y-2">
            {docsOficiales.map((d, i) => (
              <li key={i}>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-peru-red hover:underline"
                >
                  <i className="fas fa-file-pdf text-xs shrink-0" />
                  <span>{etiquetaDocumento(d)}</span>
                  <i className="fas fa-external-link-alt text-[10px] text-gray-400" />
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Sticky actions */}
      {showPrompt && <SaveAuthPromptModal onClose={() => setShowPrompt(false)} />}
      <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-100 space-y-2">
        <div className="flex gap-3">
          <button
            onClick={user ? toggleSave : () => setShowPrompt(true)}
            className={`flex-1 px-5 py-3 rounded-xl border-2 font-semibold text-sm transition-colors flex items-center justify-center gap-2
              ${saved && user
                ? 'border-peru-red bg-peru-light text-peru-red'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            <i className={`${saved && user ? 'fas' : 'far'} fa-bookmark`} />
            {saved && user ? 'Guardado' : 'Guardar'}
          </button>

          {c.link_oficial ? (
            <a
              href={c.link_oficial}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-5 py-3 rounded-xl bg-peru-red hover:bg-peru-dark text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-peru-red/20"
            >
              <i className="fas fa-paper-plane" /> Postular
            </a>
          ) : (
            <button disabled className="flex-1 px-5 py-3 rounded-xl bg-gray-200 text-gray-400 font-semibold text-sm flex items-center justify-center gap-2">
              <i className="fas fa-paper-plane" /> Sin link disponible
            </button>
          )}
        </div>

        <CalendarButton
          titulo={c.titulo}
          fechaLimite={c.fecha_limite}
          entidad={entidad}
          ubicacion={c.ubicacion}
          slug={c.slug}
        />
      </div>

      {c.link_oficial && (
        <a
          href={c.link_oficial}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm text-gray-500 hover:text-peru-red mt-3 transition-colors"
        >
          <i className="fas fa-external-link-alt mr-1" /> Ver convocatoria oficial
        </a>
      )}
    </>
  )
}

function InfoCell({
  label, value, className = 'text-gray-800',
}: {
  label: string; value: string; className?: string
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-sm font-semibold ${className}`}>{value}</div>
    </div>
  )
}

function Section({
  icon, title, children, className = 'mb-6',
}: {
  icon: string; title: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={className}>
      <h3 className="font-heading font-600 text-lg text-gray-900 mb-3 flex items-center gap-2">
        <i className={`fas ${icon} text-peru-red text-sm`} /> {title}
      </h3>
      {children}
    </div>
  )
}
