import { CheckCircle2, Clock, MapPin, X, Zap, ZapOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import {
  formatElapsedOutageTime,
  getElapsedDurationMinutes,
} from '../services/reports'

/**
 * High-focus follow-up modal for returning users who have an active, unresolved outage report.
 * Replaces the generic 'power is working' survey modal so the user can easily confirm
 * if their existing power cut has been resolved.
 */
function ActiveOutageFollowUpModal({
  report,
  isOpen,
  onClose,
  onConfirmRestored,
  onConfirmStillOut,
}) {
  const { t, lang, dir } = useI18n()
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [statusFeedback, setStatusFeedback] = useState(null)

  // Live timer tick every 1 second
  useEffect(() => {
    if (!isOpen || !report) return undefined
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [isOpen, report])

  const elapsedText = useMemo(() => {
    if (!report) return '0m'
    return formatElapsedOutageTime(report, lang, now)
  }, [lang, now, report])

  const elapsedMinutes = useMemo(() => {
    if (!report) return 0
    return getElapsedDurationMinutes(report, now)
  }, [now, report])

  const locale = lang === 'ar' ? 'ar-MR' : lang === 'fr' ? 'fr-FR' : 'en-US'
  const startTimeFormatted = useMemo(() => {
    if (!report) return ''
    const startMs =
      report.createdAt?.toMillis?.() ??
      (report.outageStartedAt ? new Date(report.outageStartedAt).getTime() : 0)
    if (!startMs) return ''
    return new Date(startMs).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [locale, report])

  if (!isOpen || !report) return null

  const handleRestored = async () => {
    setBusy(true)
    try {
      await onConfirmRestored(report.id, elapsedMinutes)
      setStatusFeedback('restored')
      setTimeout(() => {
        onClose()
      }, 1800)
    } finally {
      setBusy(false)
    }
  }

  const handleStillOut = async () => {
    setBusy(true)
    try {
      await onConfirmStillOut(report.id)
      setStatusFeedback('still_out')
      setTimeout(() => {
        onClose()
      }, 1500)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      dir={dir}
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-400/30 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-amber-400/20 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute top-4 end-4 rounded-full p-2 text-zinc-500 hover:bg-black/5 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100 transition"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {statusFeedback === 'restored' ? (
          <div className="py-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={36} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {t('activeOutage.restoredRecorded')}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto">
              {t('activeOutage.restoredDesc', { duration: elapsedText })}
            </p>
          </div>
        ) : statusFeedback === 'still_out' ? (
          <div className="py-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Clock size={36} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold">
              {t('activeOutage.stillOutRecorded')}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto">
              {t('activeOutage.timerContinues')}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header with glowing live timer */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-400/15 px-3 py-1 font-mono text-[10px] font-bold text-amber-700 uppercase dark:text-amber-300">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
                </span>
                <Zap size={12} strokeWidth={2.5} fill="currentColor" aria-hidden="true" />
                <span>{t('activeOutage.badge')}</span>
              </div>

              <h2 className="text-lg font-bold leading-tight">
                {t('activeOutage.title')}
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {t('activeOutage.subtitle')}
              </p>
            </div>

            {/* Glowing Live Timer Card */}
            <div className="rounded-2xl border border-amber-400/40 bg-linear-to-b from-amber-400/10 to-amber-500/5 p-4 text-center shadow-inner">
              <span className="font-mono text-[11px] font-semibold tracking-wider text-amber-700 dark:text-amber-300 uppercase">
                {t('activeOutage.timerLabel')}
              </span>
              <div className="tabular mt-1 font-mono text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-amber-400">
                {elapsedText}
              </div>
              <div className="mt-2 flex items-center justify-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                {startTimeFormatted && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} aria-hidden="true" />
                    <span>{t('activeOutage.sinceTime', { time: startTimeFormatted })}</span>
                  </span>
                )}
                {report.lat && report.lng && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} aria-hidden="true" />
                    <span className="tabular">{report.lat.toFixed(3)}, {report.lng.toFixed(3)}</span>
                  </span>
                )}
              </div>
              {report.details && (
                <p className="mt-2 text-xs italic text-zinc-600 dark:text-zinc-300 bg-black/5 dark:bg-white/5 py-1 px-2.5 rounded-lg">
                  “{report.details}”
                </p>
              )}
            </div>

            {/* Central prompt question */}
            <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-3 text-center dark:border-white/5 dark:bg-white/[0.02]">
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {t('activeOutage.question')}
              </p>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={handleRestored}
                className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-98 transition disabled:opacity-50"
              >
                <CheckCircle2 size={18} strokeWidth={2.4} aria-hidden="true" />
                <span>{t('activeOutage.yesRestored')}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleStillOut}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold text-xs transition disabled:opacity-50"
                >
                  <ZapOff size={14} strokeWidth={2.2} aria-hidden="true" />
                  <span>{t('activeOutage.stillOut')}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost min-h-11 rounded-2xl text-xs font-semibold"
                >
                  {t('activeOutage.checkLater')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActiveOutageFollowUpModal
