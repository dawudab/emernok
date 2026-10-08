import L from 'leaflet'
import { Fragment, useMemo } from 'react'
import { Circle, Marker, Popup } from 'react-leaflet'
import {
  ANNOUNCEMENT_RADIUS_M,
  NEIGHBOURHOODS,
  OFFICIAL_COLOR,
  getLocalName,
} from '../constants'
import { useI18n } from '../i18n/useI18n'
import { MARKER_GLYPHS } from './markerGlyphs'

// Deliberately a different shape and colour from community pins: an official
// notice should never be mistaken for a crowd report, or the other way round.
const officialIcon = L.divIcon({
  className: 'official-pin',
  html: `<span class="official-pin__badge" style="background:${OFFICIAL_COLOR}">${MARKER_GLYPHS.official}</span>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18],
})

function AnnouncementLayer({ announcements }) {
  const { t, lang, dir } = useI18n()
  const locale = lang === 'ar' ? 'ar-MR' : lang === 'fr' ? 'fr-FR' : 'en-US'

  const items = useMemo(
    () => announcements.filter((item) => item.lat != null && item.lng != null),
    [announcements],
  )

  return items.map((item) => {
    const matchedRegion = NEIGHBOURHOODS.find(
      (r) => r.id === item.areaId || r.name === item.area,
    )
    const localArea = matchedRegion
      ? getLocalName(matchedRegion, lang)
      : item.area

    return (
      <Fragment key={item.id}>
        <Circle
          center={[item.lat, item.lng]}
          radius={ANNOUNCEMENT_RADIUS_M}
          pathOptions={{
            color: OFFICIAL_COLOR,
            weight: 2,
            dashArray: '6 6',
            fillColor: OFFICIAL_COLOR,
            fillOpacity: 0.12,
          }}
        />
        <Marker position={[item.lat, item.lng]} icon={officialIcon}>
          <Popup>
            <div dir={dir} className="text-start">
              <span
                className="block font-mono text-[10px] font-semibold tracking-[0.2em] uppercase"
                style={{ color: OFFICIAL_COLOR }}
              >
                {t('banner.official')}
              </span>
              <span className="mt-1 block text-sm font-semibold">
                {t('banner.from', { org: item.org, area: localArea })}
              </span>
              <span className="mt-1 block text-sm">{item.text}</span>
              {item.expiresAt?.toDate && (
                <span className="tabular mt-1 block text-xs opacity-70">
                  {t('banner.until', {
                    time: item.expiresAt.toDate().toLocaleString(locale, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  })}
                </span>
              )}
            </div>
          </Popup>
        </Marker>
      </Fragment>
    )
  })
}

export default AnnouncementLayer
