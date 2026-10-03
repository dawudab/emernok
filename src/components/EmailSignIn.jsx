import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { useT } from '../i18n/useI18n'
import { sendMagicLink } from '../services/auth'

/**
 * Link-only by design. A password would let anyone type a stranger's address
 * and hold an unverified account; opening the link proves the mailbox is
 * theirs, which is what the five-reporter verification threshold rests on.
 */
function EmailSignIn() {
  const { emailLinkStatus, emailLinkError, finishEmailLink } = useAuth()
  const t = useT()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(null)

  // The link was opened in a different browser than the one that requested it,
  // so localStorage has no address and Firebase needs it to build the
  // credential.
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
        <p className="text-sm text-slate-700">{t('signIn.confirmAddress')}</p>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="email"
          placeholder={t('signIn.emailPlaceholder')}
          dir="ltr"
          className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base"
        />
        <button
          type="submit"
          disabled={busy || !email.includes('@')}
          className="min-h-12 w-full rounded-xl bg-slate-900 font-semibold text-white disabled:opacity-50"
        >
          {busy ? t('signIn.finishing') : t('signIn.finish')}
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
          {t('signIn.useAnother')}
        </button>
      </div>
    )
  }

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          run(async () => {
            await sendMagicLink(email)
            setSent(t('signIn.linkSent', { email: email.trim() }))
          })
        }}
        className="space-y-3"
      >
        <label className="block text-sm font-medium text-slate-700">
          {t('signIn.emailLabel')}
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t('signIn.emailPlaceholder')}
            dir="ltr"
            className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base"
          />
        </label>

        <button
          type="submit"
          disabled={busy || !email.includes('@')}
          className="min-h-12 w-full rounded-xl bg-slate-900 font-semibold text-white disabled:opacity-50"
        >
          {busy ? t('common.working') : t('signIn.sendLink')}
        </button>

        <p className="text-xs text-slate-500">{t('signIn.linkHelp')}</p>
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
