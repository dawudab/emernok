import L from 'leaflet'
import { Trash2 } from 'lucide-react'
import { Fragment, useMemo } from 'react'
import { Circle, Marker, Popup } from 'react-leaflet'
import {
  REPORT_PIN_RADIUS_M,
  REPORT_TYPES,
  STATUS_COLORS,
  VERIFY_MIN_USERS,
} from '../constants'
import { useT } from '../i18n/useI18n'
import { VOTE_RESTORED, VOTE_STILL_OUT } from '../services/reports'
import { MARKER_GLYPHS } from './markerGlyphs'

function buildIcon(iconName, color, verified) {
  const size = verified ? 34 : 28
  return L.divIcon({
    className: 'report-pin',
    html: `<span class="report-pin__dot" style="background:${color};box-shadow:0 0 14px ${color}99">${MARKER_GLYPHS[iconName]}</span>`,
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
  const t = useT()

  const formatTime = (createdAt) =>
    createdAt?.toDate ? createdAt.toDate().toLocaleString() : t('popup.sending')

  const icons = useMemo(() => {
    const entries = []
    for (const type of Object.values(REPORT_TYPES)) {
      for (const verified of [false, true]) {
        entries.push([
          `${type.id}:${verified}`,
          buildIcon(
            type.iconName,
            verified ? STATUS_COLORS.verified : STATUS_COLORS.unverified,
            verified,
          ),
        ])
      }
    }
    return Object.fromEntries(entries)
  }, [])

  const powerClusters = useMemo(
    () => clusters.filter((cluster) => cluster.type === 'power'),
    [clusters],
  )

  return powerClusters.map((cluster) => {
    const type = REPORT_TYPES[cluster.type]
    const color = cluster.verified
      ? STATUS_COLORS.verified
      : STATUS_COLORS.unverified
    const alreadyVoted = votedIds.has(cluster.latest.id)

    // Intensity scales with reporter count for a heatmap-style localized glow
    const intensity = Math.min(1, cluster.reporterCount / 4)

    const deletableReport = isAdmin
      ? cluster.latest
      : cluster.reports.find((r) => uid && r.uid === uid)

    return (
      <Fragment key={cluster.id}>
        {/* Heatmap-style concentric thermal rings covering the immediate ~100-200ft area */}
        <Circle
          center={[cluster.lat, cluster.lng]}
          radius={REPORT_PIN_RADIUS_M * 1.65}
          interactive={false}
          pathOptions={{
            stroke: false,
            fillColor: color,
            fillOpacity: 0.08 + intensity * 0.06,
          }}
        />
        <Circle
          center={[cluster.lat, cluster.lng]}
          radius={REPORT_PIN_RADIUS_M * 1.25}
          interactive={false}
          pathOptions={{
            stroke: false,
            fillColor: color,
            fillOpacity: 0.14 + intensity * 0.1,
          }}
        />
        <Circle
          center={[cluster.lat, cluster.lng]}
          radius={REPORT_PIN_RADIUS_M}
          pathOptions={{
            color,
            weight: cluster.verified ? 2 : 1,
            fillColor: color,
            fillOpacity: cluster.verified ? 0.34 : 0.2,
          }}
        />
        <Marker
          position={[cluster.lat, cluster.lng]}
          icon={icons[`${cluster.type}:${cluster.verified}`]}
        >
          <Popup>
            <span className="block text-sm font-semibold">
              {t(type.shortKey)}
            </span>
            <span
              className="mt-1 block font-mono text-[10px] font-semibold tracking-[0.15em] uppercase"
              style={{ color }}
            >
              {cluster.verified
                ? t('popup.verified')
                : t('popup.unconfirmed', {
                    count: cluster.reporterCount,
                    total: VERIFY_MIN_USERS,
                  })}
            </span>
            {cluster.details && (
              <span className="mt-1.5 block rounded-xl bg-black/5 px-2.5 py-1.5 text-xs italic dark:bg-white/10">
                “{cluster.details}”
              </span>
            )}
            <span className="tabular mt-1 block text-xs opacity-70">
              {t('popup.latest', { time: formatTime(cluster.latest.createdAt) })}
            </span>
            <span className="tabular mt-0.5 block text-xs opacity-70">
              {t('popup.tally', {
                out: cluster.stillOutCount,
                back: cluster.restoredCount,
              })}
            </span>

            {alreadyVoted ? (
              <span className="mt-2 block text-xs font-medium opacity-70">
                {t('popup.voted')}
              </span>
            ) : (
              <span className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!canVote}
                  onClick={() => onVote(cluster.latest.id, VOTE_STILL_OUT)}
                  className="min-h-9 flex-1 rounded-full bg-red-500 px-2 text-xs font-semibold text-white transition-all duration-300 disabled:opacity-40"
                >
                  {t('popup.stillOut')}
                </button>
                <button
                  type="button"
                  disabled={!canVote}
                  onClick={() => onVote(cluster.latest.id, VOTE_RESTORED)}
                  className="min-h-9 flex-1 rounded-full bg-emerald-500 px-2 text-xs font-semibold text-white transition-all duration-300 disabled:opacity-40"
                >
                  {t('popup.back')}
                </button>
              </span>
            )}

            {deletableReport && (
              <button
                type="button"
                onClick={() => onDeleteReport(deletableReport.id)}
                className="mt-2 flex min-h-8 w-full items-center justify-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
              >
                <Trash2 size={12} strokeWidth={2.2} aria-hidden="true" />
                <span>{t('report.delete')}</span>
              </button>
            )}

            {!canVote && (
              <span className="mt-1 block text-[11px] opacity-70">
                {t('popup.signInToVote')}
              </span>
            )}
          </Popup>
        </Marker>
      </Fragment>
    )
  })
}

export default ReportLayers
