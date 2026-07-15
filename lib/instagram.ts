// Publicación automática de convocatorias en Instagram (feed) vía la Graph API.
// Se dispara desde el Route Handler del scraper (app/api/convocatorias/route.ts)
// solo para convocatorias NUEVAS y activas. La imagen es la misma tarjeta que
// genera app/api/og/convocatoria/[slug] (?format=feed), servida en una URL
// pública que Meta descarga por `image_url`.
//
// Config por variables de entorno (ver .env.example):
//   IG_BUSINESS_ACCOUNT_ID  — ID de la cuenta de Instagram (el IG user id del
//                             token; en el flujo Instagram Login es el número
//                             que muestra "Agregar cuenta", ej. 178414161...)
//   IG_ACCESS_TOKEN         — token de acceso de larga duración
//   IG_API_HOST             — opcional, default 'graph.instagram.com' (flujo
//                             Instagram Login). Usar 'graph.facebook.com' solo
//                             si se migra al flujo Facebook Login.
//   IG_GRAPH_VERSION        — opcional, default 'v21.0'
//   IG_MAX_POR_REQUEST      — opcional, tope de posts por request (default 5)
//   IG_DRY_RUN              — '1' para registrar en consola sin publicar

import { BASE_URL } from '@/lib/seo'
import { parseFechaISO, hoyLima } from '@/lib/fechas-anuncio'
import { ventanaPostulacion } from '@/lib/convocatoria'

export interface ConvocatoriaPost {
  slug: string
  titulo: string
  entidad: string
  sueldo: number
  ubicacion: string
  tipoContrato: string
  fechaLimite: string
  fechaInicioPostulacion: string | null
  nivel: string[]
  modalidad: string
  linkOficial: string
  tieneDocumentos: boolean   // hay PDFs oficiales (bases, cronograma) en la web
}

// Flujo elegido: Instagram API con inicio de sesión (Instagram Login) → host
// graph.instagram.com. Los endpoints de publicación /{ig-id}/media y
// /media_publish son idénticos a los de graph.facebook.com; solo cambia el host.
const HOST = process.env.IG_API_HOST || 'graph.instagram.com'
const GRAPH = `https://${HOST}/${process.env.IG_GRAPH_VERSION || 'v21.0'}`
const MS_DIA = 86_400_000

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export function instagramConfigurado(): boolean {
  return !!(process.env.IG_ACCESS_TOKEN && process.env.IG_BUSINESS_ACCOUNT_ID)
}

// ── Texto de la tarjeta / caption ──────────────────────────────────────────

function fmtSueldo(sueldo: number): string {
  return sueldo > 0 ? `S/ ${sueldo.toLocaleString('es-PE')}` : 'Por definir'
}

// Misma regla de urgencia que la tarjeta y el proyecto
function textoUrgencia(c: ConvocatoriaPost): string | null {
  const finMs = parseFechaISO(c.fechaLimite)
  const hoyMs = parseFechaISO(hoyLima())
  if (finMs === null || hoyMs === null) return null
  const iniMs = parseFechaISO(c.fechaInicioPostulacion)
  const dias = Math.round((finMs - hoyMs) / MS_DIA)
  if (dias < 0) return null
  if (iniMs !== null && hoyMs < iniMs) {
    const d = Math.round((iniMs - hoyMs) / MS_DIA)
    return `Abre en ${d} día${d === 1 ? '' : 's'}`
  }
  if (dias === 0) return '¡Cierra hoy!'
  return `Cierra en ${dias} día${dias === 1 ? '' : 's'}`
}

function toTag(s: string): string {
  const clean = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
  return clean ? '#' + clean : ''
}

// Niveles sin valor como hashtag (el scraper a veces manda "No especificado")
const NIVELES_JUNK = new Set(['noespecificado', 'noaplica', 'ninguno', 'otros'])

function nivelUtil(n: string): boolean {
  const norm = n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/gi, '').toLowerCase()
  return norm.length > 0 && !NIVELES_JUNK.has(norm)
}

export function construirHashtags(c: ConvocatoriaPost): string {
  const region = c.ubicacion.includes(' - ') ? c.ubicacion.split(' - ')[0] : c.ubicacion
  const entidadNorm = c.entidad.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const esPoderJudicial = /poder judicial|corte superior|judicial/.test(entidadNorm)
  const tags = [
    '#EmpleoPublico', '#TrabajoPeru', '#ConvocatoriasPeru', '#Convocape',
    esPoderJudicial ? '#PoderJudicial' : '',
    toTag('Convocatoria ' + c.tipoContrato),
    toTag('Trabajo ' + region),
    ...c.nivel.filter(nivelUtil).map(toTag),
  ].filter(Boolean)
  return Array.from(new Set(tags)).join(' ')
}

export function imagenUrl(slug: string): string {
  return `${BASE_URL}/api/og/convocatoria/${slug}?format=feed`
}

export function construirCaption(c: ConvocatoriaPost): string {
  const urgencia = textoUrgencia(c)
  // Ventana de postulación con fechas concretas (no se pone vieja como el contador)
  const ventana = ventanaPostulacion(c.fechaInicioPostulacion, c.fechaLimite)
  const enlace = `${BASE_URL}/convocatorias/${c.slug}`.replace(/^https?:\/\//, '')
  const lineas = [
    `📢 Nueva convocatoria: ${c.titulo}`,
    `🏛️ ${c.entidad}`,
    `💰 Sueldo: ${fmtSueldo(c.sueldo)}`,
    `📍 ${c.ubicacion}`,
    ventana ? `🗓️ ${ventana.tramo}` : null,
    urgencia ? `⏰ ${urgencia}` : null,
    c.tieneDocumentos ? '📄 Tenemos las bases y todos los documentos oficiales en convocape.com' : null,
    '',
    `👉 Postula en ${enlace}`,
    '(link en la bio 👆)',
    '',
    construirHashtags(c),
  ]
  return lineas.filter(l => l !== null).join('\n')
}

// ── Graph API ──────────────────────────────────────────────────────────────

async function apiPost(path: string, params: Record<string, string>): Promise<{ id: string }> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, access_token: process.env.IG_ACCESS_TOKEN! }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `HTTP ${res.status}`)
  }
  return json
}

// El contenedor de imagen suele quedar listo al instante, pero Meta recomienda
// confirmar status_code === 'FINISHED' antes de publicar.
async function esperarContenedor(id: string): Promise<void> {
  for (let i = 0; i < 5; i++) {
    const res = await fetch(
      `${GRAPH}/${id}?fields=status_code&access_token=${process.env.IG_ACCESS_TOKEN!}`
    )
    const json = await res.json().catch(() => ({}))
    if (json.status_code === 'FINISHED') return
    if (json.status_code === 'ERROR') throw new Error('contenedor en estado ERROR')
    await sleep(1000)
  }
  // Si no llegó a FINISHED, intentamos publicar igual (para imágenes casi siempre lo está)
}

export async function publicarConvocatoria(
  c: ConvocatoriaPost
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const igId = process.env.IG_BUSINESS_ACCOUNT_ID!
  const image_url = imagenUrl(c.slug)
  const caption = construirCaption(c)

  if (process.env.IG_DRY_RUN === '1') {
    console.log(`[instagram][dry-run] ${c.slug}\n  image_url: ${image_url}\n  caption:\n${caption}\n`)
    return { ok: true, id: 'dry-run' }
  }

  try {
    const container = await apiPost(`${igId}/media`, { image_url, caption })
    await esperarContenedor(container.id)
    const published = await apiPost(`${igId}/media_publish`, { creation_id: container.id })
    return { ok: true, id: published.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'error desconocido' }
  }
}

// Publica un lote de convocatorias nuevas, respetando el tope diario de la API
// (Instagram limita publicaciones por API por cuenta en 24h). Nunca lanza:
// registra el resultado de cada una para no romper la respuesta al scraper.
export async function publicarNuevasEnInstagram(nuevas: ConvocatoriaPost[]): Promise<void> {
  if (!instagramConfigurado() || nuevas.length === 0) return

  const max = Number(process.env.IG_MAX_POR_REQUEST || 5)
  const lote = nuevas.slice(0, max)

  for (const c of lote) {
    const r = await publicarConvocatoria(c)
    if (r.ok) console.log(`[instagram] publicada ${c.slug} → ${r.id}`)
    else console.error(`[instagram] falló ${c.slug}: ${r.error}`)
    await sleep(1500)
  }

  if (nuevas.length > lote.length) {
    console.warn(
      `[instagram] ${nuevas.length - lote.length} convocatoria(s) no publicadas este request (tope ${max})`
    )
  }
}
