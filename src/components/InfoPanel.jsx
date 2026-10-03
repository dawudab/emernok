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
  accentFor,
} from '../constants'
import { useT } from '../i18n/useI18n'
import { useTheme } from '../theme/useTheme'
import Sheet from './Sheet'
import { TYPE_ICONS } from './icons'

function Swatch({ color, opacity }) {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 size-5 shrink-0 rounded-full border-2"
      style={{
        borderColor: color,
        background: color,
        opacity,
        boxShadow: `0 0 12px ${color}66`,
      }}
    />
  )
}

function Heading({ children }) {
  return (
    <h3 className="font-mono text-[10px] font-semibold tracking-[0.18em] text-zinc-500 uppercase dark:text-zinc-400">
      {children}
    </h3>
  )
}

function Legend() {
  const t = useT()
  const { isDark } = useTheme()

  return (
    <div className="space-y-6">
      <section>
        <Heading>{t('legend.colourTitle')}</Heading>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {t('legend.colourIntro')}
        </p>
        <ul className="mt-3 space-y-3">
          <li className="flex gap-3">
            <Swatch color={STATUS_COLORS.unverified} opacity={0.5} />
            <span className="text-sm">
              <span className="font-semibold">{t('legend.unconfirmed')}</span> —{' '}
              {t('legend.unconfirmedBody', { total: VERIFY_MIN_USERS })}
            </span>
          </li>
          <li className="flex gap-3">
            <Swatch color={STATUS_COLORS.verified} opacity={0.9} />
            <span className="text-sm">
              <span className="font-semibold">{t('legend.verified')}</span> —{' '}
              {t('legend.verifiedBody', {
                total: VERIFY_MIN_USERS,
                radius: VERIFY_RADIUS_M,
              })}
            </span>
          </li>
          <li className="flex gap-3">
            <Swatch color={OFFICIAL_COLOR} opacity={0.9} />
            <span className="text-sm">
              <span className="font-semibold">{t('legend.officialTitle')}</span>{' '}
              — {t('legend.officialBody')}
            </span>
          </li>
        </ul>
      </section>

      <section>
        <Heading>{t('legend.iconTitle')}</Heading>
        <ul className="mt-3 space-y-2.5">
          {REPORT_TYPE_LIST.map((type) => {
            const Icon = TYPE_ICONS[type.iconName]
            return (
              <li key={type.id} className="flex items-center gap-3 text-sm">
                <Icon
                  size={17}
                  strokeWidth={2}
                  aria-hidden="true"
                  style={{ color: accentFor(type, isDark) }}
                />
                <span>{t(type.shortKey)}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <Heading>{t('legend.youTitle')}</Heading>
        <p className="mt-1 text-sm">{t('legend.youBody')}</p>
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
    <div className="space-y-6 text-sm">
      {sections.map((section) => (
        <section key={section.title}>
          <Heading>{section.title}</Heading>
          <p className="mt-1.5">{section.body}</p>
        </section>
      ))}
    </div>
  )
}

function InfoPanel({ view, onClose }) {
  const t = useT()
  const legend = view === 'legend'

  return (
    <Sheet
      title={legend ? t('legend.title') : t('about.title')}
      onClose={onClose}
    >
      {legend ? <Legend /> : <About />}
    </Sheet>
  )
}

export default InfoPanel
