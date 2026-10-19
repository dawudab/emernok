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
 * Daily community power uptime survey modal.
 * Triggers up to 2 times a day per user (guests and account holders).
 * If the location is not yet detected, guests are asked for permission first.
 * If they agree, the survey shows; if they decline, it does not.
 */
function UptimeSurveyModal({
  isOpen,
  locationDetected,
  position,
  uid,
  isGuest,
  onRequestLocation,
  onClose,
  onSurveySubmitted,
}) {
  const { t, lang, dir } = useI18n()

  const [step, setStep] = useState(() => (locationDetected ? 'survey' : 'ask-location'))
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState(null)

  // Survey responses state
  const [isPowerWorking, setIsPowerWorking] = useState(null)
  const [wentOutToday, setWentOutToday] = useState(null)
  const [durationBucket, setDurationBucket] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Determine local neighbourhood / region name if position is detected
  const locationInfo = useMemo(() => {
    if (!position?.lat || !position?.lng) return null
    const region = findRegionForPoint(position.lat, position.lng)
    const sub = findSubNeighbourhoodForPoint(position.lat, position.lng)
    return {
      regionName: getLocalName(region, lang),
      regionId: region.id,
      subName: getLocalName(sub, lang),
      subId: sub.id,
    }
  }, [lang, position])

  // Handle location consent for guests / users without hardware fix
  const handleAgreeLocation = useCallback(async () => {
    setIsLocating(true)
    setLocationError(null)
    try {
      const coords = await onRequestLocation()
      if (coords && coords.lat && coords.lng) {
        setStep('survey')
      } else {
        // If location was not granted or failed
        onClose()
      }
    } catch {
      setLocationError(t('location.unavailable'))
      onClose()
    } finally {
      setIsLocating(false)
    }
  }, [onClose, onRequestLocation, t])

  const dailySubmissions = useMemo(() => getDailySurveySubmissionCount(uid), [uid])
  const dailyLimitReached = dailySubmissions >= MAX_SURVEYS_PER_DAY
  const inCooldown = useMemo(() => isSurveyInCooldown(uid), [uid])
  const cooldownMs = useMemo(() => getSurveyCooldownRemainingMs(uid), [uid])

  const canSubmit = !inCooldown && !dailyLimitReached && isPowerWorking !== null && wentOutToday !== null

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || inCooldown || dailyLimitReached || !position?.lat || !position?.lng) return
    setSubmitting(true)
    try {
      await submitUptimeSurvey({
        uid,
        lat: position.lat,
        lng: position.lng,
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
      }, 1400)
    } catch {
      // Handled in survey service
    } finally {
      setSubmitting(false)
    }
  }, [
    canSubmit,
    dailyLimitReached,
    durationBucket,
    inCooldown,
    isGuest,
    isPowerWorking,
    locationInfo,
    onClose,
    onSurveySubmitted,
    position,
    uid,
    wentOutToday,
  ])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      dir={dir}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute top-4 end-4 rounded-full p-2 text-zinc-500 hover:bg-black/5 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100 transition"
        >
          <X size={18} aria-hidden="true" />
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
          /* Daily Limit Reached (2 surveys per 24 hours) */
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
                className="btn-primary w-full min-h-11 rounded-2xl text-sm font-semibold"
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
                className="btn-primary w-full min-h-11 rounded-2xl text-sm font-semibold"
              >
                {t('survey.gotIt')}
              </button>
            </div>
          </div>
        ) : step === 'ask-location' ? (
          /* Mode A: Guest Location Consent Step */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <MapPin size={22} strokeWidth={2.5} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-mono text-[10px] font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                  {t('survey.badge')}
                </span>
                <h3 className="text-base font-bold leading-tight">
                  {t('survey.promptTitle')}
                </h3>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {t('survey.locationConsentBody')}
            </p>

            {locationError && (
              <p className="text-xs text-red-500 font-medium">{locationError}</p>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleAgreeLocation}
                disabled={isLocating}
                className="btn-primary flex-1 min-h-12 rounded-2xl text-sm font-semibold shadow-lg shadow-sky-500/20"
              >
                {isLocating ? t('common.working') : t('survey.agreeShareLocation')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost rounded-2xl px-4 min-h-12 text-sm font-medium"
              >
                {t('survey.notNow')}
              </button>
            </div>
          </div>
        ) : (
          /* Mode B: The Survey Questions */
          <div className="space-y-4">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700 uppercase dark:text-emerald-300">
                  <Zap size={11} fill="currentColor" aria-hidden="true" />
                  {t('survey.badge')}
                </span>
                {locationInfo && (
                  <span className="truncate text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    📍 {locationInfo.subName}
                  </span>
                )}
              </div>
              <h3 className="mt-1 text-base font-bold">
                {t('survey.title')}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {t('survey.subtitle')}
              </p>
            </div>

            {/* Questions Container */}
            <div className="space-y-3.5 max-h-[58dvh] overflow-y-auto pe-1">
              {/* Question 1: Is power currently working? */}
              <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-3 dark:border-white/5 dark:bg-white/[0.02]">
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  1. {t('survey.q1')}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPowerWorking(true)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition ${
                      isPowerWorking === true
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 shadow-sm'
                        : 'border-black/10 bg-white hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-800/80 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Zap size={14} className="text-emerald-500" aria-hidden="true" />
                    <span>{t('survey.q1.yes')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPowerWorking(false)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition ${
                      isPowerWorking === false
                        ? 'border-red-500 bg-red-500/20 text-red-700 dark:text-red-200 shadow-sm'
                        : 'border-black/10 bg-white hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-800/80 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <ZapOff size={14} className="text-red-500" aria-hidden="true" />
                    <span>{t('survey.q1.no')}</span>
                  </button>
                </div>
              </div>

              {/* Question 2: Did power go out at any time today? */}
              <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-3 dark:border-white/5 dark:bg-white/[0.02]">
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  2. {t('survey.q3')}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWentOutToday(false)
                      setDurationBucket('')
                    }}
                    className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                      wentOutToday === false
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 shadow-sm'
                        : 'border-black/10 bg-white hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-800/80 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {t('survey.q3.no')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWentOutToday(true)}
                    className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                      wentOutToday === true
                        ? 'border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-200 shadow-sm'
                        : 'border-black/10 bg-white hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-800/80 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {t('survey.q3.yes')}
                  </button>
                </div>

                {/* Conditional Outage Duration Selector if power went out */}
                {wentOutToday === true && (
                  <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5">
                    <span className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      {t('survey.durationLabel')}
                    </span>
                    <div className="mt-1.5 flex gap-1.5">
                      {[
                        { key: 'under_1h', label: t('survey.duration.under1h') },
                        { key: '1_to_3h', label: t('survey.duration.1to3h') },
                        { key: 'over_3h', label: t('survey.duration.over3h') },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setDurationBucket(item.key)}
                          className={`flex-1 rounded-lg border py-1.5 px-1 text-[11px] font-medium transition ${
                            durationBucket === item.key
                              ? 'border-amber-500 bg-amber-500/20 text-amber-800 dark:text-amber-200 font-semibold'
                              : 'border-black/10 bg-white dark:border-white/10 dark:bg-zinc-800'
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

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="btn-primary flex-1 min-h-12 rounded-2xl text-sm font-semibold shadow-lg shadow-sky-500/20 disabled:opacity-40"
              >
                {submitting ? t('survey.submitting') : t('survey.submit')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost rounded-2xl px-4 min-h-12 text-sm font-medium"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UptimeSurveyModal
