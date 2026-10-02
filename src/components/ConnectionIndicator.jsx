import { useAuth } from '../context/useAuth'

const STATUS_STYLES = {
  authenticated: { dot: 'bg-green-500', label: 'Connected' },
  loading: { dot: 'bg-amber-400 animate-pulse', label: 'Connecting…' },
  error: { dot: 'bg-red-500', label: 'Offline' },
  unconfigured: { dot: 'bg-slate-400', label: 'No Firebase keys' },
}

function ConnectionIndicator() {
  const { status, uid } = useAuth()
  const { dot, label } = STATUS_STYLES[status] ?? STATUS_STYLES.loading

  return (
    <div
      className="flex items-center gap-2"
      title={uid ? `Session: ${uid}` : label}
    >
      <span
        aria-hidden="true"
        className={`size-2.5 shrink-0 rounded-full ${dot}`}
      />
      <span className="text-xs font-medium text-slate-600">
        <span className="sr-only">Firebase status: </span>
        {label}
      </span>
    </div>
  )
}

export default ConnectionIndicator
