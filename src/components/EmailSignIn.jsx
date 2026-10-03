import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import {
  createEmailAccount,
  resetPassword,
  sendMagicLink,
  signInWithEmail,
} from '../services/auth'

const MIN_PASSWORD_LENGTH = 6

function EmailSignIn({ onDone }) {
  const { emailLinkStatus, emailLinkError, finishEmailLink } = useAuth()
  const [mode, setMode] = useState('link')
  const [creating, setCreating] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(null)

  // The link was opened in a different browser than the one that requested it,
  // so localStorage has no address and Firebase needs it to build the
  // credential. Nothing else can proceed until this is resolved.
  const needsAddress = emailLinkStatus === 'needs-email'

  const run = async (action) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setBusy(false)
    }
  }

  if (needsAddress) {
    return (
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          run(() => finishEmailLink(email))
        }}
      >
        <p className="text-sm text-slate-700">
          Confirm the email address this sign-in link was sent to.
        </p>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base"
        />
        <button
          type="submit"
          disabled={busy || !email.includes('@')}
          className="min-h-12 w-full rounded-xl bg-slate-900 font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Finishing…' : 'Finish sign-in'}
        </button>
        {emailLinkError && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {emailLinkError.message}
          </p>
        )}
      </form>
    )
  }

  if (sent) {
    return (
      <div className="rounded-xl bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-900">{sent}</p>
        <button
          type="button"
          onClick={() => setSent(null)}
          className="mt-3 text-sm font-semibold text-slate-600"
        >
          Use a different method
        </button>
      </div>
    )
  }

  const submit = (event) => {
    event.preventDefault()

    if (mode === 'link') {
      run(async () => {
        await sendMagicLink(email)
        setSent(
          `We sent a sign-in link to ${email.trim()}. Open it on this device to finish.`,
        )
      })
      return
    }

    run(async () => {
      if (creating) {
        await createEmailAccount(email, password)
        setSent(
          `Account created. Check ${email.trim()} for a verification link — you can browse now, but reporting unlocks once it is verified.`,
        )
        return
      }
      await signInWithEmail(email, password)
      onDone?.()
    })
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Email sign-in method"
        className="mb-3 flex gap-1 rounded-xl bg-slate-100 p-1"
      >
        {[
          { id: 'link', label: 'Email link' },
          { id: 'password', label: 'Password' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            onClick={() => {
              setMode(tab.id)
              setError(null)
            }}
            className={`min-h-10 flex-1 rounded-lg text-sm font-semibold ${
              mode === tab.id
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Email address
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base"
          />
        </label>

        {mode === 'password' && (
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={creating ? 'new-password' : 'current-password'}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base"
            />
          </label>
        )}

        <button
          type="submit"
          disabled={
            busy ||
            !email.includes('@') ||
            (mode === 'password' && password.length < MIN_PASSWORD_LENGTH)
          }
          className="min-h-12 w-full rounded-xl bg-slate-900 font-semibold text-white disabled:opacity-50"
        >
          {busy
            ? 'Working…'
            : mode === 'link'
              ? 'Send sign-in link'
              : creating
                ? 'Create account'
                : 'Sign in'}
        </button>

        {mode === 'link' ? (
          <p className="text-xs text-slate-500">
            No password needed. Opening the link proves the address is yours, so
            reporting unlocks straight away.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setCreating((previous) => !previous)
                setError(null)
              }}
              className="text-sm font-semibold text-slate-700"
            >
              {creating ? 'I already have an account' : 'Create an account'}
            </button>
            {!creating && (
              <button
                type="button"
                disabled={busy || !email.includes('@')}
                onClick={() =>
                  run(async () => {
                    await resetPassword(email)
                    setSent(`Password reset link sent to ${email.trim()}.`)
                  })
                }
                className="text-sm font-medium text-slate-500 disabled:opacity-50"
              >
                Forgot password?
              </button>
            )}
          </div>
        )}
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

export default EmailSignIn
