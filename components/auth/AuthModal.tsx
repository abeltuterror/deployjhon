'use client'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { checkEmailExists } from '@/app/actions'

type Mode = 'login' | 'register' | 'forgot'

interface Props {
  onClose: () => void
  initialMode?: 'login' | 'register'
}

// ─── Google SVG ───────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

// ─── Header compartido ────────────────────────────────────────────────────────

function ModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-peru-red rounded-lg flex items-center justify-center">
          <i className="fas fa-landmark text-white text-xs" />
        </div>
        <span className="font-heading font-bold text-gray-900">Convocape</span>
      </div>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        aria-label="Cerrar"
      >
        <i className="fas fa-times text-gray-500 text-sm" />
      </button>
    </div>
  )
}

// ─── AuthModal (router de modos) ──────────────────────────────────────────────

export default function AuthModal({ onClose, initialMode = 'login' }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)

  if (mode === 'register') return <RegisterView onClose={onClose} setMode={setMode} />
  if (mode === 'forgot')   return <ForgotView   onClose={onClose} setMode={setMode} />
  return <LoginView onClose={onClose} setMode={setMode} />
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginView({ onClose, setMode }: { onClose: () => void; setMode: (m: Mode) => void }) {
  const [supabase]   = useState(() => createClient())
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (!err) return // AuthProvider detecta el cambio de sesión → panel se actualiza

    // Detección inteligente: credenciales incorrectas puede ser contraseña mal escrita
    // O usuario registrado solo con Google (sin contraseña configurada)
    if (err.message === 'Invalid login credentials') {
      setError('__google_hint__')
    } else if (err.message.includes('Email not confirmed')) {
      setError('Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.')
    } else {
      setError(err.message)
    }
  }

  const handleGoogle = async () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${siteUrl}/auth/callback` },
    })
  }

  return (
    <>
      <ModalHeader onClose={onClose} />
      <h2 className="font-heading font-bold text-2xl text-gray-900 mb-1">Iniciar Sesión</h2>
      <p className="text-sm text-gray-500 mb-6">Accede a tus convocatorias guardadas y alertas.</p>

      <form onSubmit={handleEmail} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Correo electrónico
          </label>
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-peru-red/30 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Contraseña
          </label>
          <input
            type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-peru-red/30 text-sm"
          />
        </div>

        {error === '__google_hint__' ? (
          <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 space-y-1">
            <p className="text-amber-800 font-semibold">
              <i className="fas fa-exclamation-triangle mr-1.5" />
              Correo o contraseña incorrectos.
            </p>
            <p className="text-amber-700">
              Si te registraste con Google, usa el botón{' '}
              <button
                type="button"
                onClick={handleGoogle}
                className="font-semibold underline underline-offset-2"
              >
                Continuar con Google
              </button>
              .
            </p>
          </div>
        ) : error ? (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <i className="fas fa-exclamation-circle mr-1" />{error}
          </p>
        ) : null}

        <button
          type="submit" disabled={loading}
          className="w-full py-3 bg-peru-red hover:bg-peru-dark disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          {loading ? <i className="fas fa-spinner fa-spin" /> : 'Ingresar'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <hr className="flex-1 border-gray-200" />
        <span className="text-xs text-gray-400">o continúa con</span>
        <hr className="flex-1 border-gray-200" />
      </div>

      <button
        onClick={handleGoogle}
        className="w-full py-3 border border-gray-200 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
      >
        <GoogleIcon />
        Continuar con Google
      </button>

      <div className="mt-6 space-y-2 text-center">
        <p className="text-xs text-gray-500">
          ¿No tienes cuenta?{' '}
          <button
            onClick={() => setMode('register')}
            className="text-peru-red font-semibold hover:underline"
          >
            Regístrate
          </button>
        </p>
        <p className="text-xs text-gray-400">
          <button
            onClick={() => setMode('forgot')}
            className="hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </p>
      </div>
    </>
  )
}

// ─── Registro ─────────────────────────────────────────────────────────────────

function RegisterView({ onClose, setMode }: { onClose: () => void; setMode: (m: Mode) => void }) {
  const [supabase]   = useState(() => createClient())
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState(false)
  const [loading, setLoading]         = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const exists = await checkEmailExists(email)
    if (exists) {
      setLoading(false)
      setError('__already_registered__')
      return
    }
    // NO insertar en perfiles — el trigger de BD lo hace automáticamente
    const { error: err } = await supabase.auth.signUp({ email, password })
    setLoading(false)

    if (err) {
      if (err.message.includes('already registered') || err.message.includes('User already registered')) {
        setError('__already_registered__')
      } else {
        setError(err.message)
      }
      return
    }

    setSuccess(true)
  }

  const handleGoogle = async () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${siteUrl}/auth/callback` },
    })
  }

  if (success) {
    return (
      <>
        <ModalHeader onClose={onClose} />
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-envelope-open-text text-green-600 text-2xl" />
          </div>
          <h2 className="font-heading font-bold text-xl text-gray-900 mb-2">¡Revisa tu correo!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Te enviamos un enlace de confirmación a <strong>{email}</strong>.<br />
            Haz click en el enlace para activar tu cuenta.
          </p>
          <button
            onClick={() => setMode('login')}
            className="text-sm text-peru-red font-semibold hover:underline"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <ModalHeader onClose={onClose} />
      <h2 className="font-heading font-bold text-2xl text-gray-900 mb-1">Crear Cuenta</h2>
      <p className="text-sm text-gray-500 mb-6">Guarda convocatorias y recibe alertas personalizadas.</p>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Correo electrónico
          </label>
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-peru-red/30 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Contraseña
          </label>
          <input
            type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-peru-red/30 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Confirmar contraseña
          </label>
          <input
            type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Repite tu contraseña"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-peru-red/30 text-sm"
          />
        </div>

        {error === '__already_registered__' ? (
          <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 space-y-1">
            <p className="text-amber-800 font-semibold">
              <i className="fas fa-exclamation-triangle mr-1.5" />
              Este correo ya tiene una cuenta.
            </p>
            <p className="text-amber-700">
              Si te registraste con Google,{' '}
              <button
                type="button"
                onClick={handleGoogle}
                className="font-semibold underline underline-offset-2"
              >
                ingresa con Google
              </button>
              {' '}y desde tu perfil puedes vincular una contraseña.
            </p>
          </div>
        ) : error ? (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <i className="fas fa-exclamation-circle mr-1" />{error}
          </p>
        ) : null}

        <button
          type="submit" disabled={loading}
          className="w-full py-3 bg-peru-red hover:bg-peru-dark disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          {loading ? <i className="fas fa-spinner fa-spin" /> : 'Crear cuenta'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <hr className="flex-1 border-gray-200" />
        <span className="text-xs text-gray-400">o regístrate con</span>
        <hr className="flex-1 border-gray-200" />
      </div>

      <button
        onClick={handleGoogle}
        className="w-full py-3 border border-gray-200 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
      >
        <GoogleIcon />
        Continuar con Google
      </button>

      <p className="text-center text-xs text-gray-500 mt-6">
        ¿Ya tienes cuenta?{' '}
        <button
          onClick={() => setMode('login')}
          className="text-peru-red font-semibold hover:underline"
        >
          Inicia sesión
        </button>
      </p>
    </>
  )
}

// ─── Recuperar contraseña ─────────────────────────────────────────────────────

function ForgotView({ onClose, setMode }: { onClose: () => void; setMode: (m: Mode) => void }) {
  const [supabase]   = useState(() => createClient())
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSuccess(true)
  }

  if (success) {
    return (
      <>
        <ModalHeader onClose={onClose} />
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-paper-plane text-blue-600 text-2xl" />
          </div>
          <h2 className="font-heading font-bold text-xl text-gray-900 mb-2">Correo enviado</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enviamos un enlace para restablecer tu contraseña a <strong>{email}</strong>.
          </p>
          <button
            onClick={() => setMode('login')}
            className="text-sm text-peru-red font-semibold hover:underline"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <ModalHeader onClose={onClose} />
      <button
        onClick={() => setMode('login')}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <i className="fas fa-arrow-left" /> Volver
      </button>

      <h2 className="font-heading font-bold text-2xl text-gray-900 mb-1">Recuperar contraseña</h2>
      <p className="text-sm text-gray-500 mb-6">
        Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
      </p>

      <form onSubmit={handleForgot} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Correo electrónico
          </label>
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-peru-red/30 text-sm"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <i className="fas fa-exclamation-circle mr-1" />{error}
          </p>
        )}

        <button
          type="submit" disabled={loading}
          className="w-full py-3 bg-peru-red hover:bg-peru-dark disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          {loading ? <i className="fas fa-spinner fa-spin" /> : 'Enviar enlace'}
        </button>
      </form>
    </>
  )
}
