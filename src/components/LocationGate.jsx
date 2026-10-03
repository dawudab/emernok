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
        className="pointer-events-auto flex items-center gap-2 rounded-xl bg-slate-900/90 px-4 py-2 text-sm font-medium text-white shadow-lg"
      >
        <span
          aria-hidden="true"
          className="size-2.5 animate-pulse rounded-full bg-amber-400"
        />
        {t('location.asking')}
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
    <div
      role="alert"
      className="pointer-events-auto rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-slate-200"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-lg leading-none">
          📍
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">
            {t('location.title')}
          </p>
          <p className="mt-0.5 text-sm text-slate-600">{body}</p>
          <p className="mt-1 text-xs text-slate-500">{t('location.why')}</p>

          <div className="mt-3 flex gap-2">
            {status !== 'unsupported' && (
              <button
                type="button"
                onClick={onRetry}
                className="min-h-11 flex-1 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white"
              >
                {blocked ? t('location.retry') : t('location.enable')}
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700"
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
