import { REPORT_TYPES } from '../constants'
import { useT } from '../i18n/useI18n'
import { TYPE_ICONS } from './icons'

/**
 * Single floating action button at the bottom for posting a power outage at
 * the user's current location.
 */
function ReportActionBar({
  onReport,
  pendingType,
  disabled,
  locked,
  lockedReason,
}) {
  const t = useT()
  const action = REPORT_TYPES.power
  const Icon = TYPE_ICONS[action.iconName]
  const label = t(action.labelKey)
  const active = pendingType === action.id

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {locked && (
        <p className="glass-pill pointer-events-auto max-w-sm px-4 py-2 text-center text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {lockedReason}
        </p>
      )}

      <button
        type="button"
        onClick={() => onReport(action.id)}
        disabled={disabled}
        aria-label={label}
        title={label}
        aria-pressed={active}
        className="glass-pill pointer-events-auto flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold text-zinc-900 outline-none transition-all duration-300 active:scale-95 focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:opacity-40 dark:text-white dark:focus-visible:ring-white"
        style={
          active
            ? {
                background: '#09090b',
                color: action.accent,
                boxShadow: `0 0 0 1px ${action.accent}80, 0 0 24px ${action.accent}66`,
              }
            : undefined
        }
      >
        <span
          className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-[#f5ff3d] dark:bg-white/15"
          style={
            active
              ? {
                  filter: `drop-shadow(0 0 8px ${action.accent})`,
                }
              : undefined
          }
        >
          <Icon size={18} strokeWidth={2.3} aria-hidden="true" />
        </span>
        <span>{label}</span>
      </button>
    </div>
  )
}

export default ReportActionBar
