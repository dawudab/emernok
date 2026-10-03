import { MapPin, X, Zap } from 'lucide-react'
import { useState } from 'react'
import { MAX_REPORT_DETAILS_LENGTH } from '../constants'
import { useT } from '../i18n/useI18n'

/**
 * Compact corner icon-only floating action button (FAB) for reporting a power
 * outage. Automatically captures the user's current GPS coordinates and opens a
 * modal where optional details can be added before submitting.
 */
function ReportActionBar({
  onCaptureLocation,
  onSubmitReport,
  disabled,
}) {
  const t = useT()
  const [composerOpen, setComposerOpen] = useState(false)
  const [capturedCoords, setCapturedCoords] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleOpenFab = async () => {
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
      })
      setComposerOpen(false)
      setDetails('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {composerOpen && capturedCoords && (
        <div className="fixed inset-0 z-[1095] flex items-end justify-center bg-black/40 p-4 backdrop-blur-xs sm:items-center">
          <form
            onSubmit={handleSubmit}
            className="glass-sheet pointer-events-auto w-full max-w-md rounded-3xl p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
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

            <label className="mt-3 block">
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

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="btn-ghost min-h-11 rounded-full px-4 text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting || disabled}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-amber-400 px-5 text-sm font-bold text-zinc-950 shadow-[0_0_20px_rgba(251,191,36,0.45)] transition-all duration-200 active:scale-95 disabled:opacity-40"
              >
                <Zap size={16} strokeWidth={2.5} aria-hidden="true" />
                <span>
                  {submitting ? t('common.working') : t('report.submitNow')}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Smaller icon-only power outage button in the bottom-right corner */}
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
