import {
  Fuel,
  Layers,
  Menu,
  Moon,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/useAuth'
import { LANGUAGES, useI18n } from '../i18n/useI18n'
import { signOut } from '../services/auth'
import { useTheme } from '../theme/useTheme'
import InstallButton from './InstallButton'
import { MENU_ICONS } from './icons'

const VERIFICATION_OPTIONS = [
  { id: 'all', labelKey: 'filter.all' },
  { id: 'verified', labelKey: 'filter.verified' },
  { id: 'unverified', labelKey: 'filter.unverified' },
]

function MenuRow({
  icon: Icon,
  label,
  onClick,
  disabled,
  destructive = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-11 w-full items-center gap-3 px-4 py-2 text-start text-sm font-medium transition-all duration-200 hover:bg-black/5 active:bg-black/10 disabled:opacity-40 dark:hover:bg-white/10 dark:active:bg-white/15 ${
        destructive ? 'text-red-500' : ''
      }`}
    >
      <Icon
        size={17}
        strokeWidth={2}
        aria-hidden="true"
        className={`shrink-0 ${destructive ? '' : 'text-zinc-500 dark:text-zinc-400'}`}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  )
}

function ToggleRow({ icon: Icon, label, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex min-h-10 w-full items-center justify-between gap-3 px-4 py-1.5 text-start text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
    >
      <span className="flex items-center gap-3">
        <Icon
          size={17}
          strokeWidth={2}
          aria-hidden="true"
          className="shrink-0 text-zinc-500 dark:text-zinc-400"
        />
        <span>{label}</span>
      </span>
      <span
        className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200 ${
          checked
            ? 'bg-emerald-500'
            : 'bg-zinc-300 dark:bg-zinc-700'
        }`}
      >
        <span
          className={`inline-block size-4.5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}

function AppMenu({
  onOpenWalkthrough,
  onOpenCommunity,
  onOpenProfile,
  onOpenLegend,
  onOpenAbout,
  onOpenOfficial,
  onOpenAdmin,
  isAdmin,
  showStations,
  onToggleStations,
  showRegions,
  onToggleRegions,
  verificationFilter,
  onChangeVerificationFilter,
}) {
  const { canWrite, isAnonymous, identityLabel } = useAuth()
  const { t, lang, setLang } = useI18n()
  const { isDark, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return undefined

    const trigger = triggerRef.current
    const first = menuRef.current?.querySelector('button:not(:disabled)')
    first?.focus()

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)

    return () => {
      window.removeEventListener('keydown', handleKey)
      trigger?.focus()
    }
  }, [open])

  const choose = (action) => () => {
    close()
    action()
  }

  const handleSignOut = async () => {
    close()
    try {
      await signOut()
    } catch {
      // If signOut fails, the auth listener leaves the current user in place.
    }
  }

  return (
    <div className="relative flex shrink-0 items-center gap-1.5">
      {/* "?" button for interactive walkthrough of vision, purpose & features */}
      <button
        type="button"
        onClick={onOpenWalkthrough}
        aria-label={t('walkthrough.title')}
        title={t('walkthrough.title')}
        className="icon-button size-11 font-mono text-base font-bold outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white"
      >
        ?
      </button>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        className="icon-button size-11 outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white"
      >
        {isDark ? (
          <Sun size={18} strokeWidth={2} aria-hidden="true" />
        ) : (
          <Moon size={18} strokeWidth={2} aria-hidden="true" />
        )}
      </button>

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
            className="glass-sheet absolute top-full end-0 z-[1095] mt-2 flex max-h-[min(78dvh,calc(100vh-5.5rem))] w-[min(19rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl shadow-2xl"
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
              <div className="border-b border-black/5 px-4 py-2.5 dark:border-white/10">
                <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-zinc-500 uppercase dark:text-zinc-400">
                  {canWrite ? t('menu.signedIn') : t('menu.browsing')}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold">
                  {isAnonymous
                    ? t('menu.guest')
                    : identityLabel || t('menu.unverified')}
                </p>
              </div>

              <MenuRow
                icon={MENU_ICONS.profile}
                label={t('menu.yourProfile')}
                onClick={choose(onOpenProfile)}
              />
              <MenuRow
                icon={MENU_ICONS.community}
                label={t('menu.community')}
                onClick={choose(onOpenCommunity)}
              />

              {/* Settings section */}
              <div className="border-t border-b border-black/5 py-1.5 dark:border-white/10">
                <div className="flex items-center gap-2 px-4 py-1">
                  <SlidersHorizontal
                    size={12}
                    strokeWidth={2.2}
                    aria-hidden="true"
                    className="text-zinc-500 dark:text-zinc-400"
                  />
                  <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-zinc-500 uppercase dark:text-zinc-400">
                    {t('settings.title')}
                  </p>
                </div>

                <ToggleRow
                  icon={Layers}
                  label={t('region.sectionTitle')}
                  checked={showRegions}
                  onChange={onToggleRegions}
                />
                <ToggleRow
                  icon={Fuel}
                  label={t('filter.fuelStations')}
                  checked={showStations}
                  onChange={onToggleStations}
                />

                <div className="px-4 pt-1.5 pb-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    <ShieldCheck
                      size={15}
                      strokeWidth={2}
                      aria-hidden="true"
                      className="text-zinc-500 dark:text-zinc-400"
                    />
                    <span>{t('settings.verificationFilter')}</span>
                  </div>
                  <div
                    role="group"
                    aria-label={t('filter.verificationLabel')}
                    className="mt-1.5 grid grid-cols-3 gap-1"
                  >
                    {VERIFICATION_OPTIONS.map((option) => {
                      const active = verificationFilter === option.id
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => onChangeVerificationFilter(option.id)}
                          className={`min-h-8 rounded-full px-2 text-xs font-semibold transition-all duration-200 ${
                            active
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                              : 'bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-300'
                          }`}
                        >
                          {t(option.labelKey)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <MenuRow
                icon={MENU_ICONS.official}
                label={t('menu.official')}
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
                onClick={choose(onOpenAbout)}
              />

              <InstallButton variant="menu" onDone={close} />

              {!isAnonymous && (
                <>
                  <div className="border-t border-black/5 dark:border-white/10" />
                  <MenuRow
                    icon={MENU_ICONS.signOut}
                    label={t('menu.signOut')}
                    onClick={handleSignOut}
                    destructive
                  />
                </>
              )}
            </div>

            <div className="shrink-0 border-t border-black/5 px-4 py-2.5 dark:border-white/10">
              <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-zinc-500 uppercase dark:text-zinc-400">
                {t('menu.language')}
              </p>
              <div
                role="group"
                aria-label={t('menu.language')}
                className="mt-1.5 grid grid-cols-3 gap-1.5"
              >
                {LANGUAGES.map((item) => {
                  const active = item.id === lang
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLang(item.id)}
                      aria-pressed={active}
                      className={`min-h-9 rounded-full px-2 text-xs font-semibold transition-all duration-300 ${
                        active
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                          : 'bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AppMenu
