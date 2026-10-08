import {
  Activity,
  Clock,
  ExternalLink,
  MapPin,
  Star,
  Wrench,
  Zap,
} from 'lucide-react'
import { Fragment, useState } from 'react'
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

const DOT_CLASS = {
  normal: 'bg-emerald-500',
  warning: 'bg-amber-400',
  critical: 'bg-red-500',
}

function formatShortTime(ms, fallback) {
  if (!ms) return fallback
  return new Date(ms).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function RegionPopupContent({ region, initialSubId = null }) {
  const t = useT()
  const [selectedSubId, setSelectedSubId] = useState(initialSubId)

  const selectedSub =
    region.subNeighbourhoods?.find((s) => s.id === selectedSubId) ?? null
  const activeTarget = selectedSub ?? region
  const palette =
    STATUS_STYLE[activeTarget.overallStatus] ?? STATUS_STYLE.normal

  return (
    <div className="w-60 max-w-[76vw] space-y-2 text-zinc-900 dark:text-zinc-100">
      {/* Header: Region or Neighbourhood name + Power Grid status badge */}
      <div className="flex items-start justify-between gap-2 border-b border-black/10 pb-1.5 dark:border-white/10">
        <div className="min-w-0">
          {selectedSub ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedSubId(null)}
                className="font-mono text-[9px] font-semibold tracking-wider text-sky-600 uppercase hover:underline dark:text-sky-400"
              >
                ← {region.name}
              </button>
              <span className="block truncate font-mono text-xs font-bold">
                {selectedSub.name}
              </span>
            </>
          ) : (
            <span className="block truncate font-mono text-xs font-bold tracking-wider uppercase">
              {region.name}
            </span>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase ${
            activeTarget.overallStatus === 'critical'
              ? 'bg-red-500/20 text-red-600 dark:text-red-300'
              : activeTarget.overallStatus === 'warning'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {t(`region.status.${activeTarget.overallStatus}`)}
        </span>
      </div>

      {/* Power Grid Level + 7-Day Uptime */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-xl bg-black/5 px-2 py-1.5 dark:bg-white/5">
          <span className="flex items-center gap-1 text-[10px] opacity-75">
            <Zap size={11} className="text-amber-500" aria-hidden="true" />
            {t('region.powerLevel')}
          </span>
          <span className="tabular mt-0.5 block font-mono text-xs font-bold">
            {activeTarget.powerLevel}%
          </span>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
            <div
              className="h-full rounded-full"
              style={{
                width: `${activeTarget.powerLevel}%`,
                background: palette.color,
              }}
            />
          </div>
        </div>

        <div className="rounded-xl bg-black/5 px-2 py-1.5 dark:bg-white/5">
          <span className="flex items-center gap-1 text-[10px] opacity-75">
            <Activity
              size={11}
              className="text-emerald-500"
              aria-hidden="true"
            />
            {t('region.uptime')}
          </span>
          <span className="tabular mt-0.5 block font-mono text-xs font-bold">
            {activeTarget.uptimePercent}%
          </span>
          <span className="tabular block text-[9px] opacity-65">
            {t('region.outages', {
              verified: activeTarget.verifiedOutages,
              total: activeTarget.outageCount,
            })}
          </span>
        </div>
      </div>

      {/* Last Power Outage & Recent Maintenance */}
      <div className="space-y-1 rounded-xl bg-black/5 px-2.5 py-1.5 text-[10px] dark:bg-white/5">
        <div className="flex items-start gap-1.5">
          <Clock
            size={11}
            className="mt-0.5 shrink-0 text-amber-500"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <span className="font-semibold">{t('region.lastOutage')}: </span>
            {activeTarget.lastOutageInfo ? (
              <span className="tabular">
                {formatShortTime(activeTarget.lastOutageInfo.timestampMs, '')}
                {activeTarget.lastOutageInfo.durationHours
                  ? ` (${activeTarget.lastOutageInfo.durationHours}h)`
                  : ''}
              </span>
            ) : (
              <span className="opacity-70">{t('region.noRecentOutage')}</span>
            )}
          </div>
        </div>

        <div className="flex items-start gap-1.5">
          <Wrench
            size={11}
            className="mt-0.5 shrink-0 text-purple-500"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <span className="font-semibold">{t('region.maintenance')}: </span>
            {activeTarget.recentMaintenance ? (
              <span className="line-clamp-1">
                {activeTarget.recentMaintenance.text}
              </span>
            ) : (
              <span className="opacity-70">{t('region.noMaintenance')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Neighbourhoods (Quartiers) Breakdown */}
      <div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1 font-semibold opacity-80">
            <MapPin size={10} aria-hidden="true" />
            {t('region.neighbourhoods')}
          </span>
          {selectedSub && (
            <button
              type="button"
              onClick={() => setSelectedSubId(null)}
              className="text-[10px] font-semibold text-sky-600 dark:text-sky-400"
            >
              {t('filter.all')}
            </button>
          )}
        </div>
        <div className="mt-1 grid grid-cols-2 gap-1">
          {region.subNeighbourhoods.map((sub) => {
            const active = selectedSubId === sub.id
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() =>
                  setSelectedSubId((prev) => (prev === sub.id ? null : sub.id))
                }
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-start text-[10px] transition-colors ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`size-2 shrink-0 rounded-full ${DOT_CLASS[sub.overallStatus]}`}
                />
                <span className="truncate font-medium">{sub.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Top Fuel Stations in Region (independent of power grid status) */}
      <div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-semibold opacity-80">
            {t('region.gasStations')}
          </span>
          <span className="tabular font-mono font-semibold opacity-75">
            {t('region.gasSummary', {
              has: region.hasGasCount,
              total: region.totalStations,
            })}
          </span>
        </div>

        <ul className="mt-1 max-h-20 space-y-1 overflow-y-auto pe-0.5">
          {region.stations.map((station) => {
            const isOut = station.status === STATUS_NO_GAS
            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`
            return (
              <li
                key={station.id}
                className="flex items-center justify-between gap-1.5 rounded-lg bg-black/5 px-2 py-1 text-[10px] dark:bg-white/5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium leading-tight">
                    {station.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[9px]">
                    {station.rating && (
                      <span className="inline-flex items-center gap-0.5 font-mono text-amber-500">
                        <Star
                          size={8}
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
                  className="flex shrink-0 items-center gap-0.5 rounded-full bg-sky-600 px-2 py-0.5 text-[9px] font-semibold !text-white no-underline"
                >
                  <span>{t('station.directionsShort')}</span>
                  <ExternalLink size={8} aria-hidden="true" />
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function RegionZonesLayer({ visible, regions }) {
  if (!visible) return null

  return regions.map((region) => {
    const palette = STATUS_STYLE[region.overallStatus] ?? STATUS_STYLE.normal

    return (
      <Fragment key={region.id}>
        {/* Sub-neighbourhoods inside the region: show subtle grid lines and highlight localized outages */}
        {region.subNeighbourhoods.map((sub) => {
          const subPalette =
            STATUS_STYLE[sub.overallStatus] ?? STATUS_STYLE.normal
          const hasLocalOutage = sub.overallStatus !== 'normal'

          return (
            <Polygon
              key={sub.id}
              positions={sub.polygon}
              pathOptions={{
                color: hasLocalOutage ? subPalette.color : palette.color,
                weight: hasLocalOutage ? 1.5 : 0.75,
                dashArray: '3 5',
                fillColor: hasLocalOutage
                  ? subPalette.fillColor
                  : palette.fillColor,
                fillOpacity:
                  sub.overallStatus === 'critical'
                    ? 0.22
                    : sub.overallStatus === 'warning'
                      ? 0.14
                      : 0.04,
              }}
            >
              <Popup
                maxWidth={265}
                minWidth={225}
                autoPan={true}
                autoPanPaddingTopLeft={[16, 76]}
                autoPanPaddingBottomRight={[16, 76]}
              >
                <RegionPopupContent region={region} initialSubId={sub.id} />
              </Popup>
            </Polygon>
          )
        })}

        {/* Outer Region boundary line */}
        <Polygon
          positions={region.polygon}
          interactive={false}
          pathOptions={{
            color: palette.color,
            weight: 2.2,
            dashArray: '6 4',
            fillOpacity: 0,
          }}
        />
      </Fragment>
    )
  })
}

export default RegionZonesLayer
