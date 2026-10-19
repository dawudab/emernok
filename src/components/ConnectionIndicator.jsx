import { WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
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

function getNetworkQuality() {
  if (typeof window === 'undefined') return 'online'
  if (navigator.onLine === false) return 'offline'
  const conn =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection
  if (conn) {
    if (
      conn.saveData ||
      conn.effectiveType === 'slow-2g' ||
      conn.effectiveType === '2g'
    ) {
      return 'slow'
    }
  }
  return 'online'
}

function ConnectionIndicator() {
  const { status, uid } = useAuth()
  const t = useT()
  const [netState, setNetState] = useState(getNetworkQuality)

  useEffect(() => {
    const sync = () => setNetState(getNetworkQuality())
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    const conn =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection
    conn?.addEventListener?.('change', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
      conn?.removeEventListener?.('change', sync)
    }
  }, [])

  const { dot, key } = STATUS_STYLES[status] ?? STATUS_STYLES.loading
  const label =
    netState === 'offline'
      ? t('connection.offline')
      : netState === 'slow'
        ? t('connection.slow')
        : t(key)

  if (netState === 'offline') {
    return (
      <div
        className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
        title={label}
      >
        <WifiOff size={11} aria-hidden="true" />
        <span className="hidden sm:inline">{label}</span>
      </div>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-1" title={uid ?? label}>
      <span
        aria-hidden="true"
        className={`size-2 rounded-full transition-all duration-300 ${
          netState === 'slow' ? 'bg-amber-400' : dot
        }`}
      />
      {netState === 'slow' && (
        <span className="hidden font-mono text-[9px] text-amber-600 sm:inline dark:text-amber-300">
          2G/3G
        </span>
      )}
      <span className="sr-only">{label}</span>
    </div>
  )
}

export default ConnectionIndicator

