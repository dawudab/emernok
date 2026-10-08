import { useState } from 'react'
import { NEIGHBOURHOODS, OFFICIAL_COLOR, getLocalName } from '../constants'
import { useI18n } from '../i18n/useI18n'
import { CloseIcon, MegaphoneIcon, NavigationIcon } from './icons'

/**
 * Official notices earn a banner rather than just a pin: the point of a
 * verified source is that people see it without hunting for it. Dismissal is
 * per-notice and per-session, so it cannot be silenced permanently by accident.
 */
function AnnouncementBanner({ announcements, onFocus }) {
  const { t, lang } = useI18n()
  const locale = lang === 'ar' ? 'ar-MR' : lang === 'fr' ? 'fr-FR' : 'en-US'
  const [dismissed, setDismissed] = useState(() => new Set())

  const visible = announcements.filter((item) => !dismissed.has(item.id))
  if (visible.length === 0) return null

  const item = visible[0]
  const matchedRegion = NEIGHBOURHOODS.find(
    (r) => r.id === item.areaId || r.name === item.area,
  )
  const localArea = matchedRegion ? getLocalName(matchedRegion, lang) : item.area

  return (
    <div
      className="glass pointer-events-auto px-4 py-3"
      style={{
        borderColor: `${OFFICIAL_COLOR}66`,
        boxShadow: `0 0 24px ${OFFICIAL_COLOR}33`,
      }}
    >
      <div className="flex items-start gap-3">
        <MegaphoneIcon
          size={18}
          strokeWidth={2}
          aria-hidden="true"
          className="mt-0.5 shrink-0"
          style={{ color: OFFICIAL_COLOR }}
        />
        <div className="min-w-0 flex-1">
          <p
            className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase"
            style={{ color: OFFICIAL_COLOR }}
          >
            {t('banner.official')}
          </p>
          <p className="mt-0.5 text-sm font-semibold">
            {t('banner.from', { org: item.org, area: localArea })}
          </p>
          <p className="mt-0.5 text-sm">{item.text}</p>
          {item.expiresAt?.toDate && (
            <p className="tabular mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {t('banner.until', {
                time: item.expiresAt.toDate().toLocaleTimeString(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              })}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onFocus(item)}
              className="flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold dark:bg-white/10"
            >
              <NavigationIcon size={13} strokeWidth={2.2} aria-hidden="true" />
              {t('menu.recenter')}
            </button>
            {visible.length > 1 && (
              <span className="tabular text-xs text-zinc-500 dark:text-zinc-400">
                +{visible.length - 1}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label={t('common.dismiss')}
          onClick={() =>
            setDismissed((previous) => new Set(previous).add(item.id))
          }
          className="rounded-full bg-black/5 p-1.5 dark:bg-white/10"
        >
          <CloseIcon size={14} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export default AnnouncementBanner
