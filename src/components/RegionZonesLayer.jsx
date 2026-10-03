import { ExternalLink, Star, Zap } from 'lucide-react'
import { Polygon, Popup } from 'react-leaflet'
import { useT } from '../i18n/useI18n'
import { STATUS_NO_GAS } from '../services/stations'

const STATUS_STYLE = {
  normal: {
    color: '#10b981',
    fillColor: '#10b981',
  },
  warning: {
    color: '#f59e0b',
    fillColor: '#f59e0b',
  },
  critical: {
    color: '#ef4444',
    fillColor: '#ef4444',
  },
}

/**
 * Renders Nouakchott's regions on the map. Hover tooltips are disabled — users
 * click/tap a region to open a compact, mobile-responsive stats popup that
 * auto-pans so it never overlaps with other UI elements.
 */
function RegionZonesLayer({ visible, regions }) {
  const t = useT()

  if (!visible) return null

  return regions.map((region) => {
    const palette = STATUS_STYLE[region.overallStatus] ?? STATUS_STYLE.normal

    return (
      <Polygon
        key={region.id}
        positions={region.polygon}
        pathOptions={{
          color: palette.color,
          weight: 1.75,
          dashArray: '6 4',
          fillColor: palette.fillColor,
          fillOpacity: 0.1,
        }}
      >
        <Popup
          maxWidth={250}
          minWidth={205}
          autoPan={true}
          autoPanPaddingTopLeft={[16, 76]}
          autoPanPaddingBottomRight={[16, 76]}
        >
          <div className="w-52 max-w-[72vw] space-y-2 text-zinc-900 dark:text-zinc-100">
            {/* Compact header: Region name + status badge */}
            <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-1.5 dark:border-white/10">
              <span className="truncate font-mono text-xs font-bold tracking-wider uppercase">
                {region.name}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase ${
                  region.overallStatus === 'critical'
                    ? 'bg-red-500/20 text-red-600 dark:text-red-300'
                    : region.overallStatus === 'warning'
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {t(`region.status.${region.overallStatus}`)}
              </span>
            </div>

            {/* Compact power level row */}
            <div className="rounded-xl bg-black/5 px-2.5 py-1.5 dark:bg-white/5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 font-medium">
                  <Zap
                    size={12}
                    className="text-amber-500"
                    aria-hidden="true"
                  />
                  {t('region.powerLevel')}
                </span>
                <span className="tabular font-mono font-bold">
                  {region.powerLevel}%
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${region.powerLevel}%`,
                    background: palette.color,
                  }}
                />
              </div>
              <p className="tabular mt-1 text-[10px] opacity-70">
                {t('region.outages', {
                  verified: region.verifiedOutages,
                  total: region.outageCount,
                })}
              </p>
            </div>

            {/* Compact top fuel stations in region */}
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold opacity-80">
                  {t('region.gasStations')}
                </span>
                <span className="tabular font-mono text-[10px] font-semibold opacity-75">
                  {t('region.gasSummary', {
                    has: region.hasGasCount,
                    total: region.totalStations,
                  })}
                </span>
              </div>

              <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto pe-0.5">
                {region.stations.map((station) => {
                  const isOut = station.status === STATUS_NO_GAS
                  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`
                  return (
                    <li
                      key={station.id}
                      className="flex items-center justify-between gap-1.5 rounded-lg bg-black/5 px-2 py-1 text-[11px] dark:bg-white/5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium leading-tight">
                          {station.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                          {station.rating && (
                            <span className="inline-flex items-center gap-0.5 font-mono text-amber-500">
                              <Star
                                size={9}
                                fill="currentColor"
                                aria-hidden="true"
                              />
                              {station.rating.toFixed(1)}
                            </span>
                          )}
                          <span
                            className={`font-mono font-semibold uppercase ${
                              isOut
                                ? 'text-red-500'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isOut ? t('station.noGas') : t('station.hasGas')}
                          </span>
                        </div>
                      </div>
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t('station.directions')}
                        className="flex shrink-0 items-center gap-0.5 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-semibold !text-white no-underline"
                      >
                        <span>{t('station.directionsShort')}</span>
                        <ExternalLink size={9} aria-hidden="true" />
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </Popup>
      </Polygon>
    )
  })
}

export default RegionZonesLayer
