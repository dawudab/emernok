import { CheckCircle2, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import {
  formatElapsedOutageTime,
  getElapsedDurationMinutes,
} from '../services/reports'

/**
 * Persistent live pill on the map screen when the user has an active power outage.
 * Displays real-time ticking duration and quick action to mark restored.
 */
function ActiveOutageTrackerPill({ report, onOpenModal, onQuickRestore }) {
  const { t, lang } = useI18n()
  const [now, setNow] = useState(() => Date.now())
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    if (!report) return undefined
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [report])

  const elapsedText = useMemo(() => {
    if (!report) return '0m'
    return formatElapsedOutageTime(report, lang, now)
  }, [lang, now, report])

  const elapsedMinutes = useMemo(() => {
    if (!report) return 0
    return getElapsedDurationMinutes(report, now)
  }, [now, report])

  if (!report) return null

  const handleQuickRestore = async (e) => {
    e.stopPropagation()
    if (restoring) return
    setRestoring(true)
    try {
      await onQuickRestore(report.id, elapsedMinutes)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <aside
      aria-label={t('activeOutage.badge')}
      className="pointer-events-none fixed start-[max(1rem,env(safe-area-inset-left,0px))] bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] z-25 animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onOpenModal}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onOpenModal()
        }}
        className="glass pointer-events-auto flex items-center gap-2.5 rounded-full border border-amber-400/60 bg-zinc-950/95 p-1.5 ps-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_20px_rgba(251,191,36,0.3)] backdrop-blur-md cursor-pointer transition-all hover:scale-102 hover:border-amber-400 dark:bg-zinc-900/95"
      >
        <span className="relative flex size-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-amber-400" />
        </span>

        <div className="flex flex-col text-start leading-tight">
          <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-amber-300 uppercase">
            <Zap size={10} fill="currentColor" aria-hidden="true" />
            <span>{t('activeOutage.liveTracker')}</span>
          </span>
          <span className="tabular font-mono text-xs font-extrabold text-white">
            {elapsedText}
          </span>
        </div>

        <button
          type="button"
          disabled={restoring}
          onClick={handleQuickRestore}
          title={t('activeOutage.markRestoredShort')}
          className="ms-1 flex min-h-8 items-center gap-1 rounded-full bg-emerald-500 hover:bg-emerald-600 px-3 py-1 font-mono text-[11px] font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
        >
          <CheckCircle2 size={13} strokeWidth={2.4} aria-hidden="true" />
          <span className="hidden sm:inline">{t('activeOutage.powerBack')}</span>
          <span className="sm:hidden">{t('activeOutage.backShort')}</span>
        </button>
      </div>
    </aside>
  )
}

export default ActiveOutageTrackerPill
