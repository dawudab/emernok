import L from 'leaflet'
import { Fragment, useMemo } from 'react'
import { Circle, Marker, Popup } from 'react-leaflet'
import { ANNOUNCEMENT_RADIUS_M, OFFICIAL_COLOR } from '../constants'
import { useT } from '../i18n/useI18n'
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
  const t = useT()

  const items = useMemo(
    () => announcements.filter((item) => item.lat != null && item.lng != null),
    [announcements],
  )

  return items.map((item) => (
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
          <span
            className="block font-mono text-[10px] font-semibold tracking-[0.2em] uppercase"
            style={{ color: OFFICIAL_COLOR }}
          >
            {t('banner.official')}
          </span>
          <span className="mt-1 block text-sm font-semibold">
            {t('banner.from', { org: item.org, area: item.area })}
          </span>
          <span className="mt-1 block text-sm">{item.text}</span>
          {item.expiresAt?.toDate && (
            <span className="tabular mt-1 block text-xs opacity-70">
              {t('banner.until', {
                time: item.expiresAt.toDate().toLocaleString(),
              })}
            </span>
          )}
        </Popup>
      </Marker>
    </Fragment>
  ))
}

export default AnnouncementLayer
