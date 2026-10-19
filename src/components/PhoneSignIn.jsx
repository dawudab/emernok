import { CheckCircle2, PhoneCall, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import {
  confirmPhoneCode,
  createRecaptcha,
  formatAuthError,
  startPhoneSignIn,
} from '../services/auth'

const DEFAULT_PREFIX = '+222'

function PhoneSignIn({ onDone, onSwitchToGoogle }) {
  const { t, lang } = useI18n()
  const [phone, setPhone] = useState(DEFAULT_PREFIX)
  const [code, setCode] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [isErrorCode39, setIsErrorCode39] = useState(false)
  const [useNormalCaptcha, setUseNormalCaptcha] = useState(false)

  const recaptchaRef = useRef(null)
  const verifierRef = useRef(null)

  useEffect(() => {
    return () => {
      try {
        verifierRef.current?.clear()
      } catch {
        // Safe clear
      }
      verifierRef.current = null
    }
  }, [])

  const resetVerifier = () => {
    try {
      verifierRef.current?.clear()
    } catch {
      // Safe clear
    }
    verifierRef.current = null
    if (recaptchaRef.current) {
      recaptchaRef.current.innerHTML = ''
    }
  }

  const sendCode = async (event, forceNormalCaptcha = false) => {
    event?.preventDefault?.()
    setBusy(true)
    setError(null)
    setIsErrorCode39(false)

    // Remove any spaces, dashes, or parentheses from the phone number
    const cleanPhone = phone.trim().replace(/[\s()-]/g, '')
    if (!cleanPhone.startsWith('+')) {
      setError(
        lang === 'ar'
          ? 'يرجى إضافة رمز الدولة مع علامة + (مثال: 222+ لموريتانيا).'
          : lang === 'fr'
            ? 'Veuillez ajouter l’indicatif international avec + (ex: +222 pour la Mauritanie).'
            : 'Please include country code with + (e.g. +222 for Mauritania).',
      )
      setBusy(false)
      return
    }

    try {
      resetVerifier()
      const captchaSize = forceNormalCaptcha || useNormalCaptcha ? 'normal' : 'invisible'
      verifierRef.current = createRecaptcha(recaptchaRef.current, captchaSize)
      const confirmationResult = await startPhoneSignIn(cleanPhone, verifierRef.current)
      setConfirmation(confirmationResult)
    } catch (sendError) {
      const msg = sendError?.message || String(sendError)
      const codeStr = sendError?.code || ''
      const has39 =
        codeStr === 'auth/error-code:-39' ||
        codeStr.includes('-39') ||
        msg.includes('error-code:-39') ||
        msg.includes('-39')

      if (has39) {
        setIsErrorCode39(true)
        setUseNormalCaptcha(true)
      }
      setError(formatAuthError(sendError, lang))
      resetVerifier()
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
      setError(formatAuthError(verifyError, lang))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3.5">
      {confirmation ? (
        <form onSubmit={verify} className="space-y-3">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={15} />
              <span>{t('phone.codeLabel', { phone })}</span>
            </p>
          </div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            {t('phone.codeLabel', { phone })}
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              dir="ltr"
              autoFocus
              className="glass-input tabular mt-1 min-h-12 tracking-[0.3em] text-center text-sm font-bold"
            />
          </label>
          <button
            type="submit"
            disabled={busy || code.trim().length < 6}
            className="btn-primary min-h-11 w-full rounded-2xl text-xs font-bold"
          >
            {busy ? t('phone.verifying') : t('phone.verify')}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmation(null)
              setCode('')
              setError(null)
              setIsErrorCode39(false)
            }}
            className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-zinc-500 hover:underline dark:text-zinc-400"
          >
            <RotateCcw size={12} />
            <span>{t('phone.change')}</span>
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => sendCode(e, false)} className="space-y-3">
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            {t('phone.label')}
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t('phone.placeholder')}
              dir="ltr"
              className="glass-input mt-1 min-h-11 text-xs"
            />
          </label>

          <button
            type="submit"
            disabled={busy || phone.trim().length < 8}
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
          className="space-y-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-3.5 text-xs leading-relaxed font-medium text-red-600 dark:text-red-400"
        >
          <p>{error}</p>

          {isErrorCode39 && (
            <div className="space-y-2.5 border-t border-red-500/20 pt-2.5 text-zinc-800 dark:text-zinc-200">
              <div className="flex items-start gap-2">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-amber-500" />
                <div className="text-[11px] leading-relaxed">
                  <p className="font-bold text-amber-700 dark:text-amber-300">
                    {lang === 'ar'
                      ? 'حلول سريعة لتسجيل الدخول:'
                      : lang === 'fr'
                        ? 'Solutions rapides pour se connecter :'
                        : 'Quick solutions to sign in:'}
                  </p>
                  <ul className="mt-1 list-disc ps-4 space-y-1">
                    <li>
                      <strong>Google:</strong>{' '}
                      {lang === 'ar'
                        ? 'تسجيل الدخول الفوري بضغطة واحدة دون الحاجة إلى SMS.'
                        : lang === 'fr'
                          ? 'Connexion instantanée en 1 clic sans SMS.'
                          : '1-click instant sign in without SMS.'}
                    </li>
                    <li>
                      <strong>Firebase Test Phone Number:</strong>{' '}
                      {lang === 'ar'
                        ? 'في لوحة Firebase Console > Authentication > Phone، أضف رقمك كرقم تجريبي (Test Phone Number) مع رمز مثل 123456 للدخول الفوري.'
                        : lang === 'fr'
                          ? 'Dans Firebase Console > Authentication > Phone, ajoutez votre numéro comme numéro de test (code 123456).'
                          : 'In Firebase Console > Authentication > Phone, add your number under "Phone numbers for testing" with code 123456.'}
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onSwitchToGoogle && (
                  <button
                    type="button"
                    onClick={onSwitchToGoogle}
                    className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-900"
                  >
                    <Sparkles size={13} />
                    <span>{t('signIn.google')}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => sendCode(e, true)}
                  disabled={busy}
                  className="rounded-xl border border-black/15 bg-black/5 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-black/10 dark:border-white/20 dark:bg-white/10 dark:text-zinc-200"
                >
                  {lang === 'ar'
                    ? 'إعادة المحاولة مع reCAPTCHA مرئي'
                    : lang === 'fr'
                      ? 'Réessayer avec reCAPTCHA visible'
                      : 'Retry with visible reCAPTCHA'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recaptcha container */}
      <div ref={recaptchaRef} id="recaptcha-container" className="flex justify-center" />
    </div>
  )
}

export default PhoneSignIn
