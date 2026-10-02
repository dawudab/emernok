import { useEffect, useRef, useState } from 'react'
import { confirmPhoneCode, createRecaptcha, startPhoneSignIn } from '../services/auth'

const DEFAULT_PREFIX = '+222'

function PhoneSignIn({ onDone }) {
  const [phone, setPhone] = useState(DEFAULT_PREFIX)
  const [code, setCode] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const recaptchaRef = useRef(null)
  const verifierRef = useRef(null)

  useEffect(() => {
    return () => {
      verifierRef.current?.clear()
      verifierRef.current = null
    }
  }, [])

  const sendCode = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      // Created lazily: the invisible widget must stay mounted for the life of
      // the challenge, and must be rebuilt after a failed attempt.
      verifierRef.current ??= createRecaptcha(recaptchaRef.current)
      setConfirmation(await startPhoneSignIn(phone.trim(), verifierRef.current))
    } catch (sendError) {
      setError(sendError.message)
      verifierRef.current?.clear()
      verifierRef.current = null
    } finally {
      setBusy(false)
    }
  }

  const verify = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await confirmPhoneCode(confirmation, code.trim())
      onDone?.()
    } catch (verifyError) {
      setError(verifyError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {confirmation ? (
        <form onSubmit={verify} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Enter the 6-digit code sent to {phone}
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base tracking-widest"
            />
          </label>
          <button
            type="submit"
            disabled={busy || code.trim().length < 6}
            className="min-h-12 w-full rounded-xl bg-slate-900 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Verifying…' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmation(null)}
            className="w-full text-sm font-medium text-slate-500"
          >
            Use a different number
          </button>
        </form>
      ) : (
        <form onSubmit={sendCode} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Phone number
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+222 12 34 56 78"
              className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base"
            />
          </label>
          <button
            type="submit"
            disabled={busy || phone.trim().length < 8}
            className="min-h-12 w-full rounded-xl bg-slate-900 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send code'}
          </button>
          <p className="text-xs text-slate-500">
            Your existing reports stay with you when you add a phone number.
          </p>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div ref={recaptchaRef} />
    </div>
  )
}

export default PhoneSignIn
