import { useCallback, useMemo, useState } from 'react'
import { MapContainer } from 'react-leaflet'
import { DEFAULT_ZOOM, NOUAKCHOTT_CENTER, REPORT_TYPES } from '../constants'
import { useAuth } from '../context/useAuth'
import { useGeolocation } from '../hooks/useGeolocation'
import { useAnnouncements, useOfficial } from '../hooks/useOfficial'
import { useReports } from '../hooks/useReports'
import { useT } from '../i18n/useI18n'
import {
  AlreadyVotedError,
  RateLimitError,
  createReport,
  voteOnReport,
} from '../services/reports'
import { reportStationGasStatus } from '../services/stations'
import { buildClusters } from '../utils/clustering'
import AdminPanel from './AdminPanel'
import AnnouncementBanner from './AnnouncementBanner'
import AnnouncementLayer from './AnnouncementLayer'
import AppMenu from './AppMenu'
import CommunityPanel from './CommunityPanel'
import ConnectionIndicator from './ConnectionIndicator'
import GasStationLayer from './GasStationLayer'
import InfoPanel from './InfoPanel'
import MapControls from './MapControls'
import MapTiles from './MapTiles'
import OfficialPanel from './OfficialPanel'
import ProfilePanel from './ProfilePanel'
import RecenterMap from './RecenterMap'
import ReportActionBar from './ReportActionBar'
import ReportLayers from './ReportLayers'
import { CloseIcon } from './icons'

const NOTICE_TONES = {
  error: 'border-red-500/40 bg-red-500/15 text-red-900 dark:text-red-100',
  success:
    'border-emerald-500/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100',
  info: 'border-white/40 bg-white/50 text-zinc-900 dark:border-white/10 dark:bg-black/40 dark:text-zinc-100',
}

function MapDashboard() {
  const { uid, status, canWrite, isAnonymous, emailLinkStatus } = useAuth()
  const { reports, error: reportsError } = useReports()
  const { announcements } = useAnnouncements()
  const { isAdmin } = useOfficial(uid)
  const { position, locate } = useGeolocation()
  const t = useT()

  const [map, setMap] = useState(null)
  const [pendingType, setPendingType] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [panel, setPanel] = useState(null)
  const [votedIds, setVotedIds] = useState(() => new Set())

  const clusters = useMemo(
    () => buildClusters(reports.filter((r) => r.type === 'power')),
    [reports],
  )
  const verifiedCount = clusters.filter((cluster) => cluster.verified).length

  // Service errors carry a translation key; anything else is a raw SDK message.
  const describe = useCallback(
    (error) => (error.key ? t(error.key, error.vars) : error.message),
    [t],
  )

  const requireSignIn = useCallback(() => {
    setNotice({
      tone: 'info',
      text: isAnonymous ? t('notice.signInToPost') : t('notice.verifyToPost'),
    })
    setPanel('profile')
  }, [isAnonymous, t])

  const submit = useCallback(
    async (type, { lat, lng }) => {
      setBusy(true)
      try {
        await createReport({ uid, type, lat, lng })
        map?.flyTo([lat, lng], Math.max(map.getZoom(), DEFAULT_ZOOM))
        setNotice({
          tone: 'success',
          text: t('notice.reported', { type: t(REPORT_TYPES[type].shortKey) }),
        })
      } catch (writeError) {
        setNotice({
          tone: 'error',
          text:
            writeError instanceof RateLimitError
              ? describe(writeError)
              : t('notice.saveFailed', { message: writeError.message }),
        })
      } finally {
        setPendingType(null)
        setBusy(false)
      }
    },
    [describe, map, t, uid],
  )

  // Always post directly at the user's current location without requiring a
  // manual tap on the map.
  const handleReport = useCallback(
    async (type = 'power') => {
      if (!canWrite) {
        requireSignIn()
        return
      }
      if (busy) return

      setPendingType(type)
      const coords = position ?? (await locate()) ?? {
        lat: NOUAKCHOTT_CENTER[0],
        lng: NOUAKCHOTT_CENTER[1],
      }
      await submit(type, coords)
    },
    [busy, canWrite, locate, position, requireSignIn, submit],
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
        setNotice({ tone: 'success', text: t('notice.voteThanks') })
      } catch (voteError) {
        if (voteError instanceof AlreadyVotedError) {
          setVotedIds((previous) => new Set(previous).add(reportId))
        }
        setNotice({ tone: 'error', text: describe(voteError) })
      }
    },
    [canWrite, describe, requireSignIn, t, uid],
  )

  const handleStationReport = useCallback(
    async (stationId, gasStatus) => {
      if (!canWrite) {
        requireSignIn()
        return
      }
      try {
        await reportStationGasStatus({ stationId, uid, status: gasStatus })
        setNotice({ tone: 'success', text: t('notice.voteThanks') })
      } catch (stationError) {
        setNotice({ tone: 'error', text: describe(stationError) })
      }
    },
    [canWrite, describe, requireSignIn, t, uid],
  )

  const handleRecenter = useCallback(async () => {
    const coords = (await locate()) ?? position
    if (coords) map?.flyTo([coords.lat, coords.lng], 15)
  }, [locate, map, position])

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={NOUAKCHOTT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          dragging={true}
          zoomControl={false}
          ref={setMap}
          className="h-full w-full"
        >
          <MapTiles />
          <GasStationLayer
            position={position}
            canVote={canWrite}
            onReportGas={handleStationReport}
          />
          <AnnouncementLayer announcements={announcements} />
          <ReportLayers
            clusters={clusters}
            onVote={handleVote}
            canVote={canWrite}
            votedIds={votedIds}
          />
          <RecenterMap position={position} />
        </MapContainer>
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 space-y-2 p-4">
        <div className="glass-pill relative z-30 pointer-events-auto flex items-center gap-3 py-2 ps-5 pe-2">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-mono text-sm font-semibold tracking-[0.22em] uppercase">
              {t('app.city')}
            </h1>
            <p className="tabular truncate text-[11px] text-zinc-600 dark:text-zinc-400">
              {t('app.counts', { verified: verifiedCount, total: clusters.length })}
            </p>
          </div>
          <ConnectionIndicator />
          <AppMenu
            onOpenCommunity={() => setPanel('community')}
            onOpenProfile={() => setPanel('profile')}
            onOpenLegend={() => setPanel('legend')}
            onOpenAbout={() => setPanel('about')}
            onOpenOfficial={() => setPanel('official')}
            onOpenAdmin={() => setPanel('admin')}
            onRecenter={handleRecenter}
            canRecenter={true}
            isAdmin={isAdmin}
          />
        </div>

        <AnnouncementBanner
          announcements={announcements}
          onFocus={(item) => map?.flyTo([item.lat, item.lng], DEFAULT_ZOOM)}
        />

        {emailLinkStatus === 'completing' && (
          <div className="glass pointer-events-auto px-4 py-3 text-sm font-medium">
            {t('notice.finishingSignIn')}
          </div>
        )}

        {(emailLinkStatus === 'needs-email' || emailLinkStatus === 'error') && (
          <button
            type="button"
            onClick={() => setPanel('profile')}
            className="glass pointer-events-auto w-full border-amber-400/50 bg-amber-400/20 px-4 py-3 text-start text-sm font-medium"
          >
            {t('notice.linkNeedsStep')}
          </button>
        )}

        {notice && (
          <div
            role="status"
            className={`glass pointer-events-auto flex items-center gap-3 px-4 py-3 text-sm font-medium ${NOTICE_TONES[notice.tone]}`}
          >
            <span className="flex-1">{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label={t('common.dismiss')}
              className="rounded-full bg-black/10 p-1.5 dark:bg-white/15"
            >
              <CloseIcon size={14} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        )}

        {reportsError && (
          <div className="glass pointer-events-auto border-red-500/40 bg-red-500/15 px-4 py-3 text-sm font-medium">
            {t('notice.liveUnavailable', { message: reportsError.message })}
          </div>
        )}
      </header>

      <MapControls map={map} onRecenter={handleRecenter} />

      <ReportActionBar
        onReport={handleReport}
        pendingType={pendingType}
        disabled={busy || status !== 'authenticated'}
        locked={!canWrite}
        lockedReason={
          isAnonymous ? t('bar.lockedGuest') : t('bar.lockedUnverified')
        }
      />

      {panel === 'profile' && <ProfilePanel onClose={() => setPanel(null)} />}
      {panel === 'official' && <OfficialPanel onClose={() => setPanel(null)} />}
      {panel === 'admin' && <AdminPanel onClose={() => setPanel(null)} />}
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
