'use client'
import { useState } from 'react'
import { activarTrial } from '@/app/actions'
import { useAuth } from '@/providers/AuthProvider'

interface PaywallModalProps {
  onClose: () => void
  feature?: string
}

const PRECIO_MENSUAL = process.env.NEXT_PUBLIC_PRECIO_PREMIUM_MENSUAL ?? '20'
const PRECIO_TRIMESTRAL = process.env.NEXT_PUBLIC_PRECIO_PREMIUM_TRIMESTRAL ?? '49'

export default function PaywallModal({ onClose, feature }: PaywallModalProps) {
  const { profile } = useAuth()
  const [loading, setLoading]   = useState(false)
  const [trialMsg, setTrialMsg] = useState('')

  const trialDisponible = profile && !profile.trial_usado

  const handleTrial = async () => {
    setLoading(true)
    const res = await activarTrial()
    setLoading(false)
    if (res.error) {
      setTrialMsg(res.error)
    } else {
      setTrialMsg('¡Trial activado! Tienes 3 días Premium gratis.')
      setTimeout(onClose, 2000)
    }
  }

  const handlePago = (plan: 'mensual' | 'trimestral') => {
    // CAMBIAR: redirigir al checkout de MercadoPago
    // La ruta /api/pagos/mercadopago crea la preferencia y devuelve init_point
    fetch('/api/pagos/mercadopago', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.init_point) window.location.href = data.init_point
      })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 z-10">

        {/* Header */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
        >
          <i className="fas fa-times text-gray-500 text-xs" />
        </button>

        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-crown text-amber-500 text-2xl" />
          </div>
          <h2 className="font-heading font-700 text-xl text-gray-900">Activa Premium</h2>
          {feature && (
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-semibold text-peru-red">{feature}</span> es una función Premium
            </p>
          )}
        </div>

        {/* Beneficios */}
        <ul className="space-y-2 mb-5">
          {[
            { icon: 'fa-whatsapp fab', text: 'Alertas inmediatas por WhatsApp' },
            { icon: 'fa-bolt', text: 'Notificación al instante (sin retraso)' },
            { icon: 'fa-calendar-check', text: 'Sincronización con Google Calendar' },
            { icon: 'fa-list-check', text: 'Checklist de expediente personalizado' },
            { icon: 'fa-chart-kanban', text: 'Seguimiento Kanban de postulaciones' },
          ].map(b => (
            <li key={b.text} className="flex items-center gap-2.5 text-sm text-gray-700">
              <i className={`fas ${b.icon} text-peru-red w-4 text-center`} />
              {b.text}
            </li>
          ))}
        </ul>

        {/* Precios */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => handlePago('mensual')}
            className="border-2 border-gray-200 hover:border-peru-red rounded-xl p-3 text-center transition-colors"
          >
            <p className="text-xs text-gray-500">Mensual</p>
            <p className="font-heading font-700 text-lg text-gray-900">S/ {PRECIO_MENSUAL}</p>
            <p className="text-xs text-gray-400">/mes</p>
          </button>
          <button
            onClick={() => handlePago('trimestral')}
            className="border-2 border-peru-red bg-peru-light rounded-xl p-3 text-center relative"
          >
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-peru-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              MEJOR PRECIO
            </span>
            <p className="text-xs text-gray-500">Trimestral</p>
            <p className="font-heading font-700 text-lg text-peru-red">S/ {PRECIO_TRIMESTRAL}</p>
            <p className="text-xs text-gray-400">/3 meses</p>
          </button>
        </div>

        {/* Trial */}
        {trialDisponible && (
          <div className="border border-dashed border-gray-300 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-2">¿Quieres probar primero?</p>
            {trialMsg ? (
              <p className={`text-xs font-semibold ${trialMsg.includes('activado') ? 'text-green-600' : 'text-red-500'}`}>
                {trialMsg}
              </p>
            ) : (
              <button
                onClick={handleTrial}
                disabled={loading}
                className="text-sm font-semibold text-peru-red hover:underline disabled:opacity-60"
              >
                {loading ? <i className="fas fa-spinner fa-spin" /> : '3 días gratis sin tarjeta'}
              </button>
            )}
          </div>
        )}

        <p className="text-[10px] text-gray-400 text-center mt-3">
          Pago seguro vía MercadoPago · Cancela cuando quieras
        </p>
      </div>
    </div>
  )
}
