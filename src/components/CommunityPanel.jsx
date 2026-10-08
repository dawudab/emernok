import { Globe, Layers, MapPin, Radio } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ALL_SUB_NEIGHBOURHOODS,
  COMMUNITY_RADIUS_KM,
  NEIGHBOURHOODS,
  NOUAKCHOTT_CENTER,
  getLocalName,
} from '../constants'
import { useAuth } from '../context/useAuth'
import { useNearbyMessages } from '../hooks/useNearbyMessages'
import { useI18n } from '../i18n/useI18n'
import { MAX_MESSAGE_LENGTH, sendMessage } from '../services/messages'
import {
  findRegionForPoint,
  findSubNeighbourhoodForPoint,
} from '../utils/regionStats'
import Sheet from './Sheet'

const CHAT_SCOPES = [
  { id: 'radius', icon: Radio, labelKey: 'community.scope.radius' },
  { id: 'neighbourhood', icon: MapPin, labelKey: 'community.scope.neighbourhood' },
  { id: 'region', icon: Layers, labelKey: 'community.scope.region' },
  { id: 'global', icon: Globe, labelKey: 'community.scope.global' },
]

const RADIUS_OPTIONS = [1, 2, 5]

function formatDistance(metres, t) {
  if (metres == null) return ''
  return metres < 1000
    ? t('unit.m', { count: Math.round(metres) })
    : t('unit.km', { count: (metres / 1000).toFixed(1) })
}

function CommunityPanel({ onClose, position, onRequestSignIn }) {
  const { uid, canWrite, isAnonymous } = useAuth()
  const { t, lang } = useI18n()

  const [scope, setScope] = useState('neighbourhood')
  const [radiusKm, setRadiusKm] = useState(COMMUNITY_RADIUS_KM)

  // Detect the user's current neighbourhood and region from their GPS location
  // (or default to central Nouakchott when GPS isn't active yet).
  const currentSub = useMemo(
    () =>
      findSubNeighbourhoodForPoint(
        position?.lat ?? NOUAKCHOTT_CENTER[0],
        position?.lng ?? NOUAKCHOTT_CENTER[1],
      ),
    [position?.lat, position?.lng],
  )

  const currentRegion = useMemo(
    () =>
      findRegionForPoint(
        position?.lat ?? NOUAKCHOTT_CENTER[0],
        position?.lng ?? NOUAKCHOTT_CENTER[1],
      ),
    [position?.lat, position?.lng],
  )

  const [selectedSubId, setSelectedSubId] = useState(null)
  const [selectedRegionId, setSelectedRegionId] = useState(null)

  const activeSub =
    ALL_SUB_NEIGHBOURHOODS.find((s) => s.id === (selectedSubId ?? currentSub.id)) ??
    currentSub
  const activeRegion =
    NEIGHBOURHOODS.find((r) => r.id === (selectedRegionId ?? currentRegion.id)) ??
    currentRegion

  const effectiveCenter = useMemo(
    () =>
      position ?? {
        lat: activeSub.lat,
        lng: activeSub.lng,
      },
    [activeSub.lat, activeSub.lng, position],
  )

  const { messages, error } = useNearbyMessages({
    scope,
    center: effectiveCenter,
    radiusKm,
    neighbourhoodId: activeSub.id,
    regionId: activeRegion.id,
  })

  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [sendError, setSendError] = useState(null)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, scope])

  const locale = lang === 'ar' ? 'ar-MR' : lang === 'fr' ? 'fr-FR' : 'en-US'

  const formatTime = (createdAt) =>
    createdAt?.toDate
      ? createdAt.toDate().toLocaleString(locale, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : t('popup.sending')

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setSendError(null)
    try {
      await sendMessage({
        uid,
        text,
        lat: effectiveCenter.lat,
        lng: effectiveCenter.lng,
        scope,
        neighbourhoodId: activeSub.id,
        neighbourhoodName: activeSub.name,
        regionId: activeRegion.id,
        regionName: activeRegion.name,
      })
      setText('')
    } catch (err) {
      setSendError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const scopeSubtitle =
    scope === 'radius'
      ? t('community.desc.radius', { km: radiusKm })
      : scope === 'neighbourhood'
        ? t('community.desc.neighbourhood', {
            name: getLocalName(activeSub, lang),
          })
        : scope === 'region'
          ? t('community.desc.region', {
              name: getLocalName(activeRegion, lang),
            })
          : t('community.desc.global')

  const composer = !canWrite ? (
    <button
      type="button"
      onClick={onRequestSignIn}
      className="btn-primary min-h-11 w-full rounded-full text-sm"
    >
      {isAnonymous ? t('community.signIn') : t('community.verify')}
    </button>
  ) : (
    <form onSubmit={submit} className="flex items-end gap-2">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={1}
        maxLength={MAX_MESSAGE_LENGTH}
        placeholder={t('community.placeholder')}
        className="glass-input min-h-11 flex-1 resize-none py-2.5 text-sm"
      />
      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="btn-primary min-h-11 shrink-0 rounded-full px-4 text-sm"
      >
        {busy ? '…' : t('common.send')}
      </button>
    </form>
  )

  return (
    <Sheet
      tall
      title={t('community.title')}
      subtitle={scopeSubtitle}
      onClose={onClose}
      footer={
        <>
          {composer}
          {sendError && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-red-500">
              {sendError}
            </p>
          )}
        </>
      }
    >
      {/* 4 Public Chat Channel Tabs: Radius, Neighbourhood, Region, City-Wide */}
      <div className="sticky top-0 z-10 -mx-1 mb-3 space-y-2 bg-white/90 px-1 pb-2 backdrop-blur-md dark:bg-zinc-950/90">
        <div
          role="tablist"
          aria-label={t('community.title')}
          className="grid grid-cols-4 gap-1 rounded-2xl bg-black/5 p-1 dark:bg-white/5"
        >
          {CHAT_SCOPES.map((item) => {
            const Icon = item.icon
            const active = scope === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setScope(item.id)}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-1.5 py-1.5 text-center transition-all ${
                  active
                    ? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <Icon size={13} strokeWidth={2.2} aria-hidden="true" />
                <span className="truncate font-mono text-[10px] font-semibold">
                  {t(item.labelKey)}
                </span>
              </button>
            )
          })}
        </div>

        {/* Context bar for the selected chat scope */}
        {scope === 'radius' && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-black/5 px-3 py-1.5 text-xs dark:bg-white/5">
            <span className="text-zinc-600 dark:text-zinc-400">
              {t('community.radiusLabel')}
            </span>
            <div className="flex items-center gap-1">
              {RADIUS_OPTIONS.map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => setRadiusKm(km)}
                  className={`tabular rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold ${
                    radiusKm === km
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {t('unit.km', { count: km })}
                </button>
              ))}
            </div>
          </div>
        )}

        {scope === 'neighbourhood' && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-black/5 px-3 py-1.5 text-xs dark:bg-white/5">
            <span className="shrink-0 font-mono text-[10px] font-semibold uppercase opacity-70">
              {t('community.scope.neighbourhood')}:
            </span>
            <select
              value={activeSub.id}
              onChange={(event) => setSelectedSubId(event.target.value)}
              className="min-w-0 flex-1 truncate bg-transparent text-end font-semibold outline-none"
            >
              {ALL_SUB_NEIGHBOURHOODS.map((sub) => (
                <option
                  key={sub.id}
                  value={sub.id}
                  className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {lang === 'ar'
                    ? `${sub.regionNameAr ?? sub.regionName} · ${sub.nameAr ?? sub.name}`
                    : `${sub.regionName} · ${sub.name}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {scope === 'region' && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-black/5 px-3 py-1.5 text-xs dark:bg-white/5">
            <span className="shrink-0 font-mono text-[10px] font-semibold uppercase opacity-70">
              {t('community.scope.region')}:
            </span>
            <select
              value={activeRegion.id}
              onChange={(event) => setSelectedRegionId(event.target.value)}
              className="min-w-0 flex-1 truncate bg-transparent text-end font-semibold outline-none"
            >
              {NEIGHBOURHOODS.map((reg) => (
                <option
                  key={reg.id}
                  value={reg.id}
                  className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {getLocalName(reg, lang)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Messages list */}
      <div className="space-y-2.5">
        {error && (
          <p role="alert" className="text-xs font-medium text-red-500">
            {t('community.loadFailed', { message: error.message })}
          </p>
        )}

        {!error && messages.length === 0 && (
          <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {t('community.empty')}
          </p>
        )}

        {messages.map((message) => {
          const mine = message.uid === uid
          return (
            <div
              key={message.id}
              className={`max-w-[86%] rounded-2xl px-3 py-2 transition-all duration-200 ${
                mine
                  ? 'ms-auto bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'glass-inset'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              <p className="tabular mt-1 flex flex-wrap items-center gap-1 text-[10px] opacity-65">
                <span>{formatTime(message.createdAt)}</span>
                {scope === 'radius' && message.distance != null && (
                  <span>
                    ·{' '}
                    {t('community.away', {
                      distance: formatDistance(message.distance, t),
                    })}
                  </span>
                )}
                {scope === 'global' && (message.regionId || message.regionName) && (
                  <span>
                    ·{' '}
                    {getLocalName(
                      NEIGHBOURHOODS.find(
                        (r) =>
                          r.id === message.regionId ||
                          r.name === message.regionName,
                      ),
                      lang,
                    ) || message.regionName}
                  </span>
                )}
              </p>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
    </Sheet>
  )
}

export default CommunityPanel
