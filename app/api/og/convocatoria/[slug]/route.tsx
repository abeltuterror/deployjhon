import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getConvocatoriaBySlug } from '@/app/actions'
import { parseFechaISO, hoyLima } from '@/lib/fechas-anuncio'
import { ventanaPostulacion } from '@/lib/convocatoria'
import type { ConvocatoriaDetail } from '@/types/convocatoria'

// Genera la tarjeta social de una convocatoria en 3 formatos (?format=):
//   feed  → 1080×1080  (post cuadrado de Instagram)
//   story → 1080×1920  (historia de Instagram)
//   og    → 1200×630   (og:image para SEO / WhatsApp / Twitter)
// Es una URL pública sin auth: la Graph API de Instagram (y los scrapers
// sociales) la piden directo por `image_url`. Sin fuentes externas a propósito
// —Satori no soporta woff2 y esta ruta también alimenta el og:image, así que no
// puede fallar en runtime—; se apoya en color, jerarquía y layout de marca.

export const runtime = 'nodejs'

const RED = '#D91023'          // peru-red
const INK = '#0F172A'          // slate-900 (fondo hero)
const INK2 = '#16213E'

// Logo oficial (public/logo.svg) embebido como data URI. Es el logotipo blanco
// diseñado para fondo oscuro. Si por algún motivo no se puede leer, se cae al
// wordmark de texto (fallback). viewBox 932.44 × 252.36 → ratio ~3.695.
const LOGO_RATIO = 932.44 / 252.36
const LOGO_DATA_URI: string | null = (() => {
  try {
    const svg = readFileSync(join(process.cwd(), 'public', 'logo.svg'), 'utf-8')
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  } catch {
    return null
  }
})()

type Formato = 'feed' | 'story' | 'og'

const SIZES: Record<Formato, { w: number; h: number }> = {
  feed:  { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
  og:    { w: 1200, h: 630 },
}

// Escalas tipográficas por formato (px)
const CFG: Record<Exclude<Formato, 'og'>, {
  pad: number; cardPad: number; radius: number; brand: number; tag: number
  title: number; entidad: number; label: number; salary: number; chip: number; foot: number; req: number
}> = {
  feed:  { pad: 64, cardPad: 60, radius: 36, brand: 40, tag: 24, title: 68, entidad: 34, label: 22, salary: 78, chip: 30, foot: 26, req: 26 },
  story: { pad: 84, cardPad: 76, radius: 44, brand: 52, tag: 30, title: 88, entidad: 44, label: 28, salary: 104, chip: 40, foot: 34, req: 34 },
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function fmtSueldo(sueldo: number): string {
  return sueldo > 0 ? `S/ ${sueldo.toLocaleString('es-PE')}` : 'Por definir'
}

function tituloSize(base: number, len: number): number {
  if (len > 90) return Math.round(base * 0.68)
  if (len > 60) return Math.round(base * 0.82)
  return base
}

// Estado de la ventana de postulación + color según la regla de urgencia
// del proyecto (1–3 rojo · 4–7 naranja · >7 verde · hoy naranja · vencida rojo).
function estadoChip(c: ConvocatoriaDetail): { text: string; color: string } {
  const finMs = parseFechaISO(c.fecha_limite)
  const hoyMs = parseFechaISO(hoyLima())
  if (finMs === null || hoyMs === null) return { text: 'Convocatoria abierta', color: '#16A34A' }

  const iniMs = parseFechaISO(c.fecha_inicio_postulacion)
  const dias = Math.round((finMs - hoyMs) / 86_400_000)

  if (dias < 0) return { text: 'Convocatoria cerrada', color: '#DC2626' }
  if (iniMs !== null && hoyMs < iniMs) {
    const d = Math.round((iniMs - hoyMs) / 86_400_000)
    return { text: `Abre en ${d} día${d === 1 ? '' : 's'}`, color: '#2563EB' }
  }
  if (dias === 0) return { text: '¡Cierra hoy!', color: '#EA580C' }
  const color = dias <= 3 ? '#DC2626' : dias <= 7 ? '#EA580C' : '#16A34A'
  return { text: `Cierra en ${dias} día${dias === 1 ? '' : 's'}`, color }
}

// Pill genérico
function Pill({ text, bg, fg, size, bold }: { text: string; bg: string; fg: string; size: number; bold?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: bg,
        color: fg,
        fontSize: size,
        fontWeight: bold ? 700 : 600,
        padding: `${Math.round(size * 0.45)}px ${Math.round(size * 0.9)}px`,
        borderRadius: 999,
        lineHeight: 1,
      }}
    >
      {text}
    </div>
  )
}

const clamp3 = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 3,
  overflow: 'hidden',
} as unknown as React.CSSProperties

// Logo de marca: usa public/logo.svg; si no carga, cae al wordmark de texto.
function BrandLogo({ height }: { height: number }) {
  if (LOGO_DATA_URI) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={LOGO_DATA_URI} height={height} width={Math.round(height * LOGO_RATIO)} alt="Convocape" />
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', fontSize: height, fontWeight: 800, letterSpacing: -1 }}>
      <span style={{ color: '#FFFFFF' }}>Convoca</span>
      <span style={{ color: RED }}>pe</span>
    </div>
  )
}

// ── Layout vertical (feed / story) ─────────────────────────────────────────
function Portrait({ c, fmt }: { c: ConvocatoriaDetail; fmt: 'feed' | 'story' }) {
  const s = CFG[fmt]
  const { w, h } = SIZES[fmt]
  const entidad = c.entidades?.nombre_oficial ?? 'Entidad del Estado'
  const chip = estadoChip(c)
  const titulo = c.titulo.length > 110 ? c.titulo.slice(0, 108) + '…' : c.titulo
  const isStory = fmt === 'story'
  const reqPreview = (c.req_preview ?? [])
    .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
    .slice(0, 3)
    .map(r => (r.length > 64 ? r.slice(0, 62) + '…' : r))
  // Fechas de postulación (sin el prefijo "Postulación:", que va como etiqueta)
  const ventana = ventanaPostulacion(c.fecha_inicio_postulacion, c.fecha_limite)
  const postulTexto = ventana ? ventana.tramo.replace(/^Postulación:?\s*/, '') : null

  const tags: { text: string; bg: string; fg: string }[] = [
    { text: c.tipo_contrato, bg: RED, fg: '#FFFFFF' },
    ...c.nivel.slice(0, 2).map(n => ({ text: n, bg: '#EEF2F7', fg: '#334155' })),
    { text: c.modalidad, bg: '#EEF2F7', fg: '#334155' },
  ]

  return (
    <div
      style={{
        width: w,
        height: h,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: s.pad,
        backgroundColor: INK,
        backgroundImage: `radial-gradient(circle at 18% 12%, rgba(217,16,35,0.28) 0%, transparent 42%), linear-gradient(135deg, ${INK} 0%, ${INK2} 100%)`,
        fontFamily: 'sans-serif',
      }}
    >
      {/* Marca */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BrandLogo height={Math.round(s.brand * 1.25)} />
        <div style={{ display: 'flex', color: '#94A3B8', fontSize: Math.round(s.brand * 0.5), fontWeight: 600 }}>
          Empleo público · Perú
        </div>
      </div>

      {/* Tarjeta — en story crece para llenar el alto y distribuye los grupos */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: s.radius,
          padding: s.cardPad,
          boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
          ...(isStory
            ? { flexGrow: 1, justifyContent: 'space-between', marginTop: s.pad * 0.55, marginBottom: s.pad * 0.55 }
            : {}),
        }}
      >
        {/* Grupo superior: tags + título + entidad */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: Math.round(s.tag * 0.5), marginBottom: s.cardPad * 0.5 }}>
            {tags.map((t, i) => (
              <Pill key={i} text={t.text} bg={t.bg} fg={t.fg} size={s.tag} bold={i === 0} />
            ))}
          </div>

          <div
            style={{
              ...clamp3,
              fontSize: tituloSize(s.title, titulo.length),
              fontWeight: 800,
              color: INK,
              lineHeight: 1.08,
              letterSpacing: -1,
            }}
          >
            {titulo}
          </div>

          <div style={{ display: 'flex', marginTop: Math.round(s.entidad * 0.7), fontSize: s.entidad, fontWeight: 700, color: RED }}>
            {entidad}
          </div>
        </div>

        {/* Requisitos — solo en story, para dar cuerpo al formato vertical */}
        {isStory && reqPreview.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: s.cardPad * 0.5 }}>
            <span style={{ fontSize: s.label, fontWeight: 700, color: '#94A3B8', letterSpacing: 1, marginBottom: 6 }}>REQUISITOS</span>
            {reqPreview.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginTop: 18 }}>
                <span style={{ display: 'flex', color: RED, fontSize: s.req, fontWeight: 800, marginRight: 16, lineHeight: 1.2 }}>•</span>
                <span style={{ display: 'flex', flex: 1, fontSize: s.req, fontWeight: 500, color: '#334155', lineHeight: 1.25 }}>{r}</span>
              </div>
            ))}
          </div>
        )}

        {/* Grupo inferior: sueldo + ubicación + urgencia */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', height: 2, backgroundColor: '#E5E7EB', marginTop: s.cardPad * 0.55, marginBottom: s.cardPad * 0.55 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: s.label, fontWeight: 700, color: '#94A3B8', letterSpacing: 1 }}>SUELDO MENSUAL</span>
              <span style={{ fontSize: s.salary, fontWeight: 800, color: INK, lineHeight: 1, letterSpacing: -2 }}>{fmtSueldo(c.sueldo)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: '46%' }}>
              <span style={{ fontSize: s.label, fontWeight: 700, color: '#94A3B8', letterSpacing: 1 }}>UBICACIÓN</span>
              <span style={{ fontSize: Math.round(s.label * 1.5), fontWeight: 700, color: '#334155', textAlign: 'right' }}>{c.ubicacion}</span>
            </div>
          </div>

          {postulTexto && (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: s.cardPad * 0.45 }}>
              <span style={{ fontSize: s.label, fontWeight: 700, color: '#94A3B8', letterSpacing: 1 }}>POSTULACIÓN</span>
              <span style={{ fontSize: Math.round(s.label * 1.55), fontWeight: 800, color: INK }}>{postulTexto}</span>
            </div>
          )}

          <div style={{ display: 'flex', marginTop: s.cardPad * 0.55 }}>
            <Pill text={chip.text} bg={chip.color} fg="#FFFFFF" size={s.chip} bold />
          </div>
        </div>
      </div>

      {/* Pie */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: s.foot, fontWeight: 600 }}>
        Postula gratis en convocape.com
      </div>
    </div>
  )
}

// ── Layout horizontal (og:image 1200×630) ──────────────────────────────────
function Landscape({ c }: { c: ConvocatoriaDetail }) {
  const entidad = c.entidades?.nombre_oficial ?? 'Entidad del Estado'
  const chip = estadoChip(c)
  const titulo = c.titulo.length > 90 ? c.titulo.slice(0, 88) + '…' : c.titulo

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        padding: 64,
        backgroundColor: INK,
        backgroundImage: `radial-gradient(circle at 12% 15%, rgba(217,16,35,0.30) 0%, transparent 45%), linear-gradient(135deg, ${INK} 0%, ${INK2} 100%)`,
        fontFamily: 'sans-serif',
      }}
    >
      {/* Columna izquierda: texto */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 700, paddingRight: 40 }}>
        <BrandLogo height={42} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              ...clamp3,
              fontSize: titulo.length > 60 ? 46 : 58,
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1.1,
              letterSpacing: -1,
            }}
          >
            {titulo}
          </div>
          <div style={{ display: 'flex', marginTop: 18, fontSize: 30, fontWeight: 700, color: '#FCA5A5' }}>{entidad}</div>
        </div>
        <div style={{ display: 'flex' }}>
          <Pill text={chip.text} bg={chip.color} fg="#FFFFFF" size={26} bold />
        </div>
      </div>

      {/* Columna derecha: sueldo */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: 372,
          backgroundColor: '#FFFFFF',
          borderRadius: 32,
          padding: 40,
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 700, color: '#94A3B8', letterSpacing: 1 }}>SUELDO MENSUAL</span>
        <span style={{ fontSize: 72, fontWeight: 800, color: INK, lineHeight: 1.05, letterSpacing: -2, marginTop: 8 }}>{fmtSueldo(c.sueldo)}</span>
        <div style={{ display: 'flex', height: 2, width: 120, backgroundColor: '#E5E7EB', marginTop: 24, marginBottom: 24 }} />
        <span style={{ fontSize: 22, fontWeight: 700, color: '#94A3B8', letterSpacing: 1 }}>UBICACIÓN</span>
        <span style={{ fontSize: 30, fontWeight: 700, color: '#334155', textAlign: 'center', marginTop: 6 }}>{c.ubicacion}</span>
      </div>
    </div>
  )
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const c = await getConvocatoriaBySlug(slug)
  if (!c) return new Response('Convocatoria no encontrada', { status: 404 })

  const raw = new URL(req.url).searchParams.get('format')
  const fmt: Formato = raw === 'story' || raw === 'og' ? raw : 'feed'
  const { w, h } = SIZES[fmt]

  const CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'

  // og:image (SEO / WhatsApp / Twitter) se queda en PNG, como siempre.
  if (fmt === 'og') {
    return new ImageResponse(<Landscape c={c} />, {
      width: w,
      height: h,
      headers: { 'Cache-Control': CACHE },
    })
  }

  // next/og siempre emite PNG, pero la Graph API de Instagram solo acepta JPEG
  // (con PNG rechaza el post con "Only photo or video can be accepted as media
  // type"). Los formatos de Instagram (feed/story) se convierten a JPEG; el
  // fondo de la tarjeta es sólido, así que se aplana sobre INK por si acaso.
  const png = new ImageResponse(<Portrait c={c} fmt={fmt} />, { width: w, height: h })
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .flatten({ background: INK })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer()

  return new Response(new Uint8Array(jpeg), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': CACHE },
  })
}
