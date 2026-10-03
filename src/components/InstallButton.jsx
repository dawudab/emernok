import { useState } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useT } from '../i18n/useI18n'
import { MENU_ICONS } from './icons'

const DEFAULT_CLASS =
  'glass-pill shrink-0 px-3 py-2 text-xs font-semibold transition-all duration-300'

function InstallButton({ className = DEFAULT_CLASS, label, withIcon }) {
  // `available` is only true on iOS or when a prompt event exists, so a click
  // without a prompt event means we're on iOS and show manual steps.
  const { install, canPrompt, available } = useInstallPrompt()
  const [showIosHelp, setShowIosHelp] = useState(false)
  const t = useT()
  const Icon = MENU_ICONS.install

  if (!available) return null

  const handleClick = () => {
    if (canPrompt) {
      install()
      return
    }
    setShowIosHelp(true)
  }

  return (
    <>
      <button type="button" onClick={handleClick} className={className}>
        {withIcon && (
          <Icon
            size={18}
            strokeWidth={2}
            aria-hidden="true"
            className="shrink-0 text-zinc-500 dark:text-zinc-400"
          />
        )}
        <span className={withIcon ? 'flex-1' : undefined}>
          {label ?? t('install.button')}
        </span>
      </button>

      {showIosHelp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('install.title')}
          className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="glass-sheet w-full max-w-sm rounded-3xl p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="font-mono text-xs font-semibold tracking-[0.18em] uppercase">
              {t('install.title')}
            </h2>
            <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm">
              <li>{t('install.step1')}</li>
              <li>{t('install.step2')}</li>
              <li>{t('install.step3')}</li>
            </ol>
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              {t('install.note')}
            </p>
            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
              className="btn-primary mt-4 min-h-12 w-full"
            >
              {t('install.gotIt')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default InstallButton
