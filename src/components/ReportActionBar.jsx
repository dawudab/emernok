import {
  Calendar,
  CheckCircle2,
  Clock,
  History,
  MapPin,
  Timer,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { MAX_REPORT_DETAILS_LENGTH, PAST_OUTAGE_MAX_DAYS } from '../constants'
import { useI18n } from '../i18n/useI18n'
import {
  formatDurationHMS,
  formatRelativeTime,
  formatTimerDigital,
  getReportLastUpdatedMs,
  getReportStartTimeMs,
} from '../services/reports'

const DURATION_PRESETS = [1, 2, 4, 8, 12, 24]

function toLocalDatetimeValue(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function ReportActionBar({
  composerOpen,
  onOpenComposer,
  onCloseComposer,
  onCaptureLocation,
  onSubmitReport,
  activeUserReport,
  onResolveActiveReport,
  onConfirmActiveReportStillOut,
  hiddenWhenOverlayOpen = false,
  disabled,
}) {
  const { t, lang, dir } = useI18n()
  const [capturedCoords, setCapturedCoords] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [gateCleared, setGateCleared] = useState(false)
  const [gateBusy, setGateBusy] = useState(false)

  // Live timer for active outage
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    if (!activeUserReport) return 0
    const startMs = getReportStartTimeMs(activeUserReport)
    return Math.max(0, Math.floor((Date.now() - startMs) / 1000))
  })

  useEffect(() => {
    if (!activeUserReport) return
    const interval = setInterval(() => {
      const startMs = getReportStartTimeMs(activeUserReport)
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeUserReport])

  // Report Form State: purely for Power Outage
  const [reportMode, setReportMode] = useState('current') // 'current' | 'past'
  const [outageStartedAt, setOutageStartedAt] = useState('')
  const [bounds, setBounds] = useState({ min: '', max: '' })
  const [durationHours, setDurationHours] = useState(2)
  const [cause, setCause] = useState('unplanned')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const openReportSheet = async (initialMode = 'current') => {
    setCapturing(true)
    try {
      const coords = await onCaptureLocation()
      if (!coords) return
      const now = new Date()
      const minDate = new Date(
        now.getTime() - PAST_OUTAGE_MAX_DAYS * 24 * 60 * 60 * 1000,
      )
      const nowVal = toLocalDatetimeValue(now)
      setCapturedCoords(coords)
      setReportMode(initialMode)
      setGateCleared(initialMode === 'past')
      setOutageStartedAt(nowVal)
      setBounds({
        min: toLocalDatetimeValue(minDate),
        max: nowVal,
      })
      onOpenComposer?.()
    } finally {
      setCapturing(false)
    }
  }

  const handleClose = () => {
    onCloseComposer?.()
    setDetails('')
    setReportMode('current')
    setCause('unplanned')
    setGateCleared(false)
  }

  const handleGateResolvePrevious = async () => {
    if (!activeUserReport || gateBusy) return
    setGateBusy(true)
    try {
      await onResolveActiveReport?.(activeUserReport.id)
      setGateCleared(true)
      handleClose()
    } finally {
      setGateBusy(false)
    }
  }

  const handleGateStillActive = async () => {
    if (!activeUserReport || gateBusy) return
    setGateBusy(true)
    try {
      await onConfirmActiveReportStillOut?.(activeUserReport.id)
      setGateCleared(true)
      handleClose()
    } finally {
      setGateBusy(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!capturedCoords || submitting) return
    setSubmitting(true)
    try {
      await onSubmitReport({
        type: 'power',
        status: 'outage',
        coords: capturedCoords,
        details,
        reportMode,
        outageStartedAt:
          reportMode === 'past'
            ? outageStartedAt
            : toLocalDatetimeValue(new Date()),
        durationHours:
          reportMode === 'past'
            ? Number(durationHours) || 1
            : 0,
        cause,
      })
      handleClose()
    } finally {
      setSubmitting(false)
    }
  }

  // When user has an active ongoing outage and is attempting to post a current outage,
  // show the active outage timing card with option to confirm restored first
  const showCloseOutGate =
    Boolean(activeUserReport) &&
    reportMode === 'current' &&
    !gateCleared

  const activeReportAgo = activeUserReport
    ? formatRelativeTime(getReportLastUpdatedMs(activeUserReport), lang)
    : ''

  return (
    <>
      {composerOpen && capturedCoords && (
        <div
          dir={dir}
          className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/55 p-2 backdrop-blur-xs sm:items-center sm:p-5"
          onClick={handleClose}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
            className="glass-sheet pointer-events-auto flex max-h-[min(88dvh,calc(100vh-1.5rem))] w-full max-w-md flex-col overflow-hidden rounded-3xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/5 px-5 py-3.5 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-zinc-950 shadow-[0_0_16px_rgba(245,158,11,0.55)]">
                  <Zap size={18} strokeWidth={2.4} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-mono text-xs font-bold tracking-[0.14em] uppercase">
                    {t('dock.reportEnergy')}
                  </h3>
                  <p className="tabular mt-0.5 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                    <MapPin size={12} strokeWidth={2.2} aria-hidden="true" />
                    <span>
                      {t('report.gpsCaptured', {
                        lat: capturedCoords.lat.toFixed(4),
                        lng: capturedCoords.lng.toFixed(4),
                      })}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label={t('common.close')}
                className="rounded-full bg-black/5 p-1.5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
              >
                <X size={16} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>

            {showCloseOutGate ? (
              /* Active Outage Timing Card & Confirmation Window */
              <div className="space-y-4 px-5 py-5 text-start">
                <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                      <span className="size-2 rounded-full bg-red-500 animate-ping" />
                      <Timer size={13} aria-hidden="true" />
                      {t('report.timingActive')}
                    </span>
                    <span className="tabular font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {activeReportAgo}
                    </span>
                  </div>

                  {/* Real-time Ticking Timer Display */}
                  <div className="my-3 flex flex-col items-center justify-center rounded-xl bg-zinc-950/80 px-4 py-3 text-center text-white shadow-inner dark:bg-zinc-900/90">
                    <span className="font-mono text-3xl font-black tracking-widest text-amber-400">
                      {formatTimerDigital(elapsedSeconds)}
                    </span>
                    <span className="mt-1 font-mono text-[11px] text-zinc-400">
                      {t('report.timingDuration', {
                        time: formatDurationHMS(elapsedSeconds),
                      })}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {t('report.mustResolveFirst')}
                  </p>
                </div>

                <div className="space-y-2">
                  {/* Primary Action: Confirm Power Restored */}
                  <button
                    type="button"
                    disabled={gateBusy}
                    onClick={handleGateResolvePrevious}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 active:scale-98 disabled:opacity-40"
                  >
                    <CheckCircle2 size={18} aria-hidden="true" />
                    <span>{t('report.confirmRestored')}</span>
                  </button>

                  {/* Secondary Action: Keep Timing */}
                  <button
                    type="button"
                    disabled={gateBusy}
                    onClick={handleGateStillActive}
                    className="flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400/90 px-4 text-xs font-bold text-zinc-950 transition hover:bg-amber-400 active:scale-98 disabled:opacity-40"
                  >
                    <Clock size={15} aria-hidden="true" />
                    <span>{t('report.keepTiming')}</span>
                  </button>

                  {/* Optional: Log past outage */}
                  <button
                    type="button"
                    onClick={() => {
                      setReportMode('past')
                      setGateCleared(true)
                    }}
                    className="btn-ghost flex min-h-10 w-full items-center justify-center gap-1.5 rounded-2xl px-3 text-xs font-semibold"
                  >
                    <History size={14} aria-hidden="true" />
                    <span>{t('closeout.logPastInstead')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Scrollable form body */}
                <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-5 py-3.5 text-start">
                  {/* Current vs Log Past Outage toggle */}
                  <div>
                    <span className="mb-1 block font-mono text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase dark:text-zinc-400">
                      {t('report.modeLabel')}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        aria-pressed={reportMode === 'current'}
                        onClick={() => setReportMode('current')}
                        className={`min-h-9 rounded-2xl px-3 text-xs font-semibold transition-all ${
                          reportMode === 'current'
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                            : 'bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-300'
                        }`}
                      >
                        {t('report.modeCurrent')}
                      </button>
                      <button
                        type="button"
                        aria-pressed={reportMode === 'past'}
                        onClick={() => setReportMode('past')}
                        className={`min-h-9 rounded-2xl px-3 text-xs font-semibold transition-all ${
                          reportMode === 'past'
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                            : 'bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-300'
                        }`}
                      >
                        {t('dock.pastOutage')}
                      </button>
                    </div>
                  </div>

                  {/* If Current Outage: show helpful automatic timing badge */}
                  {reportMode === 'current' && (
                    <div className="flex items-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                      <Timer size={16} className="shrink-0 text-amber-500" aria-hidden="true" />
                      <span>{t('report.timingSubtitle')}</span>
                    </div>
                  )}

                  {/* ONLY AVAILABLE WHEN LOG PAST OUTAGE IS SELECTED */}
                  {reportMode === 'past' && (
                    <>
                      {/* Date & Time input */}
                      <label className="block">
                        <span className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase dark:text-zinc-400">
                          <Calendar size={12} aria-hidden="true" />
                          {t('report.dateTimeLabel')}
                        </span>
                        <input
                          type="datetime-local"
                          value={outageStartedAt}
                          min={bounds.min}
                          max={bounds.max}
                          onChange={(event) =>
                            setOutageStartedAt(event.target.value)
                          }
                          className="glass-input tabular min-h-10 text-xs"
                        />
                      </label>

                      {/* Duration / Timing estimate (hours) */}
                      <div>
                        <span className="mb-1 flex items-center justify-between font-mono text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase dark:text-zinc-400">
                          <span className="flex items-center gap-1.5">
                            <Clock size={12} aria-hidden="true" />
                            {t('report.durationPastLabel')}
                          </span>
                          <span className="tabular font-bold text-zinc-800 dark:text-zinc-200">
                            {t('unit.hoursShort', { count: durationHours })}
                          </span>
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {DURATION_PRESETS.map((preset) => {
                            const active = Number(durationHours) === preset
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setDurationHours(preset)}
                                className={`tabular rounded-full px-2.5 py-1 font-mono text-xs font-semibold transition-colors ${
                                  active
                                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                    : 'bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-300'
                                }`}
                              >
                                {t('unit.hoursShort', { count: preset })}
                              </button>
                            )
                          })}
                          <input
                            type="number"
                            min={0.5}
                            max={168}
                            step={0.5}
                            value={durationHours}
                            onChange={(event) =>
                              setDurationHours(event.target.value)
                            }
                            aria-label={t('report.durationPastLabel')}
                            className="glass-input tabular h-8 w-20 px-2 text-center text-xs"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Cause: Unplanned Outage vs Maintenance */}
                  <div>
                    <span className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase dark:text-zinc-400">
                      <Wrench size={12} aria-hidden="true" />
                      {t('report.causeLabel')}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        aria-pressed={cause === 'unplanned'}
                        onClick={() => setCause('unplanned')}
                        className={`min-h-9 rounded-2xl px-3 text-xs font-semibold transition-all ${
                          cause === 'unplanned'
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                            : 'bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-300'
                        }`}
                      >
                        {t('report.causeUnplanned')}
                      </button>
                      <button
                        type="button"
                        aria-pressed={cause === 'maintenance'}
                        onClick={() => setCause('maintenance')}
                        className={`min-h-9 rounded-2xl px-3 text-xs font-semibold transition-all ${
                          cause === 'maintenance'
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                            : 'bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-300'
                        }`}
                      >
                        {t('report.causeMaintenance')}
                      </button>
                    </div>
                  </div>

                  {/* Optional Notes */}
                  <label className="block">
                    <span className="mb-1 flex items-center justify-between font-mono text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase dark:text-zinc-400">
                      <span>{t('report.detailsLabel')}</span>
                      <span className="tabular font-normal text-zinc-400">
                        {details.length}/{MAX_REPORT_DETAILS_LENGTH}
                      </span>
                    </span>
                    <textarea
                      value={details}
                      onChange={(event) =>
                        setDetails(
                          event.target.value.slice(0, MAX_REPORT_DETAILS_LENGTH),
                        )
                      }
                      rows={2}
                      placeholder={t('report.detailsPlaceholder')}
                      className="glass-input resize-none py-2 text-xs"
                    />
                  </label>
                </div>

                {/* Footer Submit: Button text strictly "Submit" */}
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-black/5 px-5 py-3 dark:border-white/10">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="btn-ghost min-h-10 rounded-2xl px-4 text-xs font-semibold"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="min-h-10 rounded-2xl bg-red-500 px-6 text-xs font-bold text-white shadow-lg shadow-red-500/25 transition hover:bg-red-600 active:scale-98 disabled:opacity-40"
                  >
                    {submitting
                      ? t('common.working')
                      : t('report.submit') || 'Submit'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Floating Circular Report Button in bottom-right corner (matches screenshot) */}
      <div
        dir={dir}
        className={`pointer-events-none fixed end-[max(1rem,env(safe-area-inset-right,0px))] bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] z-20 transition-all duration-300 ${
          hiddenWhenOverlayOpen || composerOpen
            ? 'scale-75 opacity-0'
            : 'scale-100 opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={() => openReportSheet('current')}
          disabled={disabled || capturing}
          aria-label={activeUserReport ? t('report.confirmRestored') : t('dock.reportEnergy')}
          title={activeUserReport ? t('report.confirmRestored') : t('dock.reportEnergy')}
          className={`pointer-events-auto relative flex size-14 items-center justify-center rounded-full bg-zinc-950 text-amber-400 ring-2 ring-amber-400/90 shadow-[0_0_24px_rgba(251,191,36,0.65)] transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-40 ${
            activeUserReport
              ? 'ring-red-500 shadow-[0_0_24px_rgba(239,68,68,0.7)]'
              : ''
          }`}
        >
          {activeUserReport && (
            <span className="absolute -top-2 -start-2 rounded-full bg-red-600 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white shadow animate-pulse">
              {formatTimerDigital(elapsedSeconds)}
            </span>
          )}
          <Zap
            size={26}
            strokeWidth={2.4}
            aria-hidden="true"
            className={`fill-amber-400 text-amber-400 ${capturing ? 'animate-pulse' : ''}`}
          />
        </button>
      </div>
    </>
  )
}

export default ReportActionBar
