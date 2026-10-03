import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { DAILY_REPORT_LIMIT, REPORT_TYPES, accentFor } from '../constants'
import { useAuth } from '../context/useAuth'
import { useOfficial } from '../hooks/useOfficial'
import { useMyReports } from '../hooks/useReports'
import { useT } from '../i18n/useI18n'
import { refreshIdentity, signOut } from '../services/auth'
import { deleteReport } from '../services/reports'
import { useTheme } from '../theme/useTheme'
import Sheet from './Sheet'
import SignInPanel from './SignInPanel'
import { TYPE_ICONS } from './icons'

function VerifyEmailNotice({ email }) {
  const t = useT()
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)

  return (
    <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 transition-all duration-300">
      <p className="text-sm font-semibold">
        {t('profile.verifyTitle', { email })}
      </p>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        {t('profile.verifyBody')}
      </p>
      <button
        type="button"
        disabled={busy}
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
        className="btn-primary mt-3 min-h-11 w-full rounded-full text-sm"
      >
        {t('profile.verifyCheck')}
      </button>
      {state && <p className="mt-2 text-xs">{state}</p>}
    </div>
  )
}

function ProfilePanel({ onClose }) {
  const { uid, isAnonymous, email, emailVerified, canWrite, identityLabel } =
    useAuth()
  const { role, isOfficial } = useOfficial(uid)
  const { reports, error } = useMyReports(uid)
  const { isDark } = useTheme()
  const t = useT()
  const [copied, setCopied] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  const formatTime = (createdAt) =>
    createdAt?.toDate ? createdAt.toDate().toLocaleString() : t('popup.sending')

  const standing = isAnonymous
    ? t('profile.anonymous')
    : isOfficial
      ? t('profile.official', { org: role.org })
      : canWrite
        ? t('profile.fullAccess')
        : t('profile.notVerified')

  const handleDelete = async (reportId) => {
    setDeletingId(reportId)
    setDeleteError(null)
    try {
      await deleteReport(reportId)
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Sheet
      title={isAnonymous ? t('profile.guest') : identityLabel}
      label={t('profile.title')}
      subtitle={standing}
      onClose={onClose}
    >
      {uid && (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(uid)
            setCopied(true)
          }}
          className="glass-inset mb-4 flex w-full items-center justify-between gap-3 px-3 py-2"
        >
          <span className="tabular truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {uid}
          </span>
          <span className="shrink-0 font-mono text-[10px] font-semibold tracking-[0.15em] uppercase">
            {copied ? t('profile.copied') : t('profile.copyId')}
          </span>
        </button>
      )}

      {isAnonymous && <SignInPanel onDone={onClose} />}

      {!isAnonymous && !emailVerified && email && (
        <VerifyEmailNotice email={email} />
      )}

      <h3 className="mt-6 font-mono text-[10px] font-semibold tracking-[0.18em] text-zinc-500 uppercase dark:text-zinc-400">
        {t('profile.latest')}
      </h3>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {t('profile.dailyLimit', { limit: DAILY_REPORT_LIMIT })}
      </p>

      {(error || deleteError) && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-500">
          {deleteError || t('profile.loadFailed', { message: error.message })}
        </p>
      )}

      {!error && reports.length === 0 && (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          {t('profile.noReports')}
        </p>
      )}

      <ul className="mt-3 divide-y divide-black/5 dark:divide-white/10">
        {reports.map((report) => {
          const type = REPORT_TYPES[report.type]
          const Icon = TYPE_ICONS[type.iconName]
          const isDeleting = deletingId === report.id
          return (
            <li key={report.id} className="py-3">
              <div className="flex items-center gap-3">
                <Icon
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="shrink-0"
                  style={{ color: accentFor(type, isDark) }}
                />
                <span className="flex-1 text-sm font-medium">
                  {t(type.shortKey)}
                </span>
                <span className="tabular text-xs text-zinc-500 dark:text-zinc-400">
                  {formatTime(report.createdAt)}
                </span>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDelete(report.id)}
                  aria-label={t('report.delete')}
                  title={t('report.delete')}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-500/15 disabled:opacity-40"
                >
                  <Trash2 size={14} strokeWidth={2.2} aria-hidden="true" />
                </button>
              </div>
              {report.details && (
                <p className="mt-1 ps-7 text-xs text-zinc-500 dark:text-zinc-400">
                  {report.details}
                </p>
              )}
            </li>
          )
        })}
      </ul>

      {!isAnonymous && (
        <button
          type="button"
          onClick={signOut}
          className="btn-ghost mt-6 min-h-12 w-full rounded-full"
        >
          {t('common.signOut')}
        </button>
      )}
    </Sheet>
  )
}

export default ProfilePanel
