import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer } from 'react-leaflet'
import {
  DEFAULT_ZOOM,
  GAS_STATIONS,
  NOUAKCHOTT_CENTER,
  REPORT_TYPES,
} from '../constants'
import { useAuth } from '../context/useAuth'
import { useGeolocation } from '../hooks/useGeolocation'
import { useAnnouncements, useOfficial } from '../hooks/useOfficial'
import { useReports } from '../hooks/useReports'
import { useT } from '../i18n/useI18n'
import {
  AlreadyVotedError,
  RateLimitError,
  createReport,
  deleteReport,
  purgeExpiredUnverifiedReports,
  voteOnReport,
} from '../services/reports'
import {
  reportStationGasStatus,
  subscribeToStationStatuses,
} from '../services/stations'
import { buildClustersWithExpiry } from '../utils/clustering'
import { computeRegionStats } from '../utils/regionStats'
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
import RegionZonesLayer from './RegionZonesLayer'
import ReportActionBar from './ReportActionBar'
import ReportLayers from './ReportLayers'
import WalkthroughModal from './WalkthroughModal'
import { CloseIcon } from './icons'

const NOTICE_TONES = {
  error: 'border-red-500/40 bg-red-500/15 text-red-900 dark:text-red-100',
  success:
    'border-emerald-500/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100',
  info: 'border-white/40 bg-white/50 text-zinc-900 dark:border-white/10 dark:bg-black/40 dark:text-zinc-100',
}

// Top fuel stations based on review ratings (sorted highest rated first)
const TOP_FUEL_STATIONS = [...GAS_STATIONS]
  .filter((station) => (station.rating ?? 0) >= 4.5)
  .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)

function MapDashboard() {
  const { uid, status, canWrite, isAnonymous, emailLinkStatus } = useAuth()
  const { reports, error: reportsError } = useReports()
  const { announcements } = useAnnouncements()
  const { isAdmin } = useOfficial(uid)
  const { position, locate } = useGeolocation()
  const t = useT()

  const [map, setMap] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [panel, setPanel] = useState(null)
  const [votedIds, setVotedIds] = useState(() => new Set())

  // Nouakchott Regions and Top Fuel Stations are ON by default;
  // Verification Filter lives inside Settings only.
  const [showRegions, setShowRegions] = useState(true)
  const [showStations, setShowStations] = useState(true)
  const [verificationFilter, setVerificationFilter] = useState('all')

  const [stationStatuses, setStationStatuses] = useState({})

  useEffect(() => {
    return subscribeToStationStatuses((next) => setStationStatuses(next))
  }, [])

  // Cluster power reports and automatically collect any unverified reports that
  // have been up for longer than 24 hours so they delete automatically.
  const { clusters: allPowerClusters, expiredUnverifiedReports } = useMemo(
    () => buildClustersWithExpiry(reports.filter((r) => r.type === 'power')),
    [reports],
  )

  useEffect(() => {
    if (status !== 'authenticated' || expiredUnverifiedReports.length === 0) {
      return
    }
    purgeExpiredUnverifiedReports(expiredUnverifiedReports)
  }, [expiredUnverifiedReports, status])

  const filteredClusters = useMemo(() => {
    if (verificationFilter === 'verified') {
      return allPowerClusters.filter((cluster) => cluster.verified)
    }
    if (verificationFilter === 'unverified') {
      return allPowerClusters.filter((cluster) => !cluster.verified)
    }
    return allPowerClusters
  }, [allPowerClusters, verificationFilter])

  const verifiedCount = allPowerClusters.filter(
    (cluster) => cluster.verified,
  ).length

  const regionStats = useMemo(
    () =>
      computeRegionStats(allPowerClusters, TOP_FUEL_STATIONS, stationStatuses),
    [allPowerClusters, stationStatuses],
  )

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

  const handleCaptureLocation = useCallback(async () => {
    if (!canWrite) {
      requireSignIn()
      return null
    }
    const coords = (await locate()) ??
      position ?? {
        lat: NOUAKCHOTT_CENTER[0],
        lng: NOUAKCHOTT_CENTER[1],
      }
    map?.flyTo([coords.lat, coords.lng], Math.max(map.getZoom(), DEFAULT_ZOOM))
    return coords
  }, [canWrite, locate, map, position, requireSignIn])

  const handleSubmitReport = useCallback(
    async ({ type = 'power', coords, details }) => {
      if (!canWrite) {
        requireSignIn()
        return
      }
      setBusy(true)
      try {
        await createReport({
          uid,
          type,
          lat: coords.lat,
          lng: coords.lng,
          details,
        })
        map?.flyTo(
          [coords.lat, coords.lng],
          Math.max(map.getZoom(), DEFAULT_ZOOM),
        )
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
        setBusy(false)
      }
    },
    [canWrite, describe, map, requireSignIn, t, uid],
  )

  const handleDeleteReport = useCallback(
    async (reportId) => {
      try {
        await deleteReport(reportId)
        setNotice({ tone: 'info', text: t('notice.reportDeleted') })
      } catch (deleteError) {
        setNotice({ tone: 'error', text: describe(deleteError) })
      }
    },
    [describe, t],
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
          <RegionZonesLayer visible={showRegions} regions={regionStats} />
          <GasStationLayer
            visible={showStations}
            stations={TOP_FUEL_STATIONS}
            stationStatuses={stationStatuses}
            position={position}
            canVote={canWrite}
            onReportGas={handleStationReport}
          />
          <AnnouncementLayer announcements={announcements} />
          <ReportLayers
            clusters={filteredClusters}
            onVote={handleVote}
            onDeleteReport={handleDeleteReport}
            canVote={canWrite}
            uid={uid}
            isAdmin={isAdmin}
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
              {t('app.counts', {
                verified: verifiedCount,
                total: allPowerClusters.length,
              })}
            </p>
          </div>
          <ConnectionIndicator />
          <AppMenu
            onOpenWalkthrough={() => setPanel('walkthrough')}
            onOpenCommunity={() => setPanel('community')}
            onOpenProfile={() => setPanel('profile')}
            onOpenLegend={() => setPanel('legend')}
            onOpenAbout={() => setPanel('about')}
            onOpenOfficial={() => setPanel('official')}
            onOpenAdmin={() => setPanel('admin')}
            isAdmin={isAdmin}
            showStations={showStations}
            onToggleStations={() => setShowStations((prev) => !prev)}
            showRegions={showRegions}
            onToggleRegions={() => setShowRegions((prev) => !prev)}
            verificationFilter={verificationFilter}
            onChangeVerificationFilter={setVerificationFilter}
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
        onCaptureLocation={handleCaptureLocation}
        onSubmitReport={handleSubmitReport}
        disabled={busy || status !== 'authenticated'}
      />

      {panel === 'walkthrough' && (
        <WalkthroughModal
          onClose={() => setPanel(null)}
          onOpenProfile={() => setPanel('profile')}
          onOpenCommunity={() => setPanel('community')}
        />
      )}
      {panel === 'profile' && (
        <ProfilePanel
          clusters={allPowerClusters}
          onFocusReport={(report) => {
            map?.flyTo([report.lat, report.lng], 15)
            setPanel(null)
          }}
          onClose={() => setPanel(null)}
        />
      )}
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
