'use client'
import { usePanel } from '@/providers/PanelProvider'

interface Props {
  onClose: () => void
}

export default function SaveAuthPromptModal({ onClose }: Props) {
  const { openPanel } = usePanel()

  const handleRegister = () => {
    onClose()
    openPanel('user', 'register')
  }

  const handleLogin = () => {
    onClose()
    openPanel('user', 'login')
  }

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">

        {/* Icono */}
        <div className="w-14 h-14 bg-peru-red/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-bookmark text-peru-red text-2xl" />
        </div>

        {/* Texto */}
        <h2 className="font-heading font-bold text-gray-900 text-lg text-center mb-1">
          Guarda esta convocatoria
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Crea una cuenta gratuita para guardar convocatorias y hacer seguimiento de tus postulaciones.
        </p>

        {/* Botón principal */}
        <button
          onClick={handleRegister}
          className="w-full py-3 bg-peru-red hover:bg-peru-dark text-white font-semibold rounded-xl transition-colors text-sm mb-3"
        >
          Registrarse gratis
        </button>

        {/* Link secundario */}
        <button
          onClick={handleLogin}
          className="w-full py-2.5 text-sm text-gray-600 hover:text-peru-red transition-colors font-medium"
        >
          ¿Ya tienes cuenta? <span className="underline">Inicia sesión</span>
        </button>

        {/* Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          aria-label="Cerrar"
        >
          <i className="fas fa-times text-gray-500 text-sm" />
        </button>
      </div>
    </div>
  )
}
