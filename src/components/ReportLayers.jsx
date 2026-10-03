import L from 'leaflet'
import { Fragment, useMemo } from 'react'
import { Circle, Marker, Popup } from 'react-leaflet'
import {
  REPORT_TYPES,
  STATUS_COLORS,
  VERIFY_MIN_USERS,
  VERIFY_RADIUS_M,
} from '../constants'
import { VOTE_RESTORED, VOTE_STILL_OUT } from '../services/reports'

// Leaflet's default marker relies on bundled image assets, so we draw our own
// pin: fill shows validation status, the emoji shows which utility it is.
function buildIcon(icon, color, verified) {
  return L.divIcon({
    className: 'report-pin',
    html: `<span class="report-pin__dot" style="background:${color}">${icon}</span>`,
    iconSize: verified ? [34, 34] : [28, 28],
    iconAnchor: verified ? [17, 17] : [14, 14],
    popupAnchor: [0, -16],
  })
}

function formatTime(createdAt) {
  // serverTimestamp() is null locally until the write round-trips.
  if (!createdAt?.toDate) return 'Sending…'
  return createdAt.toDate().toLocaleString()
}

function ReportLayers({ clusters, onVote, canVote, votedIds }) {
  const icons = useMemo(() => {
    const entries = []
    for (const type of Object.values(REPORT_TYPES)) {
      for (const verified of [false, true]) {
        entries.push([
          `${type.id}:${verified}`,
          buildIcon(
            type.icon,
            verified ? STATUS_COLORS.verified : STATUS_COLORS.unverified,
            verified,
          ),
        ])
      }
    }
    return Object.fromEntries(entries)
  }, [])

  return clusters.map((cluster) => {
    const type = REPORT_TYPES[cluster.type]
    const color = cluster.verified
      ? STATUS_COLORS.verified
      : STATUS_COLORS.unverified
    const alreadyVoted = votedIds.has(cluster.latest.id)

    return (
      // A plain element would be injected into the map container's DOM, so the
      // pair has to be grouped with a keyed Fragment instead.
      <Fragment key={cluster.id}>
        <Circle
          center={[cluster.lat, cluster.lng]}
          radius={VERIFY_RADIUS_M}
          pathOptions={{
            color,
            weight: cluster.verified ? 2 : 1,
            fillColor: color,
            fillOpacity: cluster.verified ? 0.35 : 0.15,
          }}
        />
        <Marker
          position={[cluster.lat, cluster.lng]}
          icon={icons[`${cluster.type}:${cluster.verified}`]}
        >
          <Popup>
            <span className="block font-semibold">
              {type.icon} {type.shortLabel}
            </span>
            <span
              className="mt-1 block text-xs font-semibold"
              style={{ color }}
            >
              {cluster.verified
                ? 'Verified Community Outage'
                : `Unconfirmed · ${cluster.reporterCount}/${VERIFY_MIN_USERS} neighbours`}
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              Latest: {formatTime(cluster.latest.createdAt)}
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              {cluster.stillOutCount} still out · {cluster.restoredCount} back on
            </span>

            {alreadyVoted ? (
              <span className="mt-2 block text-xs font-medium text-slate-500">
                Thanks — your response was recorded.
              </span>
            ) : (
              <span className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!canVote}
                  onClick={() => onVote(cluster.latest.id, VOTE_STILL_OUT)}
                  className="min-h-9 flex-1 rounded-lg bg-red-500 px-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Still Out
                </button>
                <button
                  type="button"
                  disabled={!canVote}
                  onClick={() => onVote(cluster.latest.id, VOTE_RESTORED)}
                  className="min-h-9 flex-1 rounded-lg bg-emerald-600 px-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  It&apos;s Back
                </button>
              </span>
            )}
            {!canVote && (
              <span className="mt-1 block text-[11px] text-slate-500">
                Sign in with email or phone to respond.
              </span>
            )}
          </Popup>
        </Marker>
      </Fragment>
    )
  })
}

export default ReportLayers
