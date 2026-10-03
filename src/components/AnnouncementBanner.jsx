import { useState } from 'react'
import { OFFICIAL_COLOR } from '../constants'
import { useT } from '../i18n/useI18n'

/**
 * Official notices earn a banner rather than just a pin: the point of a
 * verified source is that people see it without hunting for it. Dismissal is
 * per-notice and per-session, so it cannot be silenced permanently by accident.
 */
function AnnouncementBanner({ announcements, onFocus }) {
  const t = useT()
  const [dismissed, setDismissed] = useState(() => new Set())

  const visible = announcements.filter((item) => !dismissed.has(item.id))
  if (visible.length === 0) return null

  const item = visible[0]

  return (
    <div
      className="pointer-events-auto rounded-xl px-4 py-3 text-white shadow-lg"
      style={{ background: OFFICIAL_COLOR }}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-lg leading-none">
          📢
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide opacity-90">
            {t('banner.official')}
          </p>
          <p className="text-sm font-semibold">
            {t('banner.from', { org: item.org, area: item.area })}
          </p>
          <p className="mt-0.5 text-sm">{item.text}</p>
          {item.expiresAt?.toDate && (
            <p className="mt-1 text-xs opacity-90">
              {t('banner.until', {
                time: item.expiresAt.toDate().toLocaleTimeString([], {
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
              className="rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold"
            >
              {t('menu.recenter')}
            </button>
            {visible.length > 1 && (
              <span className="text-xs opacity-90">+{visible.length - 1}</span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label={t('common.dismiss')}
          onClick={() =>
            setDismissed((previous) => new Set(previous).add(item.id))
          }
          className="rounded-lg bg-white/20 px-2 py-1"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default AnnouncementBanner
