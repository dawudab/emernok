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
        <p className="text-sm">{t('signIn.confirmAddress')}</p>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="email"
          placeholder={t('signIn.emailPlaceholder')}
          dir="ltr"
          className="glass-input min-h-12"
        />
        <button
          type="submit"
          disabled={busy || !email.includes('@')}
          className="btn-primary min-h-12 w-full rounded-full"
        >
          {busy ? t('signIn.finishing') : t('signIn.finish')}
        </button>
        {emailLinkError && (
          <p role="alert" className="text-sm font-medium text-red-500">
            {emailLinkError.message}
          </p>
        )}
      </form>
    )
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
        <p className="text-sm font-medium">{sent}</p>
        <button
          type="button"
          onClick={() => setSent(null)}
          className="mt-3 text-sm font-semibold text-zinc-600 dark:text-zinc-300"
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
        <label className="block text-sm font-medium">
          {t('signIn.emailLabel')}
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t('signIn.emailPlaceholder')}
            dir="ltr"
            className="glass-input mt-1 min-h-12"
          />
        </label>

        <button
          type="submit"
          disabled={busy || !email.includes('@')}
          className="btn-primary min-h-12 w-full rounded-full"
        >
          {busy ? t('common.working') : t('signIn.sendLink')}
        </button>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('signIn.linkHelp')}</p>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}

export default EmailSignIn
