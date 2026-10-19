import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { MAX_REPORT_DETAILS_LENGTH } from '../constants'
import { useI18n } from '../i18n/useI18n'
import {
  formatElapsedOutageTime,
  getElapsedDurationMinutes,
} from '../services/reports'

function getTodayString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getYesterdayString() {
  const d = new Date(Date.now() - 86400000)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultTimeString() {
  const d = new Date(Date.now() - 3600000)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(Math.floor(d.getMinutes() / 5) * 5).padStart(2, '0')
  return `${hours}:${minutes}`
}

function ReportActionBar({
  onCaptureLocation,
  onSubmitReport,
  activeReport,
  onMarkRestored,
  disabled,
}) {
  const { t, lang, dir } = useI18n()
  const [composerOpen, setComposerOpen] = useState(false)
  const [activeReportModalOpen, setActiveReportModalOpen] = useState(false)
  const [capturedCoords, setCapturedCoords] = useState(null)
  const [capturing, setCapturing] = useState(false)

  // Report fields
  const [reportMode, setReportMode] = useState('current') // 'current' | 'past'
  const [cause, setCause] = useState('unplanned')
  const [details, setDetails] = useState('')

  // Past outage specific fields
  const [pastDate, setPastDate] = useState(() => getTodayString())
  const [pastTime, setPastTime] = useState(() => getDefaultTimeString())
  const [pastHours, setPastHours] = useState(1)
  const [pastMinutes, setPastMinutes] = useState(30)

  const [submitting, setSubmitting] = useState(false)
  const [restoring, setRestoring] = useState(false)

  // Live timer for active report modal
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!activeReportModalOpen || !activeReport) return undefined
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [activeReportModalOpen, activeReport])

  const activeElapsedText = useMemo(() => {
    if (!activeReport) return '0m'
    return formatElapsedOutageTime(activeReport, lang, now)
  }, [activeReport, lang, now])

  const activeElapsedMinutes = useMemo(() => {
    if (!activeReport) return 0
    return getElapsedDurationMinutes(activeReport, now)
  }, [activeReport, now])

  const handleOpenFab = async () => {
    // If the user already has an active unresolved power report, focus on that report!
    if (activeReport) {
      setActiveReportModalOpen(true)
      return
    }

    setCapturing(true)
    try {
      const coords = await onCaptureLocation()
      if (!coords) return
      setCapturedCoords(coords)
      setComposerOpen(true)
    } finally {
      setCapturing(false)
    }
  }

  const handleClose = () => {
    setComposerOpen(false)
    setDetails('')
    setCause('unplanned')
    setReportMode('current')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!capturedCoords || submitting) return
    setSubmitting(true)
    try {
      if (reportMode === 'current') {
        await onSubmitReport({
          type: 'power',
          coords: capturedCoords,
          details,
          cause,
          reportMode: 'current',
          outageStartedAt: new Date().toISOString(),
        })
      } else {
        // Past Outage
        const datePart = pastDate || getTodayString()
        const timePart = pastTime || '12:00'
        const combinedIso = new Date(`${datePart}T${timePart}:00`).toISOString()
        const totalMinutes = Math.max(
          5,
          (Number(pastHours) || 0) * 60 + (Number(pastMinutes) || 0),
        )
        const durationHours = Number((totalMinutes / 60).toFixed(1))

        await onSubmitReport({
          type: 'power',
          coords: capturedCoords,
          details,
          cause,
          reportMode: 'past',
          outageStartedAt: combinedIso,
          durationHours,
          durationMinutes: totalMinutes,
        })
      }
      handleClose()
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmRestoredFromModal = async () => {
    if (!activeReport || restoring) return
    setRestoring(true)
    try {
      await onMarkRestored(activeReport.id, activeElapsedMinutes)
      setActiveReportModalOpen(false)
    } finally {
      setRestoring(false)
    }
  }

  const todayStr = useMemo(() => getTodayString(), [])
  const yesterdayStr = useMemo(() => getYesterdayString(), [])

  return (
    <>
      {/* Active Report Notice Modal (when user taps button while an outage is already ongoing) */}
      {activeReportModalOpen && activeReport && (
        <div
          role="dialog"
          aria-modal="true"
          dir={dir}
          className="fixed inset-0 z-[1150] flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs sm:p-5 animate-in fade-in duration-200"
          onClick={() => setActiveReportModalOpen(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="glass-sheet pointer-events-auto flex max-h-[min(84dvh,calc(100vh-2rem))] w-full max-w-md flex-col overflow-hidden rounded-3xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/5 px-5 py-3.5 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-zinc-950 shadow-[0_0_16px_rgba(251,191,36,0.6)]">
                  <Zap size={18} strokeWidth={2.4} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-mono text-xs font-bold tracking-[0.14em] uppercase">
                    {t('activeOutage.existingReportTitle')}
                  </h3>
                  <p className="tabular mt-0.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                    {t('activeOutage.liveTimerActive')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveReportModalOpen(false)}
                aria-label={t('common.close')}
                className="rounded-full bg-black/5 p-1.5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
              >
                <X size={16} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>

            {/* Content Body */}
            <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
              <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-center">
                <span className="font-mono text-[10px] font-bold tracking-wider text-amber-700 dark:text-amber-300 uppercase">
                  {t('activeOutage.timerLabel')}
                </span>
                <div className="tabular mt-1 font-mono text-3xl font-extrabold text-zinc-950 dark:text-amber-400">
                  {activeElapsedText}
                </div>
                {activeReport.lat && activeReport.lng && (
                  <p className="tabular mt-2 text-xs text-zinc-600 dark:text-zinc-400 flex items-center justify-center gap-1">
                    <MapPin size={12} aria-hidden="true" />
                    <span>
                      {activeReport.lat.toFixed(4)}, {activeReport.lng.toFixed(4)}
                    </span>
                  </p>
                )}
              </div>

              <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                {t('activeOutage.oneReportAtATimeRule')}
              </p>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  disabled={restoring}
                  onClick={handleConfirmRestoredFromModal}
                  className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-98 transition disabled:opacity-50"
                >
                  <CheckCircle2 size={18} strokeWidth={2.4} aria-hidden="true" />
                  <span>
                    {restoring ? t('common.working') : t('activeOutage.yesRestored')}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={capturing}
                  onClick={async () => {
                    setActiveReportModalOpen(false)
                    setCapturing(true)
                    try {
                      const coords = await onCaptureLocation()
                      if (!coords) return
                      setCapturedCoords(coords)
                      setReportMode('past')
                      setComposerOpen(true)
                    } finally {
                      setCapturing(false)
                    }
                  }}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-black/5 px-4 text-xs font-bold text-zinc-800 hover:bg-black/10 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15 transition"
                >
                  <Clock size={15} strokeWidth={2.2} aria-hidden="true" />
                  <span>{t('report.modePast')}</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 justify-end border-t border-black/5 px-5 py-3 dark:border-white/10">
              <button
                type="button"
                onClick={() => setActiveReportModalOpen(false)}
                className="btn-ghost min-h-9 rounded-full px-4 text-xs font-semibold"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outage Report Creation Modal */}
      {composerOpen && capturedCoords && (
        <div
          role="dialog"
          aria-modal="true"
          dir={dir}
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs sm:p-5 animate-in fade-in duration-200"
          onClick={handleClose}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
            className="glass-sheet pointer-events-auto flex max-h-[min(88dvh,calc(100vh-2rem))] w-full max-w-md flex-col overflow-hidden rounded-3xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/5 px-5 py-3.5 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-zinc-950 shadow-[0_0_16px_rgba(251,191,36,0.6)]">
                  <Zap size={18} strokeWidth={2.4} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-mono text-xs font-bold tracking-[0.14em] uppercase">
                    {t('report.modalTitle')}
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

            {/* Form body */}
            <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-5 py-3.5">
              {/* Report Mode Selector: Current vs Past Outage */}
              <div>
                <span className="mb-1 block font-mono text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase dark:text-zinc-400">
                  {t('report.modeLabel')}
                </span>
                <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-black/5 p-1 dark:bg-white/10">
                  <button
                    type="button"
                    onClick={() => setReportMode('current')}
                    className={`flex items-center justify-center gap-1.5 min-h-10 rounded-xl px-3 text-xs font-bold transition ${
                      reportMode === 'current'
                        ? 'bg-amber-400 text-zinc-950 shadow-sm'
                        : 'text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white'
                    }`}
                  >
                    <Zap size={14} strokeWidth={2.4} aria-hidden="true" />
                    <span>{t('report.modeCurrent')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportMode('past')}
                    className={`flex items-center justify-center gap-1.5 min-h-10 rounded-xl px-3 text-xs font-bold transition ${
                      reportMode === 'past'
                        ? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-950'
                        : 'text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white'
                    }`}
                  >
                    <Clock size={14} strokeWidth={2.2} aria-hidden="true" />
                    <span>{t('report.modePast')}</span>
                  </button>
                </div>
              </div>

              {/* Mode Notice */}
              {reportMode === 'current' ? (
                <div className="flex items-center gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                  <Clock
                    size={16}
                    className="shrink-0 text-amber-600 dark:text-amber-400"
                    aria-hidden="true"
                  />
                  <p className="leading-snug">
                    {t('report.autoTimingNotice')}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 rounded-2xl border border-sky-400/30 bg-sky-400/10 p-3 text-xs text-sky-800 dark:text-sky-200">
                  <Calendar
                    size={16}
                    className="shrink-0 text-sky-600 dark:text-sky-400"
                    aria-hidden="true"
                  />
                  <p className="leading-snug">
                    {t('report.pastNotice')}
                  </p>
                </div>
              )}

              {/* Past Outage Details (Date, Time, Duration) */}
              {reportMode === 'past' && (
                <div className="space-y-3 rounded-2xl border border-black/5 bg-black/[0.02] p-3.5 dark:border-white/5 dark:bg-white/[0.02]">
                  {/* Date & Quick Chips */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                        {t('report.dateLabel')}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPastDate(todayStr)}
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold transition ${
                            pastDate === todayStr
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                              : 'bg-black/5 text-zinc-600 hover:bg-black/10 dark:bg-white/10 dark:text-zinc-300'
                          }`}
                        >
                          {t('report.today')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPastDate(yesterdayStr)}
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold transition ${
                            pastDate === yesterdayStr
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                              : 'bg-black/5 text-zinc-600 hover:bg-black/10 dark:bg-white/10 dark:text-zinc-300'
                          }`}
                        >
                          {t('report.yesterday')}
                        </button>
                      </div>
                    </div>
                    <input
                      type="date"
                      value={pastDate}
                      max={todayStr}
                      onChange={(e) => setPastDate(e.target.value)}
                      className="glass-input mt-1.5 min-h-10 w-full py-2 px-3 text-sm font-mono"
                    />
                  </div>

                  {/* Start Time */}
                  <div>
                    <span className="mb-1 block font-mono text-[10px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                      {t('report.timeLabel')}
                    </span>
                    <input
                      type="time"
                      value={pastTime}
                      onChange={(e) => setPastTime(e.target.value)}
                      className="glass-input min-h-10 w-full py-2 px-3 text-sm font-mono"
                    />
                  </div>

                  {/* Duration Presets & Stepper */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                        {t('report.durationLabel')}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        {pastHours}h {pastMinutes}m
                      </span>
                    </div>

                    {/* Quick Duration Chips */}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {[
                        { label: '30m', h: 0, m: 30 },
                        { label: '1h', h: 1, m: 0 },
                        { label: '2h', h: 2, m: 0 },
                        { label: '3h', h: 3, m: 0 },
                        { label: '4h', h: 4, m: 0 },
                        { label: '6h', h: 6, m: 0 },
                      ].map((item) => {
                        const isMatch = pastHours === item.h && pastMinutes === item.m
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setPastHours(item.h)
                              setPastMinutes(item.m)
                            }}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                              isMatch
                                ? 'bg-amber-400 text-zinc-950 font-bold shadow-xs'
                                : 'bg-black/5 text-zinc-700 hover:bg-black/10 dark:bg-white/10 dark:text-zinc-300'
                            }`}
                          >
                            {item.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Hours & Minutes Stepper Inputs */}
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white/50 px-2.5 py-1 dark:border-white/10 dark:bg-zinc-800/50">
                        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                          {t('report.hours')}:
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="48"
                          value={pastHours}
                          onChange={(e) => setPastHours(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full bg-transparent font-mono text-sm font-bold text-zinc-900 outline-none dark:text-zinc-100"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white/50 px-2.5 py-1 dark:border-white/10 dark:bg-zinc-800/50">
                        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                          {t('report.minutes')}:
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          step="5"
                          value={pastMinutes}
                          onChange={(e) => setPastMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                          className="w-full bg-transparent font-mono text-sm font-bold text-zinc-900 outline-none dark:text-zinc-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
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
                    className={`min-h-10 rounded-2xl px-3 text-xs font-semibold transition-all ${
                      cause === 'unplanned'
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                        : 'bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-300'
                    }`}
                  >
                    {t('report.causeUnplanned')}
                  </button>
                  <button
                    type="button"
                    aria-pressed={cause === 'maintenance'}
                    onClick={() => setCause('maintenance')}
                    className={`min-h-10 rounded-2xl px-3 text-xs font-semibold transition-all ${
                      cause === 'maintenance'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-300'
                    }`}
                  >
                    {t('report.causeMaintenance')}
                  </button>
                </div>
              </div>

              {/* Optional Details */}
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase dark:text-zinc-400">
                  {t('report.detailsLabel')}
                </span>
                <textarea
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  rows={2}
                  maxLength={MAX_REPORT_DETAILS_LENGTH}
                  placeholder={t('report.detailsPlaceholder')}
                  className="glass-input resize-none py-2 text-sm"
                />
              </label>
            </div>

            {/* Footer with "Submit" button */}
            <div className="flex shrink-0 gap-2 border-t border-black/5 px-5 py-3 dark:border-white/10">
              <button
                type="button"
                onClick={handleClose}
                className="btn-ghost min-h-11 rounded-full px-4 text-xs font-semibold"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting || disabled}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-amber-400 px-5 text-xs font-bold text-zinc-950 shadow-[0_0_20px_rgba(251,191,36,0.45)] transition-all duration-200 active:scale-95 disabled:opacity-40"
              >
                <Zap size={15} strokeWidth={2.5} aria-hidden="true" />
                <span>
                  {submitting ? t('common.working') : t('report.submitButton')}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Action Button (Corner) */}
      <div className="pointer-events-none absolute end-[max(1rem,env(safe-area-inset-right,0px))] bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] z-20">
        <button
          type="button"
          onClick={handleOpenFab}
          disabled={disabled || capturing}
          aria-label={activeReport ? t('activeOutage.badge') : t('report.fabLabel')}
          title={activeReport ? t('activeOutage.badge') : t('report.fabLabel')}
          className={`pointer-events-auto flex size-13 items-center justify-center rounded-full border-2 text-amber-400 outline-none transition-all duration-300 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-40 ${
            activeReport
              ? 'border-amber-400 bg-amber-400/20 text-amber-300 shadow-[0_8px_28px_rgba(0,0,0,0.5),0_0_24px_rgba(250,204,21,0.6)] animate-pulse'
              : 'border-amber-300/90 bg-zinc-950 shadow-[0_8px_28px_rgba(0,0,0,0.45),0_0_20px_rgba(250,204,21,0.45)]'
          }`}
        >
          <Zap
            size={22}
            strokeWidth={2.5}
            aria-hidden="true"
            className={capturing || activeReport ? 'animate-pulse' : ''}
            style={{ filter: 'drop-shadow(0 0 6px rgba(250,204,21,0.8))' }}
          />
        </button>
      </div>
    </>
  )
}

export default ReportActionBar
