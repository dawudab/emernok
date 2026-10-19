import { Crosshair, MapPin, Navigation } from 'lucide-react'
import { useState } from 'react'
import { NEIGHBOURHOODS, getLocalName } from '../constants'
import { useI18n } from '../i18n/useI18n'

/**
 * Warm, consumer-friendly Location Gate explaining why location is needed
 * ("We only use your location to show outages in your neighborhood—no sign-up or personal data required")
 * alongside a 1-tap "Pick Neighborhood / Tap on Map" fallback when GPS is declined or unavailable.
 */
function LocationGate({
  status,
  permission,
  onRetry,
  onSelectNeighborhood,
  onStartMapPick,
  onDismiss,
}) {
  const { t, lang, dir } = useI18n()
  const [showPicker, setShowPicker] = useState(false)

  if (status === 'ready') return null

  if (status === 'locating') {
    return (
      <div
        role="status"
        className="glass-pill pointer-events-auto flex w-fit items-center gap-2 px-4 py-1.5 text-xs font-medium"
      >
        <span
          aria-hidden="true"
          className="size-2 animate-pulse rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
        />
        <span className="font-mono tracking-wide uppercase">
          {t('location.asking')}
        </span>
      </div>
    )
  }

  const blocked = status === 'denied' || permission === 'denied'

  return (
    <div
      role="dialog"
      dir={dir}
      className="glass pointer-events-auto mx-auto max-w-md px-4 py-3.5 shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-300">
          <MapPin size={18} strokeWidth={2.2} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs font-bold tracking-wider uppercase">
            {t('location.title')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
            {t('location.friendlyBody')}
          </p>

          {showPicker ? (
            <div className="mt-2.5 space-y-2">
              <p className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                {t('location.selectPrompt')}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {NEIGHBOURHOODS.map((region) => (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() =>
                      onSelectNeighborhood?.({
                        lat: region.lat,
                        lng: region.lng,
                        region,
                      })
                    }
                    className="truncate rounded-xl border border-black/10 bg-white/75 px-2 py-1.5 text-[11px] font-semibold text-zinc-800 transition hover:bg-amber-400/20 active:scale-95 dark:border-white/15 dark:bg-white/10 dark:text-zinc-100"
                  >
                    {getLocalName(region, lang)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                {onStartMapPick && (
                  <button
                    type="button"
                    onClick={onStartMapPick}
                    className="btn-primary flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold"
                  >
                    <Crosshair size={13} aria-hidden="true" />
                    <span>{t('location.tapMapHint')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onDismiss}
                  className="btn-ghost min-h-9 rounded-full px-3 text-xs"
                >
                  {t('location.later')}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {status !== 'unsupported' && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="btn-primary flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold"
                >
                  <Navigation size={13} aria-hidden="true" />
                  <span>
                    {blocked ? t('location.retry') : t('location.enable')}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-800 transition active:scale-95 dark:text-emerald-200"
              >
                <MapPin size={13} aria-hidden="true" />
                <span>{t('location.pickNeighborhood')}</span>
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="btn-ghost min-h-10 rounded-full px-3 text-xs"
              >
                {t('location.later')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LocationGate

