import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { useT } from '../i18n/useI18n'
import { signInWithGoogle } from '../services/auth'
import EmailSignIn from './EmailSignIn'
import PhoneSignIn from './PhoneSignIn'

function SignInPanel({ onDone }) {
  const { emailLinkStatus } = useAuth()
  const t = useT()
  const [method, setMethod] = useState('email')
  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleError, setGoogleError] = useState(null)

  // A half-finished link sign-in has to be resolved before anything else.
  const forced = emailLinkStatus === 'needs-email'
  const active = forced ? 'email' : method

  const handleGoogleSignIn = async () => {
    setGoogleBusy(true)
    setGoogleError(null)
    try {
      await signInWithGoogle()
      onDone?.()
    } catch (error) {
      if (error?.code !== 'auth/popup-closed-by-user') {
        setGoogleError(error.message)
      }
    } finally {
      setGoogleBusy(false)
    }
  }

  return (
    <div className="glass-inset p-4">
      <h3 className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
        {t('signIn.title')}
      </h3>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {t('signIn.subtitle')}
      </p>

      {!forced && (
        <div className="mt-3">
          <button
            type="button"
            disabled={googleBusy}
            onClick={handleGoogleSignIn}
            className="btn-primary flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full px-4 text-sm"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
              className="shrink-0"
            >
              <path
                fill="currentColor"
                d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.81-1.5 3.34-3.2 4.37v3.62h5.18c3.03-2.79 4.78-6.9 4.78-11.82 0-.6-.05-1.19-.1-1.9z"
              />
              <path
                fill="currentColor"
                opacity="0.8"
                d="M12.18 22c4.32 0 7.95-1.43 10.6-3.88l-5.18-3.62c-1.43.96-3.26 1.53-5.42 1.53-4.17 0-7.7-2.81-8.96-6.6H-2.1v3.73C.54 18.4 5.95 22 12.18 22z"
              />
              <path
                fill="currentColor"
                opacity="0.6"
                d="M3.22 9.43A9.6 9.6 0 0 1 2.7 6.3c0-1.09.19-2.15.52-3.13V-.56H-2.1A15.96 15.96 0 0 0-3.82 6.3c0 2.58.62 5.02 1.72 7.16l5.32-4.03z"
              />
              <path
                fill="currentColor"
                opacity="0.9"
                d="M12.18 2.58c2.35 0 4.46.81 6.12 2.4l4.59-4.59C20.12-2.18 16.5-3.6 12.18-3.6 5.95-3.6.54 0-2.1 5.24l5.32 4.03c1.26-3.79 4.79-6.69 8.96-6.69z"
              />
            </svg>
            <span>
              {googleBusy ? t('common.working') : t('signIn.google')}
            </span>
          </button>

          {googleError && (
            <p role="alert" className="mt-2 text-xs font-medium text-red-500">
              {googleError}
            </p>
          )}

          <div className="my-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
            <span className="font-mono text-[10px] tracking-[0.15em] text-zinc-400 uppercase">
              {t('signIn.or')}
            </span>
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          </div>

          <div className="flex gap-1 rounded-full bg-black/5 p-1 dark:bg-white/10">
            {[
              { id: 'email', label: t('signIn.email') },
              { id: 'phone', label: t('signIn.phone') },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={active === option.id}
                onClick={() => setMethod(option.id)}
                className={`min-h-10 flex-1 rounded-full text-sm font-semibold transition-all duration-300 ${
                  active === option.id
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        {active === 'email' ? (
          <EmailSignIn onDone={onDone} />
        ) : (
          <PhoneSignIn onDone={onDone} />
        )}
      </div>
    </div>
  )
}

export default SignInPanel
