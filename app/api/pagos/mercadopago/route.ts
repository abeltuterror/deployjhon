import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// CAMBIAR: obtener estas credenciales en https://www.mercadopago.com.pe/developers/panel
// Agregar en Vercel → Settings → Environment Variables:
//   MERCADOPAGO_ACCESS_TOKEN  = APP_USR-xxxx   (producción)
//   NEXT_PUBLIC_PRECIO_PREMIUM_MENSUAL    = 20
//   NEXT_PUBLIC_PRECIO_PREMIUM_TRIMESTRAL = 49

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN
const SITE_URL        = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://convocape.com'

const PLANES = {
  mensual:     { precio: Number(process.env.NEXT_PUBLIC_PRECIO_PREMIUM_MENSUAL    ?? 20), dias: 30  },
  trimestral:  { precio: Number(process.env.NEXT_PUBLIC_PRECIO_PREMIUM_TRIMESTRAL ?? 49), dias: 90  },
} as const

export async function POST(request: NextRequest) {
  if (!MP_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: 'MercadoPago no configurado. Agrega MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.' },
      { status: 503 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { plan } = await request.json() as { plan: 'mensual' | 'trimestral' }
  const planData = PLANES[plan]
  if (!planData) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })

  // Crea preferencia en MercadoPago
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${MP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      items: [{
        title:      `Convocape Premium — ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
        quantity:   1,
        currency_id: 'PEN',
        unit_price:  planData.precio,
      }],
      payer:            { email: user.email },
      external_reference: `${user.id}|${plan}|${planData.dias}`,
      back_urls: {
        success: `${SITE_URL}/premium/exito`,
        failure: `${SITE_URL}/premium/error`,
        pending: `${SITE_URL}/premium/pendiente`,
      },
      auto_return:       'approved',
      notification_url:  `${SITE_URL}/api/pagos/mercadopago/webhook`,
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    console.error('MercadoPago error:', data)
    return NextResponse.json({ error: 'Error creando preferencia de pago' }, { status: 500 })
  }

  return NextResponse.json({ init_point: data.init_point })
}

// ─── Webhook de MercadoPago ────────────────────────────────────────────────────
// MercadoPago llama a esta URL cuando el pago es aprobado.
// CAMBIAR: verificar firma HMAC antes de activar premium en producción.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const topic    = searchParams.get('topic')
  const id       = searchParams.get('id')

  if (topic !== 'payment' || !id || !MP_ACCESS_TOKEN) {
    return NextResponse.json({ ok: true })
  }

  const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  })
  const payment = await payRes.json()

  if (payment.status !== 'approved') return NextResponse.json({ ok: true })

  const [userId, , diasStr] = (payment.external_reference as string ?? '').split('|')
  const dias = Number(diasStr)
  if (!userId || !dias) return NextResponse.json({ ok: true })

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  const { data: perfil } = await admin
    .from('perfiles')
    .select('premium_hasta')
    .eq('id', userId)
    .single()

  const base = perfil?.premium_hasta && new Date(perfil.premium_hasta) > new Date()
    ? new Date(perfil.premium_hasta)
    : new Date()

  base.setDate(base.getDate() + dias)

  await admin
    .from('perfiles')
    .update({ premium_hasta: base.toISOString() })
    .eq('id', userId)

  return NextResponse.json({ ok: true })
}
