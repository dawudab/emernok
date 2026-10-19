import L from 'leaflet'
import { CheckCircle2, Clock, Trash2 } from 'lucide-react'
import { Fragment, useMemo } from 'react'
import { Circle, Marker, Popup } from 'react-leaflet'
import {
  REPORT_PIN_RADIUS_M,
  REPORT_TYPES,
  STATUS_COLORS,
} from '../constants'
import { useI18n } from '../i18n/useI18n'
import {
  VOTE_RESTORED,
  VOTE_STILL_OUT,
  formatRelativeTime,
} from '../services/reports'
import { MARKER_GLYPHS } from './markerGlyphs'

function getVerifiedColor(typeId) {
  if (typeId === 'water') return STATUS_COLORS.verifiedWater
  if (typeId === 'fuel') return STATUS_COLORS.verifiedFuel
  return STATUS_COLORS.verified
}

function buildTierIcon(typeId, tier, isStale = false) {
  const isVerified = tier === 'verified'
  const isWorking = tier === 'working'
  const size = isVerified ? 36 : isWorking ? 32 : 29
  const color = isWorking
    ? STATUS_COLORS.working
    : isVerified
      ? getVerifiedColor(typeId)
      : STATUS_COLORS.unverified

  const glyphKey = isWorking
    ? 'working'
    : (REPORT_TYPES[typeId]?.iconName ?? 'power')
  const opacityStyle = isStale ? 'opacity:0.48;' : ''
  const pulseRing =
    tier === 'reported' && !isStale
      ? `<span style="position:absolute;inset:-5px;border-radius:9999px;border:2px solid ${color};opacity:0.65;animation:ping 2.2s cubic-bezier(0,0,0.2,1) infinite;"></span>`
      : ''
  const verifiedBadge = isVerified
    ? `<span style="position:absolute;top:-3px;right:-3px;display:flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:9999px;background:#ffffff;color:${color};font-size:9px;font-weight:900;box-shadow:0 1px 4px rgba(0,0,0,0.35);">✓</span>`
    : ''

  return L.divIcon({
    className: 'report-pin',
    html: `<span style="position:relative;display:flex;width:${size}px;height:${size}px;${opacityStyle}">${pulseRing}<span class="report-pin__dot" style="background:${color};color:${isWorking || isVerified ? '#ffffff' : '#09090b'};box-shadow:0 0 ${isVerified ? '18px' : '12px'} ${color}aa">${MARKER_GLYPHS[glyphKey]}</span>${verifiedBadge}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -16],
  })
}

function ReportLayers({
  clusters,
  onVote,
  onDeleteReport,
  canVote,
  uid,
  isAdmin,
  votedIds,
}) {
  const { t, lang, dir } = useI18n()

  const icons = useMemo(() => {
    const entries = []
    for (const type of Object.values(REPORT_TYPES)) {
      for (const tier of ['reported', 'verified', 'working']) {
        for (const stale of [false, true]) {
          entries.push([
            `${type.id}:${tier}:${stale}`,
            buildTierIcon(type.id, tier, stale),
          ])
        }
      }
    }
    return Object.fromEntries(entries)
  }, [])

  return (clusters ?? []).map((cluster) => {
    const type = REPORT_TYPES[cluster.type] ?? REPORT_TYPES.power
    const tier =
      cluster.tier ?? (cluster.verified ? 'verified' : 'reported')
    const isWorking = tier === 'working'
    const isVerified = tier === 'verified'
    const isStale = Boolean(cluster.isStale)
    const color = isWorking
      ? STATUS_COLORS.working
      : isVerified
        ? getVerifiedColor(cluster.type)
        : STATUS_COLORS.unverified

    const alreadyVoted = votedIds.has(cluster.latest.id)
    const intensity = Math.min(1, (cluster.confirmedCount ?? cluster.reporterCount ?? 1) / 4)
    const deletableReport = isAdmin
      ? cluster.latest
      : cluster.reports.find((r) => uid && r.uid === uid)

    const relativeUpdated = formatRelativeTime(
      cluster.lastUpdatedMs || cluster.latest?.createdAt,
      lang,
    )
    const confirmedTotal =
      cluster.confirmedCount ?? cluster.reporterCount ?? 1

    return (
      <Fragment key={`${cluster.id}-${tier}`}>
        {!isStale && (
          <Circle
            center={[cluster.lat, cluster.lng]}
            radius={REPORT_PIN_RADIUS_M * (isVerified ? 1.65 : 1.35)}
            interactive={false}
            pathOptions={{
              stroke: false,
              fillColor: color,
              fillOpacity: isWorking ? 0.1 : 0.08 + intensity * 0.08,
            }}
          />
        )}
        <Circle
          center={[cluster.lat, cluster.lng]}
          radius={REPORT_PIN_RADIUS_M}
          pathOptions={{
            color,
            weight: isVerified ? 2.2 : 1.2,
            dashArray: tier === 'reported' ? '4 4' : undefined,
            fillColor: color,
            fillOpacity: isStale
              ? 0.08
              : isWorking
                ? 0.22
                : isVerified
                  ? 0.32
                  : 0.18,
          }}
        />
        <Marker
          position={[cluster.lat, cluster.lng]}
          icon={
            icons[`${cluster.type}:${tier}:${isStale}`] ??
            icons['power:reported:false']
          }
        >
          <Popup>
            <div dir={dir} className="w-60 space-y-2 text-start">
              {/* Top Tier Status + Relative Timestamp */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase ${
                    isWorking
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : isVerified
                        ? 'bg-red-500/20 text-red-600 dark:text-red-300'
                        : 'bg-amber-400/25 text-amber-800 dark:text-amber-200'
                  }`}
                >
                  {isWorking || isVerified ? (
                    <CheckCircle2 size={11} aria-hidden="true" />
                  ) : null}
                  {isStale
                    ? t('status.stale')
                    : t(`status.tier.${tier}`)}
                </span>

                <span className="tabular inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  <Clock size={11} aria-hidden="true" />
                  {t('updated.ago', { time: relativeUpdated })}
                </span>
              </div>

              {/* Title */}
              <div>
                <p className="text-sm font-bold">
                  {isWorking
                    ? t('dock.powerWorking')
                    : t(type.shortKey)}
                </p>

                {/* Provenance Pill Badge */}
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    cluster.isOfficial
                      ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300'
                      : 'bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-300'
                  }`}
                >
                  {cluster.isOfficial
                    ? t('provenance.official')
                    : t('provenance.community', { count: confirmedTotal })}
                </span>
              </div>

              {cluster.details && (
                <p className="rounded-xl bg-black/5 px-2.5 py-1.5 text-xs italic dark:bg-white/10">
                  «{cluster.details}»
                </p>
              )}

              {/* Vote / Confirmation Actions */}
              {alreadyVoted ? (
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {t('popup.voted')}
                </p>
              ) : (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={!canVote}
                    onClick={() => onVote(cluster.latest.id, VOTE_STILL_OUT)}
                    className="min-h-9 flex-1 rounded-full bg-red-500 px-2.5 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-40"
                  >
                    {t('popup.stillOut')} ({cluster.stillOutCount ?? 0})
                  </button>
                  <button
                    type="button"
                    disabled={!canVote}
                    onClick={() => onVote(cluster.latest.id, VOTE_RESTORED)}
                    className="min-h-9 flex-1 rounded-full bg-emerald-500 px-2.5 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-40"
                  >
                    {t('popup.back')} ({cluster.restoredCount ?? 0})
                  </button>
                </div>
              )}

              {deletableReport && (
                <button
                  type="button"
                  onClick={() => onDeleteReport(deletableReport.id)}
                  className="flex min-h-8 w-full items-center justify-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
                >
                  <Trash2 size={12} strokeWidth={2.2} aria-hidden="true" />
                  <span>{t('report.delete')}</span>
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      </Fragment>
    )
  })
}

export default ReportLayers

