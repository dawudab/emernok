import { CheckCircle2, HelpCircle, Mail, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { useI18n } from '../i18n/useI18n'
import {
  completeEmailLink,
  formatAuthError,
  sendMagicLink,
} from '../services/auth'

function EmailSignIn({ onDone, onSwitchToGoogle, onSwitchToPhone }) {
  const { emailLinkStatus, emailLinkError, finishEmailLink } = useAuth()
  const { t, lang } = useI18n()

  const [email, setEmail] = useState('')
  const [pastedUrl, setPastedUrl] = useState('')
  const [showPasteLink, setShowPasteLink] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(null)
  const [showConsoleGuide, setShowConsoleGuide] = useState(false)

  // When a link is detected in the URL or pasted but address is required
  const needsAddress = emailLinkStatus === 'needs-email'

  const run = async (action) => {
    setBusy(true)
    setError(null)
    setShowConsoleGuide(false)
    try {
      await action()
      onDone?.()
    } catch (actionError) {
      const code = actionError?.code
      if (code === 'auth/operation-not-allowed') {
        setShowConsoleGuide(true)
      }
      setError(formatAuthError(actionError, lang))
    } finally {
      setBusy(false)
    }
  }

  // Completing sign-in when link opened from email
  if (needsAddress) {
    return (
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          run(() => finishEmailLink(email))
        }}
      >
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3.5">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
            {t('notice.emailLinkPrompt')}
          </p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {t('signIn.confirmAddress')}
          </p>
        </div>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="email"
          placeholder={t('signIn.emailPlaceholder')}
          dir="ltr"
          required
          className="glass-input min-h-12 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !email.includes('@')}
          className="btn-primary min-h-12 w-full rounded-full text-sm font-bold"
        >
          {busy ? t('signIn.finishing') : t('signIn.finish')}
        </button>
        {(emailLinkError || error) && (
          <p role="alert" className="text-xs font-medium text-red-500">
            {error || formatAuthError(emailLinkError, lang)}
          </p>
        )}
      </form>
    )
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={18} />
            <p className="text-sm font-bold">{t('common.send')}</p>
          </div>
          <p className="mt-1.5 text-xs text-zinc-700 dark:text-zinc-300">{sent}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSent(null)}
              className="text-xs font-semibold text-zinc-600 underline dark:text-zinc-300"
            >
              {t('signIn.useAnother')}
            </button>
            <span className="text-xs text-zinc-400">·</span>
            <button
              type="button"
              onClick={() => setShowPasteLink(true)}
              className="text-xs font-semibold text-amber-600 underline dark:text-amber-400"
            >
              {t('signIn.pasteLink')}
            </button>
          </div>
        </div>

        {showPasteLink && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!pastedUrl) return
              run(() => completeEmailLink(email, pastedUrl))
            }}
            className="space-y-2 rounded-2xl bg-black/5 p-3 dark:bg-white/5"
          >
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
              {t('signIn.pasteLink')}
            </label>
            <input
              type="url"
              value={pastedUrl}
              onChange={(e) => setPastedUrl(e.target.value)}
              placeholder="https://…/__/auth/action?apiKey=…"
              className="glass-input min-h-10 text-xs"
              required
            />
            <button
              type="submit"
              disabled={busy || !pastedUrl}
              className="btn-primary min-h-10 w-full rounded-full text-xs font-bold"
            >
              {busy ? t('signIn.finishing') : t('signIn.completePasted')}
            </button>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3.5">
      <div className="rounded-2xl border border-black/5 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-start gap-2.5">
          <Mail className="mt-0.5 shrink-0 text-amber-500" size={16} />
          <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
            {t('signIn.emailLinkHelp')}
          </p>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          run(async () => {
            await sendMagicLink(email)
            setSent(t('signIn.checkEmail', { email }))
          })
        }}
        className="space-y-3"
      >
        <div>
          <label className="mb-1 block font-mono text-[10px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            {t('signIn.email')}
          </label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            placeholder={t('signIn.emailPlaceholder')}
            dir="ltr"
            required
            className="glass-input min-h-12 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={busy || !email.includes('@')}
          className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold shadow-md shadow-amber-500/20"
        >
          <Sparkles size={16} />
          <span>{busy ? t('signIn.sending') : t('signIn.sendLink')}</span>
        </button>

        {error && (
          <div className="space-y-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3">
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </p>

            {showConsoleGuide && (
              <div className="mt-2 border-t border-red-500/20 pt-2 text-[11px] text-zinc-700 dark:text-zinc-300">
                <p className="font-bold flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <HelpCircle size={13} />
                  <span>{t('signIn.consoleHelpTitle')}</span>
                </p>
                <p className="mt-1 leading-relaxed">
                  {t('signIn.consoleHelp')}
                </p>
                <div className="mt-2 flex gap-2">
                  {onSwitchToGoogle && (
                    <button
                      type="button"
                      onClick={onSwitchToGoogle}
                      className="rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-bold text-white dark:bg-white dark:text-zinc-900"
                    >
                      {t('signIn.google')}
                    </button>
                  )}
                  {onSwitchToPhone && (
                    <button
                      type="button"
                      onClick={onSwitchToPhone}
                      className="rounded-lg bg-black/10 px-2.5 py-1 text-xs font-semibold dark:bg-white/10"
                    >
                      {t('signIn.phone')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Paste sign-in link toggle for cross-device convenience */}
      {!showPasteLink && (
        <button
          type="button"
          onClick={() => setShowPasteLink(true)}
          className="block w-full text-center text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {t('signIn.pasteLink')}
        </button>
      )}

      {showPasteLink && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!pastedUrl) return
            run(() => completeEmailLink(email, pastedUrl))
          }}
          className="space-y-2 rounded-2xl bg-black/5 p-3.5 dark:bg-white/5"
        >
          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
            {t('signIn.pasteLink')}
          </label>
          <input
            type="url"
            value={pastedUrl}
            onChange={(e) => setPastedUrl(e.target.value)}
            placeholder="https://…/__/auth/action?apiKey=…"
            className="glass-input min-h-10 text-xs"
            required
          />
          <button
            type="submit"
            disabled={busy || !pastedUrl}
            className="btn-primary min-h-10 w-full rounded-full text-xs font-bold"
          >
            {busy ? t('signIn.finishing') : t('signIn.completePasted')}
          </button>
        </form>
      )}
    </div>
  )
}

export default EmailSignIn
