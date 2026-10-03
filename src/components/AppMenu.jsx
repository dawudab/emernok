import { useEffect, useRef, useState } from 'react'
import { COMMUNITY_RADIUS_KM } from '../constants'
import { useAuth } from '../context/useAuth'
import { LANGUAGES, useI18n } from '../i18n/useI18n'
import { signOut } from '../services/auth'
import InstallButton from './InstallButton'

const ROW =
  'flex w-full items-center gap-3 px-4 py-3 text-start text-sm font-medium text-slate-800 active:bg-slate-100 focus:outline-none focus-visible:bg-slate-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 disabled:opacity-40'

function MenuRow({ icon, label, hint, onClick, disabled }) {
  return (
    <button
      type="button"
      role="menuitem"
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

    const items = () =>
      Array.from(
        menuRef.current?.querySelectorAll('button:not([disabled])') ?? [],
      )

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        // Returning focus to the trigger keeps keyboard users from being
        // dumped back at the top of the document.
        triggerRef.current?.focus()
        return
      }

      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      const list = items()
      if (list.length === 0) return
      event.preventDefault()
      const current = list.indexOf(document.activeElement)
      const step = event.key === 'ArrowDown' ? 1 : -1
      const next = (current + step + list.length) % list.length
      list[next].focus()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

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
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('menu.label')}
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
            ref={menuRef}
            role="menu"
            aria-label={t('menu.label')}
            // The menu outgrew short screens once official and moderator
            // entries arrived, so it scrolls within the viewport instead of
            // running off the bottom. overscroll-contain stops the scroll
            // chaining into the map behind it.
            className="absolute end-0 z-[1095] mt-2 max-h-[min(70dvh,34rem)] w-72 overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
          >
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

            {/* Language sits first: someone who cannot read the current
                language needs this before anything else in the list. */}
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500">
                {t('menu.language')}
              </p>
              <div
                role="group"
                aria-label={t('menu.language')}
                className="mt-2 flex gap-1"
              >
                {LANGUAGES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={lang === option.id}
                    lang={option.id}
                    onClick={() => setLang(option.id)}
                    className={`min-h-11 flex-1 rounded-lg text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
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

            <InstallButton className={ROW} label={`⬇️  ${t('menu.install')}`} />

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
        </>
      )}
    </div>
  )
}

export default AppMenu
