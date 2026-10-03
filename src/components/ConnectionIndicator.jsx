import { useAuth } from '../context/useAuth'
import { useT } from '../i18n/useI18n'

const STATUS_STYLES = {
  authenticated: { dot: 'bg-green-500', key: 'connection.connected' },
  loading: { dot: 'bg-amber-400 animate-pulse', key: 'connection.connecting' },
  error: { dot: 'bg-red-500', key: 'connection.error' },
  unconfigured: { dot: 'bg-slate-400', key: 'connection.noKeys' },
}

function ConnectionIndicator() {
  const { status, uid } = useAuth()
  const t = useT()
  const { dot, key } = STATUS_STYLES[status] ?? STATUS_STYLES.loading
  const label = t(key)

  return (
    <div className="flex items-center gap-2" title={uid ? uid : label}>
      <span
        aria-hidden="true"
        className={`size-2.5 shrink-0 rounded-full ${dot}`}
      />
      <span className="hidden text-xs font-medium text-slate-600 sm:inline">
        {label}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  )
}

export default ConnectionIndicator
