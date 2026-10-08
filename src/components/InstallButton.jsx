import { Share, Smartphone, X } from 'lucide-react'
import { useState } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useT } from '../i18n/useI18n'
import { MENU_ICONS } from './icons'

const DEFAULT_CLASS =
  'glass-pill shrink-0 px-3 py-2 text-xs font-semibold transition-all duration-300'

const MENU_ROW_CLASS =
  'flex min-h-11 w-full items-center gap-3 px-4 py-2 text-start text-sm font-medium transition-all duration-200 hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/10 dark:active:bg-white/15'

export function InstallGuideModal({ onClose }) {
  const t = useT()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('install.title')}
      className="fixed inset-0 z-[1150] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        className="glass-sheet flex max-h-[min(82dvh,calc(100vh-2rem))] w-full max-w-sm flex-col overflow-hidden rounded-3xl p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Smartphone size={18} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-mono text-xs font-bold tracking-[0.16em] uppercase">
                {t('install.title')}
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                N.E.M.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded-full bg-black/5 p-1.5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
          >
            <X size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        <ol className="mt-4 list-decimal space-y-2.5 ps-5 text-sm">
          <li className="leading-snug">
            <span className="inline-flex items-center gap-1">
              {t('install.step1')}
              <Share
                size={13}
                className="inline text-sky-500"
                aria-hidden="true"
              />
            </span>
          </li>
          <li className="leading-snug">{t('install.step2')}</li>
          <li className="leading-snug">{t('install.step3')}</li>
        </ol>

        <p className="mt-3 rounded-2xl bg-black/5 px-3 py-2 text-xs text-zinc-600 dark:bg-white/5 dark:text-zinc-400">
          {t('install.note')}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="btn-primary mt-4 min-h-11 w-full rounded-full text-sm"
        >
          {t('install.gotIt')}
        </button>
      </div>
    </div>
  )
}

function InstallButton({
  variant,
  className = DEFAULT_CLASS,
  label,
  withIcon,
  onDone,
  onOpenInstallGuide,
}) {
  const { install, canPrompt, available } = useInstallPrompt()
  const [showIosHelp, setShowIosHelp] = useState(false)
  const t = useT()
  const Icon = MENU_ICONS.install

  if (!available) return null

  const isMenu = variant === 'menu'
  const showIcon = isMenu || withIcon

  const handleClick = async () => {
    if (canPrompt) {
      await install()
      onDone?.()
      return
    }
    if (onOpenInstallGuide) {
      onDone?.()
      onOpenInstallGuide()
      return
    }
    setShowIosHelp(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={isMenu ? MENU_ROW_CLASS : className}
      >
        {showIcon && (
          <Icon
            size={17}
            strokeWidth={2}
            aria-hidden="true"
            className="shrink-0 text-zinc-500 dark:text-zinc-400"
          />
        )}
        <span className={showIcon ? 'min-w-0 flex-1 truncate' : undefined}>
          {label ?? t('install.button')}
        </span>
      </button>

      {showIosHelp && (
        <InstallGuideModal
          onClose={() => {
            setShowIosHelp(false)
            onDone?.()
          }}
        />
      )}
    </>
  )
}

export default InstallButton
