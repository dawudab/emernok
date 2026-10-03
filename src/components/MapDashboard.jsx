import { useCallback, useMemo, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
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
import { buildClusters } from '../utils/clustering'
import AdminPanel from './AdminPanel'
import AnnouncementBanner from './AnnouncementBanner'
import AnnouncementLayer from './AnnouncementLayer'
import AppMenu from './AppMenu'
import CommunityPanel from './CommunityPanel'
import ConnectionIndicator from './ConnectionIndicator'
import InfoPanel from './InfoPanel'
import MapClickPicker from './MapClickPicker'
import OfficialPanel from './OfficialPanel'
import ProfilePanel from './ProfilePanel'
import RecenterMap from './RecenterMap'
import ReportActionBar from './ReportActionBar'
import ReportLayers from './ReportLayers'

function MapDashboard() {
  const { uid, status, canWrite, isAnonymous, emailLinkStatus } = useAuth()
  const { reports, error: reportsError } = useReports()
  const { announcements } = useAnnouncements()
  const { isAdmin } = useOfficial(uid)
  const { position, status: locationStatus, locate } = useGeolocation()
  const t = useT()

  const [map, setMap] = useState(null)
  const [pendingType, setPendingType] = useState(null)
  const [awaitingMapClick, setAwaitingMapClick] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [panel, setPanel] = useState(null)
  const [votedIds, setVotedIds] = useState(() => new Set())

  const clusters = useMemo(() => buildClusters(reports), [reports])

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
        setAwaitingMapClick(false)
        setBusy(false)
      }
    },
    [describe, t, uid],
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
        text: t('notice.tapMap', { type: t(REPORT_TYPES[type].shortKey) }),
      })
    },
    [canWrite, locate, position, requireSignIn, submit, t],
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
        <AnnouncementLayer announcements={announcements} />
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
            <h1 className="text-lg font-bold text-slate-900">{t('app.name')}</h1>
            <p className="truncate text-sm text-slate-600">
              {t('app.counts', {
                verified: clusters.filter((cluster) => cluster.verified).length,
                total: clusters.length,
              })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ConnectionIndicator />
            <AppMenu
              onOpenCommunity={() => setPanel('community')}
              onOpenProfile={() => setPanel('profile')}
              onOpenLegend={() => setPanel('legend')}
              onOpenAbout={() => setPanel('about')}
              onOpenOfficial={() => setPanel('official')}
              onOpenAdmin={() => setPanel('admin')}
              onRecenter={handleRecenter}
              canRecenter={locationStatus !== 'denied'}
              isAdmin={isAdmin}
            />
          </div>
        </div>

        <AnnouncementBanner
          announcements={announcements}
          onFocus={(item) => map?.flyTo([item.lat, item.lng], DEFAULT_ZOOM)}
        />

        {emailLinkStatus === 'completing' && (
          <div className="pointer-events-auto rounded-xl bg-slate-900/90 px-4 py-3 text-sm font-medium text-white shadow-lg">
            {t('notice.finishingSignIn')}
          </div>
        )}

        {(emailLinkStatus === 'needs-email' || emailLinkStatus === 'error') && (
          <button
            type="button"
            onClick={() => setPanel('profile')}
            className="pointer-events-auto w-full rounded-xl bg-amber-500 px-4 py-3 text-start text-sm font-medium text-amber-950 shadow-lg"
          >
            {t('notice.linkNeedsStep')}
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
                {t('common.cancel')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label={t('common.dismiss')}
                className="rounded-lg bg-white/20 px-2 py-1"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {locationStatus === 'denied' && (
          <div className="pointer-events-auto rounded-xl bg-slate-900/90 px-4 py-3 text-sm font-medium text-white shadow-lg">
            {t('notice.locationOff')}
          </div>
        )}

        {reportsError && (
          <div className="pointer-events-auto rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
            {t('notice.liveUnavailable', { message: reportsError.message })}
          </div>
        )}
      </header>

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
