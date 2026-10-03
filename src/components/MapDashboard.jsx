import { useCallback, useMemo, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import { DEFAULT_ZOOM, NOUAKCHOTT_CENTER, REPORT_TYPES } from '../constants'
import { useAuth } from '../context/useAuth'
import { useGeolocation } from '../hooks/useGeolocation'
import { useReports } from '../hooks/useReports'
import {
  AlreadyVotedError,
  RateLimitError,
  createReport,
  voteOnReport,
} from '../services/reports'
import { buildClusters } from '../utils/clustering'
import AppMenu from './AppMenu'
import CommunityPanel from './CommunityPanel'
import ConnectionIndicator from './ConnectionIndicator'
import InfoPanel from './InfoPanel'
import MapClickPicker from './MapClickPicker'
import ProfilePanel from './ProfilePanel'
import RecenterMap from './RecenterMap'
import ReportActionBar from './ReportActionBar'
import ReportLayers from './ReportLayers'

function MapDashboard() {
  const { uid, status, canWrite, isAnonymous, emailLinkStatus } = useAuth()
  const { reports, error: reportsError } = useReports()
  const { position, status: locationStatus, locate } = useGeolocation()

  const [map, setMap] = useState(null)
  const [pendingType, setPendingType] = useState(null)
  const [awaitingMapClick, setAwaitingMapClick] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [panel, setPanel] = useState(null)
  const [votedIds, setVotedIds] = useState(() => new Set())

  const clusters = useMemo(() => buildClusters(reports), [reports])

  const requireSignIn = useCallback(() => {
    setNotice({
      tone: 'info',
      text: isAnonymous
        ? 'Sign in with your email or phone number to post.'
        : 'Verify your email address to post.',
    })
    setPanel('profile')
  }, [isAnonymous])

  const submit = useCallback(
    async (type, { lat, lng }) => {
      setBusy(true)
      try {
        await createReport({ uid, type, lat, lng })
        setNotice({
          tone: 'success',
          text: `${REPORT_TYPES[type].shortLabel} reported. Thank you.`,
        })
      } catch (writeError) {
        // Rate-limit messages are already user-facing; other errors are not.
        setNotice({
          tone: 'error',
          text:
            writeError instanceof RateLimitError
              ? writeError.message
              : `Could not save the report: ${writeError.message}`,
        })
      } finally {
        setPendingType(null)
        setAwaitingMapClick(false)
        setBusy(false)
      }
    },
    [uid],
  )

  const handleReport = useCallback(
    async (type) => {
      if (!canWrite) {
        requireSignIn()
        return
      }

      setPendingType(type)
      setAwaitingMapClick(false)

      // Location was requested on load, so usually we already have it.
      const coords = position ?? (await locate())
      if (coords) {
        await submit(type, coords)
        return
      }

      setAwaitingMapClick(true)
      setNotice({
        tone: 'info',
        text: `Location unavailable. Tap the map to place your ${REPORT_TYPES[
          type
        ].shortLabel.toLowerCase()} pin.`,
      })
    },
    [canWrite, locate, position, requireSignIn, submit],
  )

  const handleMapPick = useCallback(
    ({ lat, lng }) => {
      if (!pendingType || busy) return
      submit(pendingType, { lat, lng })
    },
    [busy, pendingType, submit],
  )

  const handleVote = useCallback(
    async (reportId, value) => {
      if (!canWrite) {
        requireSignIn()
        return
      }
      try {
        await voteOnReport({ reportId, uid, value })
        setVotedIds((previous) => new Set(previous).add(reportId))
        setNotice({ tone: 'success', text: 'Thanks for confirming.' })
      } catch (voteError) {
        if (voteError instanceof AlreadyVotedError) {
          setVotedIds((previous) => new Set(previous).add(reportId))
        }
        setNotice({ tone: 'error', text: voteError.message })
      }
    },
    [canWrite, requireSignIn, uid],
  )

  const handleRecenter = useCallback(async () => {
    const coords = position ?? (await locate())
    if (coords) map?.flyTo([coords.lat, coords.lng], DEFAULT_ZOOM)
  }, [locate, map, position])

  const cancel = () => {
    setPendingType(null)
    setAwaitingMapClick(false)
    setNotice(null)
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <MapContainer
        center={NOUAKCHOTT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={false}
        zoomControl={false}
        ref={setMap}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ReportLayers
          clusters={clusters}
          onVote={handleVote}
          canVote={canWrite}
          votedIds={votedIds}
        />
        <RecenterMap position={position} />
        {awaitingMapClick && <MapClickPicker onPick={handleMapPick} />}
      </MapContainer>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] space-y-2 p-4">
        <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900">Emernok</h1>
            <p className="truncate text-sm text-slate-600">
              {clusters.filter((cluster) => cluster.verified).length} verified ·{' '}
              {clusters.length} active
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ConnectionIndicator />
            <AppMenu
              onOpenCommunity={() => setPanel('community')}
              onOpenProfile={() => setPanel('profile')}
              onOpenLegend={() => setPanel('legend')}
              onOpenAbout={() => setPanel('about')}
              onRecenter={handleRecenter}
              canRecenter={locationStatus !== 'denied'}
            />
          </div>
        </div>

        {emailLinkStatus === 'completing' && (
          <div className="pointer-events-auto rounded-xl bg-slate-900/90 px-4 py-3 text-sm font-medium text-white shadow-lg">
            Finishing your sign-in…
          </div>
        )}

        {(emailLinkStatus === 'needs-email' || emailLinkStatus === 'error') && (
          <button
            type="button"
            onClick={() => setPanel('profile')}
            className="pointer-events-auto w-full rounded-xl bg-amber-500 px-4 py-3 text-left text-sm font-medium text-amber-950 shadow-lg"
          >
            Your sign-in link needs one more step. Tap to finish.
          </button>
        )}

        {notice && (
          <div
            role="status"
            className={`pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              notice.tone === 'error'
                ? 'bg-red-600 text-white'
                : notice.tone === 'success'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900/90 text-white'
            }`}
          >
            <span className="flex-1">{notice.text}</span>
            {awaitingMapClick ? (
              <button
                type="button"
                onClick={cancel}
                className="rounded-lg bg-white/20 px-3 py-1 font-semibold"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label="Dismiss"
                className="rounded-lg bg-white/20 px-2 py-1"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {locationStatus === 'denied' && (
          <div className="pointer-events-auto rounded-xl bg-slate-900/90 px-4 py-3 text-sm font-medium text-white shadow-lg">
            Location is off, so the community feed is unavailable. Reports can
            still be placed by tapping the map.
          </div>
        )}

        {reportsError && (
          <div className="pointer-events-auto rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
            Live updates unavailable: {reportsError.message}
          </div>
        )}
      </header>

      <ReportActionBar
        onReport={handleReport}
        pendingType={pendingType}
        disabled={busy || status !== 'authenticated'}
        locked={!canWrite}
        lockedReason={
          isAnonymous
            ? 'Sign in with email or phone to report an outage'
            : 'Verify your email address to report an outage'
        }
      />

      {panel === 'profile' && <ProfilePanel onClose={() => setPanel(null)} />}
      {panel === 'community' && (
        <CommunityPanel
          position={position}
          onClose={() => setPanel(null)}
          onRequestSignIn={() => setPanel('profile')}
        />
      )}
      {(panel === 'legend' || panel === 'about') && (
        <InfoPanel view={panel} onClose={() => setPanel(null)} />
      )}
    </div>
  )
}

export default MapDashboard
