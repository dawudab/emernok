import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import EmailSignIn from './EmailSignIn'
import PhoneSignIn from './PhoneSignIn'

// Email is the default because it needs no SMS delivery, which is the slowest
// and least reliable part of signing in here.
function SignInPanel({ onDone }) {
  const { emailLinkStatus } = useAuth()
  const [method, setMethod] = useState('email')

  // A half-finished link sign-in has to be resolved before anything else.
  const forced = emailLinkStatus === 'needs-email'
  const active = forced ? 'email' : method

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <h3 className="text-sm font-bold text-slate-900">
        Sign in to report, post and vote
      </h3>
      <p className="mt-0.5 text-xs text-slate-500">
        Your existing reports stay with you when you sign in from this device.
      </p>

      {!forced && (
        <div className="mt-3 flex gap-2">
          {[
            { id: 'email', label: 'Email' },
            { id: 'phone', label: 'Phone' },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={active === option.id}
              onClick={() => setMethod(option.id)}
              className={`min-h-10 flex-1 rounded-xl border text-sm font-semibold ${
                active === option.id
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 text-slate-700'
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
