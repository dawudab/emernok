import { Menu } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { COMMUNITY_RADIUS_KM } from '../constants'
import { useAuth } from '../context/useAuth'
import { LANGUAGES, useI18n } from '../i18n/useI18n'
import { signOut } from '../services/auth'
import InstallButton from './InstallButton'
import { MENU_ICONS } from './icons'

const ROW =
  'flex w-full items-center gap-3 px-4 py-3 text-start text-sm font-medium outline-none transition-all duration-300 active:bg-black/5 focus-visible:bg-black/5 dark:active:bg-white/10 dark:focus-visible:bg-white/10 disabled:opacity-40'

function MenuRow({ icon: Icon, label, hint, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={ROW}>
      <Icon
        size={18}
        strokeWidth={2}
        aria-hidden="true"
        className="shrink-0 text-zinc-500 dark:text-zinc-400"
      />
      <span className="flex-1">
        {label}
        {hint && (
          <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">
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
      Array.from(menuRef.current?.querySelectorAll('button:not(:disabled)') ?? [])

    // Move keyboard and screen-reader users into the menu when it opens.
    const frame = requestAnimationFrame(() => items()[0]?.focus())

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
        return
      }

      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      const list = items()
      if (list.length === 0) return
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      const current = list.indexOf(document.activeElement)
      list[(current + step + list.length) % list.length].focus()
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
        className="icon-button size-11 outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white"
      >
        <Menu size={20} strokeWidth={2} aria-hidden="true" />
      </button>

      {open && (
        <>
          {/* Catches outside taps without stealing the first one from the map. */}
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
            // short phones instead of clipping the controls below it.
            className="glass-sheet absolute end-0 z-[1095] mt-2 flex max-h-[calc(100dvh-6rem)] w-[min(18rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl"
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
              <div className="border-b border-black/5 px-4 py-3 dark:border-white/10">
                <p className="truncate font-mono text-xs font-semibold tracking-[0.15em] uppercase">
                  {isAnonymous ? t('menu.guest') : identityLabel}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {canWrite
                    ? t('menu.statusVerified')
                    : isAnonymous
                      ? t('menu.statusGuest')
                      : t('menu.statusUnverified')}
                </p>
              </div>

              <MenuRow
                icon={MENU_ICONS.community}
                label={t('menu.community')}
                hint={
                  canWrite
                    ? t('menu.communityOpen', { km: COMMUNITY_RADIUS_KM })
                    : t('menu.communityLocked')
                }
                onClick={choose(onOpenCommunity)}
              />
              <MenuRow
                icon={MENU_ICONS.profile}
                label={isAnonymous ? t('common.signIn') : t('menu.myReports')}
                hint={isAnonymous ? t('menu.signInHint') : undefined}
                onClick={choose(onOpenProfile)}
              />
              <MenuRow
                icon={MENU_ICONS.recenter}
                label={t('menu.recenter')}
                hint={canRecenter ? undefined : t('menu.recenterOff')}
                disabled={!canRecenter}
                onClick={choose(onRecenter)}
              />

              <div className="border-t border-black/5 dark:border-white/10" />

              <MenuRow
                icon={MENU_ICONS.official}
                label={t('menu.official')}
                hint={t('menu.officialHint')}
                onClick={choose(onOpenOfficial)}
              />
              {isAdmin && (
                <MenuRow
                  icon={MENU_ICONS.admin}
                  label={t('menu.admin')}
                  onClick={choose(onOpenAdmin)}
                />
              )}

              <div className="border-t border-black/5 dark:border-white/10" />

              <MenuRow
                icon={MENU_ICONS.legend}
                label={t('menu.legend')}
                onClick={choose(onOpenLegend)}
              />
              <MenuRow
                icon={MENU_ICONS.about}
                label={t('menu.about')}
                hint={t('menu.aboutHint')}
                onClick={choose(onOpenAbout)}
              />

              <InstallButton className={ROW} label={t('menu.install')} withIcon />

              {!isAnonymous && (
                <>
                  <div className="border-t border-black/5 dark:border-white/10" />
                  <MenuRow
                    icon={MENU_ICONS.signOut}
                    label={t('common.signOut')}
                    onClick={choose(signOut)}
                  />
                </>
              )}
            </div>

            {/* Kept outside the scroll area so changing language is always
                reachable, even on the shortest supported viewport — someone
                who cannot read the current language needs it first. */}
            <div className="shrink-0 border-t border-black/5 px-4 py-3 dark:border-white/10">
              <p className="font-mono text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase dark:text-zinc-400">
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
                    lang={option.id}
                    aria-pressed={lang === option.id}
                    onClick={() => setLang(option.id)}
                    className={`min-h-11 flex-1 rounded-full text-xs font-semibold outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white ${
                      lang === option.id
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                        : 'bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200'
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
