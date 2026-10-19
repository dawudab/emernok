import { CheckCircle2, Clock, MapPin, X, Zap, ZapOff } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { getLocalName } from '../constants'
import { useI18n } from '../i18n/useI18n'
import {
  MAX_SURVEYS_PER_DAY,
  formatCooldownTime,
  getDailySurveySubmissionCount,
  getSurveyCooldownRemainingMs,
  isSurveyInCooldown,
  submitUptimeSurvey,
} from '../services/surveys'
import { findRegionForPoint, findSubNeighbourhoodForPoint } from '../utils/regionStats'

/**
 * Community power uptime survey modal.
 * Matches user screenshots:
 * Step 1: Location permission / request to get accurate neighborhood data.
 * Step 2: Survey questions (power working right now, outages today + duration).
 */
function UptimeSurveyModal({
  isOpen,
  position,
  uid,
  isGuest,
  onRequestLocation,
  onClose,
  onSurveySubmitted,
}) {
  const { t, lang, dir } = useI18n()

  // Always ask for location first when the survey pop-up opens so we get accurate neighborhood data
  const [step, setStep] = useState('ask-location')
  const [currentPosition, setCurrentPosition] = useState(position)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState(null)

  // Survey responses state
  const [isPowerWorking, setIsPowerWorking] = useState(null)
  const [wentOutToday, setWentOutToday] = useState(null)
  const [durationBucket, setDurationBucket] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Sync position if parent updates it
  const effectivePosition = currentPosition || position

  // Determine local neighbourhood / region name
  const locationInfo = useMemo(() => {
    if (!effectivePosition?.lat || !effectivePosition?.lng) return null
    const region = findRegionForPoint(effectivePosition.lat, effectivePosition.lng)
    const sub = findSubNeighbourhoodForPoint(effectivePosition.lat, effectivePosition.lng)
    return {
      regionName: getLocalName(region, lang),
      regionId: region.id,
      subName: getLocalName(sub, lang),
      subId: sub.id,
    }
  }, [effectivePosition, lang])

  // Handle location consent: asks user for location to get correct data
  const handleAgreeLocation = useCallback(async () => {
    setIsLocating(true)
    setLocationError(null)
    try {
      const coords = await onRequestLocation()
      if (coords && coords.lat && coords.lng) {
        setCurrentPosition(coords)
      }
      setStep('survey')
    } catch {
      setStep('survey')
    } finally {
      setIsLocating(false)
    }
  }, [onRequestLocation])

  const dailySubmissions = useMemo(() => getDailySurveySubmissionCount(uid), [uid])
  const dailyLimitReached = dailySubmissions >= MAX_SURVEYS_PER_DAY
  const inCooldown = useMemo(() => isSurveyInCooldown(uid), [uid])
  const cooldownMs = useMemo(() => getSurveyCooldownRemainingMs(uid), [uid])

  const canSubmit =
    !inCooldown &&
    !dailyLimitReached &&
    isPowerWorking !== null &&
    wentOutToday !== null &&
    (wentOutToday ? Boolean(durationBucket) : true)

  const handleSubmit = useCallback(async () => {
    const targetPos = effectivePosition || { lat: 18.0735, lng: -15.9582 }
    if (!canSubmit || inCooldown || dailyLimitReached) return
    setSubmitting(true)
    try {
      await submitUptimeSurvey({
        uid,
        lat: targetPos.lat,
        lng: targetPos.lng,
        isPowerWorking: Boolean(isPowerWorking),
        hasBeenWorkingAllDay: !wentOutToday,
        wentOutToday: Boolean(wentOutToday),
        durationBucket: durationBucket || '',
        regionId: locationInfo?.regionId || '',
        subNeighbourhoodId: locationInfo?.subId || '',
        isGuest: Boolean(isGuest),
      })
      setSubmitted(true)
      if (onSurveySubmitted) onSurveySubmitted()
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch {
      // Handled in survey service
    } finally {
      setSubmitting(false)
    }
  }, [
    canSubmit,
    dailyLimitReached,
    durationBucket,
    effectivePosition,
    inCooldown,
    isGuest,
    isPowerWorking,
    locationInfo,
    onClose,
    onSurveySubmitted,
    uid,
    wentOutToday,
  ])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      dir={dir}
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
        {/* Close Button (X) */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute top-4 start-4 z-10 rounded-full p-2 text-zinc-400 hover:bg-black/5 hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-zinc-100 transition"
        >
          <X size={20} strokeWidth={2.2} aria-hidden="true" />
        </button>

        {submitted ? (
          /* Thank You Screen */
          <div className="py-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={32} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold">
              {t('survey.thankYou')}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {locationInfo
                ? `${locationInfo.subName} · ${locationInfo.regionName}`
                : t('app.city')}
            </p>
          </div>
        ) : dailyLimitReached ? (
          /* Daily Limit Reached */
          <div className="py-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <CheckCircle2 size={32} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold">
              {t('survey.dailyLimitReached')}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto">
              {t('survey.cooldownSubtitle')}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl bg-zinc-900 py-3.5 text-sm font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 transition"
              >
                {t('survey.gotIt')}
              </button>
            </div>
          </div>
        ) : inCooldown ? (
          /* Cooldown Delay Active */
          <div className="py-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Clock size={32} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold">
              {t('survey.cooldownTitle')}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto">
              {t('survey.cooldownNotice', { time: formatCooldownTime(cooldownMs, lang) })}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {t('survey.cooldownSubtitle')}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl bg-zinc-900 py-3.5 text-sm font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 transition"
              >
                {t('survey.gotIt')}
              </button>
            </div>
          </div>
        ) : step === 'ask-location' ? (
          /* ========================================================= */
          /* STEP 1: Screenshot 1 - Location Request Modal              */
          /* ========================================================= */
          <div className="pt-2 space-y-4">
            {/* Header: Orange Icon + Title on the end side */}
            <div className="flex items-center gap-3.5">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400">
                <MapPin size={28} strokeWidth={2.4} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block font-semibold text-xs text-amber-600 dark:text-amber-400">
                  {t('survey.badge')}
                </span>
                <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-100 leading-snug">
                  {t('survey.promptTitle')}
                </h3>
              </div>
            </div>

            {/* Body text explaining why location is required */}
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {t('survey.locationConsentBody')}
            </p>

            {locationError && (
              <div className="rounded-xl bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400 font-medium">
                {locationError}
              </div>
            )}

            {/* Bottom Actions: "Not Now" + "Agree, Share My Location" */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-zinc-200/90 bg-zinc-100/70 px-6 py-3.5 text-sm font-bold text-zinc-800 hover:bg-zinc-200/70 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 transition"
              >
                {t('survey.notNow')}
              </button>

              <button
                type="button"
                onClick={handleAgreeLocation}
                disabled={isLocating}
                className="flex-1 rounded-2xl bg-zinc-950 py-3.5 text-sm font-bold text-white shadow-md hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLocating && (
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-950/30 dark:border-t-zinc-950" />
                )}
                <span>
                  {isLocating ? t('common.working') : t('survey.agreeShareLocation')}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* STEP 2: Screenshot 2 - Survey Questions Modal             */
          /* ========================================================= */
          <div className="pt-2 space-y-4">
            {/* Header: Green badge + Neighborhood name + Title & Subtitle */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-xs text-emerald-700 dark:text-emerald-300">
                  <Zap size={12} fill="currentColor" aria-hidden="true" />
                  <span>{t('survey.badge')}</span>
                </span>
                {locationInfo ? (
                  <span className="inline-flex items-center gap-1 font-bold text-xs text-zinc-700 dark:text-zinc-300">
                    <MapPin size={13} className="text-amber-500" aria-hidden="true" />
                    <span>{locationInfo.subName}</span>
                  </span>
                ) : (
                  <span className="font-semibold text-xs text-zinc-500 dark:text-zinc-400">
                    📍 {t('app.city')}
                  </span>
                )}
              </div>

              <h3 className="mt-2 text-lg font-bold text-zinc-950 dark:text-zinc-100">
                {t('survey.title')}
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {t('survey.subtitle')}
              </p>
            </div>

            {/* Questions Container */}
            <div className="space-y-3.5 max-h-[56dvh] overflow-y-auto pe-0.5">
              {/* Question 1: Is power currently working? */}
              <div className="rounded-2xl border border-black/5 bg-zinc-50/80 p-4 dark:border-white/5 dark:bg-zinc-800/40">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  1. {t('survey.q1')}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {/* Right button in Arabic: Yes */}
                  <button
                    type="button"
                    onClick={() => setIsPowerWorking(true)}
                    className={`flex items-center justify-center gap-2 rounded-2xl border py-3 px-3 text-xs font-bold transition shadow-xs ${
                      isPowerWorking === true
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/30'
                        : 'border-zinc-200/90 bg-white hover:bg-zinc-100/70 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    <Zap size={15} className="text-emerald-500" aria-hidden="true" />
                    <span>{t('survey.q1.yes')}</span>
                  </button>

                  {/* Left button in Arabic: No */}
                  <button
                    type="button"
                    onClick={() => setIsPowerWorking(false)}
                    className={`flex items-center justify-center gap-2 rounded-2xl border py-3 px-3 text-xs font-bold transition shadow-xs ${
                      isPowerWorking === false
                        ? 'border-red-500 bg-red-500/15 text-red-800 dark:text-red-200 ring-2 ring-red-500/30'
                        : 'border-zinc-200/90 bg-white hover:bg-zinc-100/70 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    <ZapOff size={15} className="text-red-500" aria-hidden="true" />
                    <span>{t('survey.q1.no')}</span>
                  </button>
                </div>
              </div>

              {/* Question 2: Did power go out at any time today? */}
              <div className="rounded-2xl border border-black/5 bg-zinc-50/80 p-4 dark:border-white/5 dark:bg-zinc-800/40">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  2. {t('survey.q3')}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {/* No, did not go out */}
                  <button
                    type="button"
                    onClick={() => {
                      setWentOutToday(false)
                      setDurationBucket('')
                    }}
                    className={`flex items-center justify-center rounded-2xl border py-3 px-3 text-xs font-bold transition shadow-xs ${
                      wentOutToday === false
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/30'
                        : 'border-zinc-200/90 bg-white hover:bg-zinc-100/70 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    <span>{t('survey.q3.no')}</span>
                  </button>

                  {/* Yes, went out today */}
                  <button
                    type="button"
                    onClick={() => setWentOutToday(true)}
                    className={`flex items-center justify-center rounded-2xl border py-3 px-3 text-xs font-bold transition shadow-xs ${
                      wentOutToday === true
                        ? 'border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-200 ring-2 ring-amber-500/30'
                        : 'border-zinc-200/90 bg-white hover:bg-zinc-100/70 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    <span>{t('survey.q3.yes')}</span>
                  </button>
                </div>

                {/* Conditional Duration Options if power went out */}
                {wentOutToday === true && (
                  <div className="mt-3.5 pt-3 border-t border-black/5 dark:border-white/5 animate-in fade-in duration-200">
                    <span className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                      {t('survey.durationLabel')}
                    </span>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {[
                        { key: 'under_1h', label: t('survey.duration.under1h') },
                        { key: '1_to_3h', label: t('survey.duration.1to3h') },
                        { key: 'over_3h', label: t('survey.duration.over3h') },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setDurationBucket(item.key)}
                          className={`rounded-xl border py-2 px-1 text-center text-[11px] font-bold transition ${
                            durationBucket === item.key
                              ? 'border-amber-500 bg-amber-500/20 text-amber-800 dark:text-amber-200'
                              : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions: Close + Submit Answers */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-zinc-200/90 bg-zinc-100/70 px-6 py-3.5 text-sm font-bold text-zinc-800 hover:bg-zinc-200/70 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 transition"
              >
                {t('common.close')}
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className={`flex-1 rounded-2xl py-3.5 text-sm font-bold transition shadow-md flex items-center justify-center gap-2 ${
                  canSubmit && !submitting
                    ? 'bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950'
                    : 'bg-zinc-300 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400 cursor-not-allowed opacity-60'
                }`}
              >
                {submitting && (
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-950/30 dark:border-t-zinc-950" />
                )}
                <span>
                  {submitting ? t('survey.submitting') : t('survey.submit')}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UptimeSurveyModal
