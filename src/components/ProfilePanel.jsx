import { useState } from 'react'
import { DAILY_REPORT_LIMIT, REPORT_TYPES } from '../constants'
import { useAuth } from '../context/useAuth'
import { useMyReports } from '../hooks/useReports'
import { signOut } from '../services/auth'
import PhoneSignIn from './PhoneSignIn'

function formatTime(createdAt) {
  if (!createdAt?.toDate) return 'Sending…'
  return createdAt.toDate().toLocaleString()
}

function ProfilePanel({ onClose }) {
  const { uid, isAnonymous, phoneNumber } = useAuth()
  const { reports, error } = useMyReports(uid)
  const [signingIn, setSigningIn] = useState(false)

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
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {phoneNumber ?? 'Guest account'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {isAnonymous
                ? 'Anonymous session on this device only'
                : 'Signed in by phone'}
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
            className="min-h-11 min-w-11 rounded-xl bg-slate-100 font-semibold text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isAnonymous &&
            (signingIn ? (
              <PhoneSignIn onDone={() => setSigningIn(false)} />
            ) : (
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-700">
                  Add your phone number to keep your reports if you change
                  device or clear your browser.
                </p>
                <button
                  type="button"
                  onClick={() => setSigningIn(true)}
                  className="mt-3 min-h-12 w-full rounded-xl bg-slate-900 font-semibold text-white"
                >
                  Sign in with phone
                </button>
              </div>
            ))}

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
