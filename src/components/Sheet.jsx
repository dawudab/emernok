import { useEffect } from 'react'
import { useT } from '../i18n/useI18n'
import { CloseIcon } from './icons'

/**
 * Shared modal/sheet shell for Your Profile, Community, Utility Worker,
 * Review Queue, Map Legend, and How It Works.
 * Centered inside the viewport with explicit safe padding and strict max-height
 * so the bottom of the window is never cut off on mobile screens or iframes.
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
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm transition-all duration-200 sm:p-5"
      onClick={onClose}
    >
      <div
        className={`glass-sheet flex w-full max-w-md flex-col overflow-hidden rounded-3xl shadow-2xl ${
          tall
            ? 'h-[min(36rem,calc(100dvh-2rem))] max-h-[calc(100vh-2rem)]'
            : 'max-h-[min(82dvh,calc(100vh-2rem))]'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/5 px-5 py-3.5 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="truncate font-mono text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase dark:text-zinc-400">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="icon-button size-9 shrink-0"
          >
            <CloseIcon size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch]">
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
