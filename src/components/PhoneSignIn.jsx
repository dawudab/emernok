import { CheckCircle2, PhoneCall, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { confirmPhoneCode, formatAuthError, startPhoneSignIn } from '../services/auth'

const PREFIX = '+222'
const RESEND_SECONDS = 60
// Chinguitel (2x), Mattel (3x) and Mauritel (4x) mobiles are all 8 digits.
const LOCAL_NUMBER = /^[234]\d{7}$/

const ERROR_KEYS = {
  'invalid-phone': 'phone.errorInvalidPhone',
  'invalid-code': 'phone.errorInvalidCode',
  expired: 'phone.errorExpired',
  'too-many-attempts': 'phone.errorTooMany',
  cooldown: 'phone.errorCooldown',
  'sms-failed': 'phone.errorSendFailed',
}

function PhoneSignIn({ onDone }) {
  const { t, lang } = useI18n()
  const [digits, setDigits] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const phone = `${PREFIX}${digits}`

  useEffect(() => {
    if (secondsLeft <= 0) return undefined
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  const describeError = (err) => {
    const key = ERROR_KEYS[err?.details?.reason]
    if (key) return t(key)
    if (err?.code === 'functions/internal' || err?.code === 'functions/unavailable') {
      return t('phone.errorSendFailed')
    }
    return formatAuthError(err, lang)
  }

  const sendCode = async (event) => {
    event?.preventDefault?.()
    setError(null)
    if (!LOCAL_NUMBER.test(digits)) {
      setError(t('phone.errorInvalidPhone'))
      return
    }
    setBusy(true)
    try {
      await startPhoneSignIn(phone, lang)
      setCodeSent(true)
      setCode('')
      setSecondsLeft(RESEND_SECONDS)
    } catch (sendError) {
      setError(describeError(sendError))
    } finally {
      setBusy(false)
    }
  }

  const verify = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await confirmPhoneCode(phone, code.trim())
      onDone?.()
    } catch (verifyError) {
      // A spent code cannot be retried, so send the user back to request one.
      const reason = verifyError?.details?.reason
      if (reason === 'expired' || reason === 'too-many-attempts') setCode('')
      setError(describeError(verifyError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3.5">
      {codeSent ? (
        <form onSubmit={verify} className="space-y-3">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={15} />
              <span dir="auto">{t('phone.codeLabel', { phone })}</span>
            </p>
          </div>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label={t('phone.codeLabel', { phone })}
            placeholder="123456"
            maxLength={6}
            dir="ltr"
            autoFocus
            className="glass-input tabular min-h-12 tracking-[0.3em] text-center text-sm font-bold"
          />
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="btn-primary min-h-11 w-full rounded-2xl text-xs font-bold"
          >
            {busy ? t('phone.verifying') : t('phone.verify')}
          </button>
          <div className="flex items-center justify-between gap-2 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setCodeSent(false)
                setCode('')
                setError(null)
              }}
              className="flex items-center gap-1.5 text-zinc-500 hover:underline dark:text-zinc-400"
            >
              <RotateCcw size={12} />
              <span>{t('phone.change')}</span>
            </button>
            <button
              type="button"
              onClick={sendCode}
              disabled={busy || secondsLeft > 0}
              className="tabular text-amber-600 hover:underline disabled:cursor-not-allowed disabled:text-zinc-400 disabled:no-underline dark:text-amber-400 dark:disabled:text-zinc-500"
            >
              {secondsLeft > 0
                ? t('phone.resendIn', { seconds: secondsLeft })
                : t('phone.resend')}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={sendCode} className="space-y-3">
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            {t('phone.label')}
            <div dir="ltr" className="mt-1 flex items-stretch gap-2">
              <span className="tabular flex min-h-11 shrink-0 items-center rounded-2xl border border-black/10 bg-white/70 px-3 text-xs font-bold text-zinc-900 dark:border-white/15 dark:bg-white/5 dark:text-zinc-100">
                {PREFIX}
              </span>
              <input
                value={digits}
                onChange={(event) => setDigits(event.target.value.replace(/\D/g, '').slice(0, 8))}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder={t('phone.placeholder')}
                maxLength={8}
                className="glass-input tabular min-h-11 flex-1 text-xs tracking-wider"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={busy || digits.length !== 8}
            className="btn-primary flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl text-xs font-bold shadow-md shadow-amber-500/20"
          >
            <PhoneCall size={14} className="shrink-0" />
            <span>{busy ? t('phone.sending') : t('phone.send')}</span>
          </button>

          <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t('phone.keep')}
          </p>
        </form>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3.5 text-xs leading-relaxed font-medium text-red-600 dark:text-red-400"
        >
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}

export default PhoneSignIn
