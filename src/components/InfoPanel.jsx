import {
  COMMUNITY_RADIUS_KM,
  DAILY_REPORT_LIMIT,
  OFFICIAL_COLOR,
  REPORT_COOLDOWN_SECONDS,
  REPORT_TTL_HOURS,
  REPORT_TYPE_LIST,
  RESTORED_THRESHOLD,
  STATUS_COLORS,
  VERIFY_MIN_USERS,
  VERIFY_RADIUS_M,
} from '../constants'
import { useT } from '../i18n/useI18n'

function Swatch({ color, opacity }) {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 size-5 shrink-0 rounded-full border-2"
      style={{ borderColor: color, background: color, opacity }}
    />
  )
}

function Legend() {
  const t = useT()

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-bold text-slate-900">
          {t('legend.colourTitle')}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          {t('legend.colourIntro')}
        </p>
        <ul className="mt-3 space-y-3">
          <li className="flex gap-3">
            <Swatch color={STATUS_COLORS.unverified} opacity={0.35} />
            <span className="text-sm text-slate-700">
              <span className="font-semibold">{t('legend.unconfirmed')}</span> —{' '}
              {t('legend.unconfirmedBody', { total: VERIFY_MIN_USERS })}
            </span>
          </li>
          <li className="flex gap-3">
            <Swatch color={STATUS_COLORS.verified} opacity={0.8} />
            <span className="text-sm text-slate-700">
              <span className="font-semibold">{t('legend.verified')}</span> —{' '}
              {t('legend.verifiedBody', {
                total: VERIFY_MIN_USERS,
                radius: VERIFY_RADIUS_M,
              })}
            </span>
          </li>
          <li className="flex gap-3">
            <Swatch color={OFFICIAL_COLOR} opacity={0.8} />
            <span className="text-sm text-slate-700">
              <span className="font-semibold">{t('legend.officialTitle')}</span>{' '}
              — {t('legend.officialBody')}
            </span>
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-900">
          {t('legend.iconTitle')}
        </h3>
        <ul className="mt-3 space-y-2">
          {REPORT_TYPE_LIST.map((type) => (
            <li key={type.id} className="flex items-center gap-3 text-sm">
              <span aria-hidden="true" className="w-5 text-center text-base">
                {type.icon}
              </span>
              <span className="text-slate-700">{t(type.shortKey)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-900">
          {t('legend.youTitle')}
        </h3>
        <p className="mt-1 text-sm text-slate-700">{t('legend.youBody')}</p>
      </section>
    </div>
  )
}

function About() {
  const t = useT()

  const sections = [
    { title: t('about.reportTitle'), body: t('about.reportBody') },
    {
      title: t('about.expiryTitle'),
      body: t('about.expiryBody', {
        hours: REPORT_TTL_HOURS,
        restored: RESTORED_THRESHOLD,
      }),
    },
    { title: t('about.voteTitle'), body: t('about.voteBody') },
    {
      title: t('about.feedTitle'),
      body: t('about.feedBody', { km: COMMUNITY_RADIUS_KM }),
    },
    {
      title: t('about.limitsTitle'),
      body: t('about.limitsBody', {
        cooldown: REPORT_COOLDOWN_SECONDS,
        limit: DAILY_REPORT_LIMIT,
      }),
    },
  ]

  return (
    <div className="space-y-5 text-sm text-slate-700">
      {sections.map((section) => (
        <section key={section.title}>
          <h3 className="text-sm font-bold text-slate-900">{section.title}</h3>
          <p className="mt-1">{section.body}</p>
        </section>
      ))}
    </div>
  )
}

function InfoPanel({ view, onClose }) {
  const t = useT()
  const legend = view === 'legend'
  const title = legend ? t('legend.title') : t('about.title')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="min-h-11 min-w-11 shrink-0 rounded-xl bg-slate-100 font-semibold text-slate-700"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {legend ? <Legend /> : <About />}
        </div>
      </div>
    </div>
  )
}

export default InfoPanel
