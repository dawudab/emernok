import { distanceBetween } from 'geofire-common'
import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { Marker, Popup } from 'react-leaflet'
import { GAS_STATIONS } from '../constants'
import { useT } from '../i18n/useI18n'
import {
  STATUS_HAS_GAS,
  STATUS_NO_GAS,
  subscribeToStationStatuses,
} from '../services/stations'
import { MARKER_GLYPHS } from './markerGlyphs'

const OVERPASS_URL =
  'https://overpass-api.de/api/interpreter?data=' +
  encodeURIComponent(
    '[out:json][timeout:10];node["amenity"="fuel"](17.95,-16.05,18.18,-15.85);out body;',
  )

function buildStationIcon(state) {
  // state: 'has_gas' | 'no_gas' | 'default'
  const bg =
    state === STATUS_NO_GAS
      ? '#ef4444'
      : state === STATUS_HAS_GAS
        ? '#10b981'
        : '#0284c7'
  const ring =
    state === STATUS_NO_GAS
      ? 'rgba(239,68,68,0.55)'
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

function formatDistance(metres) {
  if (metres == null) return ''
  return metres < 1000
    ? `${Math.round(metres)}m`
    : `${(metres / 1000).toFixed(1)}km`
}

function GasStationLayer({ position, canVote, onReportGas }) {
  const t = useT()
  const [osmStations, setOsmStations] = useState([])
  const [stationStatuses, setStationStatuses] = useState({})
  const [busyStationId, setBusyStationId] = useState(null)

  useEffect(() => {
    return subscribeToStationStatuses((next) => setStationStatuses(next))
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch(OVERPASS_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.elements) return
        const parsed = data.elements
          .filter((el) => el.lat != null && el.lon != null)
          .map((el) => ({
            id: `osm-${el.id}`,
            name:
              el.tags?.name ||
              el.tags?.['name:fr'] ||
              el.tags?.['name:ar'] ||
              el.tags?.brand ||
              'Station-service',
            brand: el.tags?.brand || el.tags?.operator || 'Station',
            area:
              el.tags?.['addr:street'] ||
              el.tags?.['addr:suburb'] ||
              'Nouakchott',
            lat: el.lat,
            lng: el.lon,
          }))
        setOsmStations(parsed)
      })
      .catch(() => {
        // Built-in Nouakchott stations remain available offline or if Overpass is unreachable.
      })

    return () => {
      cancelled = true
    }
  }, [])

  const allStations = useMemo(() => {
    const merged = [...GAS_STATIONS]
    for (const candidate of osmStations) {
      const duplicate = merged.some(
        (existing) =>
          distanceBetween(
            [existing.lat, existing.lng],
            [candidate.lat, candidate.lng],
          ) *
            1000 <
          150,
      )
      if (!duplicate) merged.push(candidate)
    }
    return merged
  }, [osmStations])

  const icons = useMemo(
    () => ({
      default: buildStationIcon('default'),
      [STATUS_HAS_GAS]: buildStationIcon(STATUS_HAS_GAS),
      [STATUS_NO_GAS]: buildStationIcon(STATUS_NO_GAS),
    }),
    [],
  )

  const handleChoose = async (stationId, status) => {
    setBusyStationId(stationId)
    try {
      await onReportGas(stationId, status)
    } finally {
      setBusyStationId(null)
    }
  }

  return allStations.map((station) => {
    const record = stationStatuses[station.id]
    const status = record?.status ?? 'default'
    const hasGasCount = record?.hasGasCount ?? 0
    const noGasCount = record?.noGasCount ?? 0
    const isBusy = busyStationId === station.id

    const distMetres = position
      ? distanceBetween(
          [position.lat, position.lng],
          [station.lat, station.lng],
        ) * 1000
      : null

    return (
      <Marker
        key={station.id}
        position={[station.lat, station.lng]}
        icon={icons[status] ?? icons.default}
      >
        <Popup>
          <span className="block text-sm font-semibold">{station.name}</span>
          <span className="mt-0.5 block text-xs opacity-75">
            {station.area}
          </span>
          {distMetres != null && (
            <span className="tabular mt-1 block text-xs opacity-70">
              {t('community.away', { distance: formatDistance(distMetres) })}
            </span>
          )}

          <span
            className={`mt-2 inline-block rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase ${
              status === STATUS_NO_GAS
                ? 'bg-red-500/20 text-red-600 dark:text-red-300'
                : status === STATUS_HAS_GAS
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
            }`}
          >
            {status === STATUS_NO_GAS
              ? t('station.shortage')
              : t('station.available')}
          </span>

          {(hasGasCount > 0 || noGasCount > 0) && (
            <span className="tabular mt-1.5 block text-xs opacity-70">
              {t('station.tally', { has: hasGasCount, out: noGasCount })}
            </span>
          )}

          <span className="mt-2.5 flex gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleChoose(station.id, STATUS_HAS_GAS)}
              className="min-h-9 flex-1 rounded-full bg-emerald-500 px-3 text-xs font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-40"
            >
              {t('station.hasGas')}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleChoose(station.id, STATUS_NO_GAS)}
              className="min-h-9 flex-1 rounded-full bg-red-500 px-3 text-xs font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-40"
            >
              {t('station.noGas')}
            </button>
          </span>

          {!canVote && (
            <span className="mt-1.5 block text-[11px] opacity-70">
              {t('popup.signInToVote')}
            </span>
          )}
        </Popup>
      </Marker>
    )
  })
}

export default GasStationLayer
