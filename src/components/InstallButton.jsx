import { useState } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

const DEFAULT_CLASS =
  'shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white active:bg-slate-700'

function InstallButton({ className = DEFAULT_CLASS, label = 'Install App' }) {
  // `available` is only true on iOS or when a prompt event exists, so a click
  // without a prompt event means we're on iOS and show manual steps.
  const { install, canPrompt, available } = useInstallPrompt()
  const [showIosHelp, setShowIosHelp] = useState(false)

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
      <button
        type="button"
        onClick={handleClick}
        className={className}
      >
        {label}
      </button>

      {showIosHelp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Install on iPhone or iPad"
          className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50 p-4"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-base font-bold text-slate-900">
              Add to Home Screen
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>
                Tap the <span className="font-semibold">Share</span> icon at the
                bottom of Safari.
              </li>
              <li>
                Scroll down and choose{' '}
                <span className="font-semibold">Add to Home Screen</span>.
              </li>
              <li>
                Tap <span className="font-semibold">Add</span> to confirm.
              </li>
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              Installing only works in Safari on iOS, not Chrome or Firefox.
            </p>
            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
              className="mt-4 min-h-11 w-full rounded-xl bg-slate-900 font-semibold text-white"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default InstallButton
