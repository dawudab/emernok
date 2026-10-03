import { REPORT_TYPE_LIST } from '../constants'

function ReportActionBar({
  onReport,
  pendingType,
  disabled,
  locked,
  lockedReason,
}) {
  return (
    <nav
      aria-label="Report an outage"
      className="absolute inset-x-0 bottom-0 z-[1000] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.12)] backdrop-blur"
    >
      {locked && (
        <p className="px-3 pt-2 text-center text-xs font-medium text-slate-500">
          {lockedReason}
        </p>
      )}
      <ul className="mx-auto flex max-w-xl gap-2 p-3">
        {REPORT_TYPE_LIST.map((action) => (
          <li key={action.id} className="flex-1">
            <button
              type="button"
              onClick={() => onReport(action.id)}
              disabled={disabled}
              aria-label={action.label}
              aria-pressed={pendingType === action.id}
              className={`flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 font-semibold text-white transition focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/30 disabled:opacity-50 ${action.button} ${
                pendingType === action.id ? 'ring-4 ring-slate-900/40' : ''
              }`}
            >
              <span aria-hidden="true" className="text-2xl leading-none">
                {action.icon}
              </span>
              <span className="text-sm leading-tight">{action.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default ReportActionBar
