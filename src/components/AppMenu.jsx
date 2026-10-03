import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/useAuth'
import { signOut } from '../services/auth'
import InstallButton from './InstallButton'

const ROW =
  'flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-800 active:bg-slate-100 disabled:opacity-40'

function MenuRow({ icon, label, hint, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={ROW}>
      <span aria-hidden="true" className="w-5 text-center text-base">
        {icon}
      </span>
      <span className="flex-1">
        {label}
        {hint && (
          <span className="block text-xs font-normal text-slate-500">
            {hint}
          </span>
        )}
      </span>
    </button>
  )
}

/**
 * Everything a guest can do stays visible but is labelled, rather than hidden,
 * so people can see what signing in would unlock.
 */
function AppMenu({
  onOpenCommunity,
  onOpenProfile,
  onOpenLegend,
  onOpenAbout,
  onRecenter,
  canRecenter,
}) {
  const { canWrite, isAnonymous, identityLabel } = useAuth()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const choose = (action) => () => {
    setOpen(false)
    action?.()
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu"
        className="min-h-11 min-w-11 rounded-lg bg-slate-100 text-lg active:bg-slate-200"
      >
        ☰
      </button>

      {open && (
        <>
          {/* Catches outside taps without stealing the first one from the map. */}
          <div
            className="fixed inset-0 z-[1090]"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            aria-label="App menu"
            className="absolute right-0 z-[1095] mt-2 w-72 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
          >
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <p className="truncate text-sm font-bold text-slate-900">
                {isAnonymous ? 'Guest' : identityLabel}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {canWrite
                  ? 'Verified — full access'
                  : isAnonymous
                    ? 'Viewing only. Sign in to report, post and vote.'
                    : 'Verify your email to unlock reporting.'}
              </p>
            </div>

            <MenuRow
              icon="💬"
              label="Community feed"
              hint={canWrite ? 'Neighbours within 2km' : 'Read only until you sign in'}
              onClick={choose(onOpenCommunity)}
            />
            <MenuRow
              icon="👤"
              label={isAnonymous ? 'Sign in' : 'My reports'}
              hint={isAnonymous ? 'Email or phone number' : undefined}
              onClick={choose(onOpenProfile)}
            />
            <MenuRow
              icon="📍"
              label="Centre on my location"
              hint={canRecenter ? undefined : 'Location unavailable'}
              disabled={!canRecenter}
              onClick={choose(onRecenter)}
            />

            <div className="border-t border-slate-100" />

            <MenuRow
              icon="🗺️"
              label="Map legend"
              onClick={choose(onOpenLegend)}
            />
            <MenuRow
              icon="ℹ️"
              label="How it works"
              hint="Reporting rules and limits"
              onClick={choose(onOpenAbout)}
            />

            <InstallButton className={ROW} label="⬇️  Install app" />

            {!isAnonymous && (
              <>
                <div className="border-t border-slate-100" />
                <MenuRow
                  icon="↩"
                  label="Sign out"
                  onClick={choose(signOut)}
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default AppMenu
