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
import CommunityPanel from './CommunityPanel'
import ConnectionIndicator from './ConnectionIndicator'
import InstallButton from './InstallButton'
import MapClickPicker from './MapClickPicker'
import ProfilePanel from './ProfilePanel'
import RecenterMap from './RecenterMap'
import ReportActionBar from './ReportActionBar'
import ReportLayers from './ReportLayers'

function MapDashboard() {
  const { uid, status, isAnonymous } = useAuth()
  const { reports, error: reportsError } = useReports()
  const { position, status: locationStatus, locate } = useGeolocation()

  const [pendingType, setPendingType] = useState(null)
  const [awaitingMapClick, setAwaitingMapClick] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showCommunity, setShowCommunity] = useState(false)
  const [votedIds, setVotedIds] = useState(() => new Set())

  const clusters = useMemo(() => buildClusters(reports), [reports])
  const signedInByPhone = status === 'authenticated' && !isAnonymous

  const requireSignIn = useCallback(() => {
    setNotice({
      tone: 'info',
      text: 'Sign in with your phone number to post reports.',
    })
    setShowProfile(true)
  }, [])

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
      if (!signedInByPhone) {
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
    [locate, position, requireSignIn, signedInByPhone, submit],
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
      if (!signedInByPhone) {
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
    [requireSignIn, signedInByPhone, uid],
  )

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
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ReportLayers
          clusters={clusters}
          onVote={handleVote}
          canVote={signedInByPhone}
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
            <InstallButton />
            <button
              type="button"
              onClick={() => setShowCommunity(true)}
              aria-label="Community feed"
              className="min-h-11 min-w-11 rounded-lg bg-slate-100 text-lg active:bg-slate-200"
            >
              💬
            </button>
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              aria-label="Your profile"
              className="min-h-11 min-w-11 rounded-lg bg-slate-100 text-lg active:bg-slate-200"
            >
              👤
            </button>
          </div>
        </div>

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
        locked={!signedInByPhone}
      />

      {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
      {showCommunity && (
        <CommunityPanel
          position={position}
          onClose={() => setShowCommunity(false)}
          onRequestSignIn={() => {
            setShowCommunity(false)
            setShowProfile(true)
          }}
        />
      )}
    </div>
  )
}

export default MapDashboard
