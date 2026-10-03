import { useState } from 'react'
import { DAILY_REPORT_LIMIT, REPORT_TYPES } from '../constants'
import { useAuth } from '../context/useAuth'
import { useMyReports } from '../hooks/useReports'
import { refreshIdentity, resendVerification, signOut } from '../services/auth'
import SignInPanel from './SignInPanel'

function formatTime(createdAt) {
  if (!createdAt?.toDate) return 'Sending…'
  return createdAt.toDate().toLocaleString()
}

function VerifyEmailNotice({ email }) {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)

  const run = async (action, done) => {
    setBusy(true)
    try {
      await action()
      setState(done)
    } catch (error) {
      setState(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">
        Verify {email} to start reporting
      </p>
      <p className="mt-1 text-xs text-amber-800">
        Reporting, posting and voting stay locked until the address is
        confirmed. This is what stops one person inventing many accounts.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(resendVerification, 'Verification email sent again.')
          }
          className="min-h-11 flex-1 rounded-xl bg-amber-600 text-sm font-semibold text-white disabled:opacity-50"
        >
          Resend email
        </button>
        <button
          type="button"
          disabled={busy}
          // The link is clicked in another tab, so this tab must refresh the
          // token before it can see the new state.
          onClick={() => run(refreshIdentity, 'Checked — still not verified.')}
          className="min-h-11 flex-1 rounded-xl border border-amber-600 text-sm font-semibold text-amber-900 disabled:opacity-50"
        >
          I have verified
        </button>
      </div>
      {state && <p className="mt-2 text-xs text-amber-900">{state}</p>}
    </div>
  )
}

function ProfilePanel({ onClose }) {
  const { uid, isAnonymous, email, emailVerified, canWrite, identityLabel } =
    useAuth()
  const { reports, error } = useMyReports(uid)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your profile"
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
              {isAnonymous ? 'Guest account' : identityLabel}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {isAnonymous
                ? 'Anonymous session on this device only'
                : canWrite
                  ? 'Verified — you can report, post and vote'
                  : 'Signed in, not yet verified'}
            </p>
            {uid && (
              <p className="mt-1 font-mono text-[11px] text-slate-400">
                {uid.slice(0, 12)}…
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
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
            Your latest reports
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Up to {DAILY_REPORT_LIMIT} reports per day.
          </p>

          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-600">
              Could not load your reports: {error.message}
            </p>
          )}

          {!error && reports.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">
              You have not sent any reports yet.
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
                    {type.shortLabel}
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
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePanel
