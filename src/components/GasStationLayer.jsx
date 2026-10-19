import { distanceBetween } from 'geofire-common'
import L from 'leaflet'
import { Clock, ExternalLink, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Marker, Popup } from 'react-leaflet'
import {
  NO_GAS_MIN_REPORTS,
  STATUS_COLORS,
  getLocalArea,
  getLocalName,
} from '../constants'
import { useI18n } from '../i18n/useI18n'
import { formatRelativeTime } from '../services/reports'
import {
  STATUS_HAS_GAS,
  STATUS_NO_GAS,
  resolveStationStatus,
} from '../services/stations'
import { MARKER_GLYPHS } from './markerGlyphs'

function buildStationIcon(state) {
  const bg =
    state === STATUS_NO_GAS
      ? STATUS_COLORS.verifiedFuel
      : state === STATUS_HAS_GAS
        ? STATUS_COLORS.working
        : '#0284c7'
  const ring =
    state === STATUS_NO_GAS
      ? 'rgba(249,115,22,0.55)'
      : state === STATUS_HAS_GAS
        ? 'rgba(16,185,129,0.5)'
        : 'rgba(2,132,199,0.45)'
  return L.divIcon({
    className: 'gas-station-pin',
    html: `<span class="gas-station-pin__badge" style="background:${bg};box-shadow:0 2px 10px ${ring}">${MARKER_GLYPHS.fuel}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })
}

function formatDistance(metres, t) {
  if (metres == null) return ''
  return metres < 1000
    ? t('unit.m', { count: Math.round(metres) })
    : t('unit.km', { count: (metres / 1000).toFixed(1) })
}

function GasStationLayer({
  visible = true,
  stations,
  stationStatuses,
  position,
  canVote,
  onReportGas,
}) {
  const { t, lang, dir } = useI18n()
  const [busyStationId, setBusyStationId] = useState(null)

  const icons = useMemo(
    () => ({
      default: buildStationIcon('default'),
      [STATUS_HAS_GAS]: buildStationIcon(STATUS_HAS_GAS),
      [STATUS_NO_GAS]: buildStationIcon(STATUS_NO_GAS),
    }),
    [],
  )

  if (!visible) return null

  const handleChoose = async (stationId, status) => {
    setBusyStationId(stationId)
    try {
      await onReportGas(stationId, status)
    } finally {
      setBusyStationId(null)
    }
  }

  return stations.map((station) => {
    const record = stationStatuses?.[station.id]
    const status = resolveStationStatus(record)
    const hasGasCount = record?.hasGasCount ?? 0
    const noGasCount = record?.noGasCount ?? 0
    const totalConfirmations = hasGasCount + noGasCount
    const isBusy = busyStationId === station.id
    const relativeTime = formatRelativeTime(record?.updatedAt, lang)

    const distMetres = position
      ? distanceBetween(
          [position.lat, position.lng],
          [station.lat, station.lng],
        ) * 1000
      : null

    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`

    return (
      <Marker
        key={station.id}
        position={[station.lat, station.lng]}
        icon={icons[status] ?? icons.default}
      >
        <Popup>
          <div dir={dir} className="w-60 space-y-2 text-start">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase ${
                  status === STATUS_NO_GAS
                    ? 'bg-orange-500/20 text-orange-600 dark:text-orange-300'
                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {status === STATUS_NO_GAS
                  ? t('station.shortage')
                  : t('station.available')}
              </span>
              <span className="tabular inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                <Clock size={11} aria-hidden="true" />
                {t('updated.ago', { time: relativeTime })}
              </span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="block truncate text-sm font-bold">
                  {getLocalName(station, lang)}
                </span>
                <span className="mt-0.5 block truncate text-xs opacity-75">
                  {getLocalArea(station, lang)}
                  {distMetres != null
                    ? ` · ${formatDistance(distMetres, t)}`
                    : ''}
                </span>
              </div>
              {station.rating && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-400/20 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-600 dark:text-amber-300">
                  <Star size={11} fill="currentColor" aria-hidden="true" />
                  {station.rating.toFixed(1)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-300">
                {t('provenance.community', {
                  count: Math.max(1, totalConfirmations),
                })}
              </span>
              <span className="tabular text-[11px] opacity-70">
                {t('station.tally', { has: hasGasCount, out: noGasCount })}
              </span>
            </div>

            {status !== STATUS_NO_GAS && noGasCount > 0 && (
              <span className="tabular block text-[11px] opacity-65">
                {t('station.thresholdHint', {
                  out: noGasCount,
                  min: NO_GAS_MIN_REPORTS,
                })}
              </span>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isBusy || !canVote}
                onClick={() => handleChoose(station.id, STATUS_HAS_GAS)}
                className="min-h-9 flex-1 rounded-full bg-emerald-500 px-3 text-xs font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-40"
              >
                {t('station.hasGas')}
              </button>
              <button
                type="button"
                disabled={isBusy || !canVote}
                onClick={() => handleChoose(station.id, STATUS_NO_GAS)}
                className="min-h-9 flex-1 rounded-full bg-orange-500 px-3 text-xs font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-40"
              >
                {t('station.noGas')}
              </button>
            </div>

            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full bg-sky-600 px-3 text-xs font-semibold !text-white no-underline transition-opacity hover:opacity-90"
            >
              <span>{t('station.directions')}</span>
              <ExternalLink size={13} strokeWidth={2.2} aria-hidden="true" />
            </a>
          </div>
        </Popup>
      </Marker>
    )
  })
}

export default GasStationLayer

