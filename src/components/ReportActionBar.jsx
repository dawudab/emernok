import { REPORT_TYPE_LIST } from '../constants'
import { useT } from '../i18n/useI18n'
import { TYPE_ICONS } from './icons'

/**
 * A single floating pill rather than three blocks: the map is the subject, and
 * the controls should read as instruments over it. Colour appears only on the
 * active control, so the resting state stays monochrome.
 */
function ReportActionBar({
  onReport,
  pendingType,
  disabled,
  locked,
  lockedReason,
}) {
  const t = useT()

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {locked && (
        <p className="glass-pill pointer-events-auto max-w-sm px-4 py-2 text-center text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {lockedReason}
        </p>
      )}

      <nav
        aria-label={t('bar.label')}
        className="glass-pill pointer-events-auto flex items-center gap-1 p-1.5"
      >
        {REPORT_TYPE_LIST.map((action) => {
          const Icon = TYPE_ICONS[action.iconName]
          const label = t(action.labelKey)
          const active = pendingType === action.id

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onReport(action.id)}
              disabled={disabled}
              aria-label={label}
              title={label}
              aria-pressed={active}
              className="group flex size-14 items-center justify-center rounded-full text-zinc-700 outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:opacity-40 dark:text-zinc-200 dark:focus-visible:ring-white"
              style={
                active
                  ? {
                      // Lit against a dark chip in both themes: neon yellow and
                      // bright white simply vanish on light glass otherwise.
                      background: '#09090b',
                      boxShadow: `0 0 0 1px ${action.accent}80, 0 0 24px ${action.accent}66`,
                    }
                  : undefined
              }
            >
              <Icon
                size={24}
                strokeWidth={2}
                aria-hidden="true"
                className="transition-all duration-300"
                style={{
                  color: active ? action.accent : undefined,
                  filter: active ? `drop-shadow(0 0 8px ${action.accent})` : undefined,
                }}
              />
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default ReportActionBar
