import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { useT } from '../i18n/useI18n'
import EmailSignIn from './EmailSignIn'
import PhoneSignIn from './PhoneSignIn'

// Email is the default because it needs no SMS delivery, which is the slowest
// and least reliable part of signing in here.
function SignInPanel({ onDone }) {
  const { emailLinkStatus } = useAuth()
  const t = useT()
  const [method, setMethod] = useState('email')

  // A half-finished link sign-in has to be resolved before anything else.
  const forced = emailLinkStatus === 'needs-email'
  const active = forced ? 'email' : method

  return (
    <div className="glass-inset p-4">
      <h3 className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
        {t('signIn.title')}
      </h3>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {t('signIn.subtitle')}
      </p>

      {!forced && (
        <div className="mt-3 flex gap-1 rounded-full bg-black/5 p-1 dark:bg-white/10">
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
