import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// CAMBIAR: obtener credenciales en https://console.twilio.com
// Agregar en Vercel → Settings → Environment Variables:
//   TWILIO_ACCOUNT_SID   = ACxxxxxxxxxxxxxxxxxxxx
//   TWILIO_AUTH_TOKEN    = tu_auth_token
//   TWILIO_WHATSAPP_FROM = whatsapp:+14155238886  (sandbox) o tu número aprobado
//   NOTIF_SECRET_KEY     = clave-interna-para-llamar-este-endpoint

const ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID
const AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN
const FROM_NUMBER  = process.env.TWILIO_WHATSAPP_FROM
const NOTIF_SECRET = process.env.NOTIF_SECRET_KEY

interface AlertaPayload {
  userId: string
  mensaje: string
}

export async function POST(request: NextRequest) {
  // Proteger el endpoint — solo llamadas internas (cron, webhook)
  const auth = request.headers.get('x-notif-secret')
  if (!NOTIF_SECRET || auth !== NOTIF_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    return NextResponse.json(
      { error: 'Twilio no configurado. Agrega TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_WHATSAPP_FROM.' },
      { status: 503 }
    )
  }

  const { userId, mensaje } = await request.json() as AlertaPayload

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfiles')
    .select('whatsapp_numero, premium_hasta')
    .eq('id', userId)
    .single()

  if (!perfil?.whatsapp_numero) {
    return NextResponse.json({ error: 'Usuario sin WhatsApp registrado' }, { status: 400 })
  }

  const esPremium = perfil.premium_hasta && new Date(perfil.premium_hasta) > new Date()
  if (!esPremium) {
    return NextResponse.json({ error: 'Usuario no es Premium' }, { status: 403 })
  }

  // Enviar vía Twilio
  const credentials = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64')
  const body = new URLSearchParams({
    From: FROM_NUMBER,
    To:   `whatsapp:${perfil.whatsapp_numero}`,
    Body: mensaje,
  })

  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
    {
      method:  'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    }
  )

  const result = await twilioRes.json()
  if (!twilioRes.ok) {
    console.error('Twilio error:', result)
    return NextResponse.json({ error: 'Error enviando WhatsApp' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sid: result.sid })
}
