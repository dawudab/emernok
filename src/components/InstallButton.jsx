import { useState } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useT } from '../i18n/useI18n'

const DEFAULT_CLASS =
  'shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white active:bg-slate-700'

function InstallButton({ className = DEFAULT_CLASS, label }) {
  // `available` is only true on iOS or when a prompt event exists, so a click
  // without a prompt event means we're on iOS and show manual steps.
  const { install, canPrompt, available } = useInstallPrompt()
  const [showIosHelp, setShowIosHelp] = useState(false)
  const t = useT()

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
        {label ?? t('install.button')}
      </button>

      {showIosHelp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('install.title')}
          className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50 p-4"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-base font-bold text-slate-900">
              {t('install.title')}
            </h2>
            <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm text-slate-700">
              <li>{t('install.step1')}</li>
              <li>{t('install.step2')}</li>
              <li>{t('install.step3')}</li>
            </ol>
            <p className="mt-3 text-xs text-slate-500">{t('install.note')}</p>
            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
              className="mt-4 min-h-11 w-full rounded-xl bg-slate-900 font-semibold text-white"
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
