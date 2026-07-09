import { Fragment, type CSSProperties } from 'react'
import type { Cronograma, CronogramaEtapa } from '@/types/convocatoria'
import { ESTADO_ETAPA_CLS } from '@/lib/convocatoria'

// Tabla tipo Gantt para cronogramas PSEP (grupos + responsable + estado + semana).
// Las filas del scraper viejo llegan sin `semana` → se cae a la lista simple.
// Sin 'use client': se usa igual en la página estática y dentro del slide panel.

type EstadoKey = 'completado' | 'en curso' | 'pendiente'

function estadoKey(estado: string | null): EstadoKey {
  const k = (estado ?? '').toLowerCase().replace(/_/g, ' ')
  return k === 'completado' || k === 'en curso' ? k : 'pendiente'
}

const ESTADO_ICON: Record<EstadoKey, string> = {
  completado: 'fas fa-check',
  'en curso': 'fas fa-clock',
  pendiente:  'far fa-circle',
}

const BAR_CLS: Record<EstadoKey, string> = {
  completado: 'bg-green-600',
  'en curso': 'bg-amber-500',
  pendiente:  'bg-gray-400 opacity-40',
}

// Matching por prefijo sin tildes para tolerar "Comité de Selección", "COMITE", etc.
function responsableAvatar(r: string): { color: string; initial: string } {
  const key = r.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const color =
    key.startsWith('comit')      ? '#7c3aed' :
    key.startsWith('registro')   ? '#0d9488' :
    key.startsWith('postulante') ? '#2450b8' : '#6b7280'
  return { color, initial: (r.trim()[0] ?? '?').toUpperCase() }
}

function barStyle(semana: { desde: number; hasta: number }, numWeeks: number): CSSProperties {
  const desde = Math.min(Math.max(semana.desde, 1), numWeeks)
  const hasta = Math.min(Math.max(semana.hasta, desde), numWeeks)
  return {
    left:  `calc(${((desde - 1) / numWeeks) * 100}% + 4px)`,
    width: `calc(${((hasta - desde + 1) / numWeeks) * 100}% - 8px)`,
  }
}

// 'YYYY-MM-DD…' → 'DD/MM/YYYY' sin pasar por Date (evita desfase de zona horaria)
function formatCalculadoAl(s: string | null | undefined): string | null {
  if (!s) return null
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s
}

function fechaEtapa(e: CronogramaEtapa): string {
  return e.fechaTexto ?? [e.fechaIni, e.fechaFin].filter(Boolean).join(' — ')
}

function EstadoPill({ estado }: { estado: string | null }) {
  if (!estado) return <span className="text-xs text-gray-300">—</span>
  return (
    <span className={`tag whitespace-nowrap ${ESTADO_ETAPA_CLS[estado.toLowerCase()] ?? 'bg-gray-100 text-gray-500'}`}>
      <i className={`${ESTADO_ICON[estadoKey(estado)]} mr-1 text-[9px]`} />
      {estado}
    </span>
  )
}

function EtapaRow({ etapa: e, numWeeks, cols, weekLines }: {
  etapa: CronogramaEtapa
  numWeeks: number
  cols: CSSProperties
  weekLines: CSSProperties
}) {
  const fecha = fechaEtapa(e)
  return (
    <div className="grid items-center border-t border-gray-100" style={cols}>
      <div className="px-3 py-2">
        <p className="text-sm font-semibold text-gray-800 leading-snug">{e.actividad}</p>
        {fecha && <p className="text-[11px] text-gray-400 mt-0.5">{fecha}</p>}
      </div>
      <div className="flex min-w-0 items-center gap-1.5 px-1.5 text-xs text-gray-500">
        {e.responsable ? (() => {
          const { color, initial } = responsableAvatar(e.responsable)
          return (
            <>
              <span
                className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {initial}
              </span>
              <span className="truncate" title={e.responsable}>{e.responsable}</span>
            </>
          )
        })() : <span className="text-gray-300">—</span>}
      </div>
      <div className="px-1.5">
        <EstadoPill estado={e.estado} />
      </div>
      <div className="relative h-full min-h-[38px]" style={{ gridColumn: '4 / -1', ...weekLines }}>
        {e.semana && (
          <span
            className={`absolute top-1/2 h-[11px] -translate-y-1/2 rounded-full ${BAR_CLS[estadoKey(e.estado)]}`}
            style={barStyle(e.semana, numWeeks)}
          />
        )}
      </div>
    </div>
  )
}

// Fallback para cronogramas sin datos de semanas (scraper plano legacy):
// misma lista agrupada que se renderizaba antes del Gantt.
function ListaSimple({ cronograma }: { cronograma: Cronograma }) {
  return (
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
                    {fechaEtapa(e)}
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
  )
}

export default function CronogramaGantt({ cronograma }: { cronograma: Cronograma }) {
  const etapas = cronograma.grupos.flatMap(g => g.etapas)
  const hasGantt = etapas.some(e => e.semana !== null)
  if (!hasGantt) return <ListaSimple cronograma={cronograma} />

  // Semanas visibles: totalSemanas cubriendo siempre el mayor `hasta`
  // (max con `desde` por si vienen invertidos); cap para proteger el layout
  const maxHasta = etapas.reduce(
    (m, e) => (e.semana ? Math.max(m, e.semana.desde, e.semana.hasta) : m), 0)
  const numWeeks = Math.min(Math.max(cronograma.totalSemanas ?? 0, maxHasta, 1), 26)

  const cols: CSSProperties = {
    gridTemplateColumns: `minmax(240px,1.5fr) 128px 122px repeat(${numWeeks}, 42px)`,
  }
  const weekLines: CSSProperties = {
    backgroundImage: `repeating-linear-gradient(to right, #f3f4f6 0 1px, transparent 1px calc(100% / ${numWeeks}))`,
  }

  const total = cronograma.totalEtapas
  const fechaCalc = formatCalculadoAl(cronograma.calculadoAl)
  const nota = total || fechaCalc
    ? [
        total && total !== etapas.length
          ? `${etapas.length} de las ${total} etapas del proceso`
          : `${etapas.length} etapas del proceso`,
        fechaCalc ? `estado al ${fechaCalc}` : null,
      ].filter(Boolean).join(' — ')
    : null

  const headCls = 'py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500'

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <div className="text-sm" style={{ minWidth: 490 + 42 * numWeeks }}>
          <div className="grid items-center bg-gray-50" style={cols}>
            <div className={`${headCls} px-3`}>Paso / Actividad</div>
            <div className={`${headCls} px-1.5`}>Responsable</div>
            <div className={`${headCls} px-1.5`}>Estado</div>
            {Array.from({ length: numWeeks }, (_, i) => (
              <div key={i} className={`${headCls} text-center`}>Sem {i + 1}</div>
            ))}
          </div>

          {cronograma.grupos.map(g => (
            <Fragment key={g.nombre}>
              <div className="flex items-center gap-2 border-t border-gray-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900">
                {g.nombre}
                <span className="rounded-full bg-white px-2 py-px text-[11px] font-semibold">
                  {g.etapas.length}
                </span>
              </div>
              {g.etapas.map((e, i) => (
                <EtapaRow key={i} etapa={e} numWeeks={numWeeks} cols={cols} weekLines={weekLines} />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
      {nota && <p className="mt-2 text-xs text-gray-400">{nota}</p>}
    </>
  )
}
