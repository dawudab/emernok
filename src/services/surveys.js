import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import {
  OperationType,
  auth,
  db,
  handleFirestoreError,
  isFirebaseConfigured,
} from '../firebaseConfig'

export const SURVEYS_COLLECTION = 'uptimeSurveys'
export const MAX_SURVEYS_PER_DAY = 2
export const SURVEY_COOLDOWN_MS = 4 * 60 * 60 * 1000 // 4 hours time delay between surveys
const DAY_MS = 24 * 60 * 60 * 1000
const CACHE_STORAGE_KEY = 'emernok_cached_surveys_v1'
const GUEST_ID_KEY = 'emernok_guest_survey_id_v1'

/**
 * Returns a stable anonymous/guest device identifier stored in localStorage.
 */
export function getOrCreateGuestId() {
  if (typeof window === 'undefined') return 'guest_server'
  try {
    const existing = window.localStorage.getItem(GUEST_ID_KEY)
    if (existing && existing.startsWith('guest_') && existing.length <= 64) {
      return existing
    }
    const fresh = `guest_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
    window.localStorage.setItem(GUEST_ID_KEY, fresh)
    return fresh
  } catch {
    return 'guest_ephemeral'
  }
}

/**
 * Filter an array of epoch timestamps to those occurring in the past 24 hours.
 */
function getRecentTimestamps(key) {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const now = Date.now()
    const valid = parsed.filter(
      (ts) => typeof ts === 'number' && now - ts >= 0 && now - ts < DAY_MS,
    )
    if (valid.length !== parsed.length) {
      window.localStorage.setItem(key, JSON.stringify(valid))
    }
    return valid
  } catch {
    return []
  }
}

function appendTimestamp(key) {
  if (typeof window === 'undefined') return
  try {
    const recent = getRecentTimestamps(key)
    recent.push(Date.now())
    window.localStorage.setItem(key, JSON.stringify(recent))
  } catch {
    // Ignore localStorage write quota / private mode errors
  }
}

export function getDailySurveySubmissionCount(userKey) {
  const safeKey = userKey || 'guest'
  return getRecentTimestamps(`emernok_survey_sub_${safeKey}`).length
}

export function getLastSurveySubmissionTime(userKey) {
  const safeKey = userKey || 'guest'
  const timestamps = getRecentTimestamps(`emernok_survey_sub_${safeKey}`)
  if (!timestamps.length) return 0
  return Math.max(...timestamps)
}

/**
 * Returns true if the user submitted a survey recently and is still in the cooldown period.
 */
export function isSurveyInCooldown(userKey) {
  const lastTime = getLastSurveySubmissionTime(userKey)
  if (!lastTime) return false
  return Date.now() - lastTime < SURVEY_COOLDOWN_MS
}

/**
 * Returns the remaining cooldown duration in milliseconds.
 */
export function getSurveyCooldownRemainingMs(userKey) {
  const lastTime = getLastSurveySubmissionTime(userKey)
  if (!lastTime) return 0
  const elapsed = Date.now() - lastTime
  return Math.max(0, SURVEY_COOLDOWN_MS - elapsed)
}

/**
 * Format remaining cooldown time into friendly localized text.
 */
export function formatCooldownTime(ms, lang = 'en') {
  if (!ms || ms <= 0) return '0m'
  const totalMinutes = Math.ceil(ms / (60 * 1000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (lang === 'ar') {
    if (hours > 0 && minutes > 0) return `${hours} ساعة و ${minutes} دقيقة`
    if (hours > 0) return `${hours} ساعة`
    return `${minutes} دقيقة`
  }
  if (lang === 'fr') {
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`
    if (hours > 0) return `${hours}h`
    return `${minutes}min`
  }
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}

/**
 * Check if a user is currently allowed to take/submit a survey:
 * 1. Must not have exceeded 2 surveys per 24 hours.
 * 2. Must not be in the cooldown period after completing a survey.
 */
export function canTakeSurvey(userKey) {
  const submissions = getDailySurveySubmissionCount(userKey)
  if (submissions >= MAX_SURVEYS_PER_DAY) {
    return false
  }
  if (isSurveyInCooldown(userKey)) {
    return false
  }
  return true
}

export function getDailySurveyDismissalCount(userKey) {
  const safeKey = userKey || 'guest'
  return getRecentTimestamps(`emernok_survey_dismiss_${safeKey}`).length
}

export function getLastSurveyDismissalTime(userKey) {
  const safeKey = userKey || 'guest'
  const timestamps = getRecentTimestamps(`emernok_survey_dismiss_${safeKey}`)
  if (!timestamps.length) return 0
  return Math.max(...timestamps)
}

export function getDailySurveyPromptCount(userKey) {
  const safeKey = userKey || 'guest'
  return getRecentTimestamps(`emernok_survey_prompt_${safeKey}`).length
}

export function getLastSurveyPromptTime(userKey) {
  const safeKey = userKey || 'guest'
  const timestamps = getRecentTimestamps(`emernok_survey_prompt_${safeKey}`)
  if (!timestamps.length) return 0
  return Math.max(...timestamps)
}

/**
 * Per-user cap & cooldown: Survey pop-up only automatically triggers up to 2 times a day per user,
 * on a timer, with at least 4 hours cooldown between prompts and never on every page refresh.
 */
export function canAutoPromptSurvey(userKey) {
  if (!canTakeSurvey(userKey)) {
    return false
  }
  const safeKey = userKey || 'guest'

  // Prevent auto-prompting on every refresh within the same browser session
  if (typeof window !== 'undefined') {
    try {
      if (
        window.sessionStorage.getItem(`emernok_survey_auto_prompted_${safeKey}`) ===
        'true'
      ) {
        return false
      }
    } catch {
      // Ignore storage errors
    }
  }

  // Enforce cooldown interval between auto-prompts or dismissals (at least 4 hours)
  const lastPrompt = getLastSurveyPromptTime(safeKey)
  const lastDismiss = getLastSurveyDismissalTime(safeKey)
  const lastEvent = Math.max(lastPrompt, lastDismiss)
  if (lastEvent > 0 && Date.now() - lastEvent < SURVEY_COOLDOWN_MS) {
    return false
  }

  const prompts = getDailySurveyPromptCount(safeKey)
  if (prompts >= MAX_SURVEYS_PER_DAY) {
    return false
  }
  return true
}

// Keep canPromptSurvey alias for backward compatibility
export const canPromptSurvey = canAutoPromptSurvey

/**
 * Checks whether the reminder button/prompt should be displayed on the home screen.
 * It appears if the survey was prompted or dismissed without being completed,
 * and disappears as soon as the survey is completed for that prompt / day or if cooldown is active.
 */
export function shouldShowSurveyReminder(userKey) {
  if (!canTakeSurvey(userKey)) {
    return false
  }
  const safeKey = userKey || 'guest'
  const submissions = getDailySurveySubmissionCount(safeKey)
  if (submissions >= MAX_SURVEYS_PER_DAY) {
    return false
  }
  const dismissals = getDailySurveyDismissalCount(safeKey)
  const prompts = getDailySurveyPromptCount(safeKey)
  // If the user has been prompted or dismissed without completing, show reminder button at bottom
  return dismissals > 0 || prompts > submissions
}

export function recordSurveyPrompt(userKey) {
  const safeKey = userKey || 'guest'
  appendTimestamp(`emernok_survey_prompt_${safeKey}`)
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        `emernok_survey_auto_prompted_${safeKey}`,
        'true',
      )
    }
  } catch {
    // Ignore storage errors
  }
}

export function recordSurveySubmission(userKey) {
  const safeKey = userKey || 'guest'
  appendTimestamp(`emernok_survey_sub_${safeKey}`)
  // Clear dismissals once submitted so reminder prompt disappears
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(`emernok_survey_dismiss_${safeKey}`)
      window.sessionStorage.removeItem(`emernok_survey_auto_prompted_${safeKey}`)
    }
  } catch {
    // Ignore storage errors
  }
}

export function recordSurveyDismissal(userKey) {
  const safeKey = userKey || 'guest'
  appendTimestamp(`emernok_survey_dismiss_${safeKey}`)
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        `emernok_survey_auto_prompted_${safeKey}`,
        'true',
      )
    }
  } catch {
    // Ignore storage errors
  }
}

export function readCachedSurveys() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCachedSurveys(surveys) {
  if (typeof window === 'undefined') return
  try {
    const trimmed = (surveys || []).slice(0, 150)
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Ignore cache persistence errors
  }
}

/**
 * Submit a community uptime survey response.
 */
export async function submitUptimeSurvey({
  uid,
  lat,
  lng,
  isPowerWorking,
  hasBeenWorkingAllDay,
  wentOutToday,
  durationBucket = '',
  regionId = '',
  subNeighbourhoodId = '',
  isGuest = false,
}) {
  const effectiveUid = uid || auth?.currentUser?.uid || getOrCreateGuestId()
  if (!canTakeSurvey(effectiveUid)) {
    const remainingMs = getSurveyCooldownRemainingMs(effectiveUid)
    const err = new Error(
      remainingMs > 0
        ? 'Survey cooldown active. Please wait before taking the next survey.'
        : 'Daily survey limit reached (maximum 2 per 24 hours).',
    )
    err.code = remainingMs > 0 ? 'SURVEY_COOLDOWN' : 'SURVEY_DAILY_LIMIT'
    throw err
  }
  const randomSuffix = Math.random().toString(36).slice(2, 9)
  const surveyId = `srv_${Date.now()}_${randomSuffix}`

  const resolvedWentOutToday = Boolean(wentOutToday)
  const resolvedWorkingAllDay =
    typeof hasBeenWorkingAllDay === 'boolean'
      ? hasBeenWorkingAllDay
      : !resolvedWentOutToday

  const payload = {
    uid: effectiveUid,
    lat: Number(lat),
    lng: Number(lng),
    isPowerWorking: Boolean(isPowerWorking),
    hasBeenWorkingAllDay: resolvedWorkingAllDay,
    wentOutToday: resolvedWentOutToday,
    createdAt: serverTimestamp(),
  }

  if (durationBucket) payload.durationBucket = String(durationBucket).slice(0, 30)
  if (subNeighbourhoodId)
    payload.subNeighbourhoodId = String(subNeighbourhoodId).slice(0, 80)
  if (regionId) payload.regionId = String(regionId).slice(0, 80)
  if (typeof isGuest === 'boolean') payload.isGuest = isGuest

  // Record submission locally immediately
  recordSurveySubmission(effectiveUid)

  // Optimistically store in local cache
  const localDoc = {
    ...payload,
    id: surveyId,
    createdAt: { toMillis: () => Date.now() },
  }
  const cached = readCachedSurveys()
  writeCachedSurveys([localDoc, ...cached])

  if (!db || !isFirebaseConfigured) {
    return localDoc
  }

  const docRef = doc(db, SURVEYS_COLLECTION, surveyId)
  try {
    await setDoc(docRef, payload)
    return { ...payload, id: surveyId }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, SURVEYS_COLLECTION)
    throw err
  }
}

/**
 * Dedicated 1-tap "Power is Working" quick survey ping.
 * Stores strictly in the uptimeSurveys database (NOT in reports), tracking neighborhood uptime.
 */
export async function submitQuickWorkingSurvey({
  uid,
  lat,
  lng,
  regionId = '',
  subNeighbourhoodId = '',
  isGuest = false,
}) {
  return submitUptimeSurvey({
    uid,
    lat,
    lng,
    isPowerWorking: true,
    hasBeenWorkingAllDay: true,
    wentOutToday: false,
    regionId,
    subNeighbourhoodId,
    isGuest,
  })
}

/**
 * Subscribe to recent uptime surveys to feed the live dashboard and trend graphs.
 */
export function subscribeToRecentSurveys(onNext, onError) {
  if (!db || !isFirebaseConfigured) {
    onNext(readCachedSurveys())
    return () => {}
  }

  const q = query(
    collection(db, SURVEYS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(150),
  )

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
      writeCachedSurveys(records)
      onNext(records)
    },
    (err) => {
      if (onError) onError(err)
      try {
        handleFirestoreError(err, OperationType.LIST, SURVEYS_COLLECTION)
      } catch {
        // Suppress re-throw in subscription callback
      }
    },
  )

  return unsubscribe
}
