import { ArrowLeft, ArrowRight, Zap } from 'lucide-react'
import { useI18n } from '../i18n/useI18n'

/**
 * Floating Power Survey button pinned to the bottom-left corner.
 * Perfectly balances the circular Report Outage button on the bottom-right corner.
 * Allows guests and authenticated users to take or review the community grid survey at any time,
 * and remains accessible after skipping or dismissing the survey dialog.
 */
function SurveyReminderPrompt({ onOpenSurvey, hidden = false }) {
  const { t, dir } = useI18n()
  const isRtl = dir === 'rtl'
  const Arrow = isRtl ? ArrowLeft : ArrowRight

  return (
    <aside
      dir={dir}
      aria-label={t('survey.reminderPrompt')}
      className={`fixed start-[max(1rem,env(safe-area-inset-left,0px))] bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] z-30 transition-all duration-300 ${
        hidden
          ? 'pointer-events-none scale-75 opacity-0'
          : 'pointer-events-auto scale-100 opacity-100'
      }`}
    >
      <button
        type="button"
        onClick={onOpenSurvey}
        aria-label={t('survey.reminderPrompt')}
        title={t('survey.reminderPrompt')}
        className="group relative flex h-14 min-h-14 items-center gap-2.5 rounded-full border border-amber-400 bg-white/95 text-zinc-900 shadow-[0_8px_24px_rgba(245,158,11,0.25),0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-amber-500 hover:shadow-[0_8px_28px_rgba(245,158,11,0.35)] active:scale-95 dark:border-amber-400/80 dark:bg-zinc-950/95 dark:text-zinc-100 dark:shadow-[0_0_24px_rgba(251,191,36,0.45)] dark:hover:border-amber-400 dark:hover:shadow-[0_0_28px_rgba(251,191,36,0.6)] px-4"
      >
        <span className="relative flex size-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 dark:bg-amber-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-amber-500 dark:bg-amber-400" />
        </span>
        <Zap
          size={18}
          strokeWidth={2.4}
          className="shrink-0 fill-amber-500 text-amber-500 transition-transform duration-300 group-hover:rotate-12 dark:fill-amber-400 dark:text-amber-400"
          aria-hidden="true"
        />
        <div className="flex flex-col text-start leading-tight pe-1">
          <span className="text-xs sm:text-sm font-bold tracking-wide text-amber-600 dark:text-amber-300">
            {t('survey.reminderButton')}
          </span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium hidden xs:inline">
            {t('survey.reminderAction')}
          </span>
        </div>
        <span className="ms-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 transition-colors group-hover:bg-amber-500 group-hover:text-white dark:bg-amber-400/20 dark:text-amber-300 dark:group-hover:bg-amber-400 dark:group-hover:text-zinc-950">
          <Arrow size={12} strokeWidth={2.5} aria-hidden="true" />
        </span>
      </button>
    </aside>
  )
}

export default SurveyReminderPrompt
