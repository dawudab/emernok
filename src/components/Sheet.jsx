import { useEffect } from 'react'
import { useT } from '../i18n/useI18n'
import { CloseIcon } from './icons'

/**
 * The one bottom-sheet shell every panel uses, so the glass, radii and close
 * affordance cannot drift apart between five separate panels.
 */
function Sheet({ label, title, subtitle, onClose, footer, tall, children }) {
  const t = useT()

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label ?? title}
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/40 backdrop-blur-sm transition-all duration-300"
      onClick={onClose}
    >
      <div
        className={`glass-sheet flex w-full max-w-md flex-col rounded-t-3xl pb-[env(safe-area-inset-bottom)] ${
          tall ? 'h-[82dvh]' : 'max-h-[85dvh]'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Grab handle: the iOS cue that this sheet can be dismissed. */}
        <div className="flex justify-center pt-2.5">
          <span
            aria-hidden="true"
            className="h-1 w-10 rounded-full bg-zinc-400/50 dark:bg-white/20"
          />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-4">
          <div className="min-w-0">
            <h2 className="truncate font-mono text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase dark:text-zinc-400">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="icon-button size-10 shrink-0"
          >
            <CloseIcon size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 [-webkit-overflow-scrolling:touch]">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-black/5 px-4 py-3 dark:border-white/10">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Sheet
