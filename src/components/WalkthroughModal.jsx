import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Fuel,
  Layers,
  ShieldCheck,
  Sparkles,
  User,
  X,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '../i18n/useI18n'

const STEPS = [
  { id: 'overview', icon: Compass, tabKey: 'walkthrough.tab.overview' },
  { id: 'purpose', icon: ShieldCheck, tabKey: 'walkthrough.tab.purpose' },
  { id: 'vision', icon: Sparkles, tabKey: 'walkthrough.tab.vision' },
  { id: 'howto', icon: Zap, tabKey: 'walkthrough.tab.howto' },
]

function WalkthroughModal({ onClose, onOpenProfile, onOpenCommunity }) {
  const { t, dir, lang } = useI18n()
  const [stepIndex, setStepIndex] = useState(0)

  const currentStep = STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1
  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('walkthrough.title')}
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs sm:p-5"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="glass-sheet flex max-h-[min(82dvh,calc(100vh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-3xl shadow-2xl"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-amber-400 font-mono text-sm font-bold text-zinc-950 shadow-[0_0_16px_rgba(250,204,21,0.55)]">
              {lang === 'ar' ? '؟' : '?'}
            </span>
            <div>
              <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-zinc-500 uppercase dark:text-zinc-400">
                {t('walkthrough.badge')}
              </p>
              <h2 className="text-base font-bold leading-tight">
                {t('walkthrough.title')}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded-full bg-black/5 p-2 text-zinc-600 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/15"
          >
            <X size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        {/* Interactive step selector pills */}
        <div className="grid grid-cols-4 gap-1 border-b border-black/5 bg-black/[0.02] px-3 py-2 dark:border-white/10 dark:bg-white/[0.02]">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const active = index === stepIndex
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setStepIndex(index)}
                className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-center transition-all duration-200 ${
                  active
                    ? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900'
                    : 'text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5'
                }`}
              >
                <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
                <span className="truncate font-mono text-[10px] font-semibold">
                  {t(step.tabKey)}
                </span>
              </button>
            )
          })}
        </div>

        {/* Step body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {currentStep.id === 'overview' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
                <p className="font-mono text-xs font-bold tracking-wider text-amber-700 uppercase dark:text-amber-300">
                  {t('walkthrough.overview.kicker')}
                </p>
                <p className="mt-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {t('walkthrough.overview.lead')}
                </p>
              </div>

              <p>{t('walkthrough.overview.body')}</p>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="rounded-2xl bg-black/5 p-3 dark:bg-white/5">
                  <Zap
                    size={18}
                    className="mx-auto text-amber-500"
                    aria-hidden="true"
                  />
                  <p className="mt-1 font-mono text-xs font-bold">
                    {t('walkthrough.stat.power')}
                  </p>
                </div>
                <div className="rounded-2xl bg-black/5 p-3 dark:bg-white/5">
                  <Fuel
                    size={18}
                    className="mx-auto text-sky-500"
                    aria-hidden="true"
                  />
                  <p className="mt-1 font-mono text-xs font-bold">
                    {t('walkthrough.stat.fuel')}
                  </p>
                </div>
                <div className="rounded-2xl bg-black/5 p-3 dark:bg-white/5">
                  <Layers
                    size={18}
                    className="mx-auto text-emerald-500"
                    aria-hidden="true"
                  />
                  <p className="mt-1 font-mono text-xs font-bold">
                    {t('walkthrough.stat.regions')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep.id === 'purpose' && (
            <div className="space-y-3">
              <div>
                <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-900 uppercase dark:text-white">
                  {t('walkthrough.purpose.heading')}
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {t('walkthrough.purpose.sub')}
                </p>
              </div>

              <div className="rounded-2xl bg-black/5 p-3.5 dark:bg-white/5">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  {t('walkthrough.purpose.p1Title')}
                </h4>
                <p className="mt-1 text-xs leading-relaxed">
                  {t('walkthrough.purpose.p1Body')}
                </p>
              </div>

              <div className="rounded-2xl bg-black/5 p-3.5 dark:bg-white/5">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  {t('walkthrough.purpose.p2Title')}
                </h4>
                <p className="mt-1 text-xs leading-relaxed">
                  {t('walkthrough.purpose.p2Body')}
                </p>
              </div>

              <div className="rounded-2xl bg-black/5 p-3.5 dark:bg-white/5">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  {t('walkthrough.purpose.p3Title')}
                </h4>
                <p className="mt-1 text-xs leading-relaxed">
                  {t('walkthrough.purpose.p3Body')}
                </p>
              </div>
            </div>
          )}

          {currentStep.id === 'vision' && (
            <div className="space-y-3.5">
              <div>
                <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-900 uppercase dark:text-white">
                  {t('walkthrough.vision.heading')}
                </h3>
                <p className="mt-1 text-xs">
                  {t('walkthrough.vision.lead')}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {t('walkthrough.vision.civicTitle')}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {t('walkthrough.vision.civicBody')}
                </p>
              </div>

              <p className="rounded-2xl bg-black/5 p-3.5 text-xs italic dark:bg-white/5">
                {t('walkthrough.vision.closing')}
              </p>
            </div>
          )}

          {currentStep.id === 'howto' && (
            <div className="space-y-2.5">
              <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-900 uppercase dark:text-white">
                {t('walkthrough.howto.heading')}
              </h3>

              <div className="flex items-start gap-3 rounded-2xl bg-black/5 p-3 dark:bg-white/5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-zinc-950">
                  <Zap size={15} strokeWidth={2.4} aria-hidden="true" />
                </span>
                <div className="text-xs">
                  <p className="font-bold text-zinc-900 dark:text-white">
                    {t('walkthrough.howto.f1Title')}
                  </p>
                  <p className="mt-0.5">{t('walkthrough.howto.f1Body')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-black/5 p-3 dark:bg-white/5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Layers size={15} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <div className="text-xs">
                  <p className="font-bold text-zinc-900 dark:text-white">
                    {t('walkthrough.howto.f2Title')}
                  </p>
                  <p className="mt-0.5">{t('walkthrough.howto.f2Body')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-black/5 p-3 dark:bg-white/5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
                  <Fuel size={15} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <div className="text-xs">
                  <p className="font-bold text-zinc-900 dark:text-white">
                    {t('walkthrough.howto.f3Title')}
                  </p>
                  <p className="mt-0.5">{t('walkthrough.howto.f3Body')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-black/5 p-3 dark:bg-white/5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-white dark:bg-white dark:text-zinc-900">
                  <User size={15} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-zinc-900 dark:text-white">
                    {t('walkthrough.howto.f4Title')}
                  </p>
                  <p className="mt-0.5">{t('walkthrough.howto.f4Body')}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onOpenProfile?.()
                      }}
                      className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-white dark:bg-white dark:text-zinc-900"
                    >
                      {t('menu.yourProfile')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onOpenCommunity?.()
                      }}
                      className="rounded-full bg-black/10 px-3 py-1 text-[11px] font-semibold text-zinc-800 dark:bg-white/15 dark:text-zinc-100"
                    >
                      {t('menu.community')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer step navigation */}
        <div className="flex items-center justify-between gap-2 border-t border-black/5 px-5 py-3.5 dark:border-white/10">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="btn-ghost flex min-h-10 items-center gap-1 rounded-full px-3.5 text-xs disabled:opacity-35"
          >
            <PrevIcon size={15} aria-hidden="true" />
            <span>{t('walkthrough.prev')}</span>
          </button>

          <span className="tabular font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {stepIndex + 1} / {STEPS.length}
          </span>

          {isLast ? (
            <button
              type="button"
              onClick={onClose}
              className="btn-primary min-h-10 rounded-full px-5 text-xs"
            >
              {t('walkthrough.done')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))
              }
              className="btn-primary flex min-h-10 items-center gap-1 rounded-full px-4 text-xs"
            >
              <span>{t('walkthrough.next')}</span>
              <NextIcon size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default WalkthroughModal
