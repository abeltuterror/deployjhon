import { Fragment, type CSSProperties } from 'react'
import type { Cronograma, CronogramaEtapa } from '@/types/convocatoria'
import { ESTADO_ETAPA_CLS } from '@/lib/convocatoria'

// Tabla tipo Gantt para el cronograma del proceso.
// Si el extractor no envía `semana`/`estado`, se estiman desde fechaIni/fechaFin:
// semanas relativas al lunes de la semana de la etapa más temprana, y estado
// comparando el rango de fechas contra hoy. Solo si tampoco hay fechas
// parseables se cae a la lista simple anterior.
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

// ─── Derivación de semana/estado/grupo/responsable desde el anuncio ─────

const MS_DIA = 86_400_000
const MS_SEMANA = 7 * MS_DIA

function normalizarTexto(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

// "listado de postulantes" va antes que "publicacion": esa etapa es del comité,
// no de difusión, aunque su nombre empiece con "Publicación del listado…"
function grupoDe(actividad: string): string {
  const n = normalizarTexto(actividad)
  if (n.includes('postulacion web') || n.includes('listado de postulantes')) return 'Postulación'
  if (n.includes('resultados finales') || n.includes('ganador') ||
      n.includes('suscripcion') || n.includes('registro de contrato')) return 'Resultados y contratación'
  if (n.includes('aprobacion') || n.includes('publicacion')) return 'Convocatoria y difusión'
  return 'Evaluación'
}

const ORDEN_GRUPOS = ['Convocatoria y difusión', 'Postulación', 'Evaluación', 'Resultados y contratación']

function responsableDe(actividad: string): string {
  const n = normalizarTexto(actividad)
  if (n.includes('listado de postulantes')) return 'Comité'
  if (['postulacion web', 'presentacion', 'consultas', 'suscripcion'].some(k => n.includes(k))) return 'Postulante'
  if (n.includes('publicacion')) return 'Registro'
  return 'Comité'
}

// 'YYYY-MM-DD…' → ms a medianoche local (evita desfase de zona horaria de new Date(string))
function parseFecha(s: string | null): number | null {
  if (!s) return null
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null
}

function hoyLocal(): number {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

const MESES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, setiembre: 8, septiembre: 8, octubre: 9,
  noviembre: 10, diciembre: 11,
}

// "Del 09 de Julio del 2026 al 22 de Julio del 2026" → 09/07–22/07.
// "21 y 22 de Julio del 2026" → 21/07–22/07. "No aplica" → null.
// Recorre los tokens: los números de 1–2 cifras son días en espera, un mes
// los consume, y el año (4 cifras) aplica a todo el texto.
function parseFechaTexto(texto: string | null): { ini: number; fin: number } | null {
  if (!texto) return null
  const tokens = normalizarTexto(texto).match(/\d+|[a-z]+/g) ?? []
  const diasEnEspera: number[] = []
  const fechas: { dia: number; mes: number }[] = []
  let anio: number | null = null

  for (const t of tokens) {
    if (/^\d+$/.test(t)) {
      const n = Number(t)
      if (t.length === 4) anio = n
      else if (n >= 1 && n <= 31) diasEnEspera.push(n)
    } else if (t in MESES) {
      fechas.push(...diasEnEspera.splice(0).map(dia => ({ dia, mes: MESES[t] })))
    }
  }
  if (fechas.length === 0 || anio === null) return null

  const ms = fechas.map(f => new Date(anio as number, f.mes, f.dia).getTime())
  return { ini: Math.min(...ms), fin: Math.max(...ms) }
}

function rangoEtapa(e: CronogramaEtapa): { ini: number; fin: number } | null {
  // El texto escrito del anuncio manda: el extractor lo copia verbatim y es más
  // confiable que sus fechaIni/fechaFin (a veces toma el "26" de "2026" como día)
  const deTexto = parseFechaTexto(e.fechaTexto)
  if (deTexto) return deTexto

  const a = parseFecha(e.fechaIni)
  const b = parseFecha(e.fechaFin)
  if (a === null && b === null) return null
  const ini = a ?? (b as number)
  return { ini, fin: Math.max(ini, b ?? ini) }
}

function deriveCronograma(c: Cronograma): Cronograma | null {
  const rangos = c.grupos.flatMap(g => g.etapas).map(rangoEtapa).filter(r => r !== null)
  if (rangos.length === 0) return null

  const minIni = Math.min(...rangos.map(r => r.ini))
  const lunesBase = minIni - ((new Date(minIni).getDay() + 6) % 7) * MS_DIA
  const semanaDe = (ms: number) => Math.floor((ms - lunesBase) / MS_SEMANA) + 1
  const hoy = hoyLocal()

  const completar = (e: CronogramaEtapa): CronogramaEtapa => {
    const r = rangoEtapa(e)
    return {
      ...e,
      responsable: e.responsable ?? responsableDe(e.actividad),
      ...(r && {
        semana: e.semana ?? { desde: semanaDe(r.ini), hasta: semanaDe(r.fin) },
        estado: e.estado ?? (r.fin < hoy ? 'Completado' : r.ini <= hoy ? 'En curso' : 'Pendiente'),
      }),
    }
  }

  // Si todo llega en un único grupo genérico ("Cronograma"), se reclasifica
  // por fase real según el texto de cada actividad; grupos con nombre se respetan
  const esGenerico = c.grupos.length === 1 &&
    ['cronograma', ''].includes(normalizarTexto(c.grupos[0].nombre))

  if (!esGenerico) {
    return { ...c, grupos: c.grupos.map(g => ({ nombre: g.nombre, etapas: g.etapas.map(completar) })) }
  }

  const porGrupo = new Map<string, CronogramaEtapa[]>()
  for (const e of c.grupos[0].etapas) {
    const nombre = grupoDe(e.actividad)
    if (!porGrupo.has(nombre)) porGrupo.set(nombre, [])
    porGrupo.get(nombre)!.push(completar(e))
  }

  return {
    ...c,
    grupos: ORDEN_GRUPOS.filter(n => porGrupo.has(n)).map(n => ({ nombre: n, etapas: porGrupo.get(n)! })),
  }
}

// 'YYYY-MM-DD…' → 'DD/MM/YYYY' sin pasar por Date
function formatCalculadoAl(s: string | null | undefined): string | null {
  if (!s) return null
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s
}

function fechaEtapa(e: CronogramaEtapa): string {
  return e.fechaTexto ?? [e.fechaIni, e.fechaFin].filter(Boolean).join(' — ')
}

// ─── Subcomponentes ─────────────────────────────────────────────────────

function EstadoPill({ estado }: { estado: string | null }) {
  if (!estado) return <span className="text-xs text-gray-300">—</span>
  return (
    <span className={`tag whitespace-nowrap ${ESTADO_ETAPA_CLS[estado.toLowerCase()] ?? 'bg-gray-100 text-gray-500'}`}>
      <i className={`${ESTADO_ICON[estadoKey(estado)]} mr-1 text-[9px]`} />
      {estado}
    </span>
  )
}

function EtapaRow({ etapa: e, numWeeks, cols, weekLines, weeksCol, showResp }: {
  etapa: CronogramaEtapa
  numWeeks: number
  cols: CSSProperties
  weekLines: CSSProperties
  weeksCol: string
  showResp: boolean
}) {
  const fecha = fechaEtapa(e)
  return (
    <div className="grid items-center border-t border-gray-100" style={cols}>
      <div className="px-3 py-2">
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-4" title={e.actividad}>
          {e.actividad}
        </p>
        {fecha && <p className="text-[11px] text-gray-400 mt-0.5">{fecha}</p>}
      </div>
      {showResp && (
        <div className="flex min-w-0 items-center gap-1.5 px-1.5 text-xs text-gray-500">
          {e.responsable ? (() => {
            const { color, initial } = responsableAvatar(e.responsable)
            return (
              <>
                <span
                  className="grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {initial}
                </span>
                <span className="truncate" title={e.responsable}>{e.responsable}</span>
              </>
            )
          })() : <span className="text-gray-300">—</span>}
        </div>
      )}
      <div className="px-1.5">
        <EstadoPill estado={e.estado} />
      </div>
      <div className="relative h-full min-h-9.5" style={{ gridColumn: weeksCol, ...weekLines }}>
        {e.semana && (
          <span
            className={`absolute top-1/2 h-2.75 -translate-y-1/2 rounded-full ${BAR_CLS[estadoKey(e.estado)]}`}
            style={barStyle(e.semana, numWeeks)}
          />
        )}
      </div>
    </div>
  )
}

// Fallback para cronogramas sin semanas ni fechas parseables:
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

// ─── Componente principal ───────────────────────────────────────────────

export default function CronogramaGantt({ cronograma }: { cronograma: Cronograma }) {
  let data = cronograma
  let derivado = false

  const tieneSemanas = cronograma.grupos.some(g => g.etapas.some(e => e.semana !== null))
  if (!tieneSemanas) {
    const derived = deriveCronograma(cronograma)
    if (!derived) return <ListaSimple cronograma={cronograma} />
    data = derived
    derivado = true
  }

  const etapas = data.grupos.flatMap(g => g.etapas)

  // Semanas visibles: totalSemanas cubriendo siempre el mayor `hasta`
  // (max con `desde` por si vienen invertidos); cap para proteger el layout
  const maxHasta = etapas.reduce(
    (m, e) => (e.semana ? Math.max(m, e.semana.desde, e.semana.hasta) : m), 0)
  const numWeeks = Math.min(Math.max(data.totalSemanas ?? 0, maxHasta, 1), 26)

  // La columna Responsable solo se muestra si alguna etapa la trae
  const showResp = etapas.some(e => e.responsable)
  const weeksCol = showResp ? '4 / -1' : '3 / -1'

  const cols: CSSProperties = {
    gridTemplateColumns: `minmax(240px,1.5fr)${showResp ? ' 128px' : ''} 122px repeat(${numWeeks}, 42px)`,
  }
  const weekLines: CSSProperties = {
    backgroundImage: `repeating-linear-gradient(to right, #f3f4f6 0 1px, transparent 1px calc(100% / ${numWeeks}))`,
  }

  const total = data.totalEtapas
  const fechaCalc = formatCalculadoAl(data.calculadoAl)
  const notaPartes = [
    total && total !== etapas.length
      ? `${etapas.length} de las ${total} etapas del proceso`
      : `${etapas.length} etapas del proceso`,
    fechaCalc ? `estado al ${fechaCalc}` : null,
    derivado ? 'vista estimada según las fechas y el texto del anuncio oficial' : null,
  ].filter(Boolean)
  const nota = total || fechaCalc || derivado ? notaPartes.join(' — ') : null

  const headCls = 'py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500'

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <div className="text-sm" style={{ minWidth: (showResp ? 490 : 362) + 42 * numWeeks }}>
          <div className="grid items-center bg-gray-50" style={cols}>
            <div className={`${headCls} px-3`}>Paso / Actividad</div>
            {showResp && <div className={`${headCls} px-1.5`}>Responsable</div>}
            <div className={`${headCls} px-1.5`}>Estado</div>
            {Array.from({ length: numWeeks }, (_, i) => (
              <div key={i} className={`${headCls} text-center`}>Sem {i + 1}</div>
            ))}
          </div>

          {data.grupos.map(g => (
            <Fragment key={g.nombre}>
              <div className="flex items-center gap-2 border-t border-gray-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900">
                {g.nombre}
                <span className="rounded-full bg-white px-2 py-px text-[11px] font-semibold">
                  {g.etapas.length}
                </span>
              </div>
              {g.etapas.map((e, i) => (
                <EtapaRow
                  key={i}
                  etapa={e}
                  numWeeks={numWeeks}
                  cols={cols}
                  weekLines={weekLines}
                  weeksCol={weeksCol}
                  showResp={showResp}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
      {nota && <p className="mt-2 text-xs text-gray-400">{nota}</p>}
    </>
  )
}
