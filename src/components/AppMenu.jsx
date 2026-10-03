import { useEffect, useRef, useState } from 'react'
import { COMMUNITY_RADIUS_KM } from '../constants'
import { useAuth } from '../context/useAuth'
import { LANGUAGES, useI18n } from '../i18n/useI18n'
import { signOut } from '../services/auth'
import InstallButton from './InstallButton'

const ROW =
  'flex min-h-12 w-full items-center gap-3 px-4 py-3 text-start text-sm font-medium text-slate-800 outline-none hover:bg-slate-50 focus-visible:bg-slate-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 active:bg-slate-100 disabled:opacity-40'

function MenuRow({ icon, label, hint, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={ROW}
    >
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
  onOpenOfficial,
  onOpenAdmin,
  onRecenter,
  canRecenter,
  isAdmin,
}) {
  const { canWrite, isAnonymous, identityLabel } = useAuth()
  const { t, lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return

    // Move keyboard and screen-reader users into the menu when it opens.
    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector('button:not(:disabled)')?.focus()
    })
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    // Return focus after React removes the menu from the document.
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const choose = (action) => () => {
    setOpen(false)
    action?.()
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="app-menu"
        aria-label={t('menu.label')}
        className="min-h-11 min-w-11 rounded-lg bg-slate-100 text-lg outline-none focus-visible:ring-2 focus-visible:ring-slate-900 active:bg-slate-200"
      >
        ☰
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[1090]"
            onClick={close}
            aria-hidden="true"
          />
          <div
            id="app-menu"
            ref={menuRef}
            role="dialog"
            aria-label={t('menu.label')}
            // The header starts 1rem from the top and is ~3.5rem tall. Bounding
            // the menu to the remaining dynamic viewport makes it scroll on
            // short phones instead of clipping the language controls below it.
            className="absolute end-0 z-[1095] mt-2 flex max-h-[calc(100dvh-6rem)] w-[min(18rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="truncate text-sm font-bold text-slate-900">
                  {isAnonymous ? t('menu.guest') : identityLabel}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {canWrite
                    ? t('menu.statusVerified')
                    : isAnonymous
                      ? t('menu.statusGuest')
                      : t('menu.statusUnverified')}
                </p>
              </div>

              <MenuRow
                icon="💬"
                label={t('menu.community')}
                hint={
                  canWrite
                    ? t('menu.communityOpen', { km: COMMUNITY_RADIUS_KM })
                    : t('menu.communityLocked')
                }
                onClick={choose(onOpenCommunity)}
              />
              <MenuRow
                icon="👤"
                label={isAnonymous ? t('common.signIn') : t('menu.myReports')}
                hint={isAnonymous ? t('menu.signInHint') : undefined}
                onClick={choose(onOpenProfile)}
              />
              <MenuRow
                icon="📍"
                label={t('menu.recenter')}
                hint={canRecenter ? undefined : t('menu.recenterOff')}
                disabled={!canRecenter}
                onClick={choose(onRecenter)}
              />

              <div className="border-t border-slate-100" />

              <MenuRow
                icon="📢"
                label={t('menu.official')}
                hint={t('menu.officialHint')}
                onClick={choose(onOpenOfficial)}
              />
              {isAdmin && (
                <MenuRow
                  icon="🛡️"
                  label={t('menu.admin')}
                  onClick={choose(onOpenAdmin)}
                />
              )}

              <div className="border-t border-slate-100" />

              <MenuRow
                icon="🗺️"
                label={t('menu.legend')}
                onClick={choose(onOpenLegend)}
              />
              <MenuRow
                icon="ℹ️"
                label={t('menu.about')}
                hint={t('menu.aboutHint')}
                onClick={choose(onOpenAbout)}
              />

              <InstallButton
                className={ROW}
                label={`⬇️  ${t('menu.install')}`}
              />

              {!isAnonymous && (
                <>
                  <div className="border-t border-slate-100" />
                  <MenuRow
                    icon="↩"
                    label={t('common.signOut')}
                    onClick={choose(signOut)}
                  />
                </>
              )}
            </div>

            {/* Kept outside the scroll area so changing language is always
                reachable, even on the shortest supported viewport. */}
            <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold text-slate-500">
                {t('menu.language')}
              </p>
              <div className="mt-2 flex gap-1" role="group" aria-label={t('menu.language')}>
                {LANGUAGES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    lang={option.id}
                    aria-pressed={lang === option.id}
                    onClick={() => setLang(option.id)}
                    className={`min-h-11 flex-1 rounded-lg text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                      lang === option.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AppMenu
