import { Calendar, Clock, MapPin, Wrench, X, Zap } from 'lucide-react'
import { useState } from 'react'
import { MAX_REPORT_DETAILS_LENGTH, PAST_OUTAGE_MAX_DAYS } from '../constants'
import { useT } from '../i18n/useI18n'

const DURATION_PRESETS = [1, 2, 4, 8, 12, 24]

function toLocalDatetimeValue(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function ReportActionBar({
  onCaptureLocation,
  onSubmitReport,
  disabled,
}) {
  const t = useT()
  const [composerOpen, setComposerOpen] = useState(false)
  const [capturedCoords, setCapturedCoords] = useState(null)
  const [capturing, setCapturing] = useState(false)

  const [reportMode, setReportMode] = useState('current')
  const [outageStartedAt, setOutageStartedAt] = useState('')
  const [bounds, setBounds] = useState({ min: '', max: '' })
  const [durationHours, setDurationHours] = useState(2)
  const [cause, setCause] = useState('unplanned')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleOpenFab = async () => {
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
      setOutageStartedAt(nowVal)
      setBounds({
        min: toLocalDatetimeValue(minDate),
        max: nowVal,
      })
      setComposerOpen(true)
    } finally {
      setCapturing(false)
    }
  }

  const handleClose = () => {
    setComposerOpen(false)
    setDetails('')
    setReportMode('current')
    setCause('unplanned')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!capturedCoords || submitting) return
    setSubmitting(true)
    try {
      await onSubmitReport({
        type: 'power',
        coords: capturedCoords,
        details,
        reportMode,
        outageStartedAt,
        durationHours: reportMode === 'past' ? Number(durationHours) || 1 : Number(durationHours) || 0,
        cause,
      })
      handleClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {composerOpen && capturedCoords && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs sm:p-5"
          onClick={handleClose}
        >
          <form
            onSubmit={handleSubmit}
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

            {/* Scrollable form body */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-3.5">
              {/* Current vs Past Outage selector */}
              <div>
                <span className="mb-1 block font-mono text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase dark:text-zinc-400">
                  {t('report.modeLabel')}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    aria-pressed={reportMode === 'current'}
                    onClick={() => setReportMode('current')}
                    className={`min-h-10 rounded-2xl px-3 text-xs font-semibold transition-all ${
                      reportMode === 'current'
                        ? 'bg-amber-400 text-zinc-950 shadow-sm'
                        : 'bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-300'
                    }`}
                  >
                    {t('report.modeCurrent')}
                  </button>
                  <button
                    type="button"
                    aria-pressed={reportMode === 'past'}
                    onClick={() => setReportMode('past')}
                    className={`min-h-10 rounded-2xl px-3 text-xs font-semibold transition-all ${
                      reportMode === 'past'
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                        : 'bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-300'
                    }`}
                  >
                    {t('report.modePast')}
                  </button>
                </div>
              </div>

              {/* Date & Time input (up to 7 days back) */}
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
                  onChange={(event) => setOutageStartedAt(event.target.value)}
                  className="glass-input tabular min-h-10 text-xs"
                />
              </label>

              {/* Duration estimate (hours) */}
              <div>
                <span className="mb-1 flex items-center justify-between font-mono text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase dark:text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} aria-hidden="true" />
                    {reportMode === 'past'
                      ? t('report.durationPastLabel')
                      : t('report.durationCurrentLabel')}
                  </span>
                  <span className="tabular font-bold text-zinc-800 dark:text-zinc-200">
                    {durationHours}h
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
                        {preset}h
                      </button>
                    )
                  })}
                  <input
                    type="number"
                    min={0.5}
                    max={168}
                    step={0.5}
                    value={durationHours}
                    onChange={(event) => setDurationHours(event.target.value)}
                    aria-label={t('report.durationPastLabel')}
                    className="glass-input tabular h-8 w-20 px-2 text-center text-xs"
                  />
                </div>
              </div>

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
                        ? 'bg-purple-600 text-white'
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

            {/* Footer */}
            <div className="flex shrink-0 gap-2 border-t border-black/5 px-5 py-3 dark:border-white/10">
              <button
                type="button"
                onClick={handleClose}
                className="btn-ghost min-h-10 rounded-full px-4 text-xs"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting || disabled}
                className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full bg-amber-400 px-5 text-xs font-bold text-zinc-950 shadow-[0_0_20px_rgba(251,191,36,0.45)] transition-all duration-200 active:scale-95 disabled:opacity-40"
              >
                <Zap size={15} strokeWidth={2.5} aria-hidden="true" />
                <span>
                  {submitting ? t('common.working') : t('report.submitNow')}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Compact icon-only power outage button in the bottom-right corner */}
      <div className="pointer-events-none absolute end-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-20">
        <button
          type="button"
          onClick={handleOpenFab}
          disabled={disabled || capturing}
          aria-label={t('report.fabLabel')}
          title={t('report.fabLabel')}
          className="pointer-events-auto flex size-13 items-center justify-center rounded-full border-2 border-amber-300/90 bg-zinc-950 text-amber-400 shadow-[0_8px_28px_rgba(0,0,0,0.45),0_0_20px_rgba(250,204,21,0.45)] outline-none transition-all duration-300 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-40"
        >
          <Zap
            size={22}
            strokeWidth={2.5}
            aria-hidden="true"
            className={capturing ? 'animate-pulse' : ''}
            style={{ filter: 'drop-shadow(0 0 6px rgba(250,204,21,0.8))' }}
          />
        </button>
      </div>
    </>
  )
}

export default ReportActionBar
