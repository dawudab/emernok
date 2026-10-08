import { CheckCircle2, Clock, MapPin, ShieldAlert, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  DAILY_REPORT_LIMIT,
  REPORT_TYPES,
  VERIFY_MIN_USERS,
  accentFor,
} from '../constants'
import { useAuth } from '../context/useAuth'
import { useOfficial } from '../hooks/useOfficial'
import { useMyReports } from '../hooks/useReports'
import { useT } from '../i18n/useI18n'
import { refreshIdentity, signOut } from '../services/auth'
import { deleteReport, isResolved } from '../services/reports'
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

function getReportStatus(report, clusters) {
  if (report.reportMode === 'past') {
    return {
      state: 'past',
      reporterCount: 1,
      stillOutCount: report.stillOutCount ?? 0,
      restoredCount: report.restoredCount ?? 0,
    }
  }
  if (isResolved(report)) {
    return {
      state: 'resolved',
      reporterCount: 1,
      stillOutCount: report.stillOutCount ?? 0,
      restoredCount: report.restoredCount ?? 0,
    }
  }

  const matchingCluster = (clusters ?? []).find((cluster) =>
    cluster.reports?.some((item) => item.id === report.id),
  )

  if (matchingCluster?.verified) {
    return {
      state: 'verified',
      reporterCount: matchingCluster.reporterCount,
      stillOutCount: matchingCluster.stillOutCount,
      restoredCount: matchingCluster.restoredCount,
    }
  }

  return {
    state: 'pending',
    reporterCount: matchingCluster?.reporterCount ?? 1,
    stillOutCount: matchingCluster?.stillOutCount ?? report.stillOutCount ?? 0,
    restoredCount: matchingCluster?.restoredCount ?? report.restoredCount ?? 0,
  }
}

function ProfilePanel({ clusters = [], onFocusReport, onClose }) {
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

  const enrichedReports = useMemo(
    () =>
      reports.map((report) => ({
        ...report,
        statusInfo: getReportStatus(report, clusters),
      })),
    [clusters, reports],
  )

  const summary = useMemo(() => {
    let verified = 0
    let resolved = 0
    for (const item of enrichedReports) {
      if (item.statusInfo.state === 'verified') verified += 1
      if (item.statusInfo.state === 'resolved') resolved += 1
    }
    return {
      total: enrichedReports.length,
      verified,
      resolved,
    }
  }, [enrichedReports])

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

      {/* Simple summary stats of user's own reported outages */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-black/5 px-3 py-2.5 text-center dark:bg-white/5">
          <span className="tabular block font-mono text-lg font-bold">
            {summary.total}
          </span>
          <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
            {t('profile.statTotal')}
          </span>
        </div>
        <div className="rounded-2xl bg-red-500/10 px-3 py-2.5 text-center">
          <span className="tabular block font-mono text-lg font-bold text-red-600 dark:text-red-400">
            {summary.verified}
          </span>
          <span className="block text-[11px] text-red-600/80 dark:text-red-300/80">
            {t('profile.statVerified')}
          </span>
        </div>
        <div className="rounded-2xl bg-emerald-500/10 px-3 py-2.5 text-center">
          <span className="tabular block font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {summary.resolved}
          </span>
          <span className="block text-[11px] text-emerald-600/80 dark:text-emerald-300/80">
            {t('profile.statResolved')}
          </span>
        </div>
      </div>

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

      {!error && enrichedReports.length === 0 && (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          {t('profile.noReports')}
        </p>
      )}

      <ul className="mt-3 space-y-2.5">
        {enrichedReports.map((report) => {
          const type = REPORT_TYPES[report.type]
          const Icon = TYPE_ICONS[type.iconName]
          const isDeleting = deletingId === report.id
          const { state, reporterCount, stillOutCount, restoredCount } =
            report.statusInfo

          return (
            <li
              key={report.id}
              className="rounded-2xl border border-black/5 bg-black/[0.03] p-3.5 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
                    <Icon
                      size={16}
                      strokeWidth={2.2}
                      aria-hidden="true"
                      style={{ color: accentFor(type, isDark) }}
                    />
                  </span>
                  <div>
                    <span className="block text-sm font-semibold">
                      {t(type.shortKey)}
                    </span>
                    <span className="tabular block text-[11px] text-zinc-500 dark:text-zinc-400">
                      {formatTime(report.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Live Report Status Pill */}
                {state === 'past' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/20 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider text-zinc-700 uppercase dark:text-zinc-300">
                    <Clock size={12} aria-hidden="true" />
                    {t('profile.statusPast')}
                    {report.durationHours ? ` · ${report.durationHours}h` : ''}
                  </span>
                )}
                {state === 'resolved' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                    <CheckCircle2 size={12} aria-hidden="true" />
                    {t('profile.statusResolved')}
                  </span>
                )}
                {state === 'verified' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider text-red-600 uppercase dark:text-red-300">
                    <ShieldAlert size={12} aria-hidden="true" />
                    {t('profile.statusVerified')}
                  </span>
                )}
                {state === 'pending' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-300">
                    <Clock size={12} aria-hidden="true" />
                    {t('profile.statusPending', {
                      count: reporterCount,
                      total: VERIFY_MIN_USERS,
                    })}
                  </span>
                )}
              </div>

              {report.details && (
                <p className="mt-2 rounded-xl bg-black/5 px-3 py-1.5 text-xs italic text-zinc-700 dark:bg-white/5 dark:text-zinc-300">
                  “{report.details}”
                </p>
              )}

              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-black/5 pt-2 dark:border-white/10">
                <span className="tabular text-xs text-zinc-500 dark:text-zinc-400">
                  {t('popup.tally', {
                    out: stillOutCount,
                    back: restoredCount,
                  })}
                </span>

                <div className="flex items-center gap-1.5">
                  {onFocusReport && (
                    <button
                      type="button"
                      onClick={() => onFocusReport(report)}
                      className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
                    >
                      <MapPin size={12} aria-hidden="true" />
                      <span>{t('profile.viewOnMap')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDelete(report.id)}
                    aria-label={t('report.delete')}
                    title={t('report.delete')}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-500/15 disabled:opacity-40"
                  >
                    <Trash2 size={14} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                </div>
              </div>
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
