import { MapPin } from 'lucide-react'
import { useT } from '../i18n/useI18n'

/**
 * Location is requested automatically on open, so this is about what happens
 * when that request fails. A blocked permission cannot be re-prompted by the
 * page, so the only honest response is to say where to change it rather than
 * offer a button that would do nothing.
 */
function LocationGate({ status, permission, onRetry, onDismiss }) {
  const t = useT()

  if (status === 'ready') return null

  if (status === 'locating') {
    return (
      <div
        role="status"
        className="glass-pill pointer-events-auto flex w-fit items-center gap-2 px-4 py-2 text-xs font-medium"
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
  const body = blocked
    ? t('location.blocked')
    : status === 'timeout'
      ? t('location.timeout')
      : status === 'unsupported'
        ? t('location.unsupported')
        : t('location.unavailable')

  return (
    <div role="alert" className="glass pointer-events-auto px-4 py-3">
      <div className="flex items-start gap-3">
        <MapPin size={18} strokeWidth={2} aria-hidden="true" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs font-semibold tracking-[0.15em] uppercase">
            {t('location.title')}
          </p>
          <p className="mt-1 text-sm">{body}</p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {t('location.why')}
          </p>

          <div className="mt-3 flex gap-2">
            {status !== 'unsupported' && (
              <button
                type="button"
                onClick={onRetry}
                className="btn-primary min-h-11 flex-1 rounded-full px-3 text-sm"
              >
                {blocked ? t('location.retry') : t('location.enable')}
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="btn-ghost min-h-11 rounded-full px-4 text-sm"
            >
              {t('location.later')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LocationGate
