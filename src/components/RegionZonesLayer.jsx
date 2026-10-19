import {
  Activity,
  BarChart3,
  Clock,
  ExternalLink,
  Star,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Polygon, Popup, useMap } from 'react-leaflet'
import {
  Area,
  Bar,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getLocalName } from '../constants'
import { useI18n } from '../i18n/useI18n'
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

function formatShortTime(ms, lang, fallback) {
  if (!ms) return fallback
  const locale = lang === 'ar' ? 'ar-MR' : lang === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(ms).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SevenDayTrendChart({ data, lang, t }) {
  const localizedData = useMemo(() => {
    if (!data?.length) return []
    const locale = lang === 'ar' ? 'ar-MR' : lang === 'fr' ? 'fr-FR' : 'en-US'
    return data.map((entry) => {
      const parsed = Date.parse(`${entry.dateKey}T12:00:00`)
      const dayLabel = Number.isNaN(parsed)
        ? entry.dayLabel
        : new Date(parsed).toLocaleDateString(locale, { weekday: 'short' })
      return {
        ...entry,
        dayLabel,
      }
    })
  }, [data, lang])

  if (!localizedData.length) return null

  return (
    <div className="rounded-xl bg-black/5 p-2 dark:bg-white/5">
      <div className="mb-1 flex items-center justify-between gap-1 text-[10px]">
        <span className="flex items-center gap-1 font-semibold opacity-85">
          <BarChart3
            size={11}
            className="text-emerald-500"
            aria-hidden="true"
          />
          {t('region.trendTitle')}
        </span>
        <span className="flex items-center gap-2 font-mono text-[9px] opacity-75">
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {t('region.trendUptime')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-amber-500" />
            {t('region.trendOutages')}
          </span>
        </span>
      </div>

      <div className="h-24 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={localizedData}
            margin={{ top: 4, right: 2, left: -24, bottom: 0 }}
          >
            <defs>
              <linearGradient id="uptimeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.38} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="dayLabel"
              tick={{ fontSize: 9, fill: '#71717a' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="uptime"
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tick={{ fontSize: 8, fill: '#71717a' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="outages"
              orientation="right"
              allowDecimals={false}
              hide
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(9, 9, 11, 0.92)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                padding: '4px 8px',
                fontSize: '10px',
                color: '#fafafa',
              }}
              labelStyle={{ fontWeight: 700, marginBottom: 2 }}
              formatter={(value, name) =>
                name === 'uptime'
                  ? [`${value}%`, t('region.trendUptime')]
                  : [value, t('region.trendOutages')]
              }
            />
            <Area
              yAxisId="uptime"
              type="monotone"
              dataKey="uptime"
              stroke="#10b981"
              strokeWidth={1.8}
              fill="url(#uptimeFill)"
            />
            <Bar
              yAxisId="outages"
              dataKey="outages"
              barSize={7}
              fill="#f59e0b"
              radius={[3, 3, 0, 0]}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function RegionPopupContent({ region, initialSubId = null }) {
  const { t, lang, dir } = useI18n()
  const map = useMap()
  const [selectedSubId, setSelectedSubId] = useState(initialSubId)

  const selectedSub =
    region.subNeighbourhoods?.find((s) => s.id === selectedSubId) ?? null
  const activeTarget = selectedSub ?? region
  const palette =
    STATUS_STYLE[activeTarget.overallStatus] ?? STATUS_STYLE.normal
  const backArrow = dir === 'rtl' ? '→' : '←'

  return (
    <div
      dir={dir}
      className="max-h-[min(64dvh,22rem)] w-64 max-w-[78vw] space-y-2 overflow-y-auto overscroll-contain pe-0.5 text-start text-zinc-900 dark:text-zinc-100"
    >
      {/* Header: Region or Neighbourhood name + Power Grid status badge + Close button */}
      <div className="flex items-start justify-between gap-2 border-b border-black/10 pb-1.5 dark:border-white/10">
        <div className="min-w-0 flex-1">
          {selectedSub ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedSubId(null)}
                className="font-mono text-[10px] font-semibold text-sky-600 uppercase hover:underline dark:text-sky-400"
              >
                {backArrow} {getLocalName(region, lang)}
              </button>
              <span className="block truncate font-mono text-xs font-bold">
                {getLocalName(selectedSub, lang)}
              </span>
            </>
          ) : (
            <span className="block truncate font-mono text-xs font-bold uppercase">
              {getLocalName(region, lang)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase ${
              activeTarget.overallStatus === 'critical'
                ? 'bg-red-500/20 text-red-600 dark:text-red-300'
                : activeTarget.overallStatus === 'warning'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {t(`region.status.${activeTarget.overallStatus}`)}
          </span>
          <button
            type="button"
            onClick={() => map.closePopup()}
            aria-label={t('common.close')}
            className="rounded-full p-0.5 text-zinc-400 hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200 transition"
          >
            <X size={13} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
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

      {/* Today's Crowd-Sourced Survey Summary Badge */}
      {activeTarget.todaySurveysCount > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-2.5 py-1.5 text-[10px] text-emerald-800 dark:text-emerald-200">
          <span className="inline-flex items-center gap-1 font-bold">
            <Zap size={11} fill="currentColor" className="text-emerald-500" aria-hidden="true" />
            {t('survey.badge')}
          </span>
          <span className="tabular font-mono text-[9px] font-semibold">
            {t('survey.surveyStat', {
              pct: activeTarget.todayWorkingPercent ?? 100,
              count: activeTarget.todaySurveysCount,
            })}
          </span>
        </div>
      )}

      {/* 7-Day Historical Trend of Uptime & Outage Frequency (Recharts) */}
      <SevenDayTrendChart data={activeTarget.dailyTrend} lang={lang} t={t} />

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
                {formatShortTime(
                  activeTarget.lastOutageInfo.timestampMs,
                  lang,
                  '',
                )}
                {activeTarget.lastOutageInfo.durationHours
                  ? ` (${t('unit.hoursShort', { count: activeTarget.lastOutageInfo.durationHours })})`
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

        <ul className="mt-1 space-y-1">
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
                    {getLocalName(station, lang)}
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
  const map = useMap()
  const isPopupOpenRef = useRef(false)
  const dismissedAtRef = useRef(0)

  useEffect(() => {
    if (!map) return undefined

    const handlePopupOpen = () => {
      isPopupOpenRef.current = true
    }
    const handlePopupClose = () => {
      isPopupOpenRef.current = false
    }

    map.on('popupopen', handlePopupOpen)
    map.on('popupclose', handlePopupClose)

    const container = map.getContainer()

    const handleDocumentPointerDown = (event) => {
      if (!isPopupOpenRef.current) return
      const target = event.target
      if (target instanceof Element && target.closest('.leaflet-popup')) {
        return
      }
      // User clicked outside the open popup — dismiss it immediately
      dismissedAtRef.current = Date.now()
      isPopupOpenRef.current = false
      map.closePopup()
    }

    const handleContainerClickCapture = (event) => {
      const target = event.target
      if (target instanceof Element && target.closest('.leaflet-popup')) {
        return
      }
      // If we just dismissed an open popup via pointerdown, prevent the polygon underneath
      // from immediately opening another popup on the same click gesture.
      if (Date.now() - dismissedAtRef.current < 400) {
        event.stopPropagation()
        map.closePopup()
      }
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown, true)
    container.addEventListener('click', handleContainerClickCapture, true)

    return () => {
      map.off('popupopen', handlePopupOpen)
      map.off('popupclose', handlePopupClose)
      document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
      container.removeEventListener('click', handleContainerClickCapture, true)
    }
  }, [map])

  if (!visible) return null

  return regions.map((region) => {
    const palette = STATUS_STYLE[region.overallStatus] ?? STATUS_STYLE.normal

    return (
      <Fragment key={region.id}>
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
                maxWidth={280}
                minWidth={240}
                autoPan={true}
                autoClose={true}
                closeOnClick={true}
                autoPanPaddingTopLeft={[16, 76]}
                autoPanPaddingBottomRight={[16, 76]}
              >
                <RegionPopupContent region={region} initialSubId={sub.id} />
              </Popup>
            </Polygon>
          )
        })}

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
