import { CheckCircle2, Timer } from 'lucide-react'
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
import { useSurveys } from '../hooks/useSurveys'
import { useI18n } from '../i18n/useI18n'
import {
  AlreadyVotedError,
  RateLimitError,
  confirmReportStillOut,
  createReport,
  deleteReport,
  findUserActiveOutageReport,
  formatDurationHMS,
  formatTimerDigital,
  getReportStartTimeMs,
  isWithinHours,
  purgeExpiredUnverifiedReports,
  readLocalActiveReport,
  resolveUserReport,
  voteOnReport,
} from '../services/reports'
import {
  reportStationGasStatus,
  subscribeToStationStatuses,
} from '../services/stations'
import {
  getOrCreateGuestId,
  recordSurveyDismissal,
  submitQuickWorkingSurvey,
} from '../services/surveys'
import { buildClustersWithExpiry } from '../utils/clustering'
import {
  computeRegionStats,
  findRegionForPoint,
  findSubNeighbourhoodForPoint,
} from '../utils/regionStats'
import AdminPanel from './AdminPanel'
import AnnouncementBanner from './AnnouncementBanner'
import AnnouncementLayer from './AnnouncementLayer'
import AppMenu from './AppMenu'
import CommunityPanel from './CommunityPanel'
import ConnectionIndicator from './ConnectionIndicator'
import GasStationLayer from './GasStationLayer'
import InfoPanel from './InfoPanel'
import { InstallGuideModal } from './InstallButton'
import LocationGate from './LocationGate'
import MapClickPicker from './MapClickPicker'
import MapControls from './MapControls'
import MapTiles from './MapTiles'
import OfficialPanel from './OfficialPanel'
import ProfilePanel from './ProfilePanel'
import RecenterMap from './RecenterMap'
import RegionZonesLayer from './RegionZonesLayer'
import ReportActionBar from './ReportActionBar'
import ReportLayers from './ReportLayers'
import SurveyReminderPrompt from './SurveyReminderPrompt'
import UptimeSurveyModal from './UptimeSurveyModal'
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
  const { uid, status, isAnonymous, emailLinkStatus } = useAuth()
  const { reports, error: reportsError } = useReports()
  const { surveys } = useSurveys()
  const { announcements } = useAnnouncements()
  const { isAdmin } = useOfficial(uid)
  const {
    position,
    hasHardwareFix,
    status: geoStatus,
    permission: geoPermission,
    locate,
    setManualPosition,
  } = useGeolocation()
  const { t, dir } = useI18n()

  const [map, setMap] = useState(null)
  const [_mapCenter, setMapCenter] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  /**
   * Centralized Single-Overlay UI State Manager:
   * Only ONE overlay, drawer, modal, or bottom sheet can be open at any time.
   * Values:
   * 'walkthrough' | 'community' | 'profile' | 'legend' | 'about' |
   * 'official' | 'admin' | 'install' | 'composer' | 'survey' | null
   */
  const [activeOverlay, setActiveOverlay] = useState(null)
  const [pickingLocationOnMap, setPickingLocationOnMap] = useState(false)
  const [locationGateDismissed, setLocationGateDismissed] = useState(false)
  const [followUpDismissedForId, setFollowUpDismissedForId] = useState(null)

  const [votedIds, setVotedIds] = useState(() => new Set())

  const [showRegions, setShowRegions] = useState(true)
  const [showStations, setShowStations] = useState(true)
  const [verificationFilter, setVerificationFilter] = useState('all')

  const [stationStatuses, setStationStatuses] = useState({})

  useEffect(() => {
    return subscribeToStationStatuses((next) => setStationStatuses(next))
  }, [])

  // Single-Overlay Rule: Opening any overlay closes map popups; opening a map popup closes overlays
  const openOverlay = useCallback(
    (next) => {
      if (next) {
        map?.closePopup()
      }
      setActiveOverlay(next)
    },
    [map],
  )

  // Automatically prompt user when an email sign-in link is opened
  useEffect(() => {
    if (emailLinkStatus === 'needs-email') {
      // oxlint-disable-next-line react/set-state-in-effect
      openOverlay('profile')
      setNotice({ tone: 'info', text: t('notice.emailLinkPrompt') })
    } else if (emailLinkStatus === 'completing') {
      setNotice({ tone: 'info', text: t('notice.finishingSignIn') })
    }
  }, [emailLinkStatus, openOverlay, t])

  // Ensure Leaflet recalculates its canvas height & debounce moveend for low-bandwidth smoothness
  useEffect(() => {
    if (!map) return undefined
    const refreshSize = () => map.invalidateSize({ animate: false })
    refreshSize()
    const timer = window.setTimeout(refreshSize, 150)

    let moveDebounce = null
    const handleMoveEnd = () => {
      window.clearTimeout(moveDebounce)
      moveDebounce = window.setTimeout(() => {
        const center = map.getCenter()
        setMapCenter({ lat: center.lat, lng: center.lng })
      }, 220)
    }

    const handlePopupOpen = () => {
      setActiveOverlay(null)
    }

    map.on('moveend', handleMoveEnd)
    map.on('popupopen', handlePopupOpen)
    window.addEventListener('resize', refreshSize)
    window.addEventListener('orientationchange', refreshSize)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(moveDebounce)
      map.off('moveend', handleMoveEnd)
      map.off('popupopen', handlePopupOpen)
      window.removeEventListener('resize', refreshSize)
      window.removeEventListener('orientationchange', refreshSize)
    }
  }, [map])

  // Cluster power reports into 3 tiers ('reported', 'verified', 'working')
  const { clusters: allPowerClusters, expiredUnverifiedReports } = useMemo(
    () => buildClustersWithExpiry(reports.filter((r) => r.type === 'power')),
    [reports],
  )

  useEffect(() => {
    if (
      !uid ||
      status !== 'authenticated' ||
      expiredUnverifiedReports.length === 0
    ) {
      return
    }
    purgeExpiredUnverifiedReports(expiredUnverifiedReports)
  }, [expiredUnverifiedReports, status, uid])

  const filteredClusters = useMemo(() => {
    if (verificationFilter === 'verified') {
      return allPowerClusters.filter((cluster) => cluster.verified)
    }
    if (verificationFilter === 'unverified') {
      return allPowerClusters.filter((cluster) => !cluster.verified)
    }
    return allPowerClusters
  }, [allPowerClusters, verificationFilter])

  const activeOutageClusters = useMemo(
    () => allPowerClusters.filter((cluster) => cluster.tier !== 'working'),
    [allPowerClusters],
  )

  // Live count of ongoing power outage reports
  const activePowerReports = useMemo(
    () =>
      reports.filter(
        (r) =>
          r.type === 'power' &&
          r.status === 'outage' &&
          r.reportMode !== 'past' &&
          isWithinHours(r),
      ),
    [reports],
  )

  const verifiedPowerOutagesCount = useMemo(
    () => activeOutageClusters.filter((cluster) => cluster.verified).length,
    [activeOutageClusters],
  )

  const regionStats = useMemo(
    () =>
      computeRegionStats(
        allPowerClusters,
        reports,
        announcements,
        TOP_FUEL_STATIONS,
        stationStatuses,
        surveys,
      ),
    [allPowerClusters, announcements, reports, stationStatuses, surveys],
  )

  const effectiveUserKey = useMemo(() => {
    return uid || getOrCreateGuestId()
  }, [uid])

  const isGuestUser = !uid || isAnonymous
  const canAct = status === 'authenticated'

  // Track user's most recent active (unresolved) live outage report
  const activeUserReport = useMemo(() => {
    const liveMatch = findUserActiveOutageReport(reports, effectiveUserKey)
    if (liveMatch) return liveMatch
    return readLocalActiveReport(effectiveUserKey)
  }, [effectiveUserKey, reports])

  // Real-time ticking stopwatch for user's active outage
  const [activeOutageSeconds, setActiveOutageSeconds] = useState(() => {
    if (!activeUserReport) return 0
    const startMs = getReportStartTimeMs(activeUserReport)
    return Math.max(0, Math.floor((Date.now() - startMs) / 1000))
  })

  useEffect(() => {
    if (!activeUserReport) return
    const interval = setInterval(() => {
      const startMs = getReportStartTimeMs(activeUserReport)
      setActiveOutageSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeUserReport])

  const handleCloseSurveyModal = useCallback(() => {
    recordSurveyDismissal(effectiveUserKey)
    setActiveOverlay((prev) => (prev === 'survey' ? null : prev))
  }, [effectiveUserKey])

  const handleSurveySubmitted = useCallback(() => {
    setActiveOverlay((prev) => (prev === 'survey' ? null : prev))
    setNotice({
      tone: 'success',
      text: t('survey.thankYou'),
    })
  }, [t])

  const showSurveyReminder = useMemo(() => {
    // Hidden only when full overlay sheets or modals (other than composer) are displayed
    return activeOverlay === null || activeOverlay === 'composer'
  }, [activeOverlay])

  const describe = useCallback(
    (error) => (error?.key ? t(error.key, error.vars) : error?.message || ''),
    [t],
  )

  const handleCaptureLocation = useCallback(async () => {
    const coords = (await locate()) ??
      position ?? {
        lat: NOUAKCHOTT_CENTER[0],
        lng: NOUAKCHOTT_CENTER[1],
      }
    map?.flyTo([coords.lat, coords.lng], Math.max(map.getZoom(), DEFAULT_ZOOM))
    return coords
  }, [locate, map, position])

  const handleSubmitReport = useCallback(
    async ({
      type = 'power',
      status: reportStatus = 'outage',
      coords,
      details,
      reportMode = 'current',
      outageStartedAt = '',
      durationHours = 0,
      cause = 'unplanned',
    }) => {
      if (!canAct) return
      setBusy(true)
      try {
        await createReport({
          uid: effectiveUserKey,
          type,
          status: reportStatus,
          lat: coords.lat,
          lng: coords.lng,
          details,
          reportMode,
          outageStartedAt,
          durationHours,
          cause,
        })
        map?.flyTo(
          [coords.lat, coords.lng],
          Math.max(map.getZoom(), DEFAULT_ZOOM),
        )
        setNotice({
          tone: 'success',
          text:
            reportStatus === 'working'
              ? t('notice.workingReported')
              : t('notice.reported', {
                  type: t(REPORT_TYPES[type].shortKey),
                }),
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
    [canAct, describe, effectiveUserKey, map, t],
  )

  // 1-Tap "Power is Working ⚡✅" quick survey handler (saves to uptimeSurveys, NOT reports)
  const handleQuickReportWorking = useCallback(async () => {
    setBusy(true)
    try {
      const coords = (await locate()) ??
        position ?? {
          lat: NOUAKCHOTT_CENTER[0],
          lng: NOUAKCHOTT_CENTER[1],
        }

      if (activeUserReport?.id) {
        await resolveUserReport({
          reportId: activeUserReport.id,
          uid: effectiveUserKey,
        })
        setNotice({
          tone: 'success',
          text: t('report.powerRestoredNotice'),
        })
      } else {
        const region = findRegionForPoint(coords.lat, coords.lng)
        const sub = findSubNeighbourhoodForPoint(coords.lat, coords.lng)
        await submitQuickWorkingSurvey({
          uid: effectiveUserKey,
          lat: coords.lat,
          lng: coords.lng,
          regionId: region?.id || '',
          subNeighbourhoodId: sub?.id || '',
          isGuest: isGuestUser,
        })
        setNotice({
          tone: 'success',
          text: t('notice.workingSurveyRecorded'),
        })
      }

      map?.flyTo(
        [coords.lat, coords.lng],
        Math.max(map.getZoom(), DEFAULT_ZOOM),
      )
      setEmptyBannerDismissed(true)
    } catch (err) {
      setNotice({
        tone: 'error',
        text: err?.message || t('notice.saveFailed', { message: 'Could not record survey.' }),
      })
    } finally {
      setBusy(false)
    }
  }, [
    activeUserReport,
    effectiveUserKey,
    isGuestUser,
    locate,
    map,
    position,
    t,
  ])

  const handleConfirmActiveReportStillOut = useCallback(
    async (reportId) => {
      if (!reportId) return
      try {
        await confirmReportStillOut({ reportId, uid: effectiveUserKey })
        setFollowUpDismissedForId(reportId)
        setNotice({ tone: 'success', text: t('followup.updatedNotice') })
      } catch (err) {
        setNotice({ tone: 'error', text: describe(err) })
      }
    },
    [describe, effectiveUserKey, t],
  )

  const handleResolveActiveReport = useCallback(
    async (reportId) => {
      if (!reportId) return
      try {
        await resolveUserReport({ reportId, uid: effectiveUserKey })
        setFollowUpDismissedForId(reportId)
        setNotice({ tone: 'success', text: t('followup.resolvedNotice') })
      } catch (err) {
        setNotice({ tone: 'error', text: describe(err) })
      }
    },
    [describe, effectiveUserKey, t],
  )

  const handleDeleteReport = useCallback(
    async (reportId) => {
      try {
        await deleteReport(reportId, effectiveUserKey)
        setNotice({ tone: 'info', text: t('notice.reportDeleted') })
      } catch (deleteError) {
        setNotice({ tone: 'error', text: describe(deleteError) })
      }
    },
    [describe, effectiveUserKey, t],
  )

  const handleVote = useCallback(
    async (reportId, value) => {
      if (!canAct) return
      try {
        await voteOnReport({ reportId, uid: effectiveUserKey, value })
        setVotedIds((previous) => new Set(previous).add(reportId))
        setNotice({ tone: 'success', text: t('notice.voteThanks') })
      } catch (voteError) {
        if (voteError instanceof AlreadyVotedError) {
          setVotedIds((previous) => new Set(previous).add(reportId))
        }
        setNotice({ tone: 'error', text: describe(voteError) })
      }
    },
    [canAct, describe, effectiveUserKey, t],
  )

  const handleStationReport = useCallback(
    async (stationId, gasStatus) => {
      if (!canAct) return
      try {
        await reportStationGasStatus({
          stationId,
          uid: effectiveUserKey,
          status: gasStatus,
        })
        setNotice({ tone: 'success', text: t('notice.voteThanks') })
      } catch (stationError) {
        setNotice({ tone: 'error', text: describe(stationError) })
      }
    },
    [canAct, describe, effectiveUserKey, t],
  )

  const handleRecenter = useCallback(async () => {
    const coords = (await locate()) ?? position
    if (coords) map?.flyTo([coords.lat, coords.lng], 15)
  }, [locate, map, position])

  const handleSelectNeighborhood = useCallback(
    ({ lat, lng }) => {
      setManualPosition({ lat, lng })
      setLocationGateDismissed(true)
      setPickingLocationOnMap(false)
      map?.flyTo([lat, lng], 14)
    },
    [map, setManualPosition],
  )

  const handleMapClickPick = useCallback(
    (latlng) => {
      if (!latlng) return
      setManualPosition({ lat: latlng.lat, lng: latlng.lng })
      setPickingLocationOnMap(false)
      setLocationGateDismissed(true)
      map?.flyTo([latlng.lat, latlng.lng], 15)
    },
    [map, setManualPosition],
  )

  // Determine which single floating contextual card (if any) appears under the Top Pill
  const showFollowUpBanner =
    activeOverlay === null &&
    Boolean(activeUserReport?.id) &&
    followUpDismissedForId !== activeUserReport.id

  const showLocationGateBanner =
    activeOverlay === null &&
    !showFollowUpBanner &&
    !hasHardwareFix &&
    geoStatus !== 'ready' &&
    !locationGateDismissed

  return (
    <div className="app-viewport">
      <div className="absolute inset-0 z-0 h-full w-full">
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
          {pickingLocationOnMap && (
            <MapClickPicker onPick={handleMapClickPick} />
          )}
          <RegionZonesLayer visible={showRegions} regions={regionStats} />
          <GasStationLayer
            visible={showStations}
            stations={TOP_FUEL_STATIONS}
            stationStatuses={stationStatuses}
            position={position}
            canVote={canAct}
            onReportGas={handleStationReport}
          />
          <AnnouncementLayer announcements={announcements} />
          <ReportLayers
            clusters={filteredClusters}
            onVote={handleVote}
            onDeleteReport={handleDeleteReport}
            canVote={canAct}
            uid={effectiveUserKey}
            isAdmin={isAdmin}
            votedIds={votedIds}
          />
          <RecenterMap position={position} />
        </MapContainer>
      </div>

      {/* Top Viewport Hierarchy: Compact Floating Glass Pill + Single Contextual Banner */}
      <header
        dir={dir}
        className="pointer-events-none absolute inset-x-0 top-0 z-30 space-y-2 px-[max(0.75rem,env(safe-area-inset-left,0px))] pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.4rem))] pb-2"
      >
        <div className="glass-pill relative z-30 pointer-events-auto mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-2.5 shadow-xl">
          {/* Brand & live report counters matching screenshot */}
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm sm:text-base tracking-[0.25em] font-sans text-zinc-900 dark:text-white">
              N . E . M .
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {verifiedPowerOutagesCount} verified · {activePowerReports.length} active
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ConnectionIndicator />

            <AppMenu
              onOpenWalkthrough={() => openOverlay('walkthrough')}
              onOpenCommunity={() => openOverlay('community')}
              onOpenProfile={() => openOverlay('profile')}
              onOpenLegend={() => openOverlay('legend')}
              onOpenAbout={() => openOverlay('about')}
              onOpenOfficial={() => openOverlay('official')}
              onOpenAdmin={() => openOverlay('admin')}
              onOpenInstallGuide={() => openOverlay('install')}
              isAdmin={isAdmin}
              showStations={showStations}
              onToggleStations={() => setShowStations((prev) => !prev)}
              showRegions={showRegions}
              onToggleRegions={() => setShowRegions((prev) => !prev)}
              verificationFilter={verificationFilter}
              onChangeVerificationFilter={setVerificationFilter}
            />
          </div>
        </div>

        {/* Map-Tap Mode Hint Banner */}
        {pickingLocationOnMap && (
          <div className="glass pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-2 border-amber-400/50 bg-amber-400/20 px-4 py-2.5 text-xs font-semibold">
            <span>{t('location.tapMapHint')}</span>
            <button
              type="button"
              onClick={() => setPickingLocationOnMap(false)}
              className="rounded-full bg-black/10 p-1 dark:bg-white/15"
            >
              <CloseIcon size={13} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Single-Banner Priority Queue (prevents stacked banner clutter on mobile) */}
        {emailLinkStatus === 'completing' ? (
          <div className="glass pointer-events-auto mx-auto max-w-md px-4 py-3 text-sm font-medium">
            {t('notice.finishingSignIn')}
          </div>
        ) : emailLinkStatus === 'needs-email' || emailLinkStatus === 'error' ? (
          <button
            type="button"
            onClick={() => openOverlay('profile')}
            className="glass pointer-events-auto mx-auto block w-full max-w-md border-amber-400/50 bg-amber-400/20 px-4 py-3 text-start text-sm font-medium"
          >
            {t('notice.linkNeedsStep')}
          </button>
        ) : notice ? (
          <div
            role="status"
            className={`glass pointer-events-auto mx-auto flex max-w-md items-center gap-3 px-4 py-3 text-sm font-medium ${NOTICE_TONES[notice.tone]}`}
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
        ) : reportsError ? (
          <div className="glass pointer-events-auto mx-auto max-w-md border-red-500/40 bg-red-500/15 px-4 py-3 text-sm font-medium">
            {t('notice.liveUnavailable', { message: reportsError.message })}
          </div>
        ) : showFollowUpBanner && activeUserReport ? (
          /* Active-Report Live Stopwatch & Restoration Confirmation */
          <div className="glass pointer-events-auto mx-auto max-w-md px-4 py-3 shadow-2xl border border-amber-500/30">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex size-2 rounded-full bg-red-500 animate-ping" />
                  <span className="tabular inline-flex items-center gap-1 font-mono text-[10px] font-bold text-amber-600 uppercase dark:text-amber-400">
                    <Timer size={12} aria-hidden="true" />
                    {t('report.timingActive')}
                  </span>
                  <span className="tabular font-mono text-xs font-bold text-zinc-900 dark:text-white bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full">
                    {formatTimerDigital(activeOutageSeconds)}
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold sm:text-sm">
                  {t('followup.prompt')}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {t('report.timingDuration', {
                    time: formatDurationHMS(activeOutageSeconds),
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFollowUpDismissedForId(activeUserReport.id)}
                aria-label={t('common.dismiss')}
                className="rounded-full bg-black/5 p-1 dark:bg-white/10"
              >
                <CloseIcon size={13} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  handleConfirmActiveReportStillOut(activeUserReport.id)
                }
                className="min-h-9 flex-1 rounded-full bg-amber-400 px-3 text-xs font-bold text-zinc-950 transition active:scale-95"
              >
                {t('followup.stillOut')}
              </button>
              <button
                type="button"
                onClick={() => handleResolveActiveReport(activeUserReport.id)}
                className="flex min-h-9 flex-1 items-center justify-center gap-1 rounded-full bg-emerald-500 px-3 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition active:scale-95"
              >
                <CheckCircle2 size={13} aria-hidden="true" />
                <span>{t('followup.powerBack')}</span>
              </button>
            </div>
          </div>
        ) : announcements.length > 0 && activeOverlay === null ? (
          <div className="mx-auto max-w-md">
            <AnnouncementBanner
              announcements={announcements}
              onFocus={(item) => map?.flyTo([item.lat, item.lng], DEFAULT_ZOOM)}
            />
          </div>
        ) : showLocationGateBanner ? (
          <LocationGate
            status={geoStatus}
            permission={geoPermission}
            onRetry={locate}
            onSelectNeighborhood={handleSelectNeighborhood}
            onStartMapPick={() => {
              setLocationGateDismissed(true)
              setPickingLocationOnMap(true)
            }}
            onDismiss={() => setLocationGateDismissed(true)}
          />
        ) : null}
      </header>

      <MapControls map={map} onRecenter={handleRecenter} />

      <ReportActionBar
        composerOpen={activeOverlay === 'composer'}
        onOpenComposer={() => openOverlay('composer')}
        onCloseComposer={() =>
          setActiveOverlay((prev) => (prev === 'composer' ? null : prev))
        }
        onCaptureLocation={handleCaptureLocation}
        onSubmitReport={handleSubmitReport}
        onQuickReportWorking={handleQuickReportWorking}
        activeUserReport={activeUserReport}
        onResolveActiveReport={handleResolveActiveReport}
        onConfirmActiveReportStillOut={handleConfirmActiveReportStillOut}
        hiddenWhenOverlayOpen={
          activeOverlay !== null && activeOverlay !== 'composer'
        }
        disabled={busy || !canAct}
      />

      {/* Single-Overlay Rule: Only one sheet or modal can render at a time */}
      {activeOverlay === 'install' && (
        <InstallGuideModal onClose={() => openOverlay(null)} />
      )}
      {activeOverlay === 'walkthrough' && (
        <WalkthroughModal
          onClose={() => openOverlay(null)}
          onOpenProfile={() => openOverlay('profile')}
          onOpenCommunity={() => openOverlay('community')}
        />
      )}
      {activeOverlay === 'profile' && (
        <ProfilePanel
          clusters={allPowerClusters}
          onFocusReport={(report) => {
            map?.flyTo([report.lat, report.lng], 15)
            openOverlay(null)
          }}
          onClose={() => openOverlay(null)}
        />
      )}
      {activeOverlay === 'official' && (
        <OfficialPanel onClose={() => openOverlay(null)} />
      )}
      {activeOverlay === 'admin' && (
        <AdminPanel onClose={() => openOverlay(null)} />
      )}
      {activeOverlay === 'community' && (
        <CommunityPanel
          position={position}
          onClose={() => openOverlay(null)}
          onRequestSignIn={() => openOverlay('profile')}
        />
      )}
      {(activeOverlay === 'legend' || activeOverlay === 'about') && (
        <InfoPanel view={activeOverlay} onClose={() => openOverlay(null)} />
      )}

      <SurveyReminderPrompt
        onOpenSurvey={() => openOverlay('survey')}
        hidden={!showSurveyReminder}
      />

      {activeOverlay === 'survey' && (
        <UptimeSurveyModal
          isOpen={true}
          locationDetected={hasHardwareFix}
          position={position}
          uid={effectiveUserKey}
          isGuest={isGuestUser}
          onRequestLocation={locate}
          onClose={handleCloseSurveyModal}
          onSurveySubmitted={handleSurveySubmitted}
        />
      )}
    </div>
  )
}

export default MapDashboard

