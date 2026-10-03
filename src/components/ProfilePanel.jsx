import { useState } from 'react'
import { DAILY_REPORT_LIMIT, REPORT_TYPES } from '../constants'
import { useAuth } from '../context/useAuth'
import { useOfficial } from '../hooks/useOfficial'
import { useMyReports } from '../hooks/useReports'
import { useT } from '../i18n/useI18n'
import { refreshIdentity, signOut } from '../services/auth'
import SignInPanel from './SignInPanel'

function VerifyEmailNotice({ email }) {
  const t = useT()
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)

  return (
    <div className="rounded-xl bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">
        {t('profile.verifyTitle', { email })}
      </p>
      <p className="mt-1 text-xs text-amber-800">{t('profile.verifyBody')}</p>
      <button
        type="button"
        disabled={busy}
        // The link is opened in another tab, so this tab has to refresh the
        // token before it can see the new state.
        onClick={async () => {
          setBusy(true)
          try {
            await refreshIdentity()
            setState(t('profile.verifyStill'))
          } catch (error) {
            setState(error.message)
          } finally {
            setBusy(false)
          }
        }}
        className="mt-3 min-h-11 w-full rounded-xl bg-amber-600 text-sm font-semibold text-white disabled:opacity-50"
      >
        {t('profile.verifyCheck')}
      </button>
      {state && <p className="mt-2 text-xs text-amber-900">{state}</p>}
    </div>
  )
}

function ProfilePanel({ onClose }) {
  const { uid, isAnonymous, email, emailVerified, canWrite, identityLabel } =
    useAuth()
  const { role, isOfficial } = useOfficial(uid)
  const { reports, error } = useMyReports(uid)
  const t = useT()
  const [copied, setCopied] = useState(false)

  const formatTime = (createdAt) =>
    createdAt?.toDate ? createdAt.toDate().toLocaleString() : t('popup.sending')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('profile.title')}
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900">
              {isAnonymous ? t('profile.guest') : identityLabel}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {isAnonymous
                ? t('profile.anonymous')
                : isOfficial
                  ? t('profile.official', { org: role.org })
                  : canWrite
                    ? t('profile.fullAccess')
                    : t('profile.notVerified')}
            </p>
            {uid && (
              // Needed verbatim to be granted moderator access, so it has to be
              // copyable rather than truncated for looks.
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(uid)
                  setCopied(true)
                }}
                className="mt-1 font-mono text-[11px] text-slate-400 underline"
              >
                {copied ? t('profile.copied') : t('profile.copyId')}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="min-h-11 min-w-11 shrink-0 rounded-xl bg-slate-100 font-semibold text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isAnonymous && <SignInPanel onDone={onClose} />}

          {!isAnonymous && !emailVerified && email && (
            <VerifyEmailNotice email={email} />
          )}

          <h3 className="mt-6 text-sm font-bold text-slate-900">
            {t('profile.latest')}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {t('profile.dailyLimit', { limit: DAILY_REPORT_LIMIT })}
          </p>

          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-600">
              {t('profile.loadFailed', { message: error.message })}
            </p>
          )}

          {!error && reports.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">
              {t('profile.noReports')}
            </p>
          )}

          <ul className="mt-3 divide-y divide-slate-100">
            {reports.map((report) => {
              const type = REPORT_TYPES[report.type]
              return (
                <li key={report.id} className="flex items-center gap-3 py-3">
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: type.color }}
                  />
                  <span className="flex-1 text-sm font-medium text-slate-800">
                    {t(type.shortKey)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatTime(report.createdAt)}
                  </span>
                </li>
              )
            })}
          </ul>

          {!isAnonymous && (
            <button
              type="button"
              onClick={signOut}
              className="mt-6 min-h-12 w-full rounded-xl border border-slate-300 font-semibold text-slate-700"
            >
              {t('common.signOut')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePanel
