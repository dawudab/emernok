import { useAuth } from '../context/useAuth'
import { useT } from '../i18n/useI18n'

const STATUS_STYLES = {
  authenticated: {
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]',
    key: 'connection.connected',
  },
  loading: { dot: 'bg-amber-400 animate-pulse', key: 'connection.connecting' },
  error: {
    dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]',
    key: 'connection.error',
  },
  unconfigured: { dot: 'bg-zinc-400', key: 'connection.noKeys' },
}

function ConnectionIndicator() {
  const { status, uid } = useAuth()
  const t = useT()
  const { dot, key } = STATUS_STYLES[status] ?? STATUS_STYLES.loading
  const label = t(key)

  return (
    <div className="flex shrink-0 items-center" title={uid ?? label}>
      <span
        aria-hidden="true"
        className={`size-2 rounded-full transition-all duration-300 ${dot}`}
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}

export default ConnectionIndicator
